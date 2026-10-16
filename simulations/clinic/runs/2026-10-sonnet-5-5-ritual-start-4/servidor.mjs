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
const MAX_PENDIENTES = 500;

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
    return datos;
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
  fs.writeFileSync(tmp, JSON.stringify(citas, null, 2));
  fs.renameSync(tmp, ARCHIVO);
}

// ---------- Límites por IP ----------
const envios = new Map();
const fallos = new Map();
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
  const nombre = String(d.nombre ?? '').trim();
  const telefono = String(d.telefono ?? '').trim();
  const correo = String(d.correo ?? '').trim();
  const tratamiento = String(d.tratamiento ?? '');
  const fecha = String(d.fecha ?? '');
  const hora = String(d.hora ?? '');
  const comentario = String(d.comentario ?? '').trim();

  if (nombre.length < 2 || nombre.length > 80) e.nombre = 'Escribe tu nombre (entre 2 y 80 letras).';
  if (!/^[\d\s+()\-.]{8,20}$/.test(telefono) || telefono.replace(/\D/g, '').length < 8) e.telefono = 'Escribe un teléfono válido, con al menos 8 números.';
  if (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  const trat = TRATAMIENTOS[tratamiento];
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

  if (comentario.length > 500) e.comentario = 'El comentario puede tener hasta 500 caracteres.';
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
    const lista = Object.values(errores).map((m) => `<li>${esc(m)}</li>`).join('');
    return responder(400, { error: 'Revisa los campos marcados.', errores }, 'Revisa tu solicitud', `<p>Hay algo por corregir:</p><ul>${lista}</ul>`);
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
  try { guardar(); }
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
  if (!crypto.timingSafeEqual(hash(datos.clave ?? ''), hash(CLAVE))) {
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
    const lista = [...citas].sort((a, b) => (a.creada < b.creada ? 1 : -1));
    return json(res, 200, { citas: lista.map((c) => ({ ...c, tratamientoNombre: TRATAMIENTOS[c.tratamiento]?.nombre ?? c.tratamiento })) });
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
