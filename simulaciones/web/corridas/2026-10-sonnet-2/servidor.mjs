// Servidor de Taller Rueda Libre. Sin dependencias: node servidor.mjs
import http from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(aqui, 'publico');
const ARCHIVO = process.env.MENSAJES || path.join(aqui, 'mensajes.jsonl');
const PUERTO = Number(process.env.PORT ?? 3000);
const MAX_BYTES = 10_000;
const CLAVE_GENERADA = !process.env.ADMIN_CLAVE;
const CLAVE = process.env.ADMIN_CLAVE || randomBytes(6).toString('hex');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const json = (res, codigo, obj) => { res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    let tamano = 0; const trozos = [];
    req.on('data', (t) => {
      tamano += t.length;
      if (tamano > MAX_BYTES) mal(new Error('cuerpo demasiado grande'));
      else trozos.push(t);
    });
    req.on('end', () => ok(Buffer.concat(trozos).toString('utf8')));
    req.on('error', mal);
  });
}

// Devuelve { nombre, correo, mensaje } limpio, o { error }.
export function validar(d) {
  const campo = (v, max) => (typeof v === 'string' ? v.trim() : '').slice(0, max);
  const nombre = campo(d?.nombre, 100), correo = campo(d?.correo, 200), mensaje = campo(d?.mensaje, 2000);
  if (!nombre || !correo || !mensaje) return { error: 'Llena nombre, correo y mensaje.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: 'El correo no parece válido.' };
  return { nombre, correo, mensaje };
}

async function contacto(req, res) {
  let datos;
  try {
    const texto = await leerCuerpo(req);
    datos = (req.headers['content-type'] || '').includes('json') ? JSON.parse(texto) : Object.fromEntries(new URLSearchParams(texto));
  } catch { return json(res, 400, { error: 'No pudimos leer tu mensaje.' }); }
  const v = validar(datos);
  if (v.error) return json(res, 400, v);
  try { await appendFile(ARCHIVO, JSON.stringify({ fecha: new Date().toISOString(), ...v }) + '\n'); }
  catch (e) { console.error('No se pudo guardar:', e); return json(res, 500, { error: 'No pudimos guardar tu mensaje. Intenta más tarde.' }); }
  json(res, 201, { ok: true });
}

function autorizado(req) {
  const [tipo, cred] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Basic' || !cred) return false;
  // Usuario libre; solo cuenta la clave (lo que va después del primer «:»).
  const dada = Buffer.from(Buffer.from(cred, 'base64').toString().split(':').slice(1).join(':'));
  const buena = Buffer.from(CLAVE);
  return dada.length === buena.length && timingSafeEqual(dada, buena);
}

async function admin(req, res) {
  if (!autorizado(req)) { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Administracion"' }); return res.end('Se necesita la clave.'); }
  let lineas = [];
  try { lineas = (await readFile(ARCHIVO, 'utf8')).split('\n').filter(Boolean); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const mensajes = lineas.flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }).reverse();
  const filas = mensajes.map((m) => `<tr><td>${esc(new Date(m.fecha).toLocaleString('es-MX'))}</td><td>${esc(m.nombre)}</td><td><a href="mailto:${esc(m.correo)}">${esc(m.correo)}</a></td><td>${esc(m.mensaje)}</td></tr>`).join('');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mensajes - Rueda Libre</title>
<style>body{font-family:system-ui,sans-serif;margin:1rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:.5rem;text-align:left;vertical-align:top}td:last-child{white-space:pre-wrap;word-break:break-word}.t{overflow-x:auto}</style>
<h1>Mensajes recibidos (${mensajes.length})</h1>
${mensajes.length ? `<div class="t"><table><tr><th>Fecha<th>Nombre<th>Correo<th>Mensaje</tr>${filas}</table></div>` : '<p>Todavía no hay mensajes.</p>'}`);
}

async function estatico(req, res, ruta) {
  const archivo = path.normalize(path.join(PUBLICO, ruta === '/' ? 'index.html' : ruta));
  if (!archivo.startsWith(PUBLICO + path.sep) || !TIPOS[path.extname(archivo)]) { res.writeHead(404); return res.end('No encontrado'); }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] });
    res.end(datos);
  } catch { res.writeHead(404); res.end('No encontrado'); }
}

export const servidor = http.createServer(async (req, res) => {
  try {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta === '/contacto' && req.method === 'POST') return await contacto(req, res);
    if (ruta === '/admin' && req.method === 'GET') return await admin(req, res);
    if (req.method === 'GET' || req.method === 'HEAD') return await estatico(req, res, ruta);
    res.writeHead(405); res.end('Método no permitido');
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500);
    res.end('Error del servidor');
  }
});

// Solo escucha si se corre directamente (así prueba.mjs puede importarlo).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  servidor.listen(PUERTO, () => {
    console.log(`Sitio:  http://localhost:${PUERTO}`);
    console.log(`Admin:  http://localhost:${PUERTO}/admin  (usuario: el que quieras, clave: ${CLAVE})`);
    if (CLAVE_GENERADA) console.log('La clave cambia en cada arranque; fija una con la variable ADMIN_CLAVE.');
  });
}
