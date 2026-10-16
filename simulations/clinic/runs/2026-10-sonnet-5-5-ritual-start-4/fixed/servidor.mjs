// Servidor de Fisio Andares. Sin dependencias: node servidor.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DATOS = path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'citas.json');
const ARCHIVO_CLAVE = path.join(DATOS, 'clave.txt');
const PUERTO = Number(process.env.PORT) || 3000;
const LIMITE_CITAS_HORA = Number(process.env.LIMITE_CITAS_HORA) || 5; // por dirección IP
const MAX_PENDIENTES = 1000;
const LIMITE_CITAS_HORA_TOTAL = Number(process.env.LIMITE_CITAS_HORA_TOTAL) || 100; // entre todas las direcciones
const POR_PAGINA = 25;

// Duración en minutos. Debe coincidir con data-duracion en publico/index.html.
const TRATAMIENTOS = {
  rodilla: { nombre: 'Rehabilitación de rodilla', minutos: 60 },
  espalda: { nombre: 'Dolor de espalda', minutos: 45 },
  masaje: { nombre: 'Masaje deportivo', minutos: 30 },
};
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];
const APERTURA = 9 * 60;
const CIERRE = 18 * 60;

class ErrorHttp extends Error {
  constructor(estado, mensaje) { super(mensaje); this.estado = estado; }
}

// ---------- Contraseña de la dueña ----------
fs.mkdirSync(DATOS, { recursive: true });
let CLAVE = process.env.ADMIN_PASSWORD;
let origenClave = 'la variable ADMIN_PASSWORD';
if (!CLAVE) {
  try { CLAVE = fs.readFileSync(ARCHIVO_CLAVE, 'utf8').trim(); } catch { /* se crea abajo */ }
  if (!CLAVE) {
    CLAVE = crypto.randomBytes(9).toString('base64url');
    fs.writeFileSync(ARCHIVO_CLAVE, CLAVE + '\n');
  }
  origenClave = ARCHIVO_CLAVE;
}
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();

// ---------- Almacén de citas ----------
// Una cita dañada no debe tumbar a las demás: se arreglan los campos sueltos y
// lo que no es una cita se aparta en un archivo aparte (no se pierde).
const texto = (v) => (typeof v === 'string' ? v : '');
function normalizar(datos) {
  const buenas = [], descartadas = [];
  const vistos = new Set();
  let cambios = false;
  for (const c of datos) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) { descartadas.push(c); cambios = true; continue; }
    const n = {
      id: /^[\w-]+$/.test(texto(c.id)) && !vistos.has(c.id) ? c.id : crypto.randomUUID(),
      creada: Number.isFinite(Date.parse(c.creada)) ? c.creada : '1970-01-01T00:00:00.000Z',
      estado: ESTADOS.includes(c.estado) ? c.estado : 'pendiente',
      nombre: texto(c.nombre) || '(sin nombre)', telefono: texto(c.telefono), correo: texto(c.correo),
      tratamiento: texto(c.tratamiento), fecha: texto(c.fecha), hora: texto(c.hora), comentario: texto(c.comentario),
    };
    if (JSON.stringify(n) !== JSON.stringify(c)) cambios = true;
    vistos.add(n.id);
    buenas.push(n);
  }
  buenas.sort((a, b) => (a.creada < b.creada ? -1 : a.creada > b.creada ? 1 : 0));
  if (descartadas.length) {
    const copia = path.join(DATOS, `citas.descartadas-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(copia, JSON.stringify(descartadas, null, 2));
    console.error(`\n!! Había ${descartadas.length} registro(s) que no eran citas. Se guardaron en ${copia}.\n`);
  }
  if (cambios) {
    fs.writeFileSync(ARCHIVO + '.tmp', JSON.stringify(buenas));
    fs.renameSync(ARCHIVO + '.tmp', ARCHIVO);
  }
  return buenas;
}

function cargar() {
  let texto;
  try { texto = fs.readFileSync(ARCHIVO, 'utf8'); }
  catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  try {
    const datos = JSON.parse(texto);
    if (!Array.isArray(datos)) throw new Error('no es una lista');
    return normalizar(datos);
  } catch (e) {
    // Archivo dañado: se conserva aparte (no se pierde) y se sigue con uno nuevo.
    const copia = path.join(DATOS, `citas.danado-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.renameSync(ARCHIVO, copia);
    console.error(`\n!! citas.json estaba dañado (${e.message}). Se guardó en ${copia} y se empezó con un archivo nuevo.\n`);
    return [];
  }
}
const citas = cargar();

