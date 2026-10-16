// Servidor de Fisio Andares: sin dependencias. Arranque: node servidor.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
const DIR_DATOS = process.env.DATOS_DIR ? path.resolve(process.env.DATOS_DIR) : path.join(RAIZ, 'datos');
const ARCHIVO_CITAS = path.join(DIR_DATOS, 'citas.jsonl');
const ARCHIVO_CLAVE = path.join(DIR_DATOS, 'clave-admin.txt');
const PUERTO = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const LIMITE_GLOBAL_HORA = Number(process.env.LIMITE_GLOBAL_HORA) || 40; // solicitudes válidas por hora, entre todas las IP

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

// ---------- Almacén ----------
// Una cita por línea. Se lee el archivo UNA vez al arrancar y se mantiene en memoria
// (este proceso es el único que escribe), así listar no depende del tamaño del archivo.
// Una línea dañada o con forma rara no afecta a las demás: se cuenta, se avisa y se conserva.
const esTexto = (v) => typeof v === 'string';
function citaValida(o) {
  return o && typeof o === 'object' && esTexto(o.id) && /^[\w-]+$/.test(o.id)
    && esTexto(o.creada) && !Number.isNaN(Date.parse(o.creada))
    && ['nombre', 'telefono', 'correo', 'fecha', 'hora', 'comentario'].every((k) => esTexto(o[k]))
    && TRATAMIENTOS.includes(o.tratamiento) && ESTADOS.includes(o.estado);
}
let citas = [];          // válidas, la más nueva primero
let danadas = [];        // líneas que no se pudieron leer (texto original)
const conteo = { pendiente: 0, confirmada: 0, cancelada: 0 };
function cargarAlmacen() {
  let texto = '';
  try { texto = fs.readFileSync(ARCHIVO_CITAS, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const ids = new Set();
  for (const raw of texto.split('\n')) {
    if (!raw.trim()) continue;
    let o = null;
    try { o = JSON.parse(raw); } catch {}
    if (citaValida(o) && !ids.has(o.id)) { ids.add(o.id); citas.push(o); conteo[o.estado]++; } else danadas.push(raw);
  }
  citas.sort((a, b) => (a.creada < b.creada ? 1 : a.creada > b.creada ? -1 : 0));
}
cargarAlmacen();
function reescribir() {
  const tmp = ARCHIVO_CITAS + '.tmp';
  const cuerpo = [...citas].reverse().map((c) => JSON.stringify(c)).concat(danadas).map((l) => l + '\n').join('');
  fs.writeFileSync(tmp, cuerpo);
  fs.renameSync(tmp, ARCHIVO_CITAS);
}
function agregarCita(cita) {
  // El salto de línea inicial evita pegarse a una última línea truncada.
  fs.appendFileSync(ARCHIVO_CITAS, '\n' + JSON.stringify(cita) + '\n');
  citas.unshift(cita); conteo[cita.estado]++;
}
function coincide(c, estado, q) {
  if (estado && c.estado !== estado) return false;
  if (!q) return true;
  return (c.nombre + ' ' + c.telefono + ' ' + c.correo + ' ' + c.comentario).toLowerCase().includes(q);
}
// Cambios síncronos (sin await entre leer y guardar): ninguna solicitud se pierde en medio.
function cambiarEstado(id, estado) {
  const c = citas.find((x) => x.id === id);
  if (!c) return null;
  const antes = c.estado;
  c.estado = estado;
  try { reescribir(); } catch (e) { c.estado = antes; throw e; }
  conteo[antes]--; conteo[estado]++;
  return c;
}
function borrar(filtro) {
  const quedan = citas.filter((c) => !filtro(c));
  const n = citas.length - quedan.length;
  if (!n) return 0;
  const antes = citas;
  citas = quedan;
  try { reescribir(); } catch (e) { citas = antes; throw e; }
  const sobreviven = new Set(quedan);
  for (const c of antes) if (!sobreviven.has(c)) conteo[c.estado]--;
  return n;
}

// ---------- Validación ----------
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function horaLocal() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fechaMaxima() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
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
  else if (fecha > fechaMaxima()) e.fecha = 'Solo agendamos con hasta 6 meses de anticipación.';
  else if (d.getDay() === 0 || d.getDay() === 6) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
  if (!HORAS.includes(hora)) e.hora = 'Elige una hora entre las 9:00 y las 17:00.';
  else if (!e.fecha && fecha === hoyLocal() && hora <= horaLocal()) e.hora = 'Esa hora ya pasó. Elige una hora más tarde o escoge otro día.';
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
  // Tope global: un bot con muchas IPs no puede llenar el panel (el límite por IP no lo detiene).
  if (excedido('global', '*', LIMITE_GLOBAL_HORA, 3600e3, true)) {
    return responder(429, { error: 'Estamos recibiendo muchas solicitudes. Inténtalo más tarde o llámanos.' }, 'Demasiadas solicitudes', 'Inténtalo más tarde o llámanos por teléfono.');
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
      const estado = ESTADOS.includes(url.searchParams.get('estado')) ? url.searchParams.get('estado') : '';
      const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
      const desde = Math.max(0, parseInt(url.searchParams.get('desde'), 10) || 0);
      const por = Math.min(100, Math.max(1, parseInt(url.searchParams.get('por'), 10) || 50));
      let pagina, total;
      if (!estado && !q) { pagina = citas.slice(desde, desde + por); total = citas.length; }
      else {
        const todas = citas.filter((c) => coincide(c, estado, q));
        total = todas.length; pagina = todas.slice(desde, desde + por);
      }
      return json(res, 200, { citas: pagina, total, desde, global: { ...conteo, todas: citas.length }, danadas: danadas.length });
    }
    if (url.pathname === '/api/admin/citas' && req.method === 'DELETE') {
      // Borrado en bloque: exige un filtro (estado y/o búsqueda) para no vaciar todo por error.
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Tipo no válido.' });
      const b = await leerDatos(req);
      const estado = ESTADOS.includes(b.estado) ? b.estado : '';
      const q = typeof b.q === 'string' ? b.q.trim().toLowerCase().slice(0, 100) : '';
      if (!estado && !q) return json(res, 422, { error: 'Elige un estado o escribe una búsqueda antes de eliminar en bloque.' });
      const n = borrar((c) => coincide(c, estado, q));
      return json(res, 200, { ok: true, eliminadas: n });
    }
    if (url.pathname === '/api/admin/salir' && req.method === 'POST') {
      const m = /sid=([\w-]+)/.exec(req.headers.cookie || ''); if (m) sesiones.delete(m[1]);
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    if (idCita && (req.method === 'PATCH' || req.method === 'DELETE')) {
      // Cambios solo con JSON: un formulario de otro sitio no puede enviarlo.
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Tipo no válido.' });
      // Primero se lee el cuerpo (await); leer, cambiar y guardar va después, sin ningún await en medio.
      const b = await leerDatos(req);
      if (req.method === 'PATCH') {
        if (!ESTADOS.includes(b.estado)) return json(res, 422, { error: 'Estado no válido.' });
        const c = cambiarEstado(idCita[1], b.estado);
        if (!c) return json(res, 404, { error: 'No encontramos esa solicitud.' });
        return json(res, 200, { ok: true, estado: c.estado, global: { ...conteo, todas: citas.length } });
      }
      if (!borrar((c) => c.id === idCita[1])) return json(res, 404, { error: 'No encontramos esa solicitud.' });
      return json(res, 200, { ok: true, global: { ...conteo, todas: citas.length } });
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
  if (HOST === '0.0.0.0') {
    for (const lista of Object.values(os.networkInterfaces())) for (const i of lista || []) if (i.family === 'IPv4' && !i.internal) console.log(`Desde el celular (misma red wifi):  http://${i.address}:${PUERTO}`);
  } else if (HOST === '127.0.0.1') {
    console.log('Solo se abre en este equipo. Para abrirlo desde el celular: HOST=0.0.0.0 node servidor.mjs  (ver README.md)');
  }
  if (danadas.length) console.log(`Aviso: ${danadas.length} línea(s) dañadas en citas.jsonl (se conservan, no se muestran).`);
  console.log(`Panel de la dueña: /admin.html   (contraseña desde ${ORIGEN_CLAVE})`);
  if (ORIGEN_CLAVE.includes('recién')) console.log(`Contraseña: ${CLAVE}`);
});
