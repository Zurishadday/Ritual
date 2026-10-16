// Servidor de Fisio Andares. Sin dependencias: solo módulos de Node.
// Uso: node servidor.mjs   (variables opcionales: PORT, HOST, ADMIN_PASSWORD, DATA_DIR)
import { createServer } from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DATOS = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'solicitudes.json');
const PUERTO = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// ---- Reglas del negocio -------------------------------------------------
const TRATAMIENTOS = {
  rodilla: 'Rehabilitación de rodilla',
  espalda: 'Dolor de espalda',
  masaje: 'Masaje deportivo',
};
// Se atiende de 9:00 a 18:00; la última sesión (de hasta 60 min) empieza a las 17:00.
const HORAS = [];
for (let min = 9 * 60; min <= 17 * 60; min += 30) {
  HORAS.push(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`);
}
const DIAS_MAX_ADELANTE = Number(process.env.DIAS_MAX_ADELANTE) || 90;
const MAX_SOLICITUDES = 5000;
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];

const ENVIOS_POR_VENTANA = 5;
const VENTANA_ENVIOS_MS = 10 * 60 * 1000;
const FALLOS_LOGIN_MAX = 5;
const VENTANA_LOGIN_MS = 60 * 1000;
const DURACION_SESION_MS = 8 * 60 * 60 * 1000;

// ---- Contraseña de la administradora -----------------------------------
mkdirSync(DATOS, { recursive: true });
function obtenerClave() {
  if (process.env.ADMIN_PASSWORD) return { clave: process.env.ADMIN_PASSWORD, origen: 'ADMIN_PASSWORD' };
  const archivo = path.join(DATOS, 'clave-admin.txt');
  if (existsSync(archivo)) {
    const guardada = readFileSync(archivo, 'utf8').trim();
    if (guardada) return { clave: guardada, origen: archivo };
  }
  const nueva = randomBytes(9).toString('base64url');
  writeFileSync(archivo, nueva + '\n');
  return { clave: nueva, origen: archivo };
}
const { clave: CLAVE, origen: ORIGEN_CLAVE } = obtenerClave();
const HASH_CLAVE = createHash('sha256').update(CLAVE).digest();
function claveCorrecta(intento) {
  const h = createHash('sha256').update(String(intento ?? '')).digest();
  return timingSafeEqual(h, HASH_CLAVE);
}

// ---- Almacén de solicitudes --------------------------------------------
// La lista vive en memoria (la verdad mientras el servidor corre) y se escribe completa
// a disco de forma atómica en cada cambio. Las escrituras se hacen una a una en una cola.
let citas = [];
let avisoAlmacen = '';

function cargarAlmacen() {
  if (!existsSync(ARCHIVO)) return;
  try {
    const lista = JSON.parse(readFileSync(ARCHIVO, 'utf8'));
    if (!Array.isArray(lista)) throw new Error('el archivo no contiene una lista');
    citas = lista;
  } catch (e) {
    // Archivo dañado: se aparta (no se borra) y se sigue con una lista vacía para
    // que la siguiente solicitud no se pierda.
    const copia = ARCHIVO.replace(/\.json$/, `.danado-${Date.now()}.json`);
    renameSync(ARCHIVO, copia);
    avisoAlmacen = `El archivo de solicitudes estaba dañado (${e.message}). Se guardó una copia en ${path.basename(copia)} y se empezó con una lista vacía.`;
    console.error('[aviso]', avisoAlmacen);
  }
}
cargarAlmacen();

let cola = Promise.resolve();
// mutar(lista) recibe una copia y devuelve { lista, resultado }. Solo si el disco
// se escribió bien, la memoria adopta la nueva lista.
function transaccion(mutar) {
  const tarea = cola.then(async () => {
    const { lista, resultado } = mutar(citas.slice());
    if (lista !== null) {
      const tmp = ARCHIVO + '.tmp';
      await writeFile(tmp, JSON.stringify(lista, null, 2));
      await rename(tmp, ARCHIVO);
      citas = lista;
    }
    return resultado;
  });
  cola = tarea.catch(() => {});
  return tarea;
}

// ---- Límites de uso -----------------------------------------------------
const envios = new Map(); // ip -> [marcas de tiempo]
const fallosLogin = new Map(); // ip -> [marcas de tiempo]
const sesiones = new Map(); // token -> expira

function recientes(mapa, ip, ventana) {
  const ahora = Date.now();
  const lista = (mapa.get(ip) || []).filter((t) => ahora - t < ventana);
  mapa.set(ip, lista);
  return lista;
}
function permitirEnvio(ip) {
  const lista = recientes(envios, ip, VENTANA_ENVIOS_MS);
  if (lista.length >= ENVIOS_POR_VENTANA) return false;
  lista.push(Date.now());
  return true;
}
function segundosDeEspera(ip) {
  const lista = recientes(fallosLogin, ip, VENTANA_LOGIN_MS);
  if (lista.length < FALLOS_LOGIN_MAX) return 0;
  return Math.max(1, Math.ceil((lista[0] + VENTANA_LOGIN_MS - Date.now()) / 1000));
}
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, l] of envios) if (!l.some((t) => ahora - t < VENTANA_ENVIOS_MS)) envios.delete(ip);
  for (const [ip, l] of fallosLogin) if (!l.some((t) => ahora - t < VENTANA_LOGIN_MS)) fallosLogin.delete(ip);
  for (const [tk, exp] of sesiones) if (exp < ahora) sesiones.delete(tk);
}, 60 * 1000).unref();

// ---- Validación ---------------------------------------------------------
const limpiar = (v, max) =>
  String(v ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);

function validar(entrada) {
  const errores = {};
  const nombre = limpiar(entrada.nombre, 80).replace(/\s+/g, ' ');
  const telefono = limpiar(entrada.telefono, 30);
  const correo = limpiar(entrada.correo, 120);
  const tratamiento = limpiar(entrada.tratamiento, 20);
  const fecha = limpiar(entrada.fecha, 10);
  const hora = limpiar(entrada.hora, 5);
  const comentario = limpiar(entrada.comentario, 500);

  if (nombre.length < 2) errores.nombre = 'Escribe tu nombre.';
  const digitos = telefono.replace(/\D/g, '').length;
  if (!/^[\d\s()+\-.]+$/.test(telefono) || digitos < 8 || digitos > 15) {
    errores.telefono = 'Escribe un teléfono válido, con lada (por ejemplo 33 1234 5678).';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) errores.correo = 'Escribe un correo válido (nombre@ejemplo.com).';
  if (!Object.hasOwn(TRATAMIENTOS, tratamiento)) errores.tratamiento = 'Elige un tratamiento.';

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  let dia = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (dia && (dia.getUTCFullYear() !== +m[1] || dia.getUTCMonth() !== +m[2] - 1 || dia.getUTCDate() !== +m[3])) dia = null;
  if (!dia) {
    errores.fecha = 'Elige el día que prefieres.';
  } else {
    const n = new Date();
    const hoy = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
    const diaSemana = dia.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) errores.fecha = 'Atendemos de lunes a viernes. Elige un día entre semana.';
    else if (dia.getTime() <= hoy) errores.fecha = 'Elige una fecha a partir de mañana.';
    else if (dia.getTime() > hoy + DIAS_MAX_ADELANTE * 86400000) errores.fecha = 'Elige una fecha dentro de los próximos 3 meses.';
  }
  if (!HORAS.includes(hora)) errores.hora = 'Elige una hora entre las 9:00 y las 17:00.';

  return { errores, datos: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---- Utilidades HTTP ----------------------------------------------------
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function enviarJson(res, estado, cuerpo, extra = {}) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(cuerpo));
}
function enviarHtml(res, estado, titulo, cuerpo, extra = {}) {
  res.writeHead(estado, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/estilos.css"></head><body class="pagina-simple"><main class="caja">${cuerpo}</main></body></html>`);
}

