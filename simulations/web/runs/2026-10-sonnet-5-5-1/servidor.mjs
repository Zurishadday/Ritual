// Servidor de Taller Rueda Libre. Sin dependencias: solo módulos de Node.
// Uso: node servidor.mjs
// Variables opcionales: PORT (3000), HOST (127.0.0.1), ADMIN_PASSWORD.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const DIR_PUBLICO = path.join(RAIZ, 'publico');
const DIR_DATOS = path.join(RAIZ, 'datos');
const ARCHIVO_MENSAJES = path.join(DIR_DATOS, 'mensajes.json');
const ARCHIVO_ADMIN = path.join(RAIZ, 'admin.html');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const MAX_CUERPO = 10 * 1024;
const MAX_MENSAJES = 5000;

const passwordGenerada = !process.env.ADMIN_PASSWORD;
const PASSWORD = process.env.ADMIN_PASSWORD || randomBytes(9).toString('base64url');
const hash = (s) => createHash('sha256').update(s).digest();

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const CABECERAS_BASE = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
};

function responder(res, estado, cuerpo, tipo = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(estado, { 'Content-Type': tipo, ...CABECERAS_BASE, ...extra });
  res.end(cuerpo);
}

function json(res, estado, objeto) {
  responder(res, estado, JSON.stringify(objeto), 'application/json; charset=utf-8', {
    'Cache-Control': 'no-store',
  });
}

// --- Almacenamiento de mensajes (escrituras en serie para evitar pisarse) ---

let cola = Promise.resolve();

async function leerMensajes() {
  try {
    const lista = JSON.parse(await readFile(ARCHIVO_MENSAJES, 'utf8'));
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

function modificarMensajes(fn) {
  const tarea = cola.then(async () => {
    const lista = await leerMensajes();
    const nueva = fn(lista);
    await mkdir(DIR_DATOS, { recursive: true });
    const tmp = ARCHIVO_MENSAJES + '.tmp';
    await writeFile(tmp, JSON.stringify(nueva, null, 2), 'utf8');
    await rename(tmp, ARCHIVO_MENSAJES);
  });
  cola = tarea.catch(() => {});
  return tarea;
}

// --- Utilidades ---

async function leerJson(req) {
  const partes = [];
  let total = 0;
  for await (const parte of req) {
    total += parte.length;
    if (total > MAX_CUERPO) throw Object.assign(new Error('Cuerpo demasiado grande'), { estado: 413 });
    partes.push(parte);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8'));
  } catch {
    throw Object.assign(new Error('JSON inválido'), { estado: 400 });
  }
}

function autorizado(req) {
  const cab = req.headers.authorization || '';
  if (!cab.startsWith('Basic ')) return false;
  const texto = Buffer.from(cab.slice(6), 'base64').toString('utf8');
  const i = texto.indexOf(':');
  if (i < 0) return false;
  const usuario = texto.slice(0, i);
  const clave = texto.slice(i + 1);
  const okUsuario = timingSafeEqual(hash(usuario), hash('admin'));
  const okClave = timingSafeEqual(hash(clave), hash(PASSWORD));
  return okUsuario && okClave;
}

function pedirAutenticacion(res) {
  responder(res, 401, 'Se requiere autenticación', 'text/plain; charset=utf-8', {
    'WWW-Authenticate': 'Basic realm="Administracion Taller Rueda Libre", charset="UTF-8"',
  });
}

// Límite sencillo por IP: 5 mensajes por minuto.
const intentos = new Map();
function limitado(ip) {
  const ahora = Date.now();
  const lista = (intentos.get(ip) || []).filter((t) => ahora - t < 60_000);
  lista.push(ahora);
  intentos.set(ip, lista);
  return lista.length > 5;
}
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, lista] of intentos) {
    if (lista.every((t) => ahora - t >= 60_000)) intentos.delete(ip);
  }
}, 60_000).unref();

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(d) {
  if (!d || typeof d !== 'object') return 'Datos inválidos';
  const { nombre, correo, mensaje } = d;
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100) return 'Nombre inválido';
  if (typeof correo !== 'string' || correo.length > 200 || !CORREO.test(correo.trim())) return 'Correo inválido';
  if (typeof mensaje !== 'string' || !mensaje.trim() || mensaje.length > 2000) return 'Mensaje inválido (máximo 2000 caracteres)';
  return null;
}

