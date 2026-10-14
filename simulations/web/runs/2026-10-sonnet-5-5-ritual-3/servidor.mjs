// Servidor de Taller Rueda Libre. Sin dependencias: solo módulos de Node.
// Uso:  node servidor.mjs
// Variables opcionales: PORT (por defecto 3000), ADMIN_USER (por defecto "admin"), ADMIN_PASS.
import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const ARCHIVO_DATOS = path.join(RAIZ, 'datos', 'mensajes.json');
const PUERTO = Number(process.env.PORT) || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
let adminPassGenerada = false;
const ADMIN_PASS = process.env.ADMIN_PASS || ((adminPassGenerada = true), randomBytes(6).toString('hex'));

const LIMITE_CUERPO = 10 * 1024; // 10 KB
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
let cola = Promise.resolve(); // serializa escrituras para no corromper el archivo

async function leerMensajes() {
  let texto;
  try {
    texto = await readFile(ARCHIVO_DATOS, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  try {
    const lista = JSON.parse(texto);
    if (!Array.isArray(lista)) throw new Error('formato');
    return lista;
  } catch {
    // Archivo dañado: se aparta (no se pierde) y se continúa con uno nuevo.
    const respaldo = `${ARCHIVO_DATOS}.dañado-${Date.now()}`;
    await rename(ARCHIVO_DATOS, respaldo);
    console.error(`mensajes.json estaba dañado; copia guardada en ${respaldo}`);
    return [];
  }
}

function guardarMensaje(msg) {
  const tarea = cola.then(async () => {
    const lista = await leerMensajes();
    lista.push(msg);
    await mkdir(path.dirname(ARCHIVO_DATOS), { recursive: true });
    const temporal = `${ARCHIVO_DATOS}.tmp`;
    await writeFile(temporal, JSON.stringify(lista, null, 2), 'utf8');
    await rename(temporal, ARCHIVO_DATOS); // escritura atómica
  });
  cola = tarea.catch(() => {});
  return tarea;
}

// ---------- utilidades ----------
const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function responder(res, estado, cuerpo, tipo = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(estado, {
    'Content-Type': tipo,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    ...extra,
  });
  res.end(cuerpo);
}

const json = (res, estado, obj) => responder(res, estado, JSON.stringify(obj), 'application/json; charset=utf-8');

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let tam = 0;
    const partes = [];
    req.on('data', (c) => {
      tam += c.length;
      if (tam > LIMITE_CUERPO) {
        reject(Object.assign(new Error('Cuerpo demasiado grande'), { estado: 413 }));
        req.destroy();
        return;
      }
      partes.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

function igualesSeguro(a, b) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function autenticado(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const decod = Buffer.from(h.slice(6), 'base64').toString('utf8');
  const i = decod.indexOf(':');
  if (i < 0) return false;
  const u = decod.slice(0, i);
  const p = decod.slice(i + 1);
  return igualesSeguro(u, ADMIN_USER) & igualesSeguro(p, ADMIN_PASS) ? true : false;
}

function pedirCredenciales(res) {
  responder(res, 401, 'Se requiere autenticación', 'text/plain; charset=utf-8', {
    'WWW-Authenticate': 'Basic realm="Administración Rueda Libre", charset="UTF-8"',
  });
}

// ---------- límite simple de envíos por IP ----------
const envios = new Map(); // ip -> [timestamps]
function demasiados(ip) {
  const ahora = Date.now();
  const ventana = 10 * 60 * 1000;
  const lista = (envios.get(ip) || []).filter((t) => ahora - t < ventana);
  lista.push(ahora);
  envios.set(ip, lista);
  return lista.length > 5;
}

// ---------- límite de intentos fallidos de acceso al admin ----------
const fallos = new Map(); // ip -> [timestamps]
function bloqueado(ip) {
  const ahora = Date.now();
  const lista = (fallos.get(ip) || []).filter((t) => ahora - t < 60 * 1000);
  fallos.set(ip, lista);
  return lista.length >= 5; // 5 fallos por minuto
}
const registrarFallo = (ip) => fallos.get(ip)?.push(Date.now()) ?? fallos.set(ip, [Date.now()]);

// ---------- rutas ----------
async function contacto(req, res) {
  // Sin JavaScript el navegador envía el formulario como application/x-www-form-urlencoded.
  const esFormulario = (req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded');
  const fin = (estado, obj) =>
    esFormulario
      ? responder(res, 303, '', 'text/plain; charset=utf-8', {
          Location: obj.ok ? '/?enviado=1#contacto' : `/?error=${encodeURIComponent(obj.error)}#contacto`,
        })
      : json(res, estado, obj);

  if (demasiados(req.socket.remoteAddress || '?')) {
    return fin(429, { ok: false, error: 'Demasiados mensajes. Intenta más tarde.' });
  }
  let datos;
  try {
    const crudo = await leerCuerpo(req);
    datos = esFormulario ? Object.fromEntries(new URLSearchParams(crudo)) : JSON.parse(crudo);
  } catch (e) {
    if (e.estado === 413) return fin(413, { ok: false, error: 'Mensaje demasiado largo.' });
    return fin(400, { ok: false, error: 'Datos inválidos.' });
  }
  const nombre = String(datos?.nombre ?? '').trim();
  const correo = String(datos?.correo ?? '').trim();
  const mensaje = String(datos?.mensaje ?? '').trim();
  const honeypot = String(datos?.sitio ?? '');

  if (honeypot) return fin(200, { ok: true }); // bot: fingir éxito sin guardar
  if (!nombre || nombre.length > 100) return fin(400, { ok: false, error: 'Escribe tu nombre (máx. 100 caracteres).' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 150)
    return fin(400, { ok: false, error: 'Escribe un correo válido.' });
  if (!mensaje || mensaje.length > 2000) return fin(400, { ok: false, error: 'Escribe un mensaje (máx. 2000 caracteres).' });

  await guardarMensaje({
    id: randomBytes(6).toString('hex'),
    fecha: new Date().toISOString(),
    nombre,
    correo,
    mensaje,
  });
  fin(201, { ok: true });
}

async function paginaAdmin(res) {
  const lista = (await leerMensajes()).reverse();
  const fmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  const filas = lista
    .map(
      (m) => `<article>
  <header><strong>${escapar(m.nombre)}</strong>
    <a href="mailto:${escapar(m.correo)}">${escapar(m.correo)}</a>
    <time>${escapar(fmt.format(new Date(m.fecha)))}</time></header>
  <p>${escapar(m.mensaje)}</p>
</article>`
    )
    .join('\n');
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Mensajes — Rueda Libre</title>
<style>
body{font-family:system-ui,sans-serif;background:#f4f1ea;margin:0;padding:1rem;color:#222}
main{max-width:46rem;margin:auto}
h1{font-size:1.4rem}
article{background:#fff;border-radius:10px;padding:1rem;margin:0 0 .8rem;box-shadow:0 1px 3px #0002}
header{display:flex;flex-wrap:wrap;gap:.3rem .8rem;align-items:baseline}
time{margin-left:auto;color:#666;font-size:.85rem}
p{white-space:pre-wrap;overflow-wrap:anywhere;margin:.6rem 0 0}
a{color:#0b6b4f}
</style></head><body><main>
<h1>Mensajes recibidos (${lista.length})</h1>
${filas || '<p>Aún no hay mensajes.</p>'}
</main></body></html>`;
  responder(res, 200, html, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
}

async function estatico(req, res, ruta) {
  if (ruta === '/') ruta = '/index.html';
  let decodificada;
  try {
    decodificada = decodeURIComponent(ruta);
  } catch {
    return responder(res, 400, 'Solicitud inválida');
  }
  if (decodificada.includes('\0')) return responder(res, 400, 'Solicitud inválida');
  const archivo = path.normalize(path.join(PUBLICO, decodificada));
  if (archivo !== PUBLICO && !archivo.startsWith(PUBLICO + path.sep)) return responder(res, 403, 'Prohibido');
  try {
    const datos = await readFile(archivo);
    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
    responder(res, 200, datos, tipo);
  } catch {
    responder(res, 404, 'No encontrado');
  }
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const ruta = url.pathname;

    if (ruta === '/api/contacto') {
      if (req.method !== 'POST') return responder(res, 405, 'Método no permitido', undefined, { Allow: 'POST' });
      return await contacto(req, res);
    }
    if (ruta === '/admin') {
      if (req.method !== 'GET') return responder(res, 405, 'Método no permitido');
      const ip = req.socket.remoteAddress || '?';
      if (bloqueado(ip)) {
        return responder(res, 429, 'Demasiados intentos. Espera un minuto.', 'text/plain; charset=utf-8', { 'Retry-After': '60' });
      }
      if (!autenticado(req)) {
        if (req.headers.authorization) registrarFallo(ip);
        return pedirCredenciales(res);
      }
      return await paginaAdmin(res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Método no permitido');
    return await estatico(req, res, ruta);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) responder(res, 500, 'Error interno');
    else res.end();
  }
});

if (!existsSync(PUBLICO)) {
  console.error(`No se encontró la carpeta ${PUBLICO}`);
  process.exit(1);
}

servidor.listen(PUERTO, () => {
  console.log(`Taller Rueda Libre en  http://localhost:${PUERTO}`);
  console.log(`Administración en      http://localhost:${PUERTO}/admin`);
  console.log(`  usuario: ${ADMIN_USER}`);
  console.log(`  contraseña: ${ADMIN_PASS}${adminPassGenerada ? '  (generada al azar; define ADMIN_PASS para fijarla)' : ''}`);
});
