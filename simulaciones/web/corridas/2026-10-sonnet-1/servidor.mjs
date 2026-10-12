// Servidor de Taller Rueda Libre. Sin dependencias: node servidor.mjs
import http from 'node:http';
import path from 'node:path';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const ARCHIVO = process.env.DATOS || path.join(RAIZ, 'datos', 'mensajes.jsonl');
const PUERTO = Number(process.env.PORT) || 3000;
const USUARIO = 'admin';
const CLAVE_DEFINIDA = Boolean(process.env.ADMIN_PASSWORD);
const CLAVE = process.env.ADMIN_PASSWORD || randomBytes(6).toString('hex');
const MAX_CUERPO = 10_000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

const CABECERAS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function responder(res, estado, cuerpo, tipo = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(estado, { 'Content-Type': tipo, ...CABECERAS, ...extra });
  res.end(cuerpo);
}
const json = (res, estado, obj) => responder(res, estado, JSON.stringify(obj), 'application/json; charset=utf-8');

const hash = (s) => createHash('sha256').update(s).digest();
function autorizado(req) {
  const [tipo, cred = ''] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Basic') return false;
  const [u, ...resto] = Buffer.from(cred, 'base64').toString().split(':');
  // Se comparan hashes para que timingSafeEqual reciba siempre la misma longitud.
  return timingSafeEqual(hash(u), hash(USUARIO)) & timingSafeEqual(hash(resto.join(':')), hash(CLAVE));
}

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function leerMensajes() {
  let texto = '';
  try { texto = await readFile(ARCHIVO, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const lista = [];
  for (const linea of texto.split('\n')) {
    try { if (linea) lista.push(JSON.parse(linea)); } catch { /* línea dañada: se omite */ }
  }
  return lista.reverse(); // más recientes primero
}

async function paginaAdmin(res) {
  const mensajes = await leerMensajes();
  const items = mensajes.map((m) => `
    <article class="mensaje">
      <h2>${escapar(m.nombre)}</h2>
      <a href="mailto:${escapar(m.correo)}">${escapar(m.correo)}</a>
      <time datetime="${escapar(m.fecha)}">${escapar(new Date(m.fecha).toLocaleString('es-MX'))}</time>
      <p>${escapar(m.mensaje)}</p>
    </article>`).join('') || '<p>Aún no hay mensajes.</p>';
  responder(res, 200, `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Mensajes | Taller Rueda Libre</title>
<link rel="stylesheet" href="/estilos.css"></head>
<body><main class="admin"><h1>Mensajes (${mensajes.length})</h1>${items}</main></body></html>`,
  'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let tamano = 0;
    const trozos = [];
    req.on('data', (t) => {
      tamano += t.length;
      if (tamano > MAX_CUERPO) { reject(Object.assign(new Error('grande'), { estado: 413 })); return; }
      trozos.push(t);
    });
    req.on('end', () => resolve(Buffer.concat(trozos).toString()));
    req.on('error', reject);
  });
}

async function recibirContacto(req, res) {
  let datos;
  try { datos = JSON.parse(await leerCuerpo(req)); } catch (e) {
    if (e.estado === 413) {
      res.once('finish', () => req.destroy()); // se corta la subida después de responder
      return json(res, 413, { error: 'El mensaje es demasiado largo.' });
    }
    return json(res, 400, { error: 'Solicitud no válida.' });
  }
  const limpio = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const nombre = limpio(datos?.nombre, 100);
  const correo = limpio(datos?.correo, 200);
  const mensaje = limpio(datos?.mensaje, 2000);
  if (!nombre) return json(res, 400, { error: 'Escribe tu nombre.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return json(res, 400, { error: 'Escribe un correo válido.' });
  if (!mensaje) return json(res, 400, { error: 'Escribe tu mensaje.' });
  await mkdir(path.dirname(ARCHIVO), { recursive: true });
  await appendFile(ARCHIVO, JSON.stringify({ fecha: new Date().toISOString(), nombre, correo, mensaje }) + '\n');
  json(res, 201, { ok: true });
}

async function estatico(pathname, res) {
  let ruta;
  try { ruta = decodeURIComponent(pathname); } catch { return responder(res, 400, 'Solicitud no válida'); }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.resolve(PUBLICO, '.' + ruta);
  if (!archivo.startsWith(PUBLICO + path.sep)) return responder(res, 404, 'No encontrado');
  try {
    const datos = await readFile(archivo);
    responder(res, 200, datos, TIPOS[path.extname(archivo)] || 'application/octet-stream');
  } catch {
    responder(res, 404, 'No encontrado');
  }
}

const servidor = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    if (pathname === '/api/contacto') {
      if (req.method !== 'POST') return responder(res, 405, 'Método no permitido', undefined, { Allow: 'POST' });
      return await recibirContacto(req, res);
    }
    if (pathname === '/admin') {
      if (!autorizado(req)) return responder(res, 401, 'Autenticación requerida', undefined, { 'WWW-Authenticate': 'Basic realm="Administración", charset="UTF-8"' });
      return await paginaAdmin(res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Método no permitido');
    await estatico(pathname, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) responder(res, 500, 'Error del servidor');
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Sitio:  http://localhost:${PUERTO}/`);
  console.log(`Admin:  http://localhost:${PUERTO}/admin   usuario: ${USUARIO}`);
  if (!CLAVE_DEFINIDA) console.log(`Clave temporal (cambia en cada arranque): ${CLAVE}\nPara fijarla: ADMIN_PASSWORD=tu_clave node servidor.mjs`);
});
