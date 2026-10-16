// Servidor de Fisio Andares. Sin dependencias: solo módulos de Node.
// Uso: node servidor.mjs   (PORT, ADMIN_PASSWORD y DATOS_DIR son opcionales)
import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
const DATOS = process.env.DATOS_DIR || path.join(RAIZ, 'datos');
const ARCHIVO_CITAS = path.join(DATOS, 'citas.json');
const ARCHIVO_CLAVE = path.join(DATOS, 'clave.txt');
const PUERTO = Number(process.env.PORT) || 3000;

const TRATAMIENTOS = ['rodilla', 'espalda', 'masaje'];
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];
const HORAS = [];
for (let h = 9; h <= 17; h++) {
  HORAS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 17) HORAS.push(`${String(h).padStart(2, '0')}:30`);
}

// ---------- Contraseña de la página de administración ----------
await mkdir(DATOS, { recursive: true });
let CLAVE = process.env.ADMIN_PASSWORD;
let origenClave = 'variable ADMIN_PASSWORD';
if (!CLAVE) {
  try {
    CLAVE = (await readFile(ARCHIVO_CLAVE, 'utf8')).trim();
  } catch {}
  if (!CLAVE) {
    CLAVE = randomBytes(9).toString('base64url');
    await writeFile(ARCHIVO_CLAVE, CLAVE + '\n', { mode: 0o600 });
  }
  origenClave = ARCHIVO_CLAVE;
}
const hash = (s) => createHash('sha256').update(String(s)).digest();
const claveCorrecta = (s) => timingSafeEqual(hash(s), hash(CLAVE));

// ---------- Sesiones y límites en memoria ----------
const sesiones = new Map(); // token -> expiración
const intentosFallidos = new Map(); // ip -> { n, hasta }
const solicitudesPorIp = new Map(); // ip -> [marcas de tiempo]
const HORA_MS = 3600 * 1000;

function sesionValida(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const exp = sesiones.get(m[1]);
  if (!exp) return false;
  if (exp < Date.now()) {
    sesiones.delete(m[1]);
    return false;
  }
  return true;
}

function permitirCita(ip) {
  const ahora = Date.now();
  const lista = (solicitudesPorIp.get(ip) || []).filter((t) => ahora - t < HORA_MS);
  if (lista.length >= 10) {
    solicitudesPorIp.set(ip, lista);
    return false;
  }
  lista.push(ahora);
  solicitudesPorIp.set(ip, lista);
  return true;
}

setInterval(() => {
  const ahora = Date.now();
  for (const [t, e] of sesiones) if (e < ahora) sesiones.delete(t);
  for (const [ip, v] of intentosFallidos) if (v.hasta < ahora) intentosFallidos.delete(ip);
  for (const [ip, l] of solicitudesPorIp) {
    const f = l.filter((t) => ahora - t < HORA_MS);
    if (f.length) solicitudesPorIp.set(ip, f);
    else solicitudesPorIp.delete(ip);
  }
}, 10 * 60 * 1000).unref();

