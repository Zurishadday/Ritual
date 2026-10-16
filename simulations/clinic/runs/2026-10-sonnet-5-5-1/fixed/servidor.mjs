// Servidor de Fisio Andares. Sin dependencias: node servidor.mjs
import http from 'node:http';
import { readFile, writeFile, appendFile, rename, mkdir, copyFile } from 'node:fs/promises';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DIR_DATOS = path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DIR_DATOS, 'solicitudes.jsonl'); // un registro por línea (diario)
const ARCHIVO_VIEJO = path.join(DIR_DATOS, 'solicitudes.json'); // formato anterior, se importa
const ARCHIVO_CLAVE = path.join(DIR_DATOS, 'clave-admin.txt');

const PUERTO = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const POR_PAGINA = 25;

const TRATAMIENTOS = {
  rodilla: 'Rehabilitación de rodilla',
  espalda: 'Dolor de espalda',
  masaje: 'Masaje deportivo',
};
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

// ---------- contraseña del panel ----------
// Sin ADMIN_PASSWORD no hay contraseña conocida: se genera una al azar la primera vez
// y se guarda en datos/clave-admin.txt (no está en el código ni en el repositorio).
async function obtenerClave() {
  if (process.env.ADMIN_PASSWORD) return { clave: process.env.ADMIN_PASSWORD, generada: false };
  try {
    const c = (await readFile(ARCHIVO_CLAVE, 'utf8')).trim();
    if (c) return { clave: c, generada: true };
  } catch {}
  const clave = randomBytes(12).toString('base64url');
  await mkdir(DIR_DATOS, { recursive: true });
  await writeFile(ARCHIVO_CLAVE, clave + '\n');
  return { clave, generada: true };
}
const { clave: CLAVE_ADMIN, generada: CLAVE_GENERADA } = await obtenerClave();

// ---------- almacenamiento ----------
// Diario de sólo-añadir: cada cambio es una línea. Una escritura cuesta O(1), no reescribe todo,
// y una línea dañada se salta sin tirar el resto.
let solicitudes = []; // en orden de llegada; la más nueva al final
const porId = new Map();
let cola = Promise.resolve();

function aplicar(op) {
  if (op.op === 'nueva') {
    const { op: _, ...r } = op;
    if (typeof r.id !== 'string' || porId.has(r.id)) return;
    solicitudes.push(r);
    porId.set(r.id, r);
  } else if (op.op === 'estado') {
    const r = porId.get(op.id);
    if (r && ESTADOS.includes(op.estado)) r.estado = op.estado;
  } else if (op.op === 'borrar' && Array.isArray(op.ids)) {
    const ids = new Set(op.ids);
    solicitudes = solicitudes.filter((r) => !ids.has(r.id));
    for (const id of ids) porId.delete(id);
  }
}

// Extrae los objetos completos de un JSON de arreglo posiblemente truncado.
function rescatarObjetos(texto) {
  const out = [];
  let prof = 0, ini = -1, enCad = false, esc = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enCad) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') enCad = false;
    } else if (c === '"') enCad = true;
    else if (c === '{') { if (prof++ === 0) ini = i; }
    else if (c === '}' && prof > 0 && --prof === 0) {
      try { out.push(JSON.parse(texto.slice(ini, i + 1))); } catch {}
    }
  }
  return out;
}