function guardar() {
  const tmp = ARCHIVO + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(citas));
  fs.renameSync(tmp, ARCHIVO);
}

// ---------- Límites por IP ----------
const envios = new Map();
const fallos = new Map();
const enviosTotal = new Map();
function recientes(mapa, ip, ventana) {
  const ahora = Date.now();
  const lista = (mapa.get(ip) || []).filter((t) => ahora - t < ventana);
  if (lista.length) mapa.set(ip, lista); else mapa.delete(ip);
  return lista;
}
function anotar(mapa, ip) {
  const lista = mapa.get(ip) || [];
  lista.push(Date.now());
  mapa.set(ip, lista);
}
setInterval(() => {
  for (const ip of [...envios.keys()]) recientes(envios, ip, 3600_000);
  for (const ip of [...fallos.keys()]) recientes(fallos, ip, 60_000);
  recientes(enviosTotal, 'todos', 3600_000);
  for (const [t, venc] of sesiones) if (venc < Date.now()) sesiones.delete(t);
}, 60_000).unref();

// ---------- Sesiones ----------
const sesiones = new Map();
function cookies(req) {
  const r = {};
  for (const par of (req.headers.cookie || '').split(';')) {
    const i = par.indexOf('=');
    if (i > 0) r[par.slice(0, i).trim()] = par.slice(i + 1).trim();
  }
  return r;
}
function haySesion(req) {
  const t = cookies(req).sesion;
  const venc = t && sesiones.get(t);
  if (!venc) return false;
  if (venc < Date.now()) { sesiones.delete(t); return false; }
  return true;
}