// --- Rutas ---

async function servirEstatico(res, rutaUrl) {
  let ruta;
  try {
    ruta = decodeURIComponent(rutaUrl);
  } catch {
    return responder(res, 400, 'Solicitud inválida');
  }
  if (ruta.includes('\0')) return responder(res, 400, 'Solicitud inválida');
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.join(DIR_PUBLICO, ruta);
  if (archivo !== DIR_PUBLICO && !archivo.startsWith(DIR_PUBLICO + path.sep)) {
    return responder(res, 403, 'Prohibido');
  }
  try {
    const datos = await readFile(archivo);
    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
    responder(res, 200, datos, tipo);
  } catch {
    responder(res, 404, 'No encontrado');
  }
}

async function manejar(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname;
  const metodo = req.method;

  // Formulario de contacto (público)
  if (ruta === '/api/contacto' && metodo === 'POST') {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) {
      return json(res, 415, { error: 'Se esperaba JSON' });
    }
    const ip = req.socket.remoteAddress || 'desconocida';
    if (limitado(ip)) return json(res, 429, { error: 'Demasiados mensajes. Intenta en un minuto.' });
    const datos = await leerJson(req);
    // Campo trampa para bots: si viene lleno, fingimos éxito sin guardar.
    if (datos && typeof datos.web === 'string' && datos.web) return json(res, 201, { ok: true });
    const error = validar(datos);
    if (error) return json(res, 400, { error });
    const registro = {
      id: randomUUID(),
      fecha: new Date().toISOString(),
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim(),
      mensaje: datos.mensaje.trim(),
    };
    await modificarMensajes((lista) => [registro, ...lista].slice(0, MAX_MENSAJES));
    return json(res, 201, { ok: true });
  }

  // Administración (protegida)
  if (ruta === '/admin' && metodo === 'GET') {
    if (!autorizado(req)) return pedirAutenticacion(res);
    return responder(res, 200, await readFile(ARCHIVO_ADMIN), TIPOS['.html'], { 'Cache-Control': 'no-store' });
  }
  if (ruta === '/api/mensajes' && metodo === 'GET') {
    if (!autorizado(req)) return pedirAutenticacion(res);
    return json(res, 200, await leerMensajes());
  }
  const borrar = ruta.match(/^\/api\/mensajes\/([0-9a-f-]{36})$/);
  if (borrar && metodo === 'DELETE') {
    if (!autorizado(req)) return pedirAutenticacion(res);
    // Cabecera personalizada: evita que otro sitio dispare el borrado (CSRF).
    if (req.headers['x-admin'] !== '1') return json(res, 403, { error: 'Solicitud no permitida' });
    await modificarMensajes((lista) => lista.filter((m) => m.id !== borrar[1]));
    return json(res, 200, { ok: true });
  }

  if (metodo === 'GET' || metodo === 'HEAD') return servirEstatico(res, ruta);
  responder(res, 405, 'Método no permitido');
}

const servidor = createServer((req, res) => {
  manejar(req, res).catch((e) => {
    const estado = e.estado || 500;
    if (estado === 500) console.error(e);
    if (!res.headersSent) json(res, estado, { error: estado === 500 ? 'Error interno' : e.message });
    else res.end();
  });
});

servidor.listen(PORT, HOST, () => {
  console.log(`Taller Rueda Libre en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Administración:    http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/admin  (usuario: admin)`);
  if (passwordGenerada) {
    console.log(`Contraseña de esta sesión: ${PASSWORD}`);
    console.log('Para fijar una propia: ADMIN_PASSWORD=tuclave node servidor.mjs');
  }
});
