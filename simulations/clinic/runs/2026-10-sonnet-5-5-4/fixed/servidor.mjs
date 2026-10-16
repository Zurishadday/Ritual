// Servidor de Fisio Andares. Sin dependencias: node servidor.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrir } from './datos.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(RAIZ, 'publico');
const ARCHIVO = join(process.env.DATOS_DIR || join(RAIZ, 'datos'), 'solicitudes.json');
const MAX_SOLICITUDES = 5000;
const LIMITE_ENVIOS = Number(process.env.LIMITE_ENVIOS) || 5; // solicitudes guardadas por IP cada 10 min
const PUERTO = Number(process.env.PORT) || 3000;

// Contraseña de la página de administración: variable ADMIN_PASSWORD, o una aleatoria que se imprime al arrancar.
const CLAVE = process.env.ADMIN_PASSWORD || randomBytes(6).toString('hex');
const CLAVE_GENERADA = !process.env.ADMIN_PASSWORD;

// Duración en minutos (debe coincidir con lo que se muestra en la página).
const TRATAMIENTOS = { rodilla: 60, espalda: 45, masaje: 30 };
const APERTURA = 9 * 60, CIERRE = 18 * 60;

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon',
};

// ---------- Almacenamiento (escrituras en serie, atómicas) ----------
const almacen = await abrir(ARCHIVO);

// Límite de envíos por IP (ventana de 10 minutos)
const envios = new Map(); // ip -> [marcas de tiempo]
function envioPermitido(ip) {
  const ahora = Date.now();
  if (envios.size > 1000) for (const [k, v] of envios) if (v.every(t => t < ahora - 600_000)) envios.delete(k);
  const marcas = (envios.get(ip) || []).filter(t => t > ahora - 600_000);
  envios.set(ip, marcas);
  return marcas.length < LIMITE_ENVIOS;
}
const contarEnvio = ip => envios.get(ip).push(Date.now());

// ---------- Sesiones y límite de intentos ----------
const sesiones = new Map(); // token -> expira
const SESION_MS = 8 * 3600 * 1000;
const intentos = new Map(); // ip -> { n, hasta }
const hash = s => createHash('sha256').update(s).digest();
const claveOk = s => timingSafeEqual(hash(String(s)), hash(CLAVE));

function sesionValida(req) {
  const m = /(?:^|;\s*)sesion=([a-f0-9]+)/.exec(req.headers.cookie || '');
  const exp = m && sesiones.get(m[1]);
  if (!exp) return false;
  if (exp < Date.now()) { sesiones.delete(m[1]); return false; }
  return true;
}

// ---------- Utilidades ----------
function responder(res, codigo, datos, extra = {}) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(cuerpo);
}

const fallo = (codigo, msg) => Object.assign(new Error(msg), { codigo });

// Lee el cuerpo y devuelve un objeto. Solo JSON (o, para el formulario sin JavaScript, application/x-www-form-urlencoded).
async function leerCuerpo(req, permitirForm = false) {
  const tipo = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const esForm = permitirForm && tipo === 'application/x-www-form-urlencoded';
  if (tipo !== 'application/json' && !esForm) throw fallo(415, 'tipo');
  let tam = 0; const trozos = [];
  for await (const t of req) {
    tam += t.length;
    if (tam > 10_000) throw fallo(413, 'grande');
    trozos.push(t);
  }
  const texto = Buffer.concat(trozos).toString('utf8');
  let obj;
  if (esForm) obj = Object.fromEntries(new URLSearchParams(texto));
  else { try { obj = JSON.parse(texto); } catch { throw fallo(400, 'json'); } }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) throw fallo(400, 'objeto');
  return { datos: obj, esForm };
}

