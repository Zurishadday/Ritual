// Servidor de Fisio Andares. Sin dependencias: node servidor.mjs
import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DIR_DATOS = path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DIR_DATOS, 'solicitudes.json');

const PUERTO = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const CLAVE_DEFAULT = 'fisio2026';
const CLAVE_ADMIN = process.env.ADMIN_PASSWORD || CLAVE_DEFAULT;

const TRATAMIENTOS = {
  rodilla: 'Rehabilitación de rodilla',
  espalda: 'Dolor de espalda',
  masaje: 'Masaje deportivo',
};
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

// ---------- almacenamiento ----------
let solicitudes = [];
let cola = Promise.resolve();

async function cargar() {
  try {
    solicitudes = JSON.parse(await readFile(ARCHIVO, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    solicitudes = [];
  }
}

function guardar() {
  // Escrituras en serie y atómicas (archivo temporal + rename).
  cola = cola.then(async () => {
    await mkdir(DIR_DATOS, { recursive: true });
    const tmp = ARCHIVO + '.tmp';
    await writeFile(tmp, JSON.stringify(solicitudes, null, 2));
    await rename(tmp, ARCHIVO);
  });
  return cola;
}

// ---------- utilidades ----------
function responder(res, codigo, obj) {
  const cuerpo = JSON.stringify(obj);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(cuerpo);
}

async function leerJSON(req, limite = 10_000) {
  let total = 0;
  const trozos = [];
  for await (const t of req) {
    total += t.length;
    if (total > limite) throw Object.assign(new Error('Cuerpo demasiado grande'), { codigo: 413 });
    trozos.push(t);
  }
  try {
    const v = JSON.parse(Buffer.concat(trozos).toString('utf8'));
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw 0;
    return v;
  } catch {
    throw Object.assign(new Error('JSON inválido'), { codigo: 400 });
  }
}

const intentos = new Map(); // clave -> [timestamps]
function limitado(clave, max, ventanaMs) {
  const ahora = Date.now();
  const lista = (intentos.get(clave) || []).filter((t) => ahora - t < ventanaMs);
  lista.push(ahora);
  intentos.set(clave, lista);
  return lista.length > max;
}
setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of intentos) if (v.every((t) => ahora - t > 3_600_000)) intentos.delete(k);
  for (const [k, exp] of sesiones) if (exp < ahora) sesiones.delete(k);
}, 600_000).unref();

const hash = (s) => createHash('sha256').update(String(s)).digest();
function claveCorrecta(c) {
  return timingSafeEqual(hash(c), hash(CLAVE_ADMIN));
}

const sesiones = new Map(); // token -> expira
function autorizado(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const exp = sesiones.get(m[1]);
  if (!exp || exp < Date.now()) {
    sesiones.delete(m[1]);
    return false;
  }
  return true;
}

