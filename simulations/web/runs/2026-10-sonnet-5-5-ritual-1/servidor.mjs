// Servidor de Taller Rueda Libre. Sin dependencias: node servidor.mjs
import { createServer } from 'node:http';
import { readFile, writeFile, rename, appendFile, mkdir } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const PUBLICO = join(RAIZ, 'public');
const ARCHIVO = join(RAIZ, 'datos', 'mensajes.jsonl');
const PUERTO = Number(process.env.PORT) || 3000;
const USUARIO = process.env.ADMIN_USER || 'admin';
let CLAVE = process.env.ADMIN_PASSWORD;
const claveGenerada = !CLAVE;
if (!CLAVE) CLAVE = randomBytes(6).toString('hex');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function igual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function autorizado(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const [u, ...resto] = Buffer.from(h.slice(6), 'base64').toString().split(':');
  const okU = igual(u, USUARIO);
  const okP = igual(resto.join(':'), CLAVE);
  return okU && okP;
}

// Límite sencillo: 5 mensajes por minuto por IP
const intentos = new Map();
function limitado(ip) {
  const ahora = Date.now();
  const lista = (intentos.get(ip) || []).filter((t) => ahora - t < 60_000);
  lista.push(ahora);
  intentos.set(ip, lista);
  return lista.length > 5;
}

// Fallos de login: tras 5 en 15 minutos, esa IP queda bloqueada hasta que pase la ventana
const fallosLogin = new Map();
const fallosDe = (ip) => (fallosLogin.get(ip) || []).filter((t) => Date.now() - t < 900_000).length;
function registrarFallo(ip) {
  const lista = (fallosLogin.get(ip) || []).filter((t) => Date.now() - t < 900_000);
  lista.push(Date.now());
  fallosLogin.set(ip, lista);
}

function leerCuerpo(req, max = 10_000) {
  return new Promise((ok, fallo) => {
    let tam = 0;
    const partes = [];
    req.on('data', (c) => {
      tam += c.length;
      if (tam > max) { fallo(new Error('grande')); req.destroy(); return; }
      partes.push(c);
    });
    req.on('end', () => ok(Buffer.concat(partes).toString()));
    req.on('error', fallo);
  });
}

function responder(res, codigo, cuerpo, tipo = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(codigo, {
    'Content-Type': tipo,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    ...extra,
  });
  res.end(cuerpo);
}
const json = (res, codigo, obj) => responder(res, codigo, JSON.stringify(obj), 'application/json; charset=utf-8');

