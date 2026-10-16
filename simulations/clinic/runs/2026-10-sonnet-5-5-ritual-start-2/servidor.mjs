// Servidor de Fisio Andares. Sin dependencias: node servidor.mjs
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readFile, appendFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';

const PUERTO = Number(process.env.PORT) || 3000;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(DIR, 'public');
const DATOS = process.env.DATOS_DIR || path.join(DIR, 'datos');
const ARCHIVO = path.join(DATOS, 'citas.jsonl');
const ARCHIVO_CLAVE = path.join(DATOS, 'clave.txt');

const MAX_CITAS = 5000;          // tope: si se llena, se pide llamar por teléfono
const MAX_CUERPO = 10 * 1024;
const SESION_MS = 8 * 60 * 60 * 1000;

const TRATAMIENTOS = {
  rodilla: 'Rehabilitación de rodilla',
  espalda: 'Dolor de espalda',
  masaje: 'Masaje deportivo',
};
const HORAS = [];
for (let h = 9; h <= 17; h++) for (const m of ['00', '30']) {
  if (h === 17 && m === '30') continue;
  HORAS.push(`${String(h).padStart(2, '0')}:${m}`);
}
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];

// ---------- Almacén: archivo de eventos, una línea JSON por evento ----------
// Una línea dañada solo se salta; las demás siguen funcionando.
const citas = new Map();
let lineasDanadas = 0;

function aplicar(ev) {
  if (ev.t === 'cita' && typeof ev.id === 'string') citas.set(ev.id, { ...ev.cita, id: ev.id });
  else if (ev.t === 'estado' && citas.has(ev.id) && ESTADOS.includes(ev.estado)) citas.get(ev.id).estado = ev.estado;
  else throw new Error('evento no válido');
}

await mkdir(DATOS, { recursive: true });
if (existsSync(ARCHIVO)) {
  const texto = readFileSync(ARCHIVO, 'utf8');
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    try { aplicar(JSON.parse(linea)); } catch { lineasDanadas++; }
  }
  if (texto && !texto.endsWith('\n')) await appendFile(ARCHIVO, '\n'); // cierra una última línea cortada
  if (lineasDanadas) console.warn(`AVISO: ${lineasDanadas} línea(s) dañada(s) en ${ARCHIVO} se ignoraron.`);
}

async function guardar(ev) {
  await appendFile(ARCHIVO, JSON.stringify(ev) + '\n'); // si falla, lanza y no se cambia la memoria
  aplicar(ev);
}

// ---------- Contraseña del administrador ----------
let clave = process.env.ADMIN_PASSWORD;
let origenClave = 'variable ADMIN_PASSWORD';
if (!clave) {
  origenClave = ARCHIVO_CLAVE;
  if (existsSync(ARCHIVO_CLAVE)) clave = readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
  if (!clave) {
    clave = crypto.randomBytes(9).toString('base64url');
    await writeFile(ARCHIVO_CLAVE, clave + '\n');
  }
}
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();
const claveHash = hash(clave);
const claveCorrecta = (s) => crypto.timingSafeEqual(hash(s), claveHash);

// ---------- Límites por IP y sesiones ----------
const intentos = new Map(); // clave -> [marcas de tiempo]
function limitar(nombre, ip, max, ventanaMs, { soloContar = false } = {}) {
  const k = nombre + '|' + ip;
  const ahora = Date.now();
  const lista = (intentos.get(k) || []).filter((t) => ahora - t < ventanaMs);
  if (lista.length >= max) { intentos.set(k, lista); return Math.ceil((lista[0] + ventanaMs - ahora) / 1000); }
  if (!soloContar) lista.push(ahora);
  intentos.set(k, lista);
  return 0;
}
const anotarFallo = (nombre, ip, ventanaMs) => {
  const k = nombre + '|' + ip;
  const l = (intentos.get(k) || []).filter((t) => Date.now() - t < ventanaMs);
  l.push(Date.now());
  intentos.set(k, l);
};
const sesiones = new Map();
setInterval(() => {
  const ahora = Date.now();
  for (const [k, l] of intentos) if (!l.some((t) => ahora - t < 15 * 60 * 1000)) intentos.delete(k);
  for (const [k, exp] of sesiones) if (exp < ahora) sesiones.delete(k);
}, 60 * 1000).unref();

function sesionValida(req) {
  const m = /(?:^|;\s*)sesion=([\w-]+)/.exec(req.headers.cookie || '');
  const exp = m && sesiones.get(m[1]);
  return Boolean(exp && exp > Date.now());
}

// ---------- Utilidades HTTP ----------
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