class ErrorHttp extends Error {
  constructor(estado, mensaje) { super(mensaje); this.estado = estado; }
}
function leerCuerpo(req, limite = 20000) {
  return new Promise((resolve, reject) => {
    let total = 0;
    let excedido = false;
    const trozos = [];
    req.on('data', (t) => {
      total += t.length;
      if (excedido) { if (total > 1e6) req.destroy(); return; } // se descarta el resto; si es enorme, se corta
      if (total > limite) { excedido = true; trozos.length = 0; reject(new ErrorHttp(413, 'El mensaje es demasiado largo.')); return; }
      trozos.push(t);
    });
    req.on('end', () => resolve(Buffer.concat(trozos).toString('utf8')));
    req.on('error', reject);
  });
}
async function leerEntrada(req) {
  const texto = await leerCuerpo(req);
  const tipo = String(req.headers['content-type'] || '');
  if (tipo.includes('application/json')) {
    let v;
    try { v = JSON.parse(texto || '{}'); } catch { throw new ErrorHttp(400, 'No se pudo leer el mensaje.'); }
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ErrorHttp(400, 'No se pudo leer el mensaje.');
    return { datos: v, esFormulario: false };
  }
  return { datos: Object.fromEntries(new URLSearchParams(texto)), esFormulario: true };
}