// ---------- validación de la cita ----------
function validarCita(d) {
  const texto = (v) => (typeof v === 'string' ? v.trim() : '');
  const nombre = texto(d.nombre);
  const telefono = texto(d.telefono);
  const correo = texto(d.correo);
  const tratamiento = texto(d.tratamiento);
  const fecha = texto(d.fecha);
  const hora = texto(d.hora);
  const comentario = texto(d.comentario);

  if (nombre.length < 2 || nombre.length > 100) return { error: 'Escribe tu nombre.' };
  const digitos = telefono.replace(/\D/g, '');
  if (!/^[\d\s()+\-.]+$/.test(telefono) || digitos.length < 8 || digitos.length > 15)
    return { error: 'Escribe un teléfono válido.' };
  if (correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    return { error: 'Escribe un correo válido.' };
  if (!Object.hasOwn(TRATAMIENTOS, tratamiento)) return { error: 'Elige un tratamiento.' };

  const mf = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!mf) return { error: 'Elige un día.' };
  const f = new Date(Date.UTC(+mf[1], +mf[2] - 1, +mf[3]));
  if (f.getUTCFullYear() !== +mf[1] || f.getUTCMonth() !== +mf[2] - 1 || f.getUTCDate() !== +mf[3])
    return { error: 'Día no válido.' };
  const dow = f.getUTCDay();
  if (dow === 0 || dow === 6) return { error: 'Atendemos de lunes a viernes.' };
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  if (fecha < hoyStr) return { error: 'Elige un día que no haya pasado.' };

  const mh = /^(\d{2}):(\d{2})$/.exec(hora);
  const mins = mh ? +mh[1] * 60 + +mh[2] : -1;
  // Última cita a las 17:00 para terminar antes de las 18:00.
  if (!mh || +mh[2] % 30 !== 0 || mins < 9 * 60 || mins > 17 * 60)
    return { error: 'Elige una hora entre las 9:00 y las 17:00.' };

  if (comentario.length > 500) return { error: 'El comentario es demasiado largo (máx. 500).' };

  return { valor: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---------- API ----------
async function api(req, res, url) {
  const { pathname } = url;
  const ip = req.socket.remoteAddress || '?';

  if (pathname === '/api/citas' && req.method === 'POST') {
    if (limitado('cita:' + ip, 10, 3_600_000)) return responder(res, 429, { error: 'Demasiadas solicitudes. Intenta más tarde.' });
    const { valor, error } = validarCita(await leerJSON(req));
    if (error) return responder(res, 400, { error });
    const registro = {
      id: randomUUID(),
      creada: new Date().toISOString(),
      estado: 'pendiente',
      ...valor,
    };
    solicitudes.push(registro);
    await guardar();
    return responder(res, 201, { ok: true });
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    if (limitado('login:' + ip, 10, 900_000)) return responder(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    const d = await leerJSON(req);
    if (typeof d.clave !== 'string' || !claveCorrecta(d.clave)) return responder(res, 401, { error: 'Contraseña incorrecta.' });
    const token = randomBytes(32).toString('hex');
    sesiones.set(token, Date.now() + 8 * 3_600_000);
    return responder(res, 200, { token });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!autorizado(req)) return responder(res, 401, { error: 'No autorizado.' });

    if (pathname === '/api/admin/citas' && req.method === 'GET') {
      const lista = [...solicitudes].sort((a, b) => b.creada.localeCompare(a.creada));
      return responder(res, 200, { citas: lista, tratamientos: TRATAMIENTOS });
    }

    const m = /^\/api\/admin\/citas\/([\w-]+)$/.exec(pathname);
    if (m && req.method === 'PATCH') {
      const d = await leerJSON(req);
      if (!ESTADOS.includes(d.estado)) return responder(res, 400, { error: 'Estado no válido.' });
      const cita = solicitudes.find((c) => c.id === m[1]);
      if (!cita) return responder(res, 404, { error: 'No existe esa solicitud.' });
      cita.estado = d.estado;
      await guardar();
      return responder(res, 200, cita);
    }
  }

  return responder(res, 404, { error: 'No encontrado.' });
}

// ---------- archivos estáticos ----------
async function estatico(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let ruta;
  try {
    ruta = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  if (ruta === '/') ruta = '/index.html';
  if (ruta === '/admin') ruta = '/admin.html';
  const archivo = path.normalize(path.join(PUBLICO, ruta));
  if (!archivo.startsWith(PUBLICO + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(req.method === 'HEAD' ? undefined : datos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página no encontrada');
  }
}

const servidor = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
  );
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else await estatico(req, res, url);
  } catch (e) {
    if (!res.headersSent) responder(res, e.codigo || 500, { error: e.codigo ? e.message : 'Error del servidor.' });
    if (!e.codigo) console.error(e);
  }
});

await cargar();
servidor.listen(PUERTO, HOST, () => {
  console.log(`Fisio Andares en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`);
  console.log(`Panel de administración: /admin`);
  if (CLAVE_ADMIN === CLAVE_DEFAULT)
    console.log(`AVISO: usando la contraseña por defecto "${CLAVE_DEFAULT}". Cámbiala con la variable ADMIN_PASSWORD.`);
});
