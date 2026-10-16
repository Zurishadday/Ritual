// Servidor de Fisio Andares: sin dependencias. Arranque: node servidor.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
const DIR_DATOS = path.join(RAIZ, 'datos');
const ARCHIVO_CITAS = path.join(DIR_DATOS, 'citas.jsonl');
const ARCHIVO_CLAVE = path.join(DIR_DATOS, 'clave-admin.txt');
const PUERTO = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const TRATAMIENTOS = ['rodilla', 'espalda', 'masaje'];
const HORAS = [];
for (let h = 9; h <= 17; h++) for (const m of ['00', '30']) if (!(h === 17 && m === '30')) HORAS.push(`${String(h).padStart(2, '0')}:${m}`);
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];

fs.mkdirSync(DIR_DATOS, { recursive: true });

// ---------- Contraseña de la dueña ----------
function obtenerClave() {
  if (process.env.ADMIN_PASSWORD) return { clave: process.env.ADMIN_PASSWORD, origen: 'variable ADMIN_PASSWORD' };
  try {
    const c = fs.readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
    if (c) return { clave: c, origen: 'archivo datos/clave-admin.txt' };
  } catch {}
  const c = crypto.randomBytes(9).toString('base64url');
  fs.writeFileSync(ARCHIVO_CLAVE, c + '\n');
  return { clave: c, origen: 'archivo datos/clave-admin.txt (recién creada)' };
}
const { clave: CLAVE, origen: ORIGEN_CLAVE } = obtenerClave();
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();
const claveCorrecta = (s) => crypto.timingSafeEqual(hash(s), hash(CLAVE));

// ---------- Límites por IP ----------
const limitadores = new Map(); // "tipo:ip" -> [marcas de tiempo]
function excedido(tipo, ip, max, ventanaMs, registrar) {
  const k = `${tipo}:${ip}`;
  const ahora = Date.now();
  const marcas = (limitadores.get(k) || []).filter((t) => ahora - t < ventanaMs);
  if (marcas.length >= max) { limitadores.set(k, marcas); return true; }
  if (registrar) marcas.push(ahora);
  limitadores.set(k, marcas);
  if (limitadores.size > 5000) for (const [kk, v] of limitadores) if (!v.length || ahora - v[v.length - 1] > 3600e3) limitadores.delete(kk);
  return false;
}