const pagina = (titulo, cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem">${cuerpo}</body></html>`;

// Acepta JSON (fetch) y formulario clásico (si JavaScript no carga).
async function guardarMensaje(req, res) {
  const clasico = !(req.headers['content-type'] || '').includes('application/json');
  const fallo = (codigo, error) => clasico
    ? responder(res, codigo, pagina('Error', `<h1>No se envió</h1><p>${escapar(error)}</p><p><a href="/#contacto">Volver</a></p>`), 'text/html; charset=utf-8')
    : json(res, codigo, { error });
  if (limitado(req.socket.remoteAddress)) return fallo(429, 'Demasiados intentos, espera un minuto.');
  let datos;
  try {
    const texto = await leerCuerpo(req);
    datos = clasico ? Object.fromEntries(new URLSearchParams(texto)) : JSON.parse(texto);
  } catch {
    return fallo(400, 'Solicitud no válida.');
  }
  // Campo trampa para bots: si viene lleno, fingimos éxito sin guardar.
  const bot = String(datos?.web ?? '') !== '';
  const nombre = String(datos?.nombre ?? '').trim();
  const correo = String(datos?.correo ?? '').trim();
  const mensaje = String(datos?.mensaje ?? '').trim();
  if (!nombre || nombre.length > 100) return fallo(400, 'Escribe tu nombre (máx. 100 caracteres).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 150) return fallo(400, 'Escribe un correo válido.');
  if (!mensaje || mensaje.length > 2000) return fallo(400, 'Escribe un mensaje (máx. 2000 caracteres).');
  if (!bot) {
    await mkdir(join(RAIZ, 'datos'), { recursive: true });
    const id = randomBytes(8).toString('hex');
    await appendFile(ARCHIVO, JSON.stringify({ id, fecha: new Date().toISOString(), nombre, correo, mensaje }) + '\n');
  }
  if (clasico) {
    return responder(res, 200, pagina('Gracias', '<h1>¡Gracias!</h1><p>Recibimos tu mensaje y te responderemos pronto.</p><p><a href="/">Volver al inicio</a></p>'), 'text/html; charset=utf-8');
  }
  json(res, 201, { ok: true });
}

async function leerMensajes() {
  try {
    const lineas = (await readFile(ARCHIVO, 'utf8')).split('\n').filter(Boolean);
    // Una línea dañada se omite sin afectar al resto.
    return lineas.flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

// Borrado: reescribe el archivo completo en uno temporal y lo renombra.
let bloqueo = Promise.resolve();
function borrarMensaje(id) {
  bloqueo = bloqueo.then(async () => {
    const restantes = (await leerMensajes()).filter((m) => m.id !== id);
    const tmp = ARCHIVO + '.tmp';
    await writeFile(tmp, restantes.map((m) => JSON.stringify(m) + '\n').join(''));
    await rename(tmp, ARCHIVO);
  });
  return bloqueo;
}

async function paginaAdmin(res) {
  const mensajes = (await leerMensajes()).reverse();
  const tarjetas = mensajes.map((m) => `
    <article>
      <header><strong>${escapar(m.nombre)}</strong>
        <a href="mailto:${escapar(m.correo)}">${escapar(m.correo)}</a>
        <time>${escapar(new Date(m.fecha).toLocaleString('es-MX'))}</time></header>
      <p>${escapar(m.mensaje)}</p>
      <form method="post" action="/admin/borrar" onsubmit="return confirm('¿Borrar este mensaje?')">
        <input type="hidden" name="id" value="${escapar(m.id ?? '')}">
        <button ${m.id ? '' : 'disabled'}>Borrar</button>
      </form>
    </article>`).join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Mensajes · Taller Rueda Libre</title>
<style>
body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:1rem;background:#f4f4f0;color:#222}
article{background:#fff;border-radius:8px;padding:1rem;margin:1rem 0;box-shadow:0 1px 3px #0002}
header{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:baseline}
time{color:#777;font-size:.85rem;margin-left:auto}p{white-space:pre-wrap;overflow-wrap:anywhere}
</style></head><body>
<h1>Mensajes recibidos (${mensajes.length})</h1>
${tarjetas || '<p>Aún no hay mensajes.</p>'}
</body></html>`;
  responder(res, 200, html, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
}

async function estatico(req, res, ruta) {
  if (ruta === '/') ruta = '/index.html';
  let decodificada;
  try { decodificada = decodeURIComponent(ruta); } catch { return responder(res, 400, 'Solicitud no válida'); }
  const archivo = resolve(PUBLICO, '.' + normalize('/' + decodificada));
  if (!archivo.startsWith(PUBLICO + sep)) return responder(res, 403, 'Prohibido');
  try {
    const contenido = await readFile(archivo);
    responder(res, 200, req.method === 'HEAD' ? '' : contenido, TIPOS[extname(archivo)] || 'application/octet-stream');
  } catch {
    responder(res, 404, 'No encontrado');
  }
}

const servidor = createServer(async (req, res) => {
  try {
    const ruta = new URL(req.url, 'http://x').pathname;
    if (ruta === '/api/contacto') {
      if (req.method !== 'POST') return responder(res, 405, 'Método no permitido', 'text/plain', { Allow: 'POST' });
      return await guardarMensaje(req, res);
    }
    if (ruta === '/admin' || ruta === '/admin/borrar') {
      const ip = req.socket.remoteAddress;
      if (fallosDe(ip) >= 5) return responder(res, 429, 'Demasiados intentos fallidos, espera 15 minutos.');
      if (!autorizado(req)) {
        registrarFallo(ip);
        return responder(res, 401, 'Acceso restringido', 'text/plain; charset=utf-8', {
          'WWW-Authenticate': 'Basic realm="Administracion", charset="UTF-8"',
        });
      }
      if (ruta === '/admin/borrar') {
        if (req.method !== 'POST') return responder(res, 405, 'Método no permitido');
        // Anti-CSRF: el navegador reenvía la contraseña sola, así que exigimos mismo origen.
        const origen = req.headers.origin;
        if (origen && new URL(origen).host !== req.headers.host) return responder(res, 403, 'Origen no permitido');
        const id = new URLSearchParams(await leerCuerpo(req)).get('id') || '';
        if (id) await borrarMensaje(id);
        return responder(res, 303, '', 'text/plain', { Location: '/admin' });
      }
      return await paginaAdmin(res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Método no permitido');
    await estatico(req, res, ruta);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) responder(res, 500, 'Error del servidor');
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Sitio:  http://localhost:${PUERTO}`);
  console.log(`Admin:  http://localhost:${PUERTO}/admin  (usuario: ${USUARIO})`);
  if (claveGenerada) console.log(`Contraseña de esta sesión: ${CLAVE}  (fija una con ADMIN_PASSWORD=...)`);
});
