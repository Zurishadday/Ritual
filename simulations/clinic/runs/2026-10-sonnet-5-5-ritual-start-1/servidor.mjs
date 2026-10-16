// Servidor de Fisio Andares. Sin dependencias: node servidor.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ---- Ajustes ---------------------------------------------------------------
const PUERTO = Number(process.env.PORT) || 3000;
const TELEFONO = '55 0000 0000'; // solo se usa en los mensajes de error; cámbialo también en publico/index.html
const APERTURA = 9 * 60; // 9:00
const CIERRE = 18 * 60; // 18:00
const DIAS_MAXIMOS = 120; // hasta cuántos días adelante se puede pedir cita

const TRATAMIENTOS = {
  rodilla: { nombre: 'Rehabilitación de rodilla', min: 60 },
  espalda: { nombre: 'Dolor de espalda', min: 50 },
  masaje: { nombre: 'Masaje deportivo', min: 45 },
};

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DATOS = process.env.DATOS_DIR || path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'citas.jsonl');
const ARCHIVO_CORRUPTAS = path.join(DATOS, 'citas.corruptas.log');
const ARCHIVO_CLAVE = path.join(DATOS, 'clave.txt');

// ---- Contraseña de la dueña ------------------------------------------------
// Se toma de ADMIN_PASSWORD; si no existe, se genera una vez y se guarda en datos/clave.txt
fs.mkdirSync(DATOS, { recursive: true });
let CLAVE = process.env.ADMIN_PASSWORD;
let origenClave = 'la variable ADMIN_PASSWORD';
if (!CLAVE) {
  origenClave = 'datos/clave.txt';
  try {
    CLAVE = fs.readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
  } catch {}
  if (!CLAVE) {
    CLAVE = crypto.randomBytes(9).toString('base64url');
    fs.writeFileSync(ARCHIVO_CLAVE, CLAVE + '\n');
  }
}
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();
const HASH_CLAVE = hash(CLAVE);

// ---- Almacén de citas (una cita por línea, en memoria + archivo) -----------
let citas = [];

function cargar() {
  if (!fs.existsSync(ARCHIVO)) return;
  const texto = fs.readFileSync(ARCHIVO, 'utf8');
  const malas = [];
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    try {
      const c = JSON.parse(linea);
      if (!c || typeof c !== 'object' || typeof c.id !== 'string') throw new Error('forma');
      citas.push(c);
    } catch {
      malas.push(linea);
    }
  }
  if (texto && !texto.endsWith('\n')) fs.appendFileSync(ARCHIVO, '\n'); // cierre de línea tras una escritura cortada
  if (malas.length) {
    fs.appendFileSync(ARCHIVO_CORRUPTAS, malas.join('\n') + '\n');
    console.warn(`AVISO: ${malas.length} línea(s) dañada(s) en citas.jsonl; se apartaron en datos/citas.corruptas.log`);
  }
}

function reescribir(lista) {
  const tmp = ARCHIVO + '.tmp';
  fs.writeFileSync(tmp, lista.map((c) => JSON.stringify(c)).join('\n') + (lista.length ? '\n' : ''));
  fs.renameSync(tmp, ARCHIVO);
  citas = lista;
}

cargar();

// ---- Límites de uso --------------------------------------------------------
const registros = new Map(); // nombre -> Map(clave -> [marcas de tiempo])
function lista(nombre, clave, ventana) {
  if (!registros.has(nombre)) registros.set(nombre, new Map());
  const m = registros.get(nombre);
  const ahora = Date.now();
  const v = (m.get(clave) || []).filter((t) => ahora - t < ventana);
  m.set(clave, v);
  return v;
}
const excedido = (nombre, clave, max, ventana) => lista(nombre, clave, ventana).length >= max;
const anotar = (nombre, clave, ventana) => lista(nombre, clave, ventana).push(Date.now());
setInterval(() => {
  for (const m of registros.values()) for (const [k, v] of m) if (!v.some((t) => Date.now() - t < 3600e3)) m.delete(k);
}, 600e3).unref();

const sesiones = new Map(); // token -> expira
const DURACION_SESION = 8 * 3600e3;
function sesionValida(req) {
  const m = /(?:^|;\s*)sesion=([\w-]+)/.exec(req.headers.cookie || '');
  const exp = m && sesiones.get(m[1]);
  if (!exp) return false;
  if (exp < Date.now()) {
    sesiones.delete(m[1]);
    return false;
  }
  return true;
}

