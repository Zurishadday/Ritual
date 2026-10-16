// Fisio Andares: servidor sin dependencias. Uso: node servidor.mjs
import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DATOS = path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'solicitudes.json');
const ARCHIVO_CLAVE = path.join(DATOS, 'clave.txt');
const PUERTO = Number(process.env.PORT) || 3000;

const TRATAMIENTOS = {
  rodilla: 'Rehabilitación de rodilla',
  espalda: 'Dolor de espalda',
  masaje: 'Masaje deportivo',
};
// Inicios posibles: 9:00 a 17:00 cada 30 min (la sesión más larga dura 60 min y termina a las 18:00).
const HORAS = [];
for (let h = 9; h <= 17; h++) for (const m of [0, 30]) {
  if (h === 17 && m === 30) continue;
  HORAS.push(`${String(h).padStart(2, '0')}:${m ? '30' : '00'}`);
}
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];

// ---------- Contraseña de la dueña ----------
// Se toma de CLAVE_ADMIN; si no existe, se genera una vez y se guarda en datos/clave.txt.
await mkdir(DATOS, { recursive: true });
let CLAVE = process.env.CLAVE_ADMIN;
let origenClave = 'variable CLAVE_ADMIN';
if (!CLAVE) {
  origenClave = 'archivo datos/clave.txt';
  if (existsSync(ARCHIVO_CLAVE)) CLAVE = (await readFile(ARCHIVO_CLAVE, 'utf8')).trim();
  if (!CLAVE) {
    CLAVE = randomBytes(6).toString('hex');
    await writeFile(ARCHIVO_CLAVE, CLAVE + '\n');
  }
}
const hash = (s) => createHash('sha256').update(s).digest();
const claveCorrecta = (intento) => timingSafeEqual(hash(String(intento)), hash(CLAVE));