// ---------- Validación ----------
function fechaLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function validar(d) {
  const e = {};
  // Solo se aceptan textos: un objeto o una lista no son un nombre (null = no era texto).
  const t = (v) => (v == null ? '' : typeof v === 'string' ? v : null);
  const nombre = t(d.nombre)?.trim() ?? null;
  const telefono = t(d.telefono)?.trim() ?? null;
  const correo = t(d.correo)?.trim() ?? null;
  const tratamiento = t(d.tratamiento) ?? '';
  const fecha = t(d.fecha) ?? '';
  const hora = t(d.hora) ?? '';
  const comentario = t(d.comentario)?.trim() ?? null;

  if (nombre === null || nombre.length < 2 || nombre.length > 80) e.nombre = 'Escribe tu nombre (entre 2 y 80 letras).';
  if (telefono === null || !/^[\d\s+()\-.]{8,20}$/.test(telefono) || telefono.replace(/\D/g, '').length < 8) e.telefono = 'Escribe un teléfono válido, con al menos 8 números.';
  if (correo === null || correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  const trat = Object.hasOwn(TRATAMIENTOS, tratamiento) ? TRATAMIENTOS[tratamiento] : undefined;
  if (!trat) e.tratamiento = 'Elige un tratamiento.';

  const hoy = new Date();
  const hoyTexto = fechaLocal(hoy);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  let dia = null;
  if (m) {
    dia = new Date(+m[1], +m[2] - 1, +m[3]);
    if (dia.getFullYear() !== +m[1] || dia.getMonth() !== +m[2] - 1 || dia.getDate() !== +m[3]) dia = null;
  }
  if (!dia) e.fecha = 'Elige un día.';
  else if (dia.getDay() === 0 || dia.getDay() === 6) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
  else if (fecha < hoyTexto) e.fecha = 'Ese día ya pasó. Elige uno a partir de hoy.';
  else if (dia - hoy > 90 * 86400_000) e.fecha = 'Solo agendamos con un máximo de 90 días de anticipación.';

  const h = /^(\d{2}):(\d{2})$/.exec(hora);
  const inicio = h ? +h[1] * 60 + +h[2] : NaN;
  if (!h || +h[1] > 23 || (+h[2] !== 0 && +h[2] !== 30)) e.hora = 'Elige una hora de la lista.';
  else if (inicio < APERTURA || (trat && inicio + trat.minutos > CIERRE)) {
    e.hora = trat ? `Esa hora no está disponible: atendemos de 9:00 a 18:00 y esta sesión dura ${trat.minutos} min.` : 'Atendemos de 9:00 a 18:00.';
  } else if (!e.fecha && fecha === hoyTexto && inicio <= hoy.getHours() * 60 + hoy.getMinutes()) {
    e.hora = 'Esa hora ya pasó. Elige una más tarde.';
  }

  if (comentario === null || comentario.length > 500) e.comentario = 'El comentario puede tener hasta 500 caracteres.';
  return { errores: e, datos: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---------- Utilidades HTTP ----------
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};
const CABECERAS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};
function json(res, estado, cuerpo, extra = {}) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CABECERAS, ...extra });
  res.end(JSON.stringify(cuerpo));
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function pagina(res, estado, titulo, cuerpoHtml) {
  res.writeHead(estado, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...CABECERAS });
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/estilos.css"></head>
<body><main class="aviso"><h1>${esc(titulo)}</h1>${cuerpoHtml}<p><a class="boton" href="/#cita">Volver al formulario</a></p></main></body></html>`);
}
// Sin JavaScript, el formulario se envía como página normal: si hay errores se
// devuelve el mismo formulario con lo que la persona ya escribió y cada aviso.
function paginaFormulario(res, datos, errores) {
  let form;
  try { form = /<form[\s\S]*?<\/form>/.exec(fs.readFileSync(path.join(PUBLICO, 'index.html'), 'utf8'))[0]; }
  catch { form = ''; }
  const v = (c) => (typeof datos[c] === 'string' ? datos[c] : '');
  for (const c of ['nombre', 'telefono', 'correo', 'fecha']) {
    form = form.replace(`<input id="${c}" `, () => `<input id="${c}" value="${esc(v(c))}" `);
  }
  form = form.replace(`<option value="${esc(v('tratamiento'))}"`, (m) => m + ' selected');
  form = form.replace(`<option>${esc(v('hora'))}</option>`, (m) => m.replace('<option>', '<option selected>'));
  form = form.replace('></textarea>', () => `>${esc(v('comentario'))}</textarea>`);
  for (const [c, msg] of Object.entries(errores)) {
    form = form.replace(`id="err-${c}"></p>`, () => `id="err-${c}">${esc(msg)}</p>`);
  }
  const lista = Object.values(errores).map((m) => `<li>${esc(m)}</li>`).join('');
  res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...CABECERAS });
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisa tu solicitud · Fisio Andares</title><link rel="stylesheet" href="/estilos.css"></head>
<body><main class="seccion seccion-clara"><h1>Revisa tu solicitud</h1><div class="estado mal" role="alert"><p>Hay algo por corregir; lo que escribiste sigue aquí:</p><ul>${lista}</ul></div>${form}</main></body></html>`);
}
async function leerCuerpo(req) {
  const trozos = [];
  let total = 0;
  for await (const t of req) {
    total += t.length;
    if (total > 20_000) throw new ErrorHttp(413, 'El mensaje es demasiado grande.');
    trozos.push(t);
  }
  const texto = Buffer.concat(trozos).toString('utf8');
  const tipo = (req.headers['content-type'] || '').split(';')[0].trim();
  if (tipo === 'application/json') {
    try {
      const v = JSON.parse(texto || '{}');
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
      return { tipo, datos: v };
    } catch { throw new ErrorHttp(400, 'El mensaje no es JSON válido.'); }
  }
  if (tipo === 'application/x-www-form-urlencoded') return { tipo, datos: Object.fromEntries(new URLSearchParams(texto)) };
  throw new ErrorHttp(415, 'Formato no admitido.');
}