async function cargar() {
  let dañado = 0;
  let texto = null;
  try { texto = await readFile(ARCHIVO, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') console.error('No se pudo leer el archivo de datos:', e.message); }
  if (texto !== null) {
    for (const linea of texto.split('\n')) {
      if (!linea.trim()) continue;
      try { aplicar(JSON.parse(linea)); } catch { dañado++; }
    }
  } else {
    try {
      const viejo = await readFile(ARCHIVO_VIEJO, 'utf8');
      let lista;
      try { lista = JSON.parse(viejo); } catch { lista = rescatarObjetos(viejo); dañado++; }
      for (const r of Array.isArray(lista) ? lista : []) {
        if (r && typeof r === 'object') aplicar({ op: 'nueva', ...r });
      }
    } catch {}
  }
  if (dañado) {
    console.error(`AVISO: ${dañado} línea(s) dañada(s) en los datos; se omitieron y se guardó copia en datos/.`);
    await copyFile(texto !== null ? ARCHIVO : ARCHIVO_VIEJO, path.join(DIR_DATOS, 'danado-' + Date.now() + '.bak')).catch(() => {});
  }
  // Compactar: deja el diario limpio (y termina en salto de línea) antes de añadir más.
  try {
    await mkdir(DIR_DATOS, { recursive: true });
    const tmp = ARCHIVO + '.tmp';
    await writeFile(tmp, solicitudes.map((r) => JSON.stringify({ op: 'nueva', ...r })).join('\n') + (solicitudes.length ? '\n' : ''));
    await rename(tmp, ARCHIVO);
  } catch (e) {
    console.error('No se pudo compactar el archivo de datos:', e.message);
  }
}

// Una escritura que falla no envenena la cola: la siguiente arranca limpia.
// La memoria se cambia sólo después de que la línea quedó en disco.
function registrar(op) {
  const mia = cola.catch(() => {}).then(async () => {
    await mkdir(DIR_DATOS, { recursive: true });
    await appendFile(ARCHIVO, '\n' + JSON.stringify(op) + '\n');
    aplicar(op);
  });
  cola = mia;
  return mia;
}

// ---------- utilidades ----------
function responder(res, codigo, obj) {
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(obj));
}

async function leerCuerpo(req, limite = 10_000) {
  let total = 0;
  const trozos = [];
  for await (const t of req) {
    total += t.length;
    if (total > limite) throw Object.assign(new Error('Cuerpo demasiado grande'), { codigo: 413 });
    trozos.push(t);
  }
  return Buffer.concat(trozos).toString('utf8');
}

async function leerJSON(req) {
  try {
    const v = JSON.parse(await leerCuerpo(req));
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw 0;
    return v;
  } catch (e) {
    if (e && e.codigo) throw e;
    throw Object.assign(new Error('JSON inválido'), { codigo: 400 });
  }
}

// Ventanas deslizantes. `excedido` sólo consulta; `anotar` cuenta. Así cada ruta decide
// qué cuenta (sólo lo que de verdad ocurrió) y los errores de campo no gastan el cupo.
const intentos = new Map();
function excedido(clave, max, ventanaMs) {
  const ahora = Date.now();
  const lista = (intentos.get(clave) || []).filter((t) => ahora - t < ventanaMs);
  intentos.set(clave, lista);
  return lista.length >= max;
}
function anotar(clave) {
  const l = intentos.get(clave) || [];
  l.push(Date.now());
  intentos.set(clave, l);
}
const sesiones = new Map(); // token -> expira
setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of intentos) if (v.every((t) => ahora - t > 3_600_000)) intentos.delete(k);
  for (const [k, exp] of sesiones) if (exp < ahora) sesiones.delete(k);
}, 600_000).unref();

const hash = (s) => createHash('sha256').update(String(s)).digest();
const claveCorrecta = (c) => timingSafeEqual(hash(c), hash(CLAVE_ADMIN));

function autorizado(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const exp = sesiones.get(m[1]);
  if (!exp || exp < Date.now()) {
    sesiones.delete(m[1]);
    return false;
  }
  return true;
}