// ---------- Almacenamiento (JSON, escrituras en serie y atómicas) ----------
let citas = [];
try {
  citas = JSON.parse(await readFile(ARCHIVO_CITAS, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
let cola = Promise.resolve();
function guardar() {
  cola = cola.then(async () => {
    const tmp = ARCHIVO_CITAS + '.tmp';
    await writeFile(tmp, JSON.stringify(citas, null, 2));
    await rename(tmp, ARCHIVO_CITAS);
  });
  return cola;
}

// ---------- Validación ----------
function fechaLocal(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const f = new Date(y, mo - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== mo - 1 || f.getDate() !== d) return null;
  return f;
}

function validarCita(b) {
  const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max + 1) : '');
  const nombre = texto(b.nombre, 100);
  const telefono = texto(b.telefono, 30);
  const correo = texto(b.correo, 120);
  const comentario = texto(b.comentario, 500);
  const { tratamiento, fecha, hora } = b;

  if (nombre.length < 2 || nombre.length > 100) return { error: 'Escribe tu nombre.' };
  if (telefono.replace(/\D/g, '').length < 8 || !/^[\d\s()+\-.]{8,30}$/.test(telefono))
    return { error: 'Escribe un teléfono válido.' };
  if (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    return { error: 'Escribe un correo válido.' };
  if (!TRATAMIENTOS.includes(tratamiento)) return { error: 'Elige un tratamiento.' };
  if (comentario.length > 500) return { error: 'El comentario es demasiado largo (máximo 500 caracteres).' };

  const f = fechaLocal(fecha);
  if (!f) return { error: 'Elige una fecha válida.' };
  const dia = f.getDay();
  if (dia === 0 || dia === 6) return { error: 'Atendemos de lunes a viernes.' };
  if (!HORAS.includes(hora)) return { error: 'Elige una hora entre las 9:00 y las 17:00.' };
  const [hh, mm] = hora.split(':').map(Number);
  if (new Date(f.getFullYear(), f.getMonth(), f.getDate(), hh, mm) <= new Date())
    return { error: 'Elige una fecha y hora futuras.' };

  return { valor: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---------- Utilidades HTTP ----------
const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'",
};

function responderJson(res, codigo, objeto) {
  res.writeHead(codigo, {
    ...CABECERAS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(objeto));
}

function leerJson(req, limite = 10 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const partes = [];
    req.on('data', (c) => {
      total += c.length;
      if (total > limite) {
        reject(Object.assign(new Error('grande'), { codigo: 413 }));
        req.destroy();
        return;
      }
      partes.push(c);
    });
    req.on('end', () => {
      try {
        const v = JSON.parse(Buffer.concat(partes).toString('utf8'));
        if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error();
        resolve(v);
      } catch {
        reject(Object.assign(new Error('json'), { codigo: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

async function servirEstatico(req, res, ruta) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...CABECERAS, Allow: 'GET, HEAD' });
    return res.end();
  }
  if (ruta === '/') ruta = '/index.html';
  if (ruta === '/admin') ruta = '/admin.html';
  let archivo;
  try {
    archivo = path.normalize(path.join(PUBLICO, decodeURIComponent(ruta)));
  } catch {
    archivo = null;
  }
  if (!archivo || archivo.includes('\0') || !archivo.startsWith(PUBLICO + path.sep)) {
    res.writeHead(404, CABECERAS);
    return res.end('No encontrado');
  }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, {
      ...CABECERAS,
      'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': path.extname(archivo) === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(req.method === 'HEAD' ? undefined : datos);
  } catch {
    res.writeHead(404, { ...CABECERAS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
}

// ---------- API ----------
async function api(req, res, ruta) {
  const ip = req.socket.remoteAddress || '?';

  if (ruta === '/api/login' && req.method === 'POST') {
    const bloqueo = intentosFallidos.get(ip);
    if (bloqueo && bloqueo.n >= 5 && bloqueo.hasta > Date.now())
      return responderJson(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    const b = await leerJson(req);
    if (typeof b.clave === 'string' && claveCorrecta(b.clave)) {
      intentosFallidos.delete(ip);
      const token = randomBytes(24).toString('base64url');
      sesiones.set(token, Date.now() + 8 * HORA_MS);
      return responderJson(res, 200, { token });
    }
    const v = intentosFallidos.get(ip);
    intentosFallidos.set(ip, { n: (v && v.hasta > Date.now() ? v.n : 0) + 1, hasta: Date.now() + 15 * 60 * 1000 });
    return responderJson(res, 401, { error: 'Contraseña incorrecta.' });
  }

  if (ruta === '/api/citas' && req.method === 'POST') {
    if (!permitirCita(ip))
      return responderJson(res, 429, { error: 'Demasiadas solicitudes. Inténtalo más tarde.' });
    const { error, valor } = validarCita(await leerJson(req));
    if (error) return responderJson(res, 400, { error });
    const cita = { id: randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...valor };
    citas.push(cita);
    await guardar();
    return responderJson(res, 201, { ok: true });
  }

  // Todo lo demás requiere sesión
  if (!sesionValida(req)) return responderJson(res, 401, { error: 'No autorizado.' });

  if (ruta === '/api/citas' && req.method === 'GET') {
    const lista = [...citas].sort((a, b) => (a.creada < b.creada ? 1 : -1));
    return responderJson(res, 200, lista);
  }

  const m = /^\/api\/citas\/([\w-]+)$/.exec(ruta);
  if (m && req.method === 'PATCH') {
    const b = await leerJson(req);
    if (!ESTADOS.includes(b.estado)) return responderJson(res, 400, { error: 'Estado no válido.' });
    const cita = citas.find((c) => c.id === m[1]);
    if (!cita) return responderJson(res, 404, { error: 'No existe esa solicitud.' });
    cita.estado = b.estado;
    await guardar();
    return responderJson(res, 200, cita);
  }

  return responderJson(res, 404, { error: 'No encontrado.' });
}

const servidor = http.createServer(async (req, res) => {
  try {
    const ruta = new URL(req.url, 'http://x').pathname;
    if (ruta.startsWith('/api/')) await api(req, res, ruta);
    else await servirEstatico(req, res, ruta);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e.codigo) return responderJson(res, e.codigo, { error: e.codigo === 413 ? 'Solicitud demasiado grande.' : 'Datos no válidos.' });
    console.error(e);
    responderJson(res, 500, { error: 'Error del servidor.' });
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Fisio Andares en http://localhost:${PUERTO}`);
  console.log(`Administración: http://localhost:${PUERTO}/admin`);
  console.log(`Contraseña (${origenClave}): ${process.env.ADMIN_PASSWORD ? '(la que definiste)' : CLAVE}`);
});