// ---- Validación ------------------------------------------------------------
const ver = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max + 1);

function horaAMin(h) {
  const m = /^(\d{2}):(\d{2})$/.exec(h);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function validar(d, ahora = new Date()) {
  const e = {};
  const nombre = ver(d.nombre, 80);
  if (nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  else if (nombre.length > 80) e.nombre = 'El nombre es demasiado largo.';

  const telefono = ver(d.telefono, 20);
  const digitos = telefono.replace(/\D/g, '').length;
  if (!/^[\d\s+()\-.]+$/.test(telefono) || digitos < 8 || digitos > 15 || telefono.length > 20)
    e.telefono = 'Escribe un teléfono válido, por ejemplo 55 1234 5678.';

  const correo = ver(d.correo, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 120) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';

  const tratamiento = String(d.tratamiento ?? '');
  const t = Object.hasOwn(TRATAMIENTOS, tratamiento) ? TRATAMIENTOS[tratamiento] : null;
  if (!t) e.tratamiento = 'Elige un tratamiento.';

  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const fecha = String(d.fecha ?? '');
  let dia = null;
  const mf = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (mf) {
    dia = new Date(Number(mf[1]), Number(mf[2]) - 1, Number(mf[3]));
    if (dia.getFullYear() !== Number(mf[1]) || dia.getMonth() !== Number(mf[2]) - 1 || dia.getDate() !== Number(mf[3])) dia = null;
  }
  if (!dia) e.fecha = 'Elige un día.';
  else if (dia < hoy) e.fecha = 'Ese día ya pasó.';
  else if (dia > new Date(hoy.getTime() + DIAS_MAXIMOS * 864e5)) e.fecha = `Solo agendamos con hasta ${DIAS_MAXIMOS} días de anticipación.`;
  else if (dia.getDay() === 0 || dia.getDay() === 6) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';

  const hora = String(d.hora ?? '');
  const min = horaAMin(hora);
  if (Number.isNaN(min) || min < APERTURA || min >= CIERRE || min % 30 !== 0) e.hora = 'Elige una hora entre las 9:00 y las 18:00.';
  else if (t && min + t.min > CIERRE) e.hora = `Esa hora no alcanza: ${t.nombre.toLowerCase()} dura ${t.min} min y cerramos a las 18:00.`;
  else if (dia && dia.getTime() === hoy.getTime() && min <= ahora.getHours() * 60 + ahora.getMinutes()) e.hora = 'Esa hora ya pasó. Elige otra.';

  const comentario = String(d.comentario ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim();
  if (comentario.length > 500) e.comentario = 'El comentario puede tener hasta 500 caracteres.';

  return { errores: e, datos: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---- Utilidades HTTP -------------------------------------------------------
const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

function responder(res, estado, cuerpo, extra = {}) {
  const json = typeof cuerpo !== 'string';
  res.writeHead(estado, {
    'Content-Type': json ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...CABECERAS,
    ...extra,
  });
  res.end(json ? JSON.stringify(cuerpo) : cuerpo);
}

function falla(estado, mensaje) {
  return Object.assign(new Error(mensaje), { estado });
}

async function leerCuerpo(req) {
  const trozos = [];
  let total = 0;
  for await (const t of req) {
    total += t.length;
    if (total > 16 * 1024) throw falla(413, 'Solicitud demasiado grande.');
    trozos.push(t);
  }
  const texto = Buffer.concat(trozos).toString('utf8');
  if ((req.headers['content-type'] || '').includes('application/json')) {
    try {
      const o = JSON.parse(texto || '{}');
      if (!o || typeof o !== 'object' || Array.isArray(o)) throw 0;
      return o;
    } catch {
      throw falla(400, 'JSON inválido.');
    }
  }
  return Object.fromEntries(new URLSearchParams(texto));
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function paginaResultado(titulo, cuerpoHtml) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/estilos.css"></head>
<body class="pagina-simple"><main class="caja-simple"><h1>${esc(titulo)}</h1>${cuerpoHtml}<p><a class="boton" href="/">Volver al inicio</a></p></main></body></html>`;
}

function esperaJson(req) {
  return (req.headers.accept || '').includes('application/json');
}

function ipDe(req) {
  return req.socket.remoteAddress || '?';
}

function exigirJson(req) {
  if (!(req.headers['content-type'] || '').includes('application/json')) throw falla(415, 'Se esperaba JSON.');
}

// ---- Rutas -----------------------------------------------------------------
async function crearCita(req, res) {
  const quiereJson = esperaJson(req);
  const ip = ipDe(req);
  const VENTANA = 10 * 60e3;
  if (excedido('citas', ip, Number(process.env.LIMITE_CITAS) || 6, VENTANA)) {
    const msg = `Has enviado muchas solicitudes seguidas. Espera unos minutos o llámanos al ${TELEFONO}.`;
    return quiereJson ? responder(res, 429, { error: msg }, { 'Retry-After': '600' }) : responder(res, 429, paginaResultado('Demasiadas solicitudes', `<p>${esc(msg)}</p>`));
  }
  const cuerpo = await leerCuerpo(req);
  anotar('citas', ip, VENTANA);

  // Campo trampa para bots: las personas no lo ven. Se responde "bien" sin guardar nada.
  if (String(cuerpo.sitio ?? '').trim() !== '') {
    return quiereJson ? responder(res, 201, { ok: true }) : responder(res, 200, paginaResultado('¡Solicitud recibida!', '<p>Te contactaremos pronto.</p>'));
  }

  const { errores, datos } = validar(cuerpo);
  if (Object.keys(errores).length) {
    if (quiereJson) return responder(res, 422, { errores });
    const items = Object.values(errores).map((m) => `<li>${esc(m)}</li>`).join('');
    return responder(res, 422, paginaResultado('Revisa tu solicitud', `<p>No pudimos guardarla todavía:</p><ul>${items}</ul><p>Regresa con el botón «atrás» de tu navegador, corrige y envía de nuevo.</p>`));
  }

  // Doble clic / reenvío: misma persona, mismo tratamiento y mismo horario → no se duplica
  const repetida = citas.find((c) => c.estado !== 'cancelada' && c.telefono === datos.telefono && c.tratamiento === datos.tratamiento && c.fecha === datos.fecha && c.hora === datos.hora);
  if (!repetida) {
    const cita = { id: crypto.randomUUID(), creada: new Date().toISOString(), ...datos, estado: 'pendiente' };
    try {
      fs.appendFileSync(ARCHIVO, JSON.stringify(cita) + '\n');
    } catch (err) {
      console.error('NO SE PUDO GUARDAR UNA CITA:', err, JSON.stringify(cita));
      const msg = `No pudimos guardar tu solicitud. Por favor llámanos al ${TELEFONO}.`;
      return quiereJson ? responder(res, 500, { error: msg }) : responder(res, 500, paginaResultado('No pudimos guardarla', `<p>${esc(msg)}</p>`));
    }
    citas.push(cita);
  }
  const resumen = `${TRATAMIENTOS[datos.tratamiento].nombre}, ${datos.fecha} a las ${datos.hora}`;
  if (quiereJson) return responder(res, 201, { ok: true, resumen });
  return responder(res, 200, paginaResultado('¡Solicitud recibida!', `<p>${esc(resumen)}.</p><p>Te contactaremos para confirmar tu cita.</p>`));
}

async function entrar(req, res) {
  exigirJson(req);
  const ip = ipDe(req);
  if (excedido('fallos', ip, 5, 60e3) || excedido('fallos', '*', 30, 60e3)) {
    return responder(res, 429, { error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' }, { 'Retry-After': '60' });
  }
  const { clave } = await leerCuerpo(req);
  if (typeof clave === 'string' && crypto.timingSafeEqual(hash(clave), HASH_CLAVE)) {
    const token = crypto.randomBytes(24).toString('base64url');
    sesiones.set(token, Date.now() + DURACION_SESION);
    const seguro = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return responder(res, 200, { ok: true }, { 'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DURACION_SESION / 1000}${seguro}` });
  }
  anotar('fallos', ip, 60e3);
  anotar('fallos', '*', 60e3);
  return responder(res, 401, { error: 'Contraseña incorrecta.' });
}

function salir(req, res) {
  const m = /(?:^|;\s*)sesion=([\w-]+)/.exec(req.headers.cookie || '');
  if (m) sesiones.delete(m[1]);
  responder(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
}

function listarCitas(url, res) {
  const estado = url.searchParams.get('estado');
  const LIMITE = 300;
  let l = citas.filter((c) => !estado || c.estado === estado);
  const total = l.length;
  l = l.sort((a, b) => (a.creada < b.creada ? 1 : -1)).slice(0, LIMITE);
  const cuenta = { pendiente: 0, confirmada: 0, cancelada: 0 };
  for (const c of citas) cuenta[c.estado] = (cuenta[c.estado] || 0) + 1;
  responder(res, 200, { citas: l, total, mostradas: l.length, cuenta, tratamientos: Object.fromEntries(Object.entries(TRATAMIENTOS).map(([k, v]) => [k, v.nombre])) });
}

async function cambiarEstado(req, res, id) {
  exigirJson(req);
  const { estado } = await leerCuerpo(req);
  if (!['pendiente', 'confirmada', 'cancelada'].includes(estado)) throw falla(400, 'Estado no válido.');
  const i = citas.findIndex((c) => c.id === id);
  if (i < 0) throw falla(404, 'Esa solicitud ya no existe.');
  const nueva = citas.map((c, j) => (j === i ? { ...c, estado } : c));
  try {
    reescribir(nueva);
  } catch (err) {
    console.error('No se pudo actualizar el archivo:', err);
    throw falla(500, 'No se pudo guardar el cambio. Inténtalo de nuevo.');
  }
  responder(res, 200, { ok: true, cita: citas[i] });
}

function borrar(req, res, url, id) {
  if (!(req.headers['x-requested-with'] === 'fisio')) throw falla(400, 'Falta la cabecera de seguridad.');
  let resto;
  if (id) resto = citas.filter((c) => c.id !== id);
  else if (url.searchParams.get('estado') === 'cancelada') resto = citas.filter((c) => c.estado !== 'cancelada');
  else throw falla(400, 'Indica qué borrar.');
  const borradas = citas.length - resto.length;
  try {
    reescribir(resto);
  } catch (err) {
    console.error('No se pudo borrar:', err);
    throw falla(500, 'No se pudo borrar. Inténtalo de nuevo.');
  }
  responder(res, 200, { ok: true, borradas });
}

// ---- Archivos estáticos ----------------------------------------------------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };

function estatico(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    throw falla(400, 'Ruta inválida.');
  }
  if (rel.includes('\0')) throw falla(400, 'Ruta inválida.');
  if (rel.endsWith('/')) rel += 'index.html';
  const archivo = path.join(PUBLICO, rel);
  if (archivo !== PUBLICO && !archivo.startsWith(PUBLICO + path.sep)) throw falla(404, 'No encontrado.');
  let datos;
  try {
    datos = fs.readFileSync(archivo);
  } catch {
    return responder(res, 404, paginaResultado('Página no encontrada', '<p>No existe esa página.</p>'));
  }
  const ext = path.extname(archivo).toLowerCase();
  res.writeHead(200, {
    'Content-Type': TIPOS[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.svg' || ext === '.jpg' || ext === '.webp' || ext === '.png' ? 'public, max-age=86400' : 'no-cache',
    ...CABECERAS,
  });
  res.end(req.method === 'HEAD' ? undefined : datos);
}

// ---- Servidor --------------------------------------------------------------
const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const m = req.method;

    if (p === '/api/citas' && m === 'POST') return await crearCita(req, res);
    if (p === '/api/admin/entrar' && m === 'POST') return await entrar(req, res);
    if (p === '/api/admin/salir' && m === 'POST') return salir(req, res);

    if (p.startsWith('/api/admin/')) {
      if (!sesionValida(req)) return responder(res, 401, { error: 'Necesitas iniciar sesión.' });
      const id = p.startsWith('/api/admin/citas/') ? p.slice('/api/admin/citas/'.length) : null;
      if (p === '/api/admin/citas' && m === 'GET') return listarCitas(url, res);
      if (id && m === 'PATCH') return await cambiarEstado(req, res, id);
      if (id && m === 'DELETE') return borrar(req, res, url, id);
      if (p === '/api/admin/citas' && m === 'DELETE') return borrar(req, res, url, null);
    }
    if (p.startsWith('/api/')) return responder(res, 404, { error: 'No encontrado.' });

    if (m === 'GET' || m === 'HEAD') return estatico(req, res, p);
    throw falla(405, 'Método no permitido.');
  } catch (err) {
    if (err.estado) return responder(res, err.estado, { error: err.message });
    console.error(err);
    responder(res, 500, { error: 'Error interno del servidor.' });
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Fisio Andares en  http://localhost:${PUERTO}`);
  console.log(`Panel de la dueña http://localhost:${PUERTO}/admin.html`);
  console.log(`Contraseña (de ${origenClave}): ${CLAVE}`);
});
