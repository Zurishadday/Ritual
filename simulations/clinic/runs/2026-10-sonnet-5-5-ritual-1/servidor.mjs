// Fisio Andares — servidor sin dependencias. Uso: node servidor.mjs
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync, statSync } from 'node:fs';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const PRIVADO = path.join(RAIZ, 'privado');
const DATOS = process.env.DATOS_DIR || path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'citas.jsonl');
const PUERTO = Number(process.env.PORT) || 3000;
const TELEFONO = '555 123 4567'; // mismo que en publico/index.html

// Si cambias tratamientos, cámbialos también en publico/index.html (select y tarjetas).
const TRATAMIENTOS = {
  rodilla: 'Rehabilitación de rodilla',
  espalda: 'Dolor de espalda',
  masaje: 'Masaje deportivo',
};
const HORAS = [];
for (let m = 9 * 60; m <= 17 * 60; m += 30) {
  HORAS.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
}
const ESTADOS = ['pendiente', 'confirmada', 'cancelada', 'eliminada'];

// ---------- contraseña de la dueña ----------
mkdirSync(DATOS, { recursive: true });
const ARCHIVO_CLAVE = path.join(DATOS, 'clave.txt');
let CLAVE = process.env.ADMIN_PASSWORD;
let claveNueva = false;
if (!CLAVE) {
  if (existsSync(ARCHIVO_CLAVE)) CLAVE = readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
  if (!CLAVE) {
    CLAVE = randomBytes(9).toString('base64url');
    writeFileSync(ARCHIVO_CLAVE, CLAVE + '\n');
    claveNueva = true;
  }
}
const hash = (s) => createHash('sha256').update(String(s)).digest();
const claveCorrecta = (s) => timingSafeEqual(hash(s), hash(CLAVE));

// ---------- almacén: un registro JSON por línea ----------
// Una línea dañada se salta y se cuenta; nunca tumba las demás ni la siguiente solicitud.
const citas = new Map();
function cargar() {
  if (!existsSync(ARCHIVO)) return;
  const texto = readFileSync(ARCHIVO, 'utf8');
  let malas = 0;
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    try {
      const r = JSON.parse(linea);
      if (r.evento === 'estado') {
        const c = citas.get(r.id);
        if (c && ESTADOS.includes(r.estado)) c.estado = r.estado;
      } else if (r.id && r.creada) {
        citas.set(r.id, r);
      } else malas++;
    } catch {
      malas++;
    }
  }
  if (malas) console.warn(`AVISO: ${malas} línea(s) dañada(s) en ${ARCHIVO}; se ignoraron.`);
  // Si el último guardado quedó cortado, empezar en línea nueva.
  if (texto.length && !texto.endsWith('\n')) appendFileSync(ARCHIVO, '\n');
}
function guardar(obj) {
  appendFileSync(ARCHIVO, JSON.stringify(obj) + '\n');
}
cargar();

// ---------- límites ----------
const envios = new Map(); // ip -> {n, hasta}
const fallos = new Map(); // ip -> {n, hasta, bloqueadoHasta}
const sesiones = new Map(); // sid -> expira
const SESION_MS = 12 * 3600e3;

function pasaDeLimite(mapa, clave, max, ventanaMs) {
  const ahora = Date.now();
  let e = mapa.get(clave);
  if (!e || e.hasta <= ahora) {
    e = { n: 0, hasta: ahora + ventanaMs };
    mapa.set(clave, e);
  }
  e.n++;
  return e.n > max;
}
setInterval(() => {
  const ahora = Date.now();
  for (const m of [envios, fallos]) {
    for (const [k, e] of m) if (e.hasta <= ahora && !(e.bloqueadoHasta > ahora)) m.delete(k);
  }
  for (const [k, exp] of sesiones) if (exp <= ahora) sesiones.delete(k);
}, 600e3).unref();