// ---------- validación de la cita ----------
function validarCita(d, ahora = new Date()) {
  const texto = (v) => (typeof v === 'string' ? v.trim() : '');
  const nombre = texto(d.nombre);
  const telefono = texto(d.telefono);
  const correo = texto(d.correo);
  const tratamiento = texto(d.tratamiento);
  const fecha = texto(d.fecha);
  const hora = texto(d.hora);
  const comentario = texto(d.comentario);
  const mal = (campo, error) => ({ campo, error });

  if (nombre.length < 2 || nombre.length > 100) return mal('nombre', 'Escribe tu nombre.');
  const digitos = telefono.replace(/\D/g, '');
  if (!/^[\d\s()+\-.]+$/.test(telefono) || digitos.length < 8 || digitos.length > 15)
    return mal('telefono', 'Escribe un teléfono válido, solo con números (8 a 15 dígitos).');
  if (correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    return mal('correo', 'Escribe un correo válido, por ejemplo nombre@correo.com.');
  if (!Object.hasOwn(TRATAMIENTOS, tratamiento)) return mal('tratamiento', 'Elige un tratamiento.');

  const mf = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!mf) return mal('fecha', 'Elige un día.');
  const f = new Date(Date.UTC(+mf[1], +mf[2] - 1, +mf[3]));
  if (f.getUTCFullYear() !== +mf[1] || f.getUTCMonth() !== +mf[2] - 1 || f.getUTCDate() !== +mf[3])
    return mal('fecha', 'Día no válido.');
  const dow = f.getUTCDay();
  if (dow === 0 || dow === 6) return mal('fecha', 'Atendemos de lunes a viernes.');
  const p = (n) => String(n).padStart(2, '0');
  const hoyStr = `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`;
  if (fecha < hoyStr) return mal('fecha', 'Elige un día que no haya pasado.');
  const lim = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 180);
  if (fecha > `${lim.getFullYear()}-${p(lim.getMonth() + 1)}-${p(lim.getDate())}`)
    return mal('fecha', 'Elige un día dentro de los próximos 6 meses.');

  const mh = /^(\d{2}):(\d{2})$/.exec(hora);
  const mins = mh ? +mh[1] * 60 + +mh[2] : -1;
  // Última cita a las 17:00 para terminar antes de las 18:00.
  if (!mh || +mh[2] % 30 !== 0 || mins < 9 * 60 || mins > 17 * 60)
    return mal('hora', 'Elige una hora entre las 9:00 y las 17:00.');
  if (fecha === hoyStr && mins <= ahora.getHours() * 60 + ahora.getMinutes())
    return mal('hora', 'Esa hora de hoy ya pasó. Elige una más tarde u otro día.');

  if (comentario.length > 500) return mal('comentario', 'El comentario es demasiado largo (máx. 500).');

  return { valor: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// Compartido por el formulario con JavaScript (JSON) y sin JavaScript (POST normal).
async function crearCita(datos, ip) {
  // Señuelo: las personas no ven este campo; los bots lo llenan. Se finge éxito sin guardar.
  if (typeof datos.sitio === 'string' && datos.sitio.trim()) return { codigo: 201 };
  // Primero lo específico (qué campo está mal), después el límite general.
  const { valor, error, campo } = validarCita(datos);
  if (error) return { codigo: 400, error, campo };
  if (excedido('cita:' + ip, 10, 3_600_000) || excedido('cita:global', 100, 3_600_000))
    return { codigo: 429, error: 'Hay demasiadas solicitudes en este momento. Llámanos por teléfono, por favor.' };
  await registrar({ op: 'nueva', id: randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...valor });
  anotar('cita:' + ip);
  anotar('cita:global');
  return { codigo: 201 };
}

function filtrar(url) {
  const estado = ESTADOS.includes(url.searchParams.get('estado')) ? url.searchParams.get('estado') : '';
  const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
  const coincide = (c) =>
    (!estado || c.estado === estado) &&
    (!q || c.nombre.toLowerCase().includes(q) || c.telefono.includes(q) || c.correo.toLowerCase().includes(q));
  return { estado, q, coincide };
}

// ---------- API ----------
async function api(req, res, url) {
  const { pathname } = url;
  const ip = req.socket.remoteAddress || '?';

  if (pathname === '/api/citas' && req.method === 'POST') {
    const r = await crearCita(await leerJSON(req), ip);
    if (r.codigo === 201) return responder(res, 201, { ok: true });
    return responder(res, r.codigo, { error: r.error, campo: r.campo });
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const d = await leerJSON(req);
    if (typeof d.clave === 'string' && claveCorrecta(d.clave)) {
      intentos.delete('login:' + ip);
      const token = randomBytes(32).toString('hex');
      sesiones.set(token, Date.now() + 8 * 3_600_000);
      return responder(res, 200, { token });
    }
    // Sólo cuentan los intentos fallidos.
    if (excedido('login:' + ip, 10, 900_000))
      return responder(res, 429, { error: 'Demasiados intentos fallidos. Espera unos minutos.' });
    anotar('login:' + ip);
    return responder(res, 401, { error: 'Contraseña incorrecta.' });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!autorizado(req)) return responder(res, 401, { error: 'No autorizado.' });

    if (pathname === '/api/admin/citas' && req.method === 'GET') {
      const { coincide } = filtrar(url);
      const conteos = { pendiente: 0, confirmada: 0, cancelada: 0 };
      for (const c of solicitudes) conteos[c.estado]++;
      const sel = [];
      for (let i = solicitudes.length - 1; i >= 0; i--) if (coincide(solicitudes[i])) sel.push(solicitudes[i]);
      const paginas = Math.max(1, Math.ceil(sel.length / POR_PAGINA));
      const pagina = Math.min(paginas, Math.max(1, parseInt(url.searchParams.get('pagina'), 10) || 1));
      return responder(res, 200, {
        citas: sel.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
        total: sel.length, pagina, paginas, conteos, tratamientos: TRATAMIENTOS,
      });
    }

    if (pathname === '/api/admin/borrar-filtradas' && req.method === 'POST') {
      const d = await leerJSON(req);
      const u = new URL('http://x/');
      if (typeof d.estado === 'string') u.searchParams.set('estado', d.estado);
      if (typeof d.q === 'string') u.searchParams.set('q', d.q);
      const { estado, q, coincide } = filtrar(u);
      if (!estado && !q) return responder(res, 400, { error: 'Elige un filtro antes de borrar en bloque.' });
      const ids = solicitudes.filter(coincide).map((c) => c.id);
      if (ids.length) await registrar({ op: 'borrar', ids });
      return responder(res, 200, { borradas: ids.length });
    }

    const m = /^\/api\/admin\/citas\/([\w-]+)$/.exec(pathname);
    if (m && req.method === 'PATCH') {
      const d = await leerJSON(req);
      if (!ESTADOS.includes(d.estado)) return responder(res, 400, { error: 'Estado no válido.' });
      if (!porId.has(m[1])) return responder(res, 404, { error: 'No existe esa solicitud.' });
      await registrar({ op: 'estado', id: m[1], estado: d.estado });
      return responder(res, 200, porId.get(m[1]) || { id: m[1], estado: d.estado });
    }
    if (m && req.method === 'DELETE') {
      if (!porId.has(m[1])) return responder(res, 404, { error: 'No existe esa solicitud.' });
      await registrar({ op: 'borrar', ids: [m[1]] });
      return responder(res, 200, { ok: true });
    }
  }

  return responder(res, 404, { error: 'No encontrado.' });
}

