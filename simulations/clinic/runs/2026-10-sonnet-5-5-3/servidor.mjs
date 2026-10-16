// Servidor de Fisio Andares. Sin dependencias: solo Node 18+.
// Uso: node servidor.mjs   (variables opcionales: PORT, HOST, ADMIN_PASSWORD)
import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DATOS = path.join(RAIZ, 'datos');
const ARCHIVO_SOLICITUDES = path.join(DATOS, 'solicitudes.json');
const ARCHIVO_CLAVE = path.join(DATOS, 'clave-admin.txt');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const TRATAMIENTOS = {
  rodilla: 'Rehabilitación de rodilla',
  espalda: 'Dolor de espalda',
  masaje: 'Masaje deportivo',
};
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];
// Lunes a viernes, de 9 a 18. Última cita a las 17:00 (las sesiones duran hasta 60 min).
const HORAS = [];
for (let h = 9; h <= 17; h++) for (const m of ['00', '30']) {
  if (h === 17 && m === '30') continue;
  HORAS.push(`${String(h).padStart(2, '0')}:${m}`);
}
const MAX_SOLICITUDES = 5000;

await mkdir(DATOS, { recursive: true });

// ---------- Contraseña de la administradora ----------
async function obtenerClave() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    return (await readFile(ARCHIVO_CLAVE, 'utf8')).trim();
  } catch {
    const nueva = randomBytes(9).toString('base64url');
    await writeFile(ARCHIVO_CLAVE, nueva + '\n', { mode: 0o600 });
    return nueva;
  }
}
const CLAVE = await obtenerClave();
const hash = (s) => createHash('sha256').update(s).digest();
const claveCorrecta = (s) => timingSafeEqual(hash(String(s)), hash(CLAVE));

// ---------- Sesiones y límites de uso (en memoria) ----------
const sesiones = new Map(); // token -> expiración (ms)
const DURACION_SESION = 8 * 60 * 60 * 1000;
const intentos = new Map(); // clave "tipo:ip" -> { n, hasta }

function limitado(tipo, ip, max, ventanaMs, consumir) {
  const k = `${tipo}:${ip}`;
  const ahora = Date.now();
  let r = intentos.get(k);
  if (!r || r.hasta < ahora) r = { n: 0, hasta: ahora + ventanaMs };
  if (r.n >= max) { intentos.set(k, r); return true; }
  if (consumir) r.n++;
  intentos.set(k, r);
  return false;
}
setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of sesiones) if (v < ahora) sesiones.delete(k);
  for (const [k, v] of intentos) if (v.hasta < ahora) intentos.delete(k);
}, 10 * 60 * 1000).unref();

function leerCookie(req, nombre) {
  for (const parte of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return v.join('=');
  }
  return null;
}
function autenticada(req) {
  const t = leerCookie(req, 'sesion');
  const exp = t && sesiones.get(t);
  return Boolean(exp && exp > Date.now());
}

// ---------- Almacenamiento (JSON, escritura atómica y en serie) ----------
let solicitudes = [];
try { solicitudes = JSON.parse(await readFile(ARCHIVO_SOLICITUDES, 'utf8')); } catch { /* primera vez */ }

let colaEscritura = Promise.resolve();
function guardar() {
  colaEscritura = colaEscritura.then(async () => {
    const tmp = ARCHIVO_SOLICITUDES + '.tmp';
    await writeFile(tmp, JSON.stringify(solicitudes, null, 2));
    await rename(tmp, ARCHIVO_SOLICITUDES);
  });
  return colaEscritura;
}

// ---------- Utilidades HTTP ----------
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon',
};
const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
};