// ---------- utilidades ----------
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
};
const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; form-action 'self'",
};
function enviar(res, estado, cuerpo, tipo = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(estado, { 'Content-Type': tipo, ...CABECERAS, ...extra });
  res.end(cuerpo);
}
const json = (res, estado, obj, extra = {}) =>
  enviar(res, estado, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store', ...extra });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function pagina(titulo, html) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/styles.css"></head><body class="simple"><main class="caja"><h1>${esc(titulo)}</h1>${html}</main></body></html>`;
}

async function leerCuerpo(req, max = 10_000) {
  let total = 0;
  const trozos = [];
  for await (const t of req) {
    total += t.length;
    if (total > max) throw Object.assign(new Error('grande'), { estado: 413 });
    trozos.push(t);
  }
  const texto = Buffer.concat(trozos).toString('utf8');
  const tipo = (req.headers['content-type'] || '').split(';')[0].trim();
  try {
    if (tipo === 'application/json') return { tipo, datos: JSON.parse(texto || '{}') };
    if (tipo === 'application/x-www-form-urlencoded') return { tipo, datos: Object.fromEntries(new URLSearchParams(texto)) };
  } catch {
    throw Object.assign(new Error('mal'), { estado: 400 });
  }
  throw Object.assign(new Error('tipo'), { estado: 415 });
}

function cookie(req, nombre) {
  for (const par of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = par.trim().split('=');
    if (k === nombre) return v.join('=');
  }
  return null;
}
function haySesion(req) {
  const sid = cookie(req, 'sid');
  const exp = sid && sesiones.get(sid);
  if (!exp) return false;
  if (exp <= Date.now()) { sesiones.delete(sid); return false; }
  return true;
}
const ipDe = (req) => req.socket.remoteAddress || '?';
const quiereJson = (req) => (req.headers.accept || '').includes('application/json');