// ---------- Sesiones ----------
const sesiones = new Map(); // token -> expira
const DURACION_SESION = 8 * 3600e3;
function sesionValida(req) {
  const m = /(?:^|;\s*)sid=([\w-]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const exp = sesiones.get(m[1]);
  if (!exp) return false;
  if (exp < Date.now()) { sesiones.delete(m[1]); return false; }
  return true;
}

// ---------- Almacén (una cita por línea; una línea dañada no afecta a las demás) ----------
function leerLineas() {
  let texto = '';
  try { texto = fs.readFileSync(ARCHIVO_CITAS, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  return texto.split('\n').filter((l) => l.trim()).map((raw) => {
    try {
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' && obj.id ? { raw, obj } : { raw, obj: null };
    } catch { return { raw, obj: null }; }
  });
}
function reescribir(lineas) {
  const tmp = ARCHIVO_CITAS + '.tmp';
  fs.writeFileSync(tmp, lineas.map((l) => (l.obj ? JSON.stringify(l.obj) : l.raw) + '\n').join(''));
  fs.renameSync(tmp, ARCHIVO_CITAS);
}
function agregarCita(cita) {
  // El "\n" inicial evita pegarse a una última línea truncada.
  fs.appendFileSync(ARCHIVO_CITAS, '\n' + JSON.stringify(cita) + '\n');
}

// ---------- Validación ----------
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function validar(b) {
  const e = {};
  const s = (v) => (typeof v === 'string' ? v.trim() : '');
  const nombre = s(b.nombre), telefono = s(b.telefono), correo = s(b.correo);
  const tratamiento = s(b.tratamiento), fecha = s(b.fecha), hora = s(b.hora), comentario = s(b.comentario);
  if (nombre.length < 2 || nombre.length > 80) e.nombre = 'Escribe tu nombre (2 a 80 letras).';
  const digitos = telefono.replace(/\D/g, '');
  if (!/^[\d\s+()-]+$/.test(telefono) || digitos.length < 8 || digitos.length > 15) e.telefono = 'Escribe un teléfono válido, por ejemplo 55 1234 5678.';
  if (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (!TRATAMIENTOS.includes(tratamiento)) e.tratamiento = 'Elige un tratamiento.';
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const d = f ? new Date(+f[1], +f[2] - 1, +f[3]) : null;
  if (!d || d.getMonth() !== +f[2] - 1 || d.getDate() !== +f[3]) e.fecha = 'Elige una fecha.';
  else if (fecha < hoyLocal()) e.fecha = 'Elige una fecha de hoy en adelante.';
  else if (d.getDay() === 0 || d.getDay() === 6) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
  if (!HORAS.includes(hora)) e.hora = 'Elige una hora entre las 9:00 y las 17:00.';
  if (comentario.length > 500) e.comentario = 'El comentario puede tener hasta 500 caracteres.';
  return { e, datos: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---------- Utilidades HTTP ----------
const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'",
};
function enviar(res, codigo, tipo, cuerpo, extra = {}) {
  // En 413 se cierra la conexión: no se sigue leyendo un cuerpo que ya se rechazó.
  res.writeHead(codigo, { 'Content-Type': tipo, ...CABECERAS, ...(codigo === 413 ? { Connection: 'close' } : {}), ...extra });
  res.end(cuerpo);
}
const json = (res, codigo, obj, extra) => enviar(res, codigo, 'application/json; charset=utf-8', JSON.stringify(obj), { 'Cache-Control': 'no-store', ...extra });
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function leerCuerpo(req, max = 8192) {
  return new Promise((resolver, rechazar) => {
    let n = 0; const trozos = [];
    req.on('data', (t) => {
      n += t.length;
      if (n > max) { if (n - t.length <= max) rechazar(Object.assign(new Error('grande'), { codigo: 413 })); return; }
      trozos.push(t);
    });
    req.on('end', () => resolver(Buffer.concat(trozos).toString('utf8')));
    req.on('error', rechazar);
  });
}
async function leerDatos(req) {
  const texto = await leerCuerpo(req);
  const tipo = req.headers['content-type'] || '';
  if (tipo.startsWith('application/json')) {
    try { const o = JSON.parse(texto); return o && typeof o === 'object' ? o : {}; } catch { throw Object.assign(new Error('json'), { codigo: 400 }); }
  }
  if (tipo.startsWith('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(texto));
  throw Object.assign(new Error('tipo'), { codigo: 415 });
}

function paginaHtml(titulo, mensaje, lista) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/estilos.css"></head><body><main class="pagina-simple"><h1>${esc(titulo)}</h1><p>${esc(mensaje)}</p>${lista ? `<ul>${lista.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}<p><a class="boton" href="/#cita">Volver al formulario</a></p></main></body></html>`;
}

// ---------- Rutas de la API ----------
async function crearCita(req, res, ip) {
  const quiereJson = (req.headers.accept || '').includes('application/json');
  const responder = (codigo, obj, htmlTitulo, htmlMsg, lista) => quiereJson
    ? json(res, codigo, obj)
    : enviar(res, codigo, 'text/html; charset=utf-8', paginaHtml(htmlTitulo, htmlMsg, lista));

  if (excedido('cita', ip, 5, 10 * 60e3, false)) {
    return responder(429, { error: 'Enviaste varias solicitudes seguidas. Espera unos minutos o llámanos.' }, 'Demasiadas solicitudes', 'Espera unos minutos o llámanos por teléfono.');
  }
  let b;
  try { b = await leerDatos(req); } catch (err) {
    return responder(err.codigo || 400, { error: 'No pudimos leer el formulario.' }, 'Formulario no válido', 'No pudimos leer el formulario.');
  }
  // Campo trampa: las personas no lo ven; los bots lo llenan. Se finge éxito y no se guarda.
  if (typeof b.sitio_web === 'string' && b.sitio_web.trim()) {
    return quiereJson ? json(res, 201, { ok: true }) : enviar(res, 303, 'text/plain', '', { Location: '/gracias.html' });
  }
  const { e, datos } = validar(b);
  if (Object.keys(e).length) {
    return responder(422, { errores: e }, 'Revisa tus datos', 'Corrige lo siguiente y vuelve a enviar:', Object.values(e));
  }
  excedido('cita', ip, 5, 10 * 60e3, true);
  const cita = { id: crypto.randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...datos };
  try { agregarCita(cita); } catch (err) {
    console.error('No se pudo guardar la cita:', err);
    return responder(500, { error: 'No pudimos guardar tu solicitud. Por favor llámanos por teléfono.' }, 'No se guardó', 'No pudimos guardar tu solicitud. Por favor llámanos por teléfono.');
  }
  return quiereJson ? json(res, 201, { ok: true }) : enviar(res, 303, 'text/plain', '', { Location: '/gracias.html' });
}

async function entrar(req, res, ip) {
  if (excedido('login', ip, 5, 60e3, false)) {
    return json(res, 429, { error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' }, { 'Retry-After': '60' });
  }
  let b;
  try { b = await leerDatos(req); } catch (err) { return json(res, err.codigo || 400, { error: 'Solicitud no válida.' }); }
  if (typeof b.clave !== 'string' || !claveCorrecta(b.clave)) {
    excedido('login', ip, 5, 60e3, true);
    return json(res, 401, { error: 'Contraseña incorrecta.' });
  }
  const token = crypto.randomBytes(24).toString('base64url');
  sesiones.set(token, Date.now() + DURACION_SESION);
  return json(res, 200, { ok: true }, { 'Set-Cookie': `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DURACION_SESION / 1000}` });
}

async function admin(req, res, url) {
  if (!sesionValida(req)) return json(res, 401, { error: 'Inicia sesión.' });
  const idCita = /^\/api\/admin\/citas\/([\w-]+)$/.exec(url.pathname);
  try {
    if (url.pathname === '/api/admin/citas' && req.method === 'GET') {
      const lineas = leerLineas();
      const citas = lineas.filter((l) => l.obj).map((l) => l.obj).sort((a, b) => (a.creada < b.creada ? 1 : -1));
      return json(res, 200, { citas, danadas: lineas.filter((l) => !l.obj).length });
    }
    if (url.pathname === '/api/admin/salir' && req.method === 'POST') {
      const m = /sid=([\w-]+)/.exec(req.headers.cookie || ''); if (m) sesiones.delete(m[1]);
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    if (idCita && (req.method === 'PATCH' || req.method === 'DELETE')) {
      // Cambios solo con JSON: un formulario de otro sitio no puede enviarlo.
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Tipo no válido.' });
      const lineas = leerLineas();
      const l = lineas.find((x) => x.obj && x.obj.id === idCita[1]);
      if (!l) return json(res, 404, { error: 'No encontramos esa solicitud.' });
      if (req.method === 'PATCH') {
        const b = await leerDatos(req);
        if (!ESTADOS.includes(b.estado)) return json(res, 422, { error: 'Estado no válido.' });
        l.obj.estado = b.estado;
      } else lineas.splice(lineas.indexOf(l), 1);
      reescribir(lineas);
      return json(res, 200, { ok: true, estado: l.obj.estado });
    }
  } catch (err) {
    console.error(err);
    return json(res, err.codigo || 500, { error: 'No pudimos completar la acción.' });
  }
  return json(res, 404, { error: 'No existe.' });
}

// ---------- Archivos estáticos ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
function estatico(req, res, url) {
  let ruta;
  try { ruta = decodeURIComponent(url.pathname); } catch { return enviar(res, 400, 'text/plain', 'Solicitud no válida'); }
  if (ruta.includes('\0')) return enviar(res, 400, 'text/plain', 'Solicitud no válida');
  if (ruta === '/') ruta = '/index.html';
  const archivo = path.join(PUBLICO, ruta);
  if (!archivo.startsWith(PUBLICO + path.sep)) return enviar(res, 403, 'text/plain', 'Prohibido');
  fs.readFile(archivo, (err, datos) => {
    if (err) return enviar(res, 404, 'text/html; charset=utf-8', paginaHtml('Página no encontrada', 'Esa página no existe.'));
    const ext = path.extname(archivo);
    enviar(res, 200, TIPOS[ext] || 'application/octet-stream', req.method === 'HEAD' ? '' : datos, { 'Cache-Control': ext === '.svg' ? 'public, max-age=86400' : 'no-cache' });
  });
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const ip = req.socket.remoteAddress || '?';
    if (url.pathname === '/api/citas' && req.method === 'POST') return await crearCita(req, res, ip);
    if (url.pathname === '/api/admin/entrar' && req.method === 'POST') return await entrar(req, res, ip);
    if (url.pathname.startsWith('/api/admin/')) return await admin(req, res, url);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'No existe.' });
    if (req.method === 'GET' || req.method === 'HEAD') return estatico(req, res, url);
    return enviar(res, 405, 'text/plain', 'Método no permitido');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) enviar(res, 500, 'text/plain', 'Error del servidor');
  }
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Fisio Andares en  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`);
  console.log(`Panel de la dueña: /admin.html   (contraseña desde ${ORIGEN_CLAVE})`);
  if (ORIGEN_CLAVE.includes('recién')) console.log(`Contraseña: ${CLAVE}`);
});