// ---------- Rutas ----------
async function crearCita(req, res, ip) {
  const { tipo, datos } = await leerCuerpo(req);
  const desdeFormularioSimple = tipo !== 'application/json';
  const responder = (estado, cuerpo, titulo, html) =>
    desdeFormularioSimple ? pagina(res, estado, titulo, html) : json(res, estado, cuerpo);

  if (recientes(envios, ip, 3600_000).length >= LIMITE_CITAS_HORA) {
    const msg = 'Has enviado varias solicitudes seguidas. Espera un rato o llámanos para agendar.';
    return responder(429, { error: msg }, 'Demasiadas solicitudes', `<p>${esc(msg)}</p>`);
  }
  const { errores, datos: limpio } = validar(datos);
  if (Object.keys(errores).length) {
    if (desdeFormularioSimple) return paginaFormulario(res, datos, errores);
    return json(res, 400, { error: 'Revisa los campos marcados.', errores });
  }
  if (recientes(enviosTotal, 'todos', 3600_000).length >= LIMITE_CITAS_HORA_TOTAL) {
    const msg = 'Estamos recibiendo muchas solicitudes en este momento. Inténtalo en un rato o llámanos para agendar.';
    return responder(429, { error: msg }, 'Demasiadas solicitudes', `<p>${esc(msg)}</p>`);
  }
  anotar(envios, ip);
  const exito = { ok: true, mensaje: 'Recibimos tu solicitud. Te contactaremos para confirmar tu cita.' };
  // Campo trampa que los usuarios no ven: si viene lleno es un robot. Parece éxito pero no se guarda.
  if (String(datos.sitio_web ?? '').trim() !== '') {
    return responder(200, exito, 'Solicitud recibida', `<p>${esc(exito.mensaje)}</p>`);
  }
  if (citas.filter((c) => c.estado === 'pendiente').length >= MAX_PENDIENTES) {
    const msg = 'Ahora mismo no podemos recibir más solicitudes por la web. Por favor llámanos.';
    return responder(503, { error: msg }, 'No pudimos recibir tu solicitud', `<p>${esc(msg)}</p>`);
  }
  const cita = { id: crypto.randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...limpio };
  citas.push(cita);
  try { guardar(); anotar(enviosTotal, 'todos'); }
  catch (e) {
    citas.pop();
    console.error('No se pudo guardar la cita:', e);
    const msg = 'No pudimos guardar tu solicitud. Inténtalo de nuevo en unos minutos o llámanos.';
    return responder(500, { error: msg }, 'No pudimos guardar tu solicitud', `<p>${esc(msg)}</p>`);
  }
  return responder(201, exito, 'Solicitud recibida', `<p>${esc(exito.mensaje)}</p>`);
}