// ---------- validación de la cita ----------
const limpiar = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function validar(d) {
  const e = {};
  const nombre = limpiar(d.nombre, 80);
  if (nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  const telefono = limpiar(d.telefono, 30);
  const digitos = telefono.replace(/\D/g, '');
  if (!/^[\d\s()+\-.]+$/.test(telefono) || digitos.length < 8 || digitos.length > 15)
    e.telefono = 'Escribe un teléfono válido, con al menos 8 dígitos.';
  const correo = limpiar(d.correo, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  const clave = limpiar(d.tratamiento, 20);
  if (!TRATAMIENTOS[clave]) e.tratamiento = 'Elige un tratamiento.';
  const dia = limpiar(d.dia, 10);
  const hora = limpiar(d.hora, 5);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!m) e.dia = 'Elige un día.';
  else {
    const [a, mes, dd] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const f = new Date(Date.UTC(a, mes - 1, dd));
    const dow = f.getUTCDay();
    if (f.getUTCMonth() !== mes - 1) e.dia = 'Ese día no existe.';
    else if (dow === 0 || dow === 6) e.dia = 'Atendemos de lunes a viernes. Elige otro día.';
    else if (dia < hoyLocal()) e.dia = 'Ese día ya pasó. Elige uno a partir de hoy.';
  }
  if (!HORAS.includes(hora)) e.hora = 'Elige una hora entre las 9:00 y las 17:00.';
  else if (!e.dia && dia === hoyLocal()) {
    const n = new Date();
    if (hora <= `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`)
      e.hora = 'Esa hora ya pasó. Elige una posterior o escoge otro día.';
  }
  const comentario = limpiar(d.comentario, 500);
  return {
    errores: e,
    cita: { nombre, telefono, correo, tratamiento: TRATAMIENTOS[clave] || '', dia, hora, comentario },
  };
}

// ---------- rutas ----------
async function api(req, res, url) {
  // Enviar solicitud de cita (pública)
  if (url.pathname === '/api/citas' && req.method === 'POST') {
    if (pasaDeLimite(envios, ipDe(req), 10, 10 * 60e3))
      return quiereJson(req)
        ? json(res, 429, { error: `Enviaste muchas solicitudes seguidas. Llámanos al ${TELEFONO}.` })
        : enviar(res, 429, pagina('Demasiadas solicitudes', `<p>Espera unos minutos o llámanos al <a href="tel:5551234567">${TELEFONO}</a>.</p>`));
    const { datos } = await leerCuerpo(req);
    // Campo trampa para bots: las personas no lo ven. Se responde "ok" sin guardar nada.
    if (limpiar(datos.sitio_web, 200)) {
      return quiereJson(req) ? json(res, 201, { ok: true }) : redirigir(res, '/gracias.html');
    }
    const { errores, cita } = validar(datos);
    if (Object.keys(errores).length) {
      if (quiereJson(req)) return json(res, 400, { errores });
      const lis = Object.values(errores).map((m) => `<li>${esc(m)}</li>`).join('');
      return enviar(res, 400, pagina('Revisa tu solicitud', `<ul>${lis}</ul><p><a class="boton" href="javascript:history.back()">Volver y corregir</a></p>`));
    }
    const registro = { id: randomUUID(), creada: new Date().toISOString(), ...cita, estado: 'pendiente' };
    try {
      guardar(registro);
    } catch (err) {
      console.error('No se pudo guardar la cita:', err);
      const msg = `No pudimos guardar tu solicitud. Por favor llámanos al ${TELEFONO}.`;
      return quiereJson(req) ? json(res, 500, { error: msg }) : enviar(res, 500, pagina('No se pudo guardar', `<p>${esc(msg)}</p>`));
    }
    citas.set(registro.id, registro);
    return quiereJson(req) ? json(res, 201, { ok: true }) : redirigir(res, '/gracias.html');
  }

  // Todo lo demás de /api/admin requiere sesión
  if (url.pathname.startsWith('/api/admin/')) {
    if (!haySesion(req)) return json(res, 401, { error: 'Sesión vencida' });

    if (url.pathname === '/api/admin/citas' && req.method === 'GET') {
      const lista = [...citas.values()]
        .filter((c) => c.estado !== 'eliminada')
        .sort((a, b) => (a.creada < b.creada ? 1 : a.creada > b.creada ? -1 : 0));
      return json(res, 200, { citas: lista });
    }
    const m = /^\/api\/admin\/citas\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (m && req.method === 'PATCH') {
      const { tipo, datos } = await leerCuerpo(req);
      if (tipo !== 'application/json') return json(res, 415, { error: 'Solo JSON' });
      const c = citas.get(m[1]);
      if (!c || c.estado === 'eliminada') return json(res, 404, { error: 'No existe esa solicitud' });
      if (!ESTADOS.includes(datos.estado)) return json(res, 400, { error: 'Estado no válido' });
      try {
        guardar({ evento: 'estado', id: c.id, estado: datos.estado, en: new Date().toISOString() });
      } catch (err) {
        console.error('No se pudo guardar el cambio:', err);
        return json(res, 500, { error: 'No se pudo guardar el cambio. Intenta de nuevo.' });
      }
      c.estado = datos.estado;
      return json(res, 200, { ok: true, cita: c });
    }
  }
  return json(res, 404, { error: 'No encontrado' });
}

function redirigir(res, destino, extra = {}) {
  res.writeHead(303, { Location: destino, ...CABECERAS, ...extra });
  res.end();
}

async function paginaPrivada(archivo, res, estado = 200, mensaje = '') {
  const t = (await readFile(path.join(PRIVADO, archivo), 'utf8')).replace('<!--MENSAJE-->', mensaje);
  enviar(res, estado, t, TIPOS[path.extname(archivo)], { 'Cache-Control': 'no-store' });
}

async function admin(req, res, url) {
  if (url.pathname === '/admin' && req.method === 'GET') {
    if (haySesion(req)) return paginaPrivada('admin.html', res);
    return paginaPrivada('login.html', res);
  }
  if (url.pathname === '/admin.js' && req.method === 'GET') {
    if (!haySesion(req)) return enviar(res, 401, 'No autorizado', 'text/plain; charset=utf-8');
    return paginaPrivada('admin.js', res);
  }
  if (url.pathname === '/admin/login' && req.method === 'POST') {
    const ip = ipDe(req);
    const f = fallos.get(ip);
    const ahora = Date.now();
    if (f && f.bloqueadoHasta > ahora) {
      const min = Math.ceil((f.bloqueadoHasta - ahora) / 60e3);
      return paginaPrivada('login.html', res, 429, `<p class="error" role="alert">Demasiados intentos. Espera ${min} minuto(s) e inténtalo de nuevo.</p>`);
    }
    const { datos } = await leerCuerpo(req);
    if (claveCorrecta(datos.clave ?? '')) {
      fallos.delete(ip);
      const sid = randomBytes(24).toString('base64url');
      sesiones.set(sid, ahora + SESION_MS);
      return redirigir(res, '/admin', { 'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESION_MS / 1000}` });
    }
    const e = fallos.get(ip) && fallos.get(ip).hasta > ahora ? fallos.get(ip) : { n: 0, hasta: ahora + 10 * 60e3 };
    e.n++;
    if (e.n >= 5) e.bloqueadoHasta = ahora + 5 * 60e3; // 5 fallos → 5 minutos de espera
    fallos.set(ip, e);
    console.warn(`Intento de acceso fallido desde ${ip} (${e.n})`);
    const msg = e.n >= 5 ? 'Demasiados intentos. Espera 5 minutos e inténtalo de nuevo.' : 'Contraseña incorrecta.';
    return paginaPrivada('login.html', res, e.n >= 5 ? 429 : 401, `<p class="error" role="alert">${msg}</p>`);
  }
  if (url.pathname === '/admin/salir' && req.method === 'POST') {
    const sid = cookie(req, 'sid');
    if (sid) sesiones.delete(sid);
    return redirigir(res, '/admin', { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  return enviar(res, 405, pagina('No permitido', '<p>Método no permitido.</p>'));
}

async function estatico(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD')
    return enviar(res, 405, 'Método no permitido', 'text/plain; charset=utf-8');
  let ruta;
  try { ruta = decodeURIComponent(url.pathname); } catch { ruta = '/'; }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.normalize(path.join(PUBLICO, ruta));
  if (!archivo.startsWith(PUBLICO + path.sep)) return enviar(res, 403, 'Prohibido', 'text/plain; charset=utf-8');
  try {
    if (!statSync(archivo).isFile()) throw new Error();
    const cuerpo = await readFile(archivo);
    return enviar(res, 200, req.method === 'HEAD' ? '' : cuerpo, TIPOS[path.extname(archivo)] || 'application/octet-stream', {
      'Cache-Control': 'public, max-age=300',
    });
  } catch {
    return enviar(res, 404, pagina('Página no encontrada', '<p><a href="/">Volver al inicio</a></p>'));
  }
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/') || url.pathname === '/admin.js') return await admin(req, res, url);
    return await estatico(req, res, url);
  } catch (err) {
    const estado = err.estado || 500;
    if (estado === 500) console.error(err);
    if (res.headersSent) return res.end();
    const msg = estado === 413 ? 'El mensaje es demasiado largo.' : estado === 500 ? 'Error del servidor.' : 'Solicitud no válida.';
    return (req.url || '').startsWith('/api/')
      ? json(res, estado, { error: msg })
      : enviar(res, estado, pagina('Error', `<p>${msg}</p>`));
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Fisio Andares en http://localhost:${PUERTO}`);
  console.log(`Panel de la dueña:   http://localhost:${PUERTO}/admin`);
  if (claveNueva) console.log(`Contraseña generada (guardada en datos/clave.txt): ${CLAVE}`);
  else console.log(process.env.ADMIN_PASSWORD ? 'Contraseña: la de ADMIN_PASSWORD' : 'Contraseña: la de datos/clave.txt');
});
