// Servidor de Fisio Andares. Sin dependencias: node servidor.mjs
import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(RAIZ, 'publico');
const ARCHIVO = join(RAIZ, 'datos', 'solicitudes.json');
const PUERTO = Number(process.env.PORT) || 3000;

// Contraseña de la página de administración: variable ADMIN_PASSWORD, o una aleatoria que se imprime al arrancar.
const CLAVE = process.env.ADMIN_PASSWORD || randomBytes(6).toString('hex');
const CLAVE_GENERADA = !process.env.ADMIN_PASSWORD;

// Duración en minutos (debe coincidir con lo que se muestra en la página).
const TRATAMIENTOS = { rodilla: 60, espalda: 45, masaje: 30 };
const APERTURA = 9 * 60, CIERRE = 18 * 60;

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon',
};

// ---------- Almacenamiento (escrituras en serie, atómicas) ----------
let solicitudes = [];
try { solicitudes = JSON.parse(await readFile(ARCHIVO, 'utf8')); } catch { /* primer arranque */ }
let cola = Promise.resolve();
function guardar() {
  cola = cola.then(async () => {
    await mkdir(dirname(ARCHIVO), { recursive: true });
    const tmp = ARCHIVO + '.tmp';
    await writeFile(tmp, JSON.stringify(solicitudes, null, 2));
    await rename(tmp, ARCHIVO);
  });
  return cola;
}

// ---------- Sesiones y límite de intentos ----------
const sesiones = new Map(); // token -> expira
const SESION_MS = 8 * 3600 * 1000;
const intentos = new Map(); // ip -> { n, hasta }
const hash = s => createHash('sha256').update(s).digest();
const claveOk = s => timingSafeEqual(hash(String(s)), hash(CLAVE));

function sesionValida(req) {
  const m = /(?:^|;\s*)sesion=([a-f0-9]+)/.exec(req.headers.cookie || '');
  const exp = m && sesiones.get(m[1]);
  if (!exp) return false;
  if (exp < Date.now()) { sesiones.delete(m[1]); return false; }
  return true;
}

// ---------- Utilidades ----------
function responder(res, codigo, datos, extra = {}) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(cuerpo);
}

async function leerJson(req) {
  let tam = 0; const trozos = [];
  for await (const t of req) {
    tam += t.length;
    if (tam > 10_000) throw Object.assign(new Error('grande'), { codigo: 413 });
    trozos.push(t);
  }
  try { return JSON.parse(Buffer.concat(trozos).toString('utf8')); }
  catch { throw Object.assign(new Error('json'), { codigo: 400 }); }
}

function validar(d) {
  const e = {};
  const txt = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const nombre = txt(d.nombre, 100), telefono = txt(d.telefono, 30), correo = txt(d.correo, 120);
  const comentario = txt(d.comentario, 500);
  if (nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  if (!/^[\d\s()+\-.]{7,20}$/.test(telefono) || telefono.replace(/\D/g, '').length < 7) e.telefono = 'Escribe un teléfono válido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) e.correo = 'Escribe un correo válido.';
  if (!(d.tratamiento in TRATAMIENTOS)) e.tratamiento = 'Elige un tratamiento.';

  const fecha = typeof d.fecha === 'string' ? d.fecha : '', hora = typeof d.hora === 'string' ? d.hora : '';
  const mf = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const f = mf && new Date(Date.UTC(+mf[1], +mf[2] - 1, +mf[3]));
  if (!f || f.toISOString().slice(0, 10) !== fecha) e.fecha = 'Elige una fecha.';
  else if (f.getUTCDay() === 0 || f.getUTCDay() === 6) e.fecha = 'Atendemos de lunes a viernes.';
  else if (fecha < new Date(Date.now() - 86400000).toISOString().slice(0, 10)) e.fecha = 'Elige una fecha futura.';

  const mh = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!mh) e.hora = 'Elige una hora.';
  else if (d.tratamiento in TRATAMIENTOS) {
    const ini = +mh[1] * 60 + +mh[2];
    if (ini < APERTURA || ini + TRATAMIENTOS[d.tratamiento] > CIERRE) e.hora = 'La sesión debe terminar antes de las 18:00.';
  }
  return { e, v: { nombre, telefono, correo, tratamiento: d.tratamiento, fecha, hora, comentario } };
}