function ipDe(req) { return req.socket.remoteAddress || 'desconocida'; }

function sesionActiva(req) {
  const m = /(?:^|;\s*)sesion=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  if (!m) return null;
  const exp = sesiones.get(m[1]);
  if (!exp || exp < Date.now()) { sesiones.delete(m[1]); return null; }
  return m[1];
}

// ---- Rutas de la API ----------------------------------------------------
async function recibirSolicitud(req, res) {
  let entrada;
  try {
    entrada = await leerEntrada(req);
  } catch (e) {
    if (e instanceof ErrorHttp) return enviarJson(res, e.estado, { error: e.message });
    throw e;
  }
  const { datos, esFormulario } = entrada;
  const fallo = (estado, mensaje, errores) => {
    if (!esFormulario) return enviarJson(res, estado, { error: mensaje, errores });
    const lista = errores ? `<ul>${Object.values(errores).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    return enviarHtml(res, estado, 'No se pudo enviar', `<h1>No se pudo enviar tu solicitud</h1><p>${esc(mensaje)}</p>${lista}<p>Usa el botón «Atrás» de tu navegador para corregir y volver a enviar, o <a href="/#contacto">llámanos</a>.</p>`);
  };

  // Campo trampa para bots: las personas no lo ven. Se responde «bien» sin guardar nada.
  if (limpiar(datos.sitio_web, 200)) {
    return esFormulario ? redirigir(res, '/cita-enviada.html') : enviarJson(res, 201, { ok: true });
  }

  const { errores, datos: limpio } = validar(datos);
  if (Object.keys(errores).length) return fallo(400, 'Revisa estos datos:', errores);

  if (!permitirEnvio(ipDe(req))) {
    return fallo(429, 'Has enviado varias solicitudes seguidas. Espera unos minutos o llámanos por teléfono.');
  }

  try {
    await transaccion((lista) => {
      // Doble clic o reenvío: la misma solicitud en los últimos 2 minutos no se repite.
      const ahora = Date.now();
      const repetida = lista.slice(-20).some((c) =>
        ahora - Date.parse(c.creadaEn) < 120000 &&
        ['telefono', 'tratamiento', 'fecha', 'hora'].every((k) => c[k] === limpio[k]));
      if (repetida) return { lista: null, resultado: 'repetida' };
      if (lista.length >= MAX_SOLICITUDES) throw new ErrorHttp(503, 'Por ahora no podemos recibir más solicitudes en línea.');
      lista.push({ id: randomUUID(), creadaEn: new Date().toISOString(), estado: 'pendiente', ...limpio });
      return { lista, resultado: 'guardada' };
    });
  } catch (e) {
    if (e instanceof ErrorHttp) return fallo(e.estado, e.message + ' Llámanos por teléfono, por favor.');
    console.error('[error] no se pudo guardar la solicitud:', e);
    return fallo(500, 'No pudimos guardar tu solicitud. Intenta de nuevo en un momento o llámanos por teléfono.');
  }
  return esFormulario ? redirigir(res, '/cita-enviada.html') : enviarJson(res, 201, { ok: true });
}

function redirigir(res, destino) {
  res.writeHead(303, { Location: destino, 'Cache-Control': 'no-store' });
  res.end();
}

async function iniciarSesion(req, res) {
  const ip = ipDe(req);
  const espera = segundosDeEspera(ip);
  if (espera) {
    return enviarJson(res, 429, { error: `Demasiados intentos. Espera ${espera} segundos para volver a probar.`, espera }, { 'Retry-After': String(espera) });
  }
  let entrada;
  try { entrada = await leerEntrada(req); } catch (e) {
    if (e instanceof ErrorHttp) return enviarJson(res, e.estado, { error: e.message });
    throw e;
  }
  if (!claveCorrecta(entrada.datos.clave)) {
    recientes(fallosLogin, ip, VENTANA_LOGIN_MS).push(Date.now());
    const nueva = segundosDeEspera(ip);
    if (nueva) {
      return enviarJson(res, 429, { error: `Contraseña incorrecta. Demasiados intentos: espera ${nueva} segundos.`, espera: nueva }, { 'Retry-After': String(nueva) });
    }
    return enviarJson(res, 401, { error: 'Contraseña incorrecta.' });
  }
  const token = randomBytes(32).toString('hex');
  sesiones.set(token, Date.now() + DURACION_SESION_MS);
  enviarJson(res, 200, { ok: true }, { 'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DURACION_SESION_MS / 1000}` });
}