// ---------- formulario sin JavaScript ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function paginaResultado(res, codigo, titulo, texto) {
  res.writeHead(codigo, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titulo)} · Fisio Andares</title><link rel="stylesheet" href="/estilos.css"></head><body><main class="seccion"><h1>${esc(titulo)}</h1><p>${esc(texto)}</p><p><a class="boton" href="/#cita">Volver al formulario</a></p></main></body></html>`);
}
async function citaSinJS(req, res) {
  const params = new URLSearchParams(await leerCuerpo(req));
  const r = await crearCita(Object.fromEntries(params), req.socket.remoteAddress || '?');
  if (r.codigo === 201) return paginaResultado(res, 201, '¡Solicitud enviada!', 'Te confirmaremos tu cita por teléfono o correo.');
  return paginaResultado(res, r.codigo, 'No pudimos enviar tu solicitud', r.error);
}

// ---------- archivos estáticos ----------
async function estatico(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/cita') return citaSinJS(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let ruta;
  try {
    ruta = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  if (ruta === '/') ruta = '/index.html';
  if (ruta === '/admin') ruta = '/admin.html';
  const archivo = path.normalize(path.join(PUBLICO, ruta));
  if (!archivo.startsWith(PUBLICO + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(req.method === 'HEAD' ? undefined : datos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página no encontrada');
  }
}

const servidor = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else await estatico(req, res, url);
  } catch (e) {
    if (!res.headersSent) responder(res, e.codigo || 500, { error: e.codigo ? e.message : 'Error del servidor. Intenta de nuevo.' });
    if (!e.codigo) console.error(e);
  }
});

await cargar();
servidor.listen(PUERTO, HOST, () => {
  console.log(`Fisio Andares en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`);
  console.log(`Panel de administración: /admin  (${solicitudes.length} solicitudes guardadas)`);
  if (CLAVE_GENERADA) console.log(`Contraseña del panel (guardada en datos/clave-admin.txt): ${CLAVE_ADMIN}`);
});