async function login(req, res, ip) {
  if (recientes(fallos, ip, 60_000).length >= 5) {
    return json(res, 429, { error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' }, { 'Retry-After': '60' });
  }
  const { datos } = await leerCuerpo(req);
  if (typeof datos.clave !== 'string' || !crypto.timingSafeEqual(hash(datos.clave), hash(CLAVE))) {
    anotar(fallos, ip);
    return json(res, 401, { error: 'Contraseña incorrecta.' });
  }
  fallos.delete(ip);
  const token = crypto.randomBytes(24).toString('base64url');
  sesiones.set(token, Date.now() + 8 * 3600_000);
  json(res, 200, { ok: true }, { 'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${8 * 3600}` });
}

async function admin(req, res, url, ip) {
  if (url.pathname === '/api/admin/login' && req.method === 'POST') return login(req, res, ip);
  if (!haySesion(req)) return json(res, 401, { error: 'Inicia sesión.' });
  if (url.pathname === '/api/admin/salir' && req.method === 'POST') {
    sesiones.delete(cookies(req).sesion);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (url.pathname === '/api/admin/citas' && req.method === 'GET') {
    // Las citas se guardan de la más vieja a la más nueva; se leen desde el final, por páginas.
    const filtro = url.searchParams.get('estado') || 'todas';
    if (filtro !== 'todas' && !ESTADOS.includes(filtro)) return json(res, 400, { error: 'Filtro no válido.' });
    const conteos = { todas: citas.length, pendiente: 0, confirmada: 0, cancelada: 0 };
    for (const c of citas) conteos[c.estado]++;
    let desde = citas.length - 1;
    const antes = url.searchParams.get('antes');
    if (antes) {
      const k = citas.findLastIndex((c) => c.id === antes);
      if (k < 0) return json(res, 409, { error: 'La lista cambió. Recárgala.' });
      desde = k - 1;
    }
    const pagina = [];
    let hayMas = false;
    for (let i = desde; i >= 0; i--) {
      if (filtro !== 'todas' && citas[i].estado !== filtro) continue;
      if (pagina.length === POR_PAGINA) { hayMas = true; break; }
      pagina.push({ ...citas[i], tratamientoNombre: Object.hasOwn(TRATAMIENTOS, citas[i].tratamiento) ? TRATAMIENTOS[citas[i].tratamiento].nombre : citas[i].tratamiento });
    }
    return json(res, 200, { citas: pagina, hayMas, conteos });
  }
  if (url.pathname === '/api/admin/citas/eliminar' && req.method === 'POST') {
    const { datos } = await leerCuerpo(req);
    const filtro = datos.estado;
    if (filtro !== 'todas' && !ESTADOS.includes(filtro)) return json(res, 400, { error: 'Filtro no válido.' });
    const antes = citas.slice();
    const quedan = citas.filter((c) => filtro !== 'todas' && c.estado !== filtro);
    citas.length = 0; citas.push(...quedan);
    try { guardar(); } catch (e) { citas.length = 0; citas.push(...antes); console.error(e); return json(res, 500, { error: 'No se pudo eliminar.' }); }
    return json(res, 200, { ok: true, eliminadas: antes.length - quedan.length });
  }
  const m = /^\/api\/admin\/citas\/([\w-]+)$/.exec(url.pathname);
  if (m) {
    const i = citas.findIndex((c) => c.id === m[1]);
    if (i < 0) return json(res, 404, { error: 'Esa solicitud ya no existe.' });
    if (req.method === 'PATCH') {
      const { datos } = await leerCuerpo(req);
      if (!ESTADOS.includes(datos.estado)) return json(res, 400, { error: 'Estado no válido.' });
      const antes = citas[i].estado;
      citas[i].estado = datos.estado;
      try { guardar(); } catch (e) { citas[i].estado = antes; console.error(e); return json(res, 500, { error: 'No se pudo guardar el cambio.' }); }
      return json(res, 200, { ok: true, estado: datos.estado });
    }
    if (req.method === 'DELETE') {
      const [quitada] = citas.splice(i, 1);
      try { guardar(); } catch (e) { citas.splice(i, 0, quitada); console.error(e); return json(res, 500, { error: 'No se pudo eliminar.' }); }
      return json(res, 200, { ok: true });
    }
  }
  return json(res, 404, { error: 'No encontrado.' });
}

function estatico(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new ErrorHttp(405, 'Método no permitido.');
  let ruta;
  try { ruta = decodeURIComponent(url.pathname); } catch { throw new ErrorHttp(400, 'Dirección no válida.'); }
  if (ruta === '/') ruta = '/index.html';
  if (ruta === '/admin') ruta = '/admin.html';
  const archivo = path.join(PUBLICO, path.normalize(ruta));
  if (!archivo.startsWith(PUBLICO + path.sep) || !TIPOS[path.extname(archivo)]) throw new ErrorHttp(404, 'No encontrado.');
  let datos;
  try { datos = fs.readFileSync(archivo); } catch { throw new ErrorHttp(404, 'No encontrado.'); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)], 'Cache-Control': 'no-cache', ...CABECERAS });
  res.end(req.method === 'HEAD' ? undefined : datos);
}

const servidor = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress;
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/citas' && req.method === 'POST') return await crearCita(req, res, ip);
    if (url.pathname.startsWith('/api/admin/')) return await admin(req, res, url, ip);
    if (url.pathname.startsWith('/api/')) throw new ErrorHttp(404, 'No encontrado.');
    estatico(req, res, url);
  } catch (e) {
    const estado = e instanceof ErrorHttp ? e.estado : 500;
    if (!(e instanceof ErrorHttp)) console.error(e);
    if (res.headersSent) return res.end();
    json(res, estado, { error: e instanceof ErrorHttp ? e.message : 'Error del servidor.' });
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Fisio Andares en http://localhost:${PUERTO}`);
  console.log(`Página de la dueña: http://localhost:${PUERTO}/admin`);
  console.log(`Contraseña: ${process.env.ADMIN_PASSWORD ? '(la de ' + origenClave + ')' : CLAVE + '   (guardada en ' + origenClave + ')'}`);
});