const pad = n => String(n).padStart(2, '0');
const aFecha = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function validar(d) {
  const e = {};
  const txt = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const trat = typeof d.tratamiento === 'string' && Object.hasOwn(TRATAMIENTOS, d.tratamiento) ? d.tratamiento : null;
  const nombre = txt(d.nombre, 100), telefono = txt(d.telefono, 30), correo = txt(d.correo, 120);
  const comentario = txt(d.comentario, 500);
  if (nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  if (!/^[\d\s()+\-.]{7,20}$/.test(telefono) || telefono.replace(/\D/g, '').length < 7) e.telefono = 'Escribe un teléfono válido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) e.correo = 'Escribe un correo válido.';
  if (!trat) e.tratamiento = 'Elige un tratamiento.';

  // Fechas y horas en la hora local del consultorio (la del servidor).
  const ahora = new Date();
  const hoy = aFecha(ahora), minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const limite = aFecha(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 180));
  const fecha = typeof d.fecha === 'string' ? d.fecha : '', hora = typeof d.hora === 'string' ? d.hora : '';
  const mf = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const f = mf && new Date(Date.UTC(+mf[1], +mf[2] - 1, +mf[3]));
  if (!f || f.toISOString().slice(0, 10) !== fecha) e.fecha = 'Elige una fecha.';
  else if (f.getUTCDay() === 0 || f.getUTCDay() === 6) e.fecha = 'Atendemos de lunes a viernes.';
  else if (fecha < hoy) e.fecha = 'Elige una fecha de hoy en adelante.';
  else if (fecha > limite) e.fecha = 'Solo agendamos con hasta 6 meses de anticipación.';

  const mh = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!mh) e.hora = 'Elige una hora.';
  else {
    const ini = +mh[1] * 60 + +mh[2];
    if (ini % 30 !== 0) e.hora = 'Elige una hora de la lista (cada 30 minutos).';
    else if (trat && (ini < APERTURA || ini + TRATAMIENTOS[trat] > CIERRE)) e.hora = 'La sesión debe empezar desde las 9:00 y terminar a las 18:00 como máximo.';
    else if (!e.fecha && fecha === hoy && ini <= minAhora) e.hora = 'Esa hora ya pasó. Elige una más tarde.';
  }
  return { e, v: { nombre, telefono, correo, tratamiento: trat, fecha, hora, comentario } };
}