function responder(res, estado, cuerpo, tipo = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(estado, { 'Content-Type': tipo, ...CABECERAS, ...extra });
  res.end(cuerpo);
}
const json = (res, estado, obj, extra) =>
  responder(res, estado, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store', ...extra });

async function leerJson(req, max = 10_000) {
  let tam = 0; const trozos = [];
  for await (const t of req) {
    tam += t.length;
    if (tam > max) throw Object.assign(new Error('Solicitud demasiado grande'), { estado: 413 });
    trozos.push(t);
  }
  try { return JSON.parse(Buffer.concat(trozos).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON inválido'), { estado: 400 }); }
}

function mismoOrigen(req) {
  const o = req.headers.origin;
  return !o || new URL(o).host === req.headers.host;
}

// ---------- Validación de la solicitud de cita ----------
function fechaLocalHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function validarCita(b) {
  const errores = {};
  const texto = (v) => (typeof v === 'string' ? v.trim() : '');
  const nombre = texto(b.nombre), telefono = texto(b.telefono), correo = texto(b.correo);
  const comentario = texto(b.comentario), fecha = texto(b.fecha), hora = texto(b.hora);

  if (nombre.length < 2 || nombre.length > 100) errores.nombre = 'Escribe tu nombre.';
  if (!/^[\d\s()+\-.]{7,20}$/.test(telefono) || (telefono.match(/\d/g) || []).length < 7)
    errores.telefono = 'Escribe un teléfono válido.';
  if (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.correo = 'Escribe un correo válido.';
  if (!Object.hasOwn(TRATAMIENTOS, b.tratamiento)) errores.tratamiento = 'Elige un tratamiento.';
  if (comentario.length > 500) errores.comentario = 'Máximo 500 caracteres.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
    errores.fecha = 'Elige un día.';
  } else {
    const dia = new Date(fecha + 'T00:00:00Z').getUTCDay();
    if (dia === 0 || dia === 6) errores.fecha = 'Atendemos de lunes a viernes.';
    else if (fecha < fechaLocalHoy()) errores.fecha = 'Elige un día que no haya pasado.';
  }
  if (!HORAS.includes(hora)) errores.hora = 'Elige una hora entre 9:00 y 17:00.';

  return { errores, datos: { nombre, telefono, correo, tratamiento: b.tratamiento, fecha, hora, comentario } };
}

// ---------- Rutas de la API ----------
async function api(req, res, ruta) {
  const ip = req.socket.remoteAddress || '?';

  if (req.method === 'POST' && ruta !== '/api/salir' && !mismoOrigen(req))
    return json(res, 403, { error: 'Origen no permitido' });

  // Pública: pedir cita
  if (req.method === 'POST' && ruta === '/api/citas') {
    if (limitado('cita', ip, 10, 60 * 60 * 1000, true))
      return json(res, 429, { error: 'Demasiadas solicitudes. Inténtalo más tarde o llámanos.' });
    const b = await leerJson(req);
    if (typeof b.web === 'string' && b.web) return json(res, 201, { ok: true }); // trampa para bots
    const { errores, datos } = validarCita(b);
    if (Object.keys(errores).length) return json(res, 400, { error: 'Revisa los datos.', errores });
    if (solicitudes.length >= MAX_SOLICITUDES) return json(res, 503, { error: 'No podemos recibir más solicitudes ahora. Llámanos.' });
    solicitudes.push({ id: randomUUID(), ...datos, estado: 'pendiente', creada: new Date().toISOString() });
    await guardar();
    return json(res, 201, { ok: true });
  }

  if (req.method === 'POST' && ruta === '/api/entrar') {
    if (limitado('login', ip, 5, 15 * 60 * 1000, false))
      return json(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' });
    const b = await leerJson(req);
    if (typeof b.clave !== 'string' || !claveCorrecta(b.clave)) {
      limitado('login', ip, 5, 15 * 60 * 1000, true);
      return json(res, 401, { error: 'Contraseña incorrecta.' });
    }
    const token = randomBytes(32).toString('base64url');
    sesiones.set(token, Date.now() + DURACION_SESION);
    return json(res, 200, { ok: true }, {
      'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DURACION_SESION / 1000}`,
    });
  }

  if (req.method === 'POST' && ruta === '/api/salir') {
    const t = leerCookie(req, 'sesion');
    if (t) sesiones.delete(t);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  // Protegidas
  if (!autenticada(req)) return json(res, 401, { error: 'No autorizada' });

  if (req.method === 'GET' && ruta === '/api/solicitudes') {
    const lista = [...solicitudes].sort((a, b) => b.creada.localeCompare(a.creada));
    return json(res, 200, { solicitudes: lista, tratamientos: TRATAMIENTOS });
  }

  const m = ruta.match(/^\/api\/solicitudes\/([\w-]+)$/);
  if (req.method === 'POST' && m) {
    const b = await leerJson(req);
    if (!ESTADOS.includes(b.estado)) return json(res, 400, { error: 'Estado inválido' });
    const s = solicitudes.find((x) => x.id === m[1]);
    if (!s) return json(res, 404, { error: 'No existe esa solicitud' });
    s.estado = b.estado;
    await guardar();
    return json(res, 200, { ok: true, solicitud: s });
  }

  return json(res, 404, { error: 'No encontrado' });
}

// ---------- Archivos estáticos ----------
async function estatico(req, res, ruta) {
  if (ruta === '/') ruta = '/index.html';
  else if (ruta === '/admin') ruta = '/admin.html';
  const archivo = path.normalize(path.join(PUBLICO, ruta));
  if (!archivo.startsWith(PUBLICO + path.sep)) return responder(res, 403, 'Prohibido');
  try {
    const datos = await readFile(archivo);
    const extra = ruta === '/admin.html' ? { 'Cache-Control': 'no-store' } : { 'Cache-Control': 'public, max-age=300' };
    responder(res, 200, req.method === 'HEAD' ? '' : datos, TIPOS[path.extname(archivo)] || 'application/octet-stream', extra);
  } catch {
    responder(res, 404, 'Página no encontrada');
  }
}

const servidor = http.createServer(async (req, res) => {
  try {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta.startsWith('/api/')) return await api(req, res, ruta);
    if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Método no permitido');
    await estatico(req, res, ruta);
  } catch (e) {
    const estado = e.estado || 500;
    if (estado === 500) console.error(e);
    if (!res.headersSent) json(res, estado, { error: estado === 500 ? 'Error del servidor' : e.message });
  }
});

servidor.listen(PORT, HOST, () => {
  console.log(`Fisio Andares en  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Panel de citas    http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/admin`);
  console.log(process.env.ADMIN_PASSWORD
    ? 'Contraseña: la de ADMIN_PASSWORD'
    : `Contraseña: ${CLAVE}   (guardada en datos/clave-admin.txt)`);
});