function vistaCita(c) {
  return { ...c, tratamientoNombre: TRATAMIENTOS[c.tratamiento] || c.tratamiento };
}

async function apiAdmin(req, res, ruta) {
  if (req.method === 'POST' && ruta === '/api/admin/login') return iniciarSesion(req, res);

  const token = sesionActiva(req);
  if (!token) return enviarJson(res, 401, { error: 'Entra con tu contraseña.' });

  if (req.method === 'POST' && ruta === '/api/admin/logout') {
    sesiones.delete(token);
    return enviarJson(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (req.method === 'GET' && ruta === '/api/admin/citas') {
    // Se agregan en orden de llegada, así que las más nuevas están al final: basta invertir.
    return enviarJson(res, 200, { citas: citas.map(vistaCita).reverse(), aviso: avisoAlmacen });
  }
  const m = /^\/api\/admin\/citas\/([0-9a-f-]{36})$/.exec(ruta);
  if (m && (req.method === 'PATCH' || req.method === 'DELETE')) {
    const id = m[1];
    let estadoNuevo;
    if (req.method === 'PATCH') {
      let entrada;
      try { entrada = await leerEntrada(req); } catch (e) {
        if (e instanceof ErrorHttp) return enviarJson(res, e.estado, { error: e.message });
        throw e;
      }
      estadoNuevo = entrada.datos.estado;
      if (!ESTADOS.includes(estadoNuevo)) return enviarJson(res, 400, { error: 'Estado no válido.' });
    }
    try {
      const resultado = await transaccion((lista) => {
        const i = lista.findIndex((c) => c.id === id);
        if (i < 0) return { lista: null, resultado: null };
        if (req.method === 'DELETE') { lista.splice(i, 1); return { lista, resultado: true }; }
        lista[i] = { ...lista[i], estado: estadoNuevo };
        return { lista, resultado: lista[i] };
      });
      if (!resultado) return enviarJson(res, 404, { error: 'Esa solicitud ya no existe. Actualiza la lista.' });
      return enviarJson(res, 200, req.method === 'DELETE' ? { ok: true } : { cita: vistaCita(resultado) });
    } catch (e) {
      console.error('[error] no se pudo actualizar:', e);
      return enviarJson(res, 500, { error: 'No se pudo guardar el cambio. Intenta de nuevo.' });
    }
  }
  return enviarJson(res, 404, { error: 'No encontrado.' });
}

// ---- Archivos estáticos -------------------------------------------------
async function servirEstatico(req, res, ruta) {
  let rel;
  try { rel = decodeURIComponent(ruta); } catch { rel = null; }
  if (rel === '/') rel = '/index.html';
  if (rel === '/admin') rel = '/admin.html';
  const noEncontrado = () => enviarHtml(res, 404, 'No encontrada', '<h1>Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>');
  if (!rel || rel.includes('\0')) return noEncontrado();
  const archivo = path.resolve(PUBLICO, '.' + rel);
  if (!archivo.startsWith(PUBLICO + path.sep)) return noEncontrado();
  const tipo = TIPOS[path.extname(archivo).toLowerCase()];
  if (!tipo) return noEncontrado();
  let contenido;
  try { contenido = await readFile(archivo); } catch { return noEncontrado(); }
  const cache = tipo.startsWith('image/') ? 'public, max-age=86400' : 'no-cache';
  res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': contenido.length, 'Cache-Control': cache });
  res.end(req.method === 'HEAD' ? undefined : contenido);
}

// ---- Servidor -----------------------------------------------------------
const servidor = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  try {
    const ruta = new URL(req.url, 'http://localhost').pathname;
    if (ruta === '/api/citas' && req.method === 'POST') return await recibirSolicitud(req, res);
    if (ruta.startsWith('/api/admin/')) return await apiAdmin(req, res, ruta);
    if (ruta.startsWith('/api/')) return enviarJson(res, 404, { error: 'No encontrado.' });
    if (req.method === 'GET' || req.method === 'HEAD') return await servirEstatico(req, res, ruta);
    return enviarJson(res, 405, { error: 'Método no permitido.' });
  } catch (e) {
    console.error('[error]', e);
    if (!res.headersSent) enviarJson(res, 500, { error: 'Algo salió mal. Intenta de nuevo o llámanos por teléfono.' });
    else res.end();
  }
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Fisio Andares en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`);
  console.log(`Panel de la administradora: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}/admin`);
  console.log(`Contraseña del panel: ${process.env.ADMIN_PASSWORD ? '(la de ADMIN_PASSWORD)' : CLAVE}   [${ORIGEN_CLAVE}]`);
});
