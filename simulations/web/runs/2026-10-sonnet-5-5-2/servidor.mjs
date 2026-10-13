// Servidor de Taller Rueda Libre. Sin dependencias: solo módulos de Node.
// Uso: node servidor.mjs
// Variables opcionales: PORT (3000), HOST (127.0.0.1), ADMIN_CLAVE (si falta, se genera una al arrancar).

import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const PUBLICO = resolve(RAIZ, 'publico');
const PRIVADO = resolve(RAIZ, 'privado');
const DATOS = resolve(RAIZ, 'datos');
const ARCHIVO = resolve(DATOS, 'mensajes.json');

const PUERTO = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const USUARIO = 'admin';
const CLAVE_GENERADA = !process.env.ADMIN_CLAVE;
const CLAVE = process.env.ADMIN_CLAVE || randomBytes(9).toString('base64url');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; form-action 'self'; frame-ancestors 'none'",
};

// ---------- Almacenamiento (JSON en disco, escrituras en serie) ----------

let cola = Promise.resolve();

async function leerMensajes() {
  try {
    return JSON.parse(await readFile(ARCHIVO, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

function modificarMensajes(fn) {
  const tarea = cola.then(async () => {
    const mensajes = await leerMensajes();
    const nuevos = fn(mensajes);
    await mkdir(DATOS, { recursive: true });
    const tmp = ARCHIVO + '.tmp';
    await writeFile(tmp, JSON.stringify(nuevos, null, 2));
    await rename(tmp, ARCHIVO);
  });
  cola = tarea.catch(() => {});
  return tarea;
}

// ---------- Utilidades ----------

function responder(res, estado, cuerpo, tipo = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(estado, { 'Content-Type': tipo, ...CABECERAS, ...extra });
  res.end(cuerpo);
}

const json = (res, estado, obj) => responder(res, estado, JSON.stringify(obj));

function leerCuerpo(req, limite = 10_000) {
  return new Promise((ok, fallo) => {
    let total = 0;
    const trozos = [];
    req.on('data', (t) => {
      total += t.length;
      if (total > limite) {
        fallo(Object.assign(new Error('Cuerpo demasiado grande'), { estado: 413 }));
        req.destroy();
        return;
      }
      trozos.push(t);
    });
    req.on('end', () => ok(Buffer.concat(trozos).toString('utf8')));
    req.on('error', fallo);
  });
}

const hash = (s) => createHash('sha256').update(s).digest();

function autorizado(req) {
  const cab = req.headers.authorization || '';
  if (!cab.startsWith('Basic ')) return false;
  const [usuario, ...resto] = Buffer.from(cab.slice(6), 'base64').toString('utf8').split(':');
  const claveEnviada = resto.join(':');
  const okUsuario = timingSafeEqual(hash(usuario), hash(USUARIO));
  const okClave = timingSafeEqual(hash(claveEnviada), hash(CLAVE));
  return okUsuario && okClave;
}

function pedirClave(res) {
  responder(res, 401, 'Se requiere autenticación', 'text/plain; charset=utf-8', {
    'WWW-Authenticate': 'Basic realm="Administración Taller Rueda Libre", charset="UTF-8"',
  });
}

// Límite simple: 5 mensajes por IP cada 10 minutos.
const intentos = new Map();
function limitado(ip) {
  const ahora = Date.now();
  const recientes = (intentos.get(ip) || []).filter((t) => ahora - t < 600_000);
  if (recientes.length >= 5) {
    intentos.set(ip, recientes);
    return true;
  }
  recientes.push(ahora);
  intentos.set(ip, recientes);
  return false;
}

async function servirArchivo(res, carpeta, ruta) {
  let rel;
  try {
    rel = decodeURIComponent(ruta);
  } catch {
    return responder(res, 400, 'Solicitud inválida', 'text/plain; charset=utf-8');
  }
  if (rel.includes('\0')) return responder(res, 400, 'Solicitud inválida', 'text/plain; charset=utf-8');
  if (rel.endsWith('/')) rel += 'index.html';
  const completa = resolve(carpeta, '.' + rel);
  if (!completa.startsWith(carpeta + sep)) {
    return responder(res, 403, 'Prohibido', 'text/plain; charset=utf-8');
  }
  try {
    const datos = await readFile(completa);
    const tipo = TIPOS[extname(completa).toLowerCase()] || 'application/octet-stream';
    responder(res, 200, datos, tipo, { 'Cache-Control': 'no-cache' });
  } catch {
    responder(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
  }
}

// ---------- Rutas ----------

async function manejar(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname;

  // Formulario de contacto
  if (ruta === '/api/contacto') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
    const ip = req.socket.remoteAddress || 'desconocida';
    if (limitado(ip)) return json(res, 429, { error: 'Demasiados mensajes. Inténtalo más tarde.' });

    let datos;
    try {
      datos = JSON.parse(await leerCuerpo(req));
    } catch (e) {
      if (e.estado === 413) return json(res, 413, { error: 'Mensaje demasiado grande' });
      return json(res, 400, { error: 'Datos inválidos' });
    }
    if (typeof datos !== 'object' || datos === null) return json(res, 400, { error: 'Datos inválidos' });

    // Campo trampa para bots: si viene relleno, fingimos éxito y no guardamos.
    if (datos.sitio_web) return json(res, 201, { ok: true });

    const nombre = String(datos.nombre ?? '').trim();
    const correo = String(datos.correo ?? '').trim();
    const mensaje = String(datos.mensaje ?? '').trim();
    if (!nombre || nombre.length > 100) return json(res, 400, { error: 'Escribe tu nombre (máx. 100 caracteres).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 200) {
      return json(res, 400, { error: 'Escribe un correo válido.' });
    }
    if (!mensaje || mensaje.length > 2000) return json(res, 400, { error: 'Escribe tu mensaje (máx. 2000 caracteres).' });

    const registro = { id: randomUUID(), fecha: new Date().toISOString(), nombre, correo, mensaje };
    await modificarMensajes((lista) => [...lista, registro]);
    return json(res, 201, { ok: true });
  }

  // Administración (todo protegido con usuario y clave)
  if (ruta === '/admin' || ruta === '/admin/' || ruta === '/admin/admin.js' || ruta.startsWith('/api/mensajes')) {
    if (!autorizado(req)) return pedirClave(res);

    if (ruta === '/admin' || ruta === '/admin/') return servirArchivo(res, PRIVADO, '/admin.html');
    if (ruta === '/admin/admin.js') return servirArchivo(res, PRIVADO, '/admin.js');

    if (ruta === '/api/mensajes' && req.method === 'GET') {
      const lista = await leerMensajes();
      return json(res, 200, lista.slice().reverse());
    }
    const m = ruta.match(/^\/api\/mensajes\/([0-9a-f-]{36})$/);
    if (m && req.method === 'DELETE') {
      await modificarMensajes((lista) => lista.filter((x) => x.id !== m[1]));
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'No encontrado' });
  }

  // Sitio público
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return responder(res, 405, 'Método no permitido', 'text/plain; charset=utf-8');
  }
  return servirArchivo(res, PUBLICO, ruta);
}

const servidor = createServer((req, res) => {
  manejar(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: 'Error interno' });
    else res.end();
  });
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Taller Rueda Libre en http://${HOST}:${PUERTO}`);
  console.log(`Administración:    http://${HOST}:${PUERTO}/admin`);
  console.log(`  usuario: ${USUARIO}`);
  console.log(`  clave:   ${CLAVE}${CLAVE_GENERADA ? '   (generada; define ADMIN_CLAVE para fijarla)' : ''}`);
});