const PAGINA = (titulo, cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo} · Fisio Andares</title>
<link rel="stylesheet" href="/estilos.css"></head><body><main class="seccion"><h1>${titulo}</h1>${cuerpo}
<p><a class="boton" href="/#cita">Volver al formulario</a></p></main></body></html>`;

function html(res, codigo, titulo, cuerpo) {
  res.writeHead(codigo, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(PAGINA(titulo, cuerpo));
}

// ---------- Rutas API ----------
async function api(req, res, ruta) {
  const ip = req.socket.remoteAddress;

  // Un POST desde otro sitio web (CSRF) trae un Origin distinto al nuestro.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origen = req.headers.origin;
    if (origen && origen !== 'null' && new URL(origen).host !== req.headers.host) return responder(res, 403, { error: 'Origen no permitido.' });
    if (origen === 'null') return responder(res, 403, { error: 'Origen no permitido.' });
  }

  if (ruta === '/api/solicitudes' && req.method === 'POST') {
    const { datos: d, esForm } = await leerCuerpo(req, true);
    const salir = (codigo, titulo, msg, json) => esForm ? html(res, codigo, titulo, msg) : responder(res, codigo, json);
    const { e, v } = validar(d);
    if (Object.keys(e).length) {
      return salir(400, 'Revisa tu solicitud', `<ul>${Object.values(e).map(m => `<li>${m}</li>`).join('')}</ul>`, { errores: e });
    }
    const exito = () => salir(esForm ? 200 : 201, 'Solicitud enviada', '<p>¡Gracias! Te contactaremos para confirmar tu cita.</p>', { ok: true });
    // Trampa para bots: el campo "sitio_web" está oculto para personas. Se responde "ok" sin guardar nada.
    if (typeof d.sitio_web === 'string' && d.sitio_web.trim()) return exito();
    // Misma solicitud repetida (doble clic, reenvío): se responde "ok" sin duplicarla.
    const digitos = v.telefono.replace(/\D/g, '');
    if (almacen.todas().some(x => x.estado !== 'cancelada' && x.tratamiento === v.tratamiento && x.fecha === v.fecha
      && x.hora === v.hora && x.telefono.replace(/\D/g, '') === digitos)) return exito();
    if (!envioPermitido(ip)) return salir(429, 'Demasiadas solicitudes', '<p>Has enviado varias solicitudes seguidas. Espera unos minutos o llámanos.</p>', { error: 'Demasiadas solicitudes. Espera unos minutos o llámanos.' });
    if (almacen.todas().length >= MAX_SOLICITUDES) return salir(503, 'No disponible', '<p>No podemos recibir solicitudes ahora. Llámanos por teléfono.</p>', { error: 'No podemos recibir solicitudes ahora. Llámanos por teléfono.' });
    contarEnvio(ip);
    await almacen.agregar({ id: randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...v });
    return exito();
  }

  if (ruta === '/api/admin/login' && req.method === 'POST') {
    const r = intentos.get(ip) || { n: 0, hasta: 0 };
    if (r.hasta > Date.now()) return responder(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    const { datos: d } = await leerCuerpo(req);
    if (!claveOk(d.clave ?? '')) {
      r.n++; if (r.n >= 5) { r.n = 0; r.hasta = Date.now() + 5 * 60_000; }
      intentos.set(ip, r);
      return responder(res, 401, { error: 'Contraseña incorrecta.' });
    }
    intentos.delete(ip);
    const token = randomBytes(24).toString('hex');
    sesiones.set(token, Date.now() + SESION_MS);
    return responder(res, 200, { ok: true },
      { 'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESION_MS / 1000}` });
  }

  if (ruta === '/api/admin/logout' && req.method === 'POST') {
    const m = /sesion=([a-f0-9]+)/.exec(req.headers.cookie || '');
    if (m) sesiones.delete(m[1]);
    return responder(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (ruta.startsWith('/api/admin/')) {
    if (!sesionValida(req)) return responder(res, 401, { error: 'No autorizado.' });

    if (ruta === '/api/admin/solicitudes' && req.method === 'GET') {
      const orden = [...almacen.todas()].sort((a, b) => b.creada.localeCompare(a.creada));
      return responder(res, 200, orden);
    }
    const m = /^\/api\/admin\/solicitudes\/([\w-]+)$/.exec(ruta);
    if (m && req.method === 'PATCH') {
      const { datos: { estado } } = await leerCuerpo(req);
      if (!['pendiente', 'confirmada', 'cancelada'].includes(estado)) return responder(res, 400, { error: 'Estado inválido.' });
      const s = almacen.buscar(m[1]);
      if (!s) return responder(res, 404, { error: 'No existe.' });
      await almacen.cambiarEstado(s, estado);
      return responder(res, 200, s);
    }
    if (m && req.method === 'DELETE') {
      const s = almacen.buscar(m[1]);
      if (!s) return responder(res, 404, { error: 'No existe.' });
      await almacen.eliminar(s);
      return responder(res, 200, { ok: true });
    }
  }
  responder(res, 404, { error: 'No encontrado.' });
}

// ---------- Archivos estáticos ----------
async function estatico(res, ruta) {
  if (ruta === '/') ruta = '/index.html';
  if (ruta === '/admin') ruta = '/admin.html';
  const archivo = normalize(join(PUBLICO, decodeURIComponent(ruta)));
  if (!archivo.startsWith(PUBLICO + '\\') && !archivo.startsWith(PUBLICO + '/')) { res.writeHead(403); return res.end('Prohibido'); }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(datos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
}

createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'");
  try {
    const ruta = new URL(req.url, 'http://x').pathname;
    if (ruta.startsWith('/api/')) await api(req, res, ruta);
    else if (req.method === 'GET' || req.method === 'HEAD') await estatico(res, ruta);
    else { res.writeHead(405); res.end(); }
  } catch (err) {
    if (res.headersSent) return res.end();
    if (err.codigo) return responder(res, err.codigo, { error: 'Solicitud inválida.' });
    if (err instanceof TypeError && err.code === 'ERR_INVALID_URL') return responder(res, 400, { error: 'Solicitud inválida.' });
    console.error(err);
    responder(res, 500, { error: 'Error del servidor.' });
  }
}).listen(PUERTO, () => {
  console.log(`Fisio Andares en http://localhost:${PUERTO}`);
  console.log(`Administración: http://localhost:${PUERTO}/admin`);
  if (CLAVE_GENERADA) console.log(`Contraseña (aleatoria, cambia en cada arranque): ${CLAVE}\n  Para fijar una: ADMIN_PASSWORD=tuclave node servidor.mjs`);
});