// ---------- Rutas API ----------
async function api(req, res, ruta) {
  const ip = req.socket.remoteAddress;

  if (ruta === '/api/solicitudes' && req.method === 'POST') {
    const { e, v } = validar(await leerJson(req));
    if (Object.keys(e).length) return responder(res, 400, { errores: e });
    if (solicitudes.length >= 5000) return responder(res, 503, { error: 'Servicio saturado.' });
    solicitudes.push({ id: randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...v });
    await guardar();
    return responder(res, 201, { ok: true });
  }

  if (ruta === '/api/admin/login' && req.method === 'POST') {
    const r = intentos.get(ip) || { n: 0, hasta: 0 };
    if (r.hasta > Date.now()) return responder(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    const d = await leerJson(req);
    if (!claveOk(d.clave ?? '')) {
      r.n++; if (r.n >= 5) { r.n = 0; r.hasta = Date.now() + 5 * 60_000; }
      intentos.set(ip, r);
      return responder(res, 401, { error: 'Contraseña incorrecta.' });
    }
    intentos.delete(ip);
    const token = randomBytes(24).toString('hex');
    sesiones.set(token, Date.now() + SESION_MS);
    return responder(res, 200, { ok: true },
      { 'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESION_MS / 1000}` });
  }

  if (ruta === '/api/admin/logout' && req.method === 'POST') {
    const m = /sesion=([a-f0-9]+)/.exec(req.headers.cookie || '');
    if (m) sesiones.delete(m[1]);
    return responder(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (ruta.startsWith('/api/admin/')) {
    if (!sesionValida(req)) return responder(res, 401, { error: 'No autorizado.' });

    if (ruta === '/api/admin/solicitudes' && req.method === 'GET') {
      const orden = [...solicitudes].sort((a, b) => b.creada.localeCompare(a.creada));
      return responder(res, 200, orden);
    }
    const m = /^\/api\/admin\/solicitudes\/([\w-]+)$/.exec(ruta);
    if (m && req.method === 'PATCH') {
      const { estado } = await leerJson(req);
      if (!['pendiente', 'confirmada', 'cancelada'].includes(estado)) return responder(res, 400, { error: 'Estado inválido.' });
      const s = solicitudes.find(x => x.id === m[1]);
      if (!s) return responder(res, 404, { error: 'No existe.' });
      s.estado = estado;
      await guardar();
      return responder(res, 200, s);
    }
  }
  responder(res, 404, { error: 'No encontrado.' });
}

// ---------- Archivos estáticos ----------
async function estatico(res, ruta) {
  if (ruta === '/') ruta = '/index.html';
  if (ruta === '/admin') ruta = '/admin.html';
  const archivo = normalize(join(PUBLICO, decodeURIComponent(ruta)));
  if (!archivo.startsWith(PUBLICO + '\\') && !archivo.startsWith(PUBLICO + '/')) { res.writeHead(403); return res.end('Prohibido'); }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(datos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
}

createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'");
  try {
    const ruta = new URL(req.url, 'http://x').pathname;
    if (ruta.startsWith('/api/')) await api(req, res, ruta);
    else if (req.method === 'GET' || req.method === 'HEAD') await estatico(res, ruta);
    else { res.writeHead(405); res.end(); }
  } catch (err) {
    if (res.headersSent) return res.end();
    if (err.codigo) return responder(res, err.codigo, { error: 'Solicitud inválida.' });
    console.error(err);
    responder(res, 500, { error: 'Error del servidor.' });
  }
}).listen(PUERTO, () => {
  console.log(`Fisio Andares en http://localhost:${PUERTO}`);
  console.log(`Administración: http://localhost:${PUERTO}/admin`);
  if (CLAVE_GENERADA) console.log(`Contraseña (aleatoria, cambia en cada arranque): ${CLAVE}\n  Para fijar una: ADMIN_PASSWORD=tuclave node servidor.mjs`);
});
