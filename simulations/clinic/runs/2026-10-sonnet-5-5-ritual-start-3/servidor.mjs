// Servidor de Fisio Andares. Solo módulos de Node, sin dependencias.
// Uso: node servidor.mjs   (PORT, HOST y CONTRASENA_ADMIN son opcionales)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DATOS = process.env.DATOS_DIR || path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'citas.jsonl');
const PUERTO = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const TELEFONO = '55 1234 5678'; // el mismo que en publico/index.html

// Duración en minutos. Debe coincidir con los data-min del <select> de index.html.
const TRATAMIENTOS = {
  rodilla: { nombre: 'Rehabilitación de rodilla', min: 60 },
  espalda: { nombre: 'Dolor de espalda', min: 45 },
  masaje: { nombre: 'Masaje deportivo', min: 30 },
};
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];
const APERTURA = 9 * 60;
const CIERRE = 18 * 60;
const MAX_CUERPO = 10 * 1024;
const SESION_MS = 8 * 60 * 60 * 1000;
const MAX_LISTA = 200;

fs.mkdirSync(DATOS, { recursive: true });

// ---------- Contraseña del consultorio ----------
function obtenerContrasena() {
  if (process.env.CONTRASENA_ADMIN) return { valor: process.env.CONTRASENA_ADMIN, origen: 'la variable CONTRASENA_ADMIN' };
  const archivo = path.join(DATOS, 'contrasena-admin.txt');
  try {
    const v = fs.readFileSync(archivo, 'utf8').trim();
    if (v) return { valor: v, origen: archivo };
  } catch { /* se crea abajo */ }
  const valor = crypto.randomBytes(9).toString('base64url');
  fs.writeFileSync(archivo, valor + '\n');
  return { valor, origen: archivo };
}
const CONTRASENA = obtenerContrasena();
const huella = (s) => crypto.createHash('sha256').update(String(s)).digest();
const HUELLA_CONTRASENA = huella(CONTRASENA.valor);

// ---------- Almacén: un archivo de eventos, una línea JSON por evento ----------
// Añadir una cita nunca lee el archivo (cuesta lo mismo con 10 o 10 000 citas) y
// una línea dañada solo se salta: no arrastra a las demás.
function agregar(evento) {
  // El "\n" inicial protege la línea nueva si la anterior quedó cortada a medias.
  fs.appendFileSync(ARCHIVO, '\n' + JSON.stringify(evento) + '\n');
}