// ---------- Almacén de solicitudes ----------
// Se guarda todo el arreglo en un JSON con escritura atómica (archivo temporal + rename).
// Si el archivo está dañado, se aparta con otro nombre (no se pierde) y se sigue con uno nuevo.
let solicitudes = [];
async function cargar() {
  let texto;
  try { texto = await readFile(ARCHIVO, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  try {
    const datos = JSON.parse(texto);
    if (!Array.isArray(datos)) throw new Error('no es una lista');
    solicitudes = datos;
  } catch (e) {
    const apartado = path.join(DATOS, `solicitudes.danado-${Date.now()}.json`);
    await rename(ARCHIVO, apartado);
    console.error(`\n!! ${ARCHIVO} estaba dañado (${e.message}). Se guardó en ${apartado}; se empieza con una lista vacía.\n`);
  }
}
await cargar();

let cola = Promise.resolve();
// Aplica un cambio en serie: construye la lista nueva, la escribe y solo entonces la adopta.
function transaccion(cambio) {
  const paso = cola.then(async () => {
    const nueva = cambio(solicitudes);
    const tmp = ARCHIVO + '.tmp';
    await writeFile(tmp, JSON.stringify(nueva.lista, null, 1));
    await rename(tmp, ARCHIVO);
    solicitudes = nueva.lista;
    return nueva.resultado;
  });
  cola = paso.catch(() => {});
  return paso;
}

// ---------- Límites de intentos ----------
function limitador(max, ventanaMs) {
  const mapa = new Map();
  return {
    // Cuenta un intento y dice si se pasó del límite.
    golpe(clave) {
      const ahora = Date.now();
      const l = (mapa.get(clave) || []).filter((t) => ahora - t < ventanaMs);
      l.push(ahora);
      mapa.set(clave, l);
      return l.length > max ? Math.ceil((l[0] + ventanaMs - ahora) / 1000) : 0;
    },
    bloqueado(clave) {
      const ahora = Date.now();
      const l = (mapa.get(clave) || []).filter((t) => ahora - t < ventanaMs);
      return l.length >= max ? Math.ceil((l[0] + ventanaMs - ahora) / 1000) : 0;
    },
    limpiar() { const a = Date.now(); for (const [k, l] of mapa) if (l.every((t) => a - t >= ventanaMs)) mapa.delete(k); },
  };
}
const intentosLogin = limitador(5, 60_000);      // 5 contraseñas malas por minuto y por IP
const envios = limitador(5, 10 * 60_000);         // 5 solicitudes aceptadas cada 10 min por IP
const rechazos = limitador(30, 10 * 60_000);      // las rechazadas (errores, bots) tienen su propio tope, más holgado, y no gastan el de arriba
setInterval(() => { intentosLogin.limpiar(); envios.limpiar(); rechazos.limpiar(); for (const [t, e] of sesiones) if (e < Date.now()) sesiones.delete(t); }, 60_000).unref();

const sesiones = new Map(); // token -> expiración
const MAX_PENDIENTES = 500;

// ---------- Utilidades ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function json(res, estado, cuerpo, extra = {}) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(cuerpo));
}
function pagina(res, estado, titulo, html) {
  res.writeHead(estado, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/estilo.css"></head><body><main class="aviso"><h1>${esc(titulo)}</h1>${html}</main></body></html>`);
}
async function leerCuerpo(req) {
  const trozos = []; let total = 0;
  for await (const t of req) {
    total += t.length;
    if (total > 20_000) { const e = new Error('Cuerpo demasiado grande'); e.estado = 413; throw e; }
    trozos.push(t);
  }
  const texto = Buffer.concat(trozos).toString('utf8');
  const tipo = req.headers['content-type'] || '';
  try {
    if (tipo.includes('application/json')) return JSON.parse(texto || '{}');
    if (tipo.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(texto));
  } catch { /* cae abajo */ }
  const e = new Error('Datos no válidos'); e.estado = 400; throw e;
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, v.join('=')]));
}
const haySesion = (req) => { const e = sesiones.get(cookies(req).sesion); return Boolean(e && e > Date.now()); };
const ipDe = (req) => req.socket.remoteAddress || 'desconocida';
function hoyLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// ---------- Validación de la solicitud ----------
function validar(b) {
  const errores = [];
  const txt = (v) => (typeof v === 'string' ? v.trim() : '');
  const nombre = txt(b.nombre), telefono = txt(b.telefono), correo = txt(b.correo);
  const tratamiento = txt(b.tratamiento), fecha = txt(b.fecha), hora = txt(b.hora), comentario = txt(b.comentario);
  if (nombre.length < 2 || nombre.length > 80) errores.push({ campo: 'nombre', mensaje: 'Escribe tu nombre (2 a 80 letras).' });
  const digitos = telefono.replace(/\D/g, '');
  if (!/^[\d\s+()-]+$/.test(telefono) || digitos.length < 8 || digitos.length > 15) errores.push({ campo: 'telefono', mensaje: 'Escribe un teléfono válido, con al menos 8 números.' });
  if (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) errores.push({ campo: 'correo', mensaje: 'Escribe un correo válido, como nombre@correo.com.' });
  if (!TRATAMIENTOS[tratamiento]) errores.push({ campo: 'tratamiento', mensaje: 'Elige un tratamiento de la lista.' });
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const d = m && new Date(+m[1], +m[2] - 1, +m[3]);
  if (!d || d.getMonth() !== +m[2] - 1) errores.push({ campo: 'fecha', mensaje: 'Elige un día en el calendario.' });
  else if (fecha < hoyLocal()) errores.push({ campo: 'fecha', mensaje: 'Ese día ya pasó. Elige uno a partir de hoy.' });
  else if (d.getDay() === 0 || d.getDay() === 6) errores.push({ campo: 'fecha', mensaje: 'Atendemos de lunes a viernes. Elige un día entre semana.' });
  if (!HORAS.includes(hora)) errores.push({ campo: 'hora', mensaje: 'Elige una hora entre 9:00 y 17:00 (atendemos de 9 a 18).' });
  else if (fecha === hoyLocal()) {
    const n = new Date(); if (hora <= `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`) errores.push({ campo: 'hora', mensaje: 'Esa hora de hoy ya pasó. Elige otra.' });
  }
  if (comentario.length > 500) errores.push({ campo: 'comentario', mensaje: 'El comentario es muy largo (máximo 500 letras).' });
  return { errores, datos: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---------- Rutas ----------
async function api(req, res, url) {
  const ruta = url.pathname;
  const ip = ipDe(req);

  if (req.method === 'POST' && ruta === '/api/citas') {
    const quiereJson = (req.headers.accept || '').includes('application/json');
    const responder = (estado, cuerpo) => {
      if (quiereJson) return json(res, estado, cuerpo);
      if (estado === 201 || estado === 200) { res.writeHead(303, { Location: '/gracias.html' }); return res.end(); }
      const lista = (cuerpo.errores || [{ mensaje: cuerpo.mensaje }]).map((e) => `<li>${esc(e.mensaje)}</li>`).join('');
      return pagina(res, estado, 'No pudimos guardar tu solicitud', `<ul>${lista}</ul><p><a class="boton" href="/#cita" onclick="history.back();return false">Volver al formulario</a></p>`);
    };
    const espera = Math.max(envios.bloqueado(ip), rechazos.bloqueado(ip));
    if (espera) { res.setHeader('Retry-After', espera); return responder(429, { mensaje: 'Has enviado muchas solicitudes seguidas. Intenta de nuevo en unos minutos, o llámanos.' }); }
    const cuerpo = await leerCuerpo(req);
    if (typeof cuerpo.sitio_web === 'string' && cuerpo.sitio_web !== '') { rechazos.golpe(ip); return responder(201, { ok: true }); } // trampa para bots: se finge éxito y no se guarda
    const { errores, datos } = validar(cuerpo);
    if (errores.length) { rechazos.golpe(ip); return responder(400, { errores }); }
    envios.golpe(ip);
    if (solicitudes.filter((s) => s.estado === 'pendiente').length >= MAX_PENDIENTES) return responder(503, { mensaje: 'Ahora mismo no podemos recibir más solicitudes en línea. Por favor llámanos.' });
    await transaccion((lista) => {
      const repetida = lista.some((s) => s.estado === 'pendiente' && s.telefono === datos.telefono && s.fecha === datos.fecha && s.hora === datos.hora && s.tratamiento === datos.tratamiento);
      if (repetida) return { lista, resultado: null }; // doble clic: no se duplica
      return { lista: [...lista, { id: randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...datos }], resultado: null };
    });
    return responder(201, { ok: true });
  }

  if (ruta === '/api/admin/entrar' && req.method === 'POST') {
    const espera = intentosLogin.bloqueado(ip);
    if (espera) return json(res, 429, { mensaje: `Demasiados intentos. Espera ${espera} segundos.` }, { 'Retry-After': String(espera) });
    const { clave } = await leerCuerpo(req);
    if (typeof clave !== 'string' || !claveCorrecta(clave)) {
      const e = intentosLogin.golpe(ip);
      return json(res, 401, { mensaje: e ? 'Demasiados intentos. Espera un minuto.' : 'Contraseña incorrecta.' });
    }
    const token = randomBytes(24).toString('hex');
    sesiones.set(token, Date.now() + 8 * 3600_000);
    return json(res, 200, { ok: true }, { 'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
  }
  if (ruta === '/api/admin/salir' && req.method === 'POST') {
    sesiones.delete(cookies(req).sesion);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (ruta.startsWith('/api/admin/')) {
    if (!haySesion(req)) return json(res, 401, { mensaje: 'Inicia sesión.' });
    if (req.method === 'GET' && ruta === '/api/admin/citas') {
      const lista = [...solicitudes].sort((a, b) => (a.creada < b.creada ? 1 : -1));
      return json(res, 200, { citas: lista });
    }
    const m = /^\/api\/admin\/citas\/([\w-]+)$/.exec(ruta);
    if (m && req.method === 'PATCH') {
      const { estado } = await leerCuerpo(req);
      if (!ESTADOS.includes(estado)) return json(res, 400, { mensaje: 'Estado no válido.' });
      const cita = await transaccion((lista) => {
        const i = lista.findIndex((s) => s.id === m[1]);
        if (i < 0) return { lista, resultado: null };
        const nueva = [...lista]; nueva[i] = { ...lista[i], estado };
        return { lista: nueva, resultado: nueva[i] };
      });
      return cita ? json(res, 200, { cita }) : json(res, 404, { mensaje: 'Esa solicitud ya no existe.' });
    }
    if (m && req.method === 'DELETE') {
      const hubo = await transaccion((lista) => {
        const nueva = lista.filter((s) => s.id !== m[1]);
        return { lista: nueva, resultado: nueva.length !== lista.length };
      });
      return hubo ? json(res, 200, { ok: true }) : json(res, 404, { mensaje: 'Esa solicitud ya no existe.' });
    }
  }
  return json(res, 404, { mensaje: 'No encontrado.' });
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon' };
async function estatico(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let nombre;
  try { nombre = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (nombre === '/') nombre = '/index.html';
  if (nombre === '/admin') nombre = '/admin.html';
  const archivo = path.normalize(path.join(PUBLICO, nombre));
  if (!archivo.startsWith(PUBLICO + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    const contenido = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    return res.end(req.method === 'HEAD' ? undefined : contenido);
  } catch {
    return pagina(res, 404, 'Página no encontrada', '<p><a class="boton" href="/">Ir al inicio</a></p>');
  }
}

const servidor = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return await estatico(req, res, url);
  } catch (e) {
    if (e.estado) return json(res, e.estado, { mensaje: e.message });
    console.error(e);
    if (!res.headersSent) return json(res, 500, { mensaje: 'Algo salió mal en el servidor. Intenta de nuevo o llámanos.' });
    res.end();
  }
});
servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\nEl puerto ${PUERTO} ya está en uso por otro programa. Usa otro, por ejemplo:\n  PowerShell:  $env:PORT=8081; node servidor.mjs\n  Mac/Linux:   PORT=8081 node servidor.mjs\n`);
  else console.error(e);
  process.exit(1);
});
servidor.listen(PUERTO, () => {
  console.log(`Fisio Andares en http://localhost:${PUERTO}`);
  console.log(`Panel de la dueña: http://localhost:${PUERTO}/admin   (contraseña: ${CLAVE}, desde ${origenClave})`);
});
