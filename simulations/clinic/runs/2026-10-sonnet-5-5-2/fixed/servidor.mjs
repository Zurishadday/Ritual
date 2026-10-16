// Servidor de Fisio Andares. Sin dependencias: solo módulos de Node.
// Uso: node servidor.mjs   (PORT, ADMIN_PASSWORD y DATOS_DIR son opcionales)
import http from 'node:http';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
const DATOS = process.env.DATOS_DIR || path.join(RAIZ, 'datos');
const ARCHIVO_CITAS = path.join(DATOS, 'citas.json');
const ARCHIVO_CLAVE = path.join(DATOS, 'clave.txt');
const PUERTO = Number(process.env.PORT) || 3000;

const TRATAMIENTOS = ['rodilla', 'espalda', 'masaje'];
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];
const HORAS = [];
for (let h = 9; h <= 17; h++) {
  HORAS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 17) HORAS.push(`${String(h).padStart(2, '0')}:30`);
}

// ---------- Contraseña de la página de administración ----------
await mkdir(DATOS, { recursive: true });
let CLAVE = process.env.ADMIN_PASSWORD;
let origenClave = 'variable ADMIN_PASSWORD';
if (!CLAVE) {
  try {
    CLAVE = (await readFile(ARCHIVO_CLAVE, 'utf8')).trim();
  } catch {}
  if (!CLAVE) {
    CLAVE = randomBytes(9).toString('base64url');
    await writeFile(ARCHIVO_CLAVE, CLAVE + '\n', { mode: 0o600 });
  }
  origenClave = ARCHIVO_CLAVE;
}
const hash = (s) => createHash('sha256').update(String(s)).digest();
const claveCorrecta = (s) => timingSafeEqual(hash(s), hash(CLAVE));

// ---------- Sesiones y límites en memoria ----------
const sesiones = new Map(); // token -> expiración
const intentosFallidos = new Map(); // ip -> { n, hasta }
const solicitudesPorIp = new Map(); // ip -> [marcas de tiempo]
const HORA_MS = 3600 * 1000;

function sesionValida(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const exp = sesiones.get(m[1]);
  if (!exp) return false;
  if (exp < Date.now()) {
    sesiones.delete(m[1]);
    return false;
  }
  return true;
}

// Solo cuentan las solicitudes ya validadas: corregir un error de captura no gasta cupo.
function cupoCita(ip) {
  const ahora = Date.now();
  const lista = (solicitudesPorIp.get(ip) || []).filter((t) => ahora - t < HORA_MS);
  solicitudesPorIp.set(ip, lista);
  return lista.length < 10;
}
function registrarCita(ip) {
  const lista = solicitudesPorIp.get(ip) || [];
  lista.push(Date.now());
  solicitudesPorIp.set(ip, lista);
}

setInterval(() => {
  const ahora = Date.now();
  for (const [t, e] of sesiones) if (e < ahora) sesiones.delete(t);
  for (const [ip, v] of intentosFallidos) if (v.hasta < ahora) intentosFallidos.delete(ip);
  for (const [ip, l] of solicitudesPorIp) {
    const f = l.filter((t) => ahora - t < HORA_MS);
    if (f.length) solicitudesPorIp.set(ip, f);
    else solicitudesPorIp.delete(ip);
  }
}, 10 * 60 * 1000).unref();

// ---------- Almacenamiento (JSON, escrituras en serie y atómicas) ----------
// citas va de la más nueva a la más antigua; nunca se modifica en sitio: cada cambio
// construye la lista nueva, la escribe en disco y solo entonces la adopta en memoria.
let citas = [];
let conteo = { total: 0, pendiente: 0, confirmada: 0, cancelada: 0 };
function recontar() {
  conteo = { total: citas.length, pendiente: 0, confirmada: 0, cancelada: 0 };
  for (const c of citas) conteo[c.estado] = (conteo[c.estado] || 0) + 1;
}
try {
  const leidas = JSON.parse(await readFile(ARCHIVO_CITAS, 'utf8'));
  if (!Array.isArray(leidas)) throw new Error('no es una lista');
  citas = leidas.sort((a, b) => (a.creada < b.creada ? 1 : -1));
} catch (e) {
  if (e.code !== 'ENOENT') {
    // Archivo dañado: se aparta para no perderlo y el servidor arranca con una lista vacía.
    const apartado = path.join(DATOS, `citas.danado-${Date.now()}.json`);
    await rename(ARCHIVO_CITAS, apartado).catch(() => {});
    console.error(`citas.json no se pudo leer (${e.message}). Se guardó en ${apartado} y se empieza sin solicitudes.`);
  }
}
recontar();

let cola = Promise.resolve();
// cambiar(lista) devuelve { lista, resultado }. Si escribir falla, la memoria queda como estaba
// y la siguiente operación se intenta de nuevo con normalidad.
function transaccion(cambiar) {
  const paso = cola.then(async () => {
    const { lista, resultado } = cambiar(citas);
    const tmp = ARCHIVO_CITAS + '.tmp';
    await rm(tmp, { recursive: true, force: true });
    await writeFile(tmp, JSON.stringify(lista));
    await rename(tmp, ARCHIVO_CITAS);
    citas = lista;
    recontar();
    return resultado;
  });
  cola = paso.catch(() => {});
  return paso;
}