function leerCitas() {
  let texto = '';
  try {
    texto = fs.readFileSync(ARCHIVO, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const citas = new Map();
  let danadas = 0;
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    let ev;
    try { ev = JSON.parse(linea); } catch { danadas++; continue; }
    if (!ev || typeof ev !== 'object' || typeof ev.id !== 'string') { danadas++; continue; }
    if (ev.tipo === 'cita') citas.set(ev.id, { ...ev, estado: 'pendiente' });
    else if (ev.tipo === 'estado') {
      const c = citas.get(ev.id);
      if (c && ESTADOS.includes(ev.estado)) c.estado = ev.estado;
    } else if (ev.tipo === 'borrar') citas.delete(ev.id);
  }
  if (danadas) console.warn(`Aviso: ${danadas} línea(s) dañada(s) en ${ARCHIVO}; se ignoraron.`);
  return { citas: [...citas.values()], danadas };
}

const txt = (v, max = 200) => String(v ?? '').slice(0, max);
function citaPublica(c) {
  return {
    id: txt(c.id), creada: txt(c.creada), nombre: txt(c.nombre, 100), telefono: txt(c.telefono, 40),
    correo: txt(c.correo, 150), tratamiento: txt(c.tratamiento, 20), fecha: txt(c.fecha, 10),
    hora: txt(c.hora, 5), comentario: txt(c.comentario, 500), estado: c.estado,
  };
}
function conteo(citas) {
  const r = { total: citas.length, pendiente: 0, confirmada: 0, cancelada: 0 };
  for (const c of citas) r[c.estado]++;
  return r;
}

// ---------- Límites de intentos por IP ----------
function limitador(max, ventanaMs) {
  const m = new Map();
  const vigentes = (ip, t) => (m.get(ip) || []).filter((x) => t - x < ventanaMs);
  setInterval(() => {
    const t = Date.now();
    for (const ip of m.keys()) { const a = vigentes(ip, t); if (a.length) m.set(ip, a); else m.delete(ip); }
  }, 60_000).unref();
  return {
    // segundos que faltan para poder volver a intentar (0 = puede)
    espera(ip) {
      const t = Date.now();
      const a = vigentes(ip, t);
      return a.length >= max ? Math.ceil((a[0] + ventanaMs - t) / 1000) : 0;
    },
    anotar(ip) { const t = Date.now(); const a = vigentes(ip, t); a.push(t); m.set(ip, a); },
  };
}
const limiteLogin = limitador(5, 60_000);          // 5 contraseñas malas por minuto y por IP
const limiteCitas = limitador(5, 10 * 60_000);     // 5 solicitudes cada 10 min por IP

// ---------- Sesiones del consultorio ----------
const sesiones = new Map(); // token -> expira
setInterval(() => {
  const t = Date.now();
  for (const [k, v] of sesiones) if (v < t) sesiones.delete(k);
}, 60_000).unref();

function cookie(req, nombre) {
  for (const parte of (req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return '';
}
function haySesion(req) {
  const t = cookie(req, 'sesion');
  const exp = t && sesiones.get(t);
  return Boolean(exp && exp > Date.now());
}

// ---------- Validación de la solicitud ----------
const pad = (n) => String(n).padStart(2, '0');
const aMinutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function diaSemana(fecha) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d.getUTCDay(); // 0 domingo ... 6 sábado
}
const limpiar = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);

function validar(entrada) {
  const errores = {};
  const nombre = limpiar(entrada.nombre, 100);
  const telefono = limpiar(entrada.telefono, 40);
  const correo = limpiar(entrada.correo, 150);
  const tratamiento = limpiar(entrada.tratamiento, 20);
  const fecha = limpiar(entrada.fecha, 10);
  const hora = limpiar(entrada.hora, 5);
  const comentario = String(entrada.comentario ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 500);

  if (nombre.length < 2) errores.nombre = 'Escribe tu nombre.';
  const digitos = telefono.replace(/\D/g, '').length;
  if (!/^[\d\s+()\-.]+$/.test(telefono) || digitos < 8 || digitos > 15) errores.telefono = 'Escribe un teléfono válido, con al menos 8 dígitos.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.correo = 'Escribe un correo válido, como nombre@correo.com.';
  if (!TRATAMIENTOS[tratamiento]) errores.tratamiento = 'Elige un tratamiento.';

  const dia = diaSemana(fecha);
  if (dia === null) errores.fecha = 'Elige un día.';
  else if (dia === 0 || dia === 6) errores.fecha = 'Atendemos de lunes a viernes. Elige un día entre semana.';
  else if (fecha < hoyLocal()) errores.fecha = 'Ese día ya pasó. Elige uno a partir de hoy.';
  else if (fecha > hoyLocal().replace(/^\d{4}/, (y) => String(+y + 1))) errores.fecha = 'Elige un día dentro del próximo año.';

  if (!/^\d{2}:\d{2}$/.test(hora)) errores.hora = 'Elige una hora.';
  else {
    const ini = aMinutos(hora);
    const dur = TRATAMIENTOS[tratamiento]?.min ?? 0;
    if (ini < APERTURA || ini % 30 !== 0) errores.hora = 'Elige una hora entre las 09:00 y las 18:00.';
    else if (dur && ini + dur > CIERRE) errores.hora = `Esa sesión dura ${dur} min y terminaría después de las 18:00. Elige una hora más temprana.`;
    else if (ini >= CIERRE) errores.hora = 'Elige una hora entre las 09:00 y las 18:00.';
  }
  return { errores, datos: { nombre, telefono, correo, tratamiento, fecha, hora, comentario } };
}

// ---------- Utilidades HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};
const CABECERAS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

function json(res, estado, cuerpo, extra = {}) {
  res.writeHead(estado, { ...CABECERAS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(cuerpo));
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Respuesta para quien envía el formulario sin JavaScript.
function paginaResultado(res, estado, titulo, parrafos) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titulo)} · Fisio Andares</title>
<link rel="stylesheet" href="/estilos.css"></head><body><main class="pagina-simple">
<h1>${esc(titulo)}</h1>${parrafos.map((p) => `<p>${esc(p)}</p>`).join('')}
<p><a class="boton" href="/#cita">Volver al formulario</a></p></main></body></html>`;
  res.writeHead(estado, { ...CABECERAS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
}

async function leerCuerpo(req) {
  let total = 0;
  const trozos = [];
  for await (const t of req) {
    total += t.length;
    if (total > MAX_CUERPO) { const e = new Error('Cuerpo demasiado grande'); e.estado = 413; throw e; }
    trozos.push(t);
  }
  const texto = Buffer.concat(trozos).toString('utf8');
  if (!texto) return {};
  const tipo = req.headers['content-type'] || '';
  try {
    if (tipo.includes('application/json')) { const o = JSON.parse(texto); return o && typeof o === 'object' ? o : {}; }
    return Object.fromEntries(new URLSearchParams(texto));
  } catch {
    const e = new Error('Cuerpo ilegible'); e.estado = 400; throw e;
  }
}

function origenValido(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

// ---------- Rutas ----------
async function citaNueva(req, res, ip) {
  const quiereJson = (req.headers.accept || '').includes('application/json');
  const responder = (estado, cuerpo, titulo, parrafos) =>
    quiereJson ? json(res, estado, cuerpo) : paginaResultado(res, estado, titulo, parrafos);

  const espera = limiteCitas.espera(ip);
  if (espera) {
    res.setHeader('Retry-After', espera);
    return responder(429, { error: `Has enviado varias solicitudes seguidas. Llámanos al ${TELEFONO} o intenta de nuevo en unos minutos.` },
      'Demasiadas solicitudes', [`Has enviado varias solicitudes seguidas. Llámanos al ${TELEFONO} o intenta de nuevo en unos minutos.`]);
  }
  const entrada = await leerCuerpo(req);

  // Trampa para robots: este campo está oculto para las personas. Si viene lleno,
  // se responde "ok" pero no se guarda nada.
  if (String(entrada.sitio_web ?? '').trim()) {
    limiteCitas.anotar(ip);
    return responder(201, { ok: true }, 'Solicitud recibida', ['Gracias. Te contactaremos pronto.']);
  }

  const { errores, datos } = validar(entrada);
  if (Object.keys(errores).length) {
    return responder(422, { errores }, 'Revisa tu solicitud', Object.values(errores));
  }
  limiteCitas.anotar(ip);
  const cita = { tipo: 'cita', id: crypto.randomUUID(), creada: new Date().toISOString(), ...datos };
  try {
    agregar(cita);
  } catch (e) {
    console.error('No se pudo guardar la cita:', e);
    return responder(500, { error: `No pudimos guardar tu solicitud. Por favor llámanos al ${TELEFONO}.` },
      'No pudimos guardar tu solicitud', [`Por favor llámanos al ${TELEFONO} para agendar tu cita.`]);
  }
  const t = TRATAMIENTOS[datos.tratamiento];
  return responder(201, { ok: true, tratamiento: t.nombre, fecha: datos.fecha, hora: datos.hora }, 'Solicitud recibida',
    [`Gracias, ${datos.nombre}. Recibimos tu solicitud de ${t.nombre} para el ${datos.fecha} a las ${datos.hora}.`,
      'Te contactaremos para confirmar tu cita.']);
}

async function admin(req, res, url, ip) {
  const ruta = url.pathname;
  if (req.method !== 'GET' && !origenValido(req)) return json(res, 403, { error: 'Origen no permitido' });

  if (ruta === '/api/admin/login' && req.method === 'POST') {
    const espera = limiteLogin.espera(ip);
    if (espera) {
      return json(res, 429, { error: `Demasiados intentos. Espera ${espera} segundos e inténtalo de nuevo.`, espera }, { 'Retry-After': String(espera) });
    }
    const { contrasena } = await leerCuerpo(req);
    const ok = crypto.timingSafeEqual(huella(contrasena ?? ''), HUELLA_CONTRASENA);
    if (!ok) {
      limiteLogin.anotar(ip);
      return json(res, 401, { error: 'Contraseña incorrecta.' });
    }
    const token = crypto.randomBytes(32).toString('base64url');
    sesiones.set(token, Date.now() + SESION_MS);
    return json(res, 200, { ok: true }, { 'Set-Cookie': `sesion=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESION_MS / 1000}` });
  }

  if (ruta === '/api/admin/logout' && req.method === 'POST') {
    sesiones.delete(cookie(req, 'sesion'));
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (!haySesion(req)) return json(res, 401, { error: 'Inicia sesión.' });

  if (ruta === '/api/admin/citas' && req.method === 'GET') {
    const { citas, danadas } = leerCitas();
    const filtro = url.searchParams.get('estado');
    const lista = citas
      .filter((c) => !ESTADOS.includes(filtro) || c.estado === filtro)
      .sort((a, b) => (a.creada < b.creada ? 1 : a.creada > b.creada ? -1 : 0));
    return json(res, 200, { citas: lista.slice(0, MAX_LISTA).map(citaPublica), mostradas: Math.min(lista.length, MAX_LISTA), coinciden: lista.length, conteo: conteo(citas), danadas });
  }

  const m = /^\/api\/admin\/citas\/([\w-]{1,64})(\/estado)?$/.exec(ruta);
  if (m) {
    const id = m[1];
    const { citas } = leerCitas();
    if (!citas.some((c) => c.id === id)) return json(res, 404, { error: 'Esa solicitud ya no existe.' });
    if (m[2] && req.method === 'POST') {
      const { estado } = await leerCuerpo(req);
      if (!ESTADOS.includes(estado)) return json(res, 400, { error: 'Estado no válido.' });
      agregar({ tipo: 'estado', id, estado, cuando: new Date().toISOString() });
    } else if (!m[2] && req.method === 'DELETE') {
      agregar({ tipo: 'borrar', id, cuando: new Date().toISOString() });
    } else return json(res, 405, { error: 'Método no permitido' });
    return json(res, 200, { ok: true, conteo: conteo(leerCitas().citas) });
  }
  return json(res, 404, { error: 'No encontrado' });
}

function estatico(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { ...CABECERAS, Allow: 'GET, HEAD' }); return res.end(); }
  let ruta;
  try { ruta = decodeURIComponent(url.pathname); } catch { res.writeHead(400, CABECERAS); return res.end('Solicitud no válida'); }
  if (ruta.includes('\0')) { res.writeHead(400, CABECERAS); return res.end('Solicitud no válida'); }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.join(PUBLICO, path.normalize(ruta));
  if (!archivo.startsWith(PUBLICO + path.sep)) { res.writeHead(403, CABECERAS); return res.end('Prohibido'); }
  fs.readFile(archivo, (err, datos) => {
    if (err) {
      res.writeHead(404, { ...CABECERAS, 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><meta charset="utf-8"><title>No encontrada</title><p>Esa página no existe. <a href="/">Ir al inicio</a></p>');
    }
    const ext = path.extname(archivo).toLowerCase();
    res.writeHead(200, {
      ...CABECERAS,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    res.end(req.method === 'HEAD' ? undefined : datos);
  });
}

const servidor = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || 'desconocida';
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/citas' && req.method === 'POST') {
      if (!origenValido(req)) return json(res, 403, { error: 'Origen no permitido' });
      return await citaNueva(req, res, ip);
    }
    if (url.pathname.startsWith('/api/admin/')) return await admin(req, res, url, ip);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'No encontrado' });
    return estatico(req, res, url);
  } catch (e) {
    if (!e.estado) console.error(e);
    if (res.headersSent) return res.end();
    return json(res, e.estado || 500, { error: e.estado === 413 ? 'El mensaje es demasiado largo.' : e.estado ? 'Solicitud no válida.' : 'Error interno del servidor.' });
  }
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Fisio Andares en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`);
  console.log(`Panel del consultorio: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}/admin.html`);
  if (process.env.CONTRASENA_ADMIN) console.log('Contraseña del panel: la de la variable CONTRASENA_ADMIN');
  else console.log(`Contraseña del panel: ${CONTRASENA.valor}   (guardada en ${CONTRASENA.origen}; puedes cambiarla editando ese archivo)`);
});