function responder(res, estado, cuerpo, tipo, extra = {}) {
  res.writeHead(estado, { 'Content-Type': tipo, ...CABECERAS, ...extra });
  res.end(cuerpo);
}
const json = (res, estado, obj, extra = {}) =>
  responder(res, estado, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store', ...extra });

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function leerCuerpo(req) {
  let total = 0;
  const trozos = [];
  for await (const t of req) {
    total += t.length;
    if (total > MAX_CUERPO) { const e = new Error('grande'); e.codigo = 413; throw e; }
    trozos.push(t);
  }
  const texto = Buffer.concat(trozos).toString('utf8');
  if ((req.headers['content-type'] || '').includes('application/json')) {
    try { return JSON.parse(texto) || {}; } catch { const e = new Error('json'); e.codigo = 400; throw e; }
  }
  return Object.fromEntries(new URLSearchParams(texto));
}

const ip = (req) => req.socket.remoteAddress || 'desconocida';
const quiereJson = (req) => (req.headers.accept || '').includes('application/json');

// ---------- Validación de la solicitud de cita ----------
const dosDigitos = (n) => String(n).padStart(2, '0');
function fechaLocal(d) { return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`; }

function validarCita(d) {
  const limpio = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const c = {
    nombre: limpio(d.nombre, 100), telefono: limpio(d.telefono, 25), correo: limpio(d.correo, 120),
    tratamiento: limpio(d.tratamiento, 20), fecha: limpio(d.fecha, 10), hora: limpio(d.hora, 5),
    comentario: String(d.comentario ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, 500),
  };
  const e = {};
  if (c.nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  if (!/^[\d\s()+.-]+$/.test(c.telefono) || c.telefono.replace(/\D/g, '').length < 7 || c.telefono.replace(/\D/g, '').length > 15)
    e.telefono = 'Escribe un teléfono válido, solo números (ej. 55 1234 5678).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.correo)) e.correo = 'Escribe un correo válido (ej. nombre@correo.com).';
  if (!TRATAMIENTOS[c.tratamiento]) e.tratamiento = 'Elige un tratamiento.';
  if (!HORAS.includes(c.hora)) e.hora = 'Elige una hora entre 9:00 y 17:00.';

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.fecha);
  const dia = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!dia || dia.getUTCMonth() !== +m[2] - 1) e.fecha = 'Elige un día.';
  else {
    const hoy = new Date();
    const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    const limite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 90);
    if (c.fecha < fechaLocal(manana)) e.fecha = 'Elige un día a partir de mañana. Para hoy, llámanos.';
    else if (c.fecha > fechaLocal(limite)) e.fecha = 'Solo agendamos con hasta 90 días de anticipación.';
    else if ([0, 6].includes(dia.getUTCDay())) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
  }
  return { c, e };
}

// ---------- Rutas ----------
async function crearCita(req, res) {
  const sitioJson = quiereJson(req);
  const fallar = (estado, mensaje, errores = {}, extra = {}) => sitioJson
    ? json(res, estado, { ok: false, mensaje, errores }, extra)
    : responder(res, estado, paginaMensaje('No pudimos guardar tu solicitud', mensaje, errores), TIPOS['.html'], extra);

  // Solo cuentan los envíos válidos (y los de la trampa): equivocarse al llenar no bloquea a nadie.
  const espera = limitar('cita', ip(req), 5, 10 * 60 * 1000, { soloContar: true });
  if (espera) return fallar(429, 'Hiciste muchas solicitudes seguidas. Espera unos minutos o llámanos por teléfono.', {}, { 'Retry-After': espera });

  let datos;
  try { datos = await leerCuerpo(req); } catch (err) { return fallar(err.codigo || 400, 'No pudimos leer el formulario.'); }

  if (datos.sitio_web) { // trampa para bots: se aparenta éxito y no se guarda nada
    anotarFallo('cita', ip(req), 10 * 60 * 1000);
    return sitioJson ? json(res, 200, { ok: true, resumen: {} }) : redirigir(res, '/gracias.html');
  }
  const { c, e } = validarCita(datos);
  if (Object.keys(e).length) return fallar(422, 'Revisa los campos marcados.', e);
  if (citas.size >= MAX_CITAS) return fallar(503, 'Ahora mismo no podemos recibir solicitudes en línea. Llámanos por teléfono.');

  anotarFallo('cita', ip(req), 10 * 60 * 1000);
  const id = crypto.randomBytes(6).toString('hex');
  try {
    await guardar({ t: 'cita', id, cita: { ...c, creada: new Date().toISOString(), estado: 'pendiente' } });
  } catch (err) {
    console.error('No se pudo guardar la cita:', err);
    return fallar(500, 'No pudimos guardar tu solicitud. Inténtalo de nuevo o llámanos por teléfono.');
  }
  if (sitioJson) return json(res, 200, { ok: true, resumen: { tratamiento: TRATAMIENTOS[c.tratamiento], fecha: c.fecha, hora: c.hora } });
  redirigir(res, '/gracias.html');
}

const redirigir = (res, destino) => { res.writeHead(303, { Location: destino, ...CABECERAS }); res.end(); };

function paginaMensaje(titulo, mensaje, errores) {
  const lista = Object.values(errores).map((m) => `<li>${esc(m)}</li>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/estilos.css"></head>
<body><main class="pagina-mensaje"><h1>${esc(titulo)}</h1><p>${esc(mensaje)}</p>${lista ? `<ul>${lista}</ul>` : ''}
<p><a class="boton" href="/#cita">Volver al formulario</a></p></main></body></html>`;
}

async function login(req, res) {
  const espera = limitar('login', ip(req), 5, 60 * 1000, { soloContar: true });
  if (espera) return json(res, 429, { ok: false, mensaje: `Demasiados intentos. Espera ${espera} segundos.` }, { 'Retry-After': espera });
  let datos;
  try { datos = await leerCuerpo(req); } catch (err) { return json(res, err.codigo || 400, { ok: false, mensaje: 'Solicitud no válida.' }); }
  if (!claveCorrecta(datos.clave ?? '')) {
    anotarFallo('login', ip(req), 60 * 1000);
    return json(res, 401, { ok: false, mensaje: 'Contraseña incorrecta.' });
  }
  const token = crypto.randomBytes(24).toString('base64url');
  sesiones.set(token, Date.now() + SESION_MS);
  json(res, 200, { ok: true }, { 'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESION_MS / 1000}` });
}