// ---------- Validación ----------
function fechaLocal(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const f = new Date(y, mo - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== mo - 1 || f.getDate() !== d) return null;
  return f;
}

function validarCita(b) {
  const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max + 1) : '');
  const nombre = texto(b.nombre, 100);
  const telefono = texto(b.telefono, 30);
  const correo = texto(b.correo, 120);
  const comentario = texto(b.comentario, 500);
  const { tratamiento, fecha, hora } = b;

  if (nombre.length < 2 || nombre.length > 100) return { error: 'Escribe tu nombre.', campo: 'nombre' };
  if (telefono.replace(/\D/g, '').length < 8 || !/^[\d\s()+\-.]{8,30}$/.test(telefono))
    return { error: 'Escribe un teléfono válido.', campo: 'telefono' };
  if (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    return { error: 'Escribe un correo válido.', campo: 'correo' };
  if (!TRATAMIENTOS.includes(tratamiento)) return { error: 'Elige un tratamiento.', campo: 'tratamiento' };
  if (comentario.length > 500) return { error: 'El comentario es demasiado largo (máximo 500 caracteres).', campo: 'comentario' };

  const f = fechaLocal(fecha);
  if (!f) return { error: 'Elige una fecha válida.', campo: 'fecha' };
  const dia = f.getDay();
  if (dia === 0 || dia === 6) return { error: 'Atendemos de lunes a viernes.', campo: 'fecha' };
  if (!HORAS.includes(hora)) return { error: 'Elige una hora entre las 9:00 y las 17:00.', campo: 'hora' };
  const [hh, mm] = hora.split(':').map(Number);
  if (new Date(f.getFullYear(), f.getMonth(), f.getDate(), hh, mm) <= new Date())
    return { error: 'Elige una fecha y hora futuras.', campo: 'hora' };

  return { valor: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---------- Utilidades HTTP ----------
const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'",
};

function responderJson(res, codigo, objeto, extra = {}) {
  res.writeHead(codigo, {
    ...CABECERAS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  res.end(JSON.stringify(objeto));
}

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function responderPagina(res, codigo, titulo, mensaje) {
  res.writeHead(codigo, { ...CABECERAS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/estilos.css"></head><body><main class="seccion"><h1>${esc(titulo)}</h1><p>${esc(mensaje)}</p><p><a class="boton" href="/#cita">Volver al formulario</a></p></main></body></html>`);
}

// Lee el cuerpo (JSON o formulario clásico). Si se pasa del límite lo descarta sin guardarlo
// y sigue leyendo hasta el final para poder contestar 413 sin cortar la conexión.
function leerCuerpo(req, limite = 10 * 1024) {
  return new Promise((resolve, reject) => {
    const falla = (codigo) => Object.assign(new Error('cuerpo'), { codigo });
    if (Number(req.headers['content-length']) > limite) {
      req.resume();
      return reject(falla(413));
    }
    let total = 0;
    let excedido = false;
    const partes = [];
    req.on('data', (c) => {
      total += c.length;
      if (excedido) return;
      if (total > limite) {
        excedido = true;
        partes.length = 0;
        return reject(falla(413));
      }
      partes.push(c);
    });
    req.on('end', () => {
      if (excedido) return;
      const texto = Buffer.concat(partes).toString('utf8');
      try {
        if ((req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) {
          return resolve(Object.fromEntries(new URLSearchParams(texto)));
        }
        const v = JSON.parse(texto);
        if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error();
        resolve(v);
      } catch {
        reject(falla(400));
      }
    });
    req.on('error', reject);
  });
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

async function servirEstatico(req, res, ruta) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...CABECERAS, Allow: 'GET, HEAD' });
    return res.end();
  }
  if (ruta === '/') ruta = '/index.html';
  if (ruta === '/admin') ruta = '/admin.html';
  let archivo;
  try {
    archivo = path.normalize(path.join(PUBLICO, decodeURIComponent(ruta)));
  } catch {
    archivo = null;
  }
  if (!archivo || archivo.includes('\0') || !archivo.startsWith(PUBLICO + path.sep)) {
    res.writeHead(404, CABECERAS);
    return res.end('No encontrado');
  }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, {
      ...CABECERAS,
      'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': path.extname(archivo) === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(req.method === 'HEAD' ? undefined : datos);
  } catch {
    res.writeHead(404, { ...CABECERAS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
}

// ---------- API ----------
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const LIMITE_PAGINA = 50;

function listar(url) {
  const estado = ESTADOS.includes(url.searchParams.get('estado')) ? url.searchParams.get('estado') : null;
  const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
  const desde = Math.max(0, parseInt(url.searchParams.get('desde'), 10) || 0);
  const limite = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limite'), 10) || LIMITE_PAGINA));
  const pagina = [];
  let vistos = 0;
  let hayMas = false;
  for (const c of citas) {
    if (estado && c.estado !== estado) continue;
    if (q && !(c.nombre + ' ' + c.correo + ' ' + c.telefono + ' ' + c.comentario).toLowerCase().includes(q)) continue;
    if (vistos++ < desde) continue;
    if (pagina.length === limite) {
      hayMas = true;
      break;
    }
    pagina.push(c);
  }
  return { citas: pagina, hayMas, siguiente: desde + pagina.length, conteo };
}

async function api(req, res, ruta, url) {
  const ip = req.socket.remoteAddress || '?';
  const formulario = (req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded');

  if (ruta === '/api/login' && req.method === 'POST') {
    const b = await leerCuerpo(req);
    // La contraseña correcta siempre entra. Los intentos fallidos se frenan: tras 5 por IP se
    // rechazan y cada fallo tarda un poco en contestar.
    if (typeof b.clave === 'string' && claveCorrecta(b.clave)) {
      intentosFallidos.delete(ip);
      const token = randomBytes(24).toString('base64url');
      sesiones.set(token, Date.now() + 8 * HORA_MS);
      return responderJson(res, 200, { token });
    }
    const v = intentosFallidos.get(ip);
    const vigente = v && v.hasta > Date.now();
    if (vigente && v.n >= 5) return responderJson(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    intentosFallidos.set(ip, { n: (vigente ? v.n : 0) + 1, hasta: Date.now() + 15 * 60 * 1000 });
    await pausa(300);
    return responderJson(res, 401, { error: 'Contraseña incorrecta.' });
  }

  if (ruta === '/api/citas' && req.method === 'POST') {
    const cuerpo = await leerCuerpo(req);
    const fallo = (codigo, error, campo) =>
      formulario ? responderPagina(res, codigo, 'No pudimos enviar tu solicitud', error) : responderJson(res, codigo, { error, campo });
    const { error, campo, valor } = validarCita(cuerpo);
    if (error) return fallo(400, error, campo);
    // Campo trampa para bots: las personas no lo ven. Se responde "bien" sin guardar nada.
    if (typeof cuerpo.sitio_web === 'string' && cuerpo.sitio_web.trim()) {
      if (formulario) {
        res.writeHead(303, { ...CABECERAS, Location: '/gracias.html' });
        return res.end();
      }
      return responderJson(res, 201, { ok: true });
    }
    if (!cupoCita(ip)) return fallo(429, 'Demasiadas solicitudes. Inténtalo más tarde.');
    const cita = { id: randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...valor };
    await transaccion((lista) => ({ lista: [cita, ...lista], resultado: cita }));
    registrarCita(ip);
    if (formulario) {
      res.writeHead(303, { ...CABECERAS, Location: '/gracias.html' });
      return res.end();
    }
    return responderJson(res, 201, { ok: true });
  }

  // Todo lo demás requiere sesión
  if (!sesionValida(req)) return responderJson(res, 401, { error: 'No autorizado.' });

  if (ruta === '/api/citas' && req.method === 'GET') return responderJson(res, 200, listar(url));

  const m = /^\/api\/citas\/([\w-]+)$/.exec(ruta);
  if (m && req.method === 'PATCH') {
    const b = await leerCuerpo(req);
    if (!ESTADOS.includes(b.estado)) return responderJson(res, 400, { error: 'Estado no válido.' });
    const cita = await transaccion((lista) => {
      const i = lista.findIndex((c) => c.id === m[1]);
      if (i < 0) throw Object.assign(new Error('no existe'), { codigo: 404 });
      const nueva = { ...lista[i], estado: b.estado };
      const copia = lista.slice();
      copia[i] = nueva;
      return { lista: copia, resultado: nueva };
    });
    return responderJson(res, 200, { cita, conteo });
  }
  if (m && req.method === 'DELETE') {
    await transaccion((lista) => {
      const i = lista.findIndex((c) => c.id === m[1]);
      if (i < 0) throw Object.assign(new Error('no existe'), { codigo: 404 });
      return { lista: [...lista.slice(0, i), ...lista.slice(i + 1)], resultado: null };
    });
    return responderJson(res, 200, { ok: true, conteo });
  }

  return responderJson(res, 404, { error: 'No encontrado.' });
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) await api(req, res, url.pathname, url);
    else await servirEstatico(req, res, url.pathname);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e.codigo === 413) {
      res.on('finish', () => setTimeout(() => req.destroy(), 3000).unref());
      return responderJson(res, 413, { error: 'Solicitud demasiado grande.' }, { Connection: 'close' });
    }
    if (e.codigo === 404) return responderJson(res, 404, { error: 'No existe esa solicitud.' });
    if (e.codigo) return responderJson(res, e.codigo, { error: 'Datos no válidos.' });
    console.error(e);
    responderJson(res, 500, { error: 'Error del servidor. Inténtalo de nuevo.' });
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Fisio Andares en http://localhost:${PUERTO}`);
  console.log(`Administración: http://localhost:${PUERTO}/admin`);
  console.log(`Contraseña (${origenClave}): ${process.env.ADMIN_PASSWORD ? '(la que definiste)' : CLAVE}`);
});