async function admin(req, res, ruta) {
  if (ruta === '/api/admin/login' && req.method === 'POST') return login(req, res);
  if (!sesionValida(req)) return json(res, 401, { ok: false, mensaje: 'Inicia sesión.' });

  if (ruta === '/api/admin/citas' && req.method === 'GET') {
    const lista = [...citas.values()].sort((a, b) => b.creada.localeCompare(a.creada));
    return json(res, 200, { ok: true, citas: lista.map((c) => ({ ...c, tratamientoNombre: TRATAMIENTOS[c.tratamiento] || c.tratamiento })), lineasDanadas });
  }
  if (ruta === '/api/admin/estado' && req.method === 'POST') {
    let d;
    try { d = await leerCuerpo(req); } catch (err) { return json(res, err.codigo || 400, { ok: false, mensaje: 'Solicitud no válida.' }); }
    if (!citas.has(d.id) || !ESTADOS.includes(d.estado)) return json(res, 400, { ok: false, mensaje: 'Solicitud no válida.' });
    try { await guardar({ t: 'estado', id: d.id, estado: d.estado }); }
    catch (err) { console.error(err); return json(res, 500, { ok: false, mensaje: 'No se pudo guardar el cambio.' }); }
    return json(res, 200, { ok: true, estado: d.estado });
  }
  if (ruta === '/api/admin/salir' && req.method === 'POST') {
    const m = /sesion=([\w-]+)/.exec(req.headers.cookie || '');
    if (m) sesiones.delete(m[1]);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  json(res, 404, { ok: false, mensaje: 'No existe.' });
}

async function estatico(req, res, ruta) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Método no permitido', 'text/plain; charset=utf-8');
  if (ruta === '/') ruta = '/index.html';
  const archivo = path.join(PUBLICO, path.normalize(ruta));
  if (!archivo.startsWith(PUBLICO + path.sep)) return responder(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
  try {
    const datos = await readFile(archivo);
    const tipo = TIPOS[path.extname(archivo)] || 'application/octet-stream';
    responder(res, 200, req.method === 'HEAD' ? null : datos, tipo, { 'Cache-Control': 'no-cache' });
  } catch {
    responder(res, 404, paginaMensaje('Página no encontrada', 'Esa página no existe.', {}), TIPOS['.html']);
  }
}

const servidor = http.createServer(async (req, res) => {
  try {
    let ruta;
    try { ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch { return responder(res, 400, 'Solicitud no válida', 'text/plain; charset=utf-8'); }
    if (ruta === '/api/citas' && req.method === 'POST') return await crearCita(req, res);
    if (ruta.startsWith('/api/admin/')) return await admin(req, res, ruta);
    if (ruta.startsWith('/api/')) return json(res, 404, { ok: false, mensaje: 'No existe.' });
    await estatico(req, res, ruta);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) responder(res, 500, 'Error del servidor', 'text/plain; charset=utf-8');
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Fisio Andares en http://localhost:${PUERTO}`);
  console.log(`Panel de la fisioterapeuta: http://localhost:${PUERTO}/admin.html`);
  console.log(`Contraseña (${origenClave}): ${clave}`);
  console.log(`Solicitudes guardadas en: ${ARCHIVO} (${citas.size} cargadas)`);
});
