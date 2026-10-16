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
const CONFIAR_PROXY = process.env.CONFIAR_PROXY === '1'; // detrás de un proxy de confianza: usa X-Forwarded-For
const ZONA = process.env.ZONA_HORARIA || 'America/Mexico_City'; // hora del consultorio
try { new Intl.DateTimeFormat('en', { timeZone: ZONA }); } catch { console.error(`ZONA_HORARIA no válida: ${ZONA}`); process.exit(1); }
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
const POR_PAGINA = 50;

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
  return { valor, origen: archivo, nueva: true };
}
const CONTRASENA = obtenerContrasena();
const huella = (s) => crypto.createHash('sha256').update(String(s)).digest();
const HUELLA_CONTRASENA = huella(CONTRASENA.valor);

// ---------- Almacén ----------
// Archivo de eventos (una línea JSON por evento) + copia completa en memoria.
// Se lee una sola vez al arrancar y se reescribe compacto (sin eventos viejos) al
// arrancar y cuando el registro crece mucho. Cada petición trabaja sobre la memoria:
// listar o cambiar un estado no vuelve a leer ni a interpretar el archivo.
const lista = [];            // citas en orden de llegada (las más nuevas al final)
const porId = new Map();
const cuentas = { pendiente: 0, confirmada: 0, cancelada: 0 };
let marcadas = 0;            // citas borradas que aún ocupan lugar en `lista`
let lineasLog = 0;
let danadasAlArrancar = 0;

const fichaBusqueda = (c) => `${c.nombre} ${c.telefono} ${c.correo} ${c.comentario}`.toLowerCase();
function registrar(ev, estado) {
  const c = {
    id: ev.id, creada: txt(ev.creada), nombre: txt(ev.nombre, 100), telefono: txt(ev.telefono, 40), correo: txt(ev.correo, 150),
    tratamiento: txt(ev.tratamiento, 20), fecha: txt(ev.fecha, 10), hora: txt(ev.hora, 5), comentario: txt(ev.comentario, 500),
    estado: ESTADOS.includes(estado) ? estado : 'pendiente',
  };
  c.busca = fichaBusqueda(c);
  if (porId.has(c.id)) return;
  porId.set(c.id, c);
  lista.push(c);
  cuentas[c.estado]++;
}
function quitar(c) {
  c.borrada = true;
  porId.delete(c.id);
  cuentas[c.estado]--;
  marcadas++;
}
function limpiarLista() {
  const vivas = lista.filter((c) => !c.borrada);
  lista.length = 0;
  for (const c of vivas) lista.push(c);
  marcadas = 0;
}

function cargarArchivo() {
  let texto = '';
  try {
    texto = fs.readFileSync(ARCHIVO, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const rotas = [];
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    let ev;
    try { ev = JSON.parse(linea); } catch { rotas.push(linea); continue; }
    if (!ev || typeof ev !== 'object' || typeof ev.id !== 'string') { rotas.push(linea); continue; }
    lineasLog++;
    if (ev.tipo === 'cita') registrar(ev, ev.estado);
    else if (ev.tipo === 'estado') {
      const c = porId.get(ev.id);
      if (c && ESTADOS.includes(ev.estado)) { cuentas[c.estado]--; c.estado = ev.estado; cuentas[c.estado]++; }
    } else if (ev.tipo === 'borrar') {
      const c = porId.get(ev.id);
      if (c) quitar(c);
    }
  }
  limpiarLista();
  danadasAlArrancar = rotas.length;
  if (rotas.length) {
    // Antes de compactar se guardan aparte para que nada se pierda en silencio.
    const aparte = path.join(DATOS, 'lineas-danadas.txt');
    fs.appendFileSync(aparte, rotas.join('\n') + '\n');
    console.warn(`Aviso: ${rotas.length} línea(s) dañada(s) en ${ARCHIVO}; se copiaron a ${aparte}.`);
  }
  if (texto && (rotas.length || lineasLog !== lista.length)) compactar();
}

function compactar() {
  const salida = lista.filter((c) => !c.borrada).map((c) => JSON.stringify({
    tipo: 'cita', id: c.id, creada: c.creada, nombre: c.nombre, telefono: c.telefono, correo: c.correo,
    tratamiento: c.tratamiento, fecha: c.fecha, hora: c.hora, comentario: c.comentario, estado: c.estado,
  }));
  const tmp = ARCHIVO + '.tmp';
  fs.writeFileSync(tmp, salida.length ? salida.join('\n') + '\n' : '');
  fs.renameSync(tmp, ARCHIVO);
  limpiarLista();
  lineasLog = lista.length;
}

function agregar(evento) {
  // El "\n" inicial protege la línea nueva si la anterior quedó cortada a medias.
  fs.appendFileSync(ARCHIVO, '\n' + JSON.stringify(evento) + '\n');
  lineasLog++;
  if (lineasLog > 2 * lista.length + 5000) compactar();
}

function guardarCita(datos) {
  const ev = { tipo: 'cita', id: crypto.randomUUID(), creada: new Date().toISOString(), ...datos };
  agregar(ev);
  registrar(ev, 'pendiente');
}
function cambiarEstado(id, estado) {
  const c = porId.get(id);
  if (!c) return false;
  agregar({ tipo: 'estado', id, estado, cuando: new Date().toISOString() });
  cuentas[c.estado]--; c.estado = estado; cuentas[estado]++;
  return true;
}
function borrarUna(id) {
  const c = porId.get(id);
  if (!c) return false;
  agregar({ tipo: 'borrar', id, cuando: new Date().toISOString() });
  quitar(c);
  if (marcadas > 1000 && marcadas > lista.length / 2) limpiarLista();
  return true;
}
const coincide = (c, estado, q) => !c.borrada && (!estado || c.estado === estado) && (!q || c.busca.includes(q));
function buscar(estado, q, desde, limite) {
  const pagina = [];
  let coinciden = 0;
  for (let i = lista.length - 1; i >= 0; i--) {
    const c = lista[i];
    if (!coincide(c, estado, q)) continue;
    if (coinciden >= desde && pagina.length < limite) pagina.push(c);
    coinciden++;
  }
  return { pagina, coinciden };
}
function borrarLote(estado, q) {
  let n = 0;
  for (const c of lista) if (coincide(c, estado, q)) { quitar(c); n++; }
  if (n) compactar();
  return n;
}
const conteo = () => ({ total: porId.size, ...cuentas });

const txt = (v, max = 200) => String(v ?? '').slice(0, max);
function citaPublica(c) {
  return {
    id: c.id, creada: c.creada, nombre: c.nombre, telefono: c.telefono, correo: c.correo, tratamiento: c.tratamiento,
    fecha: c.fecha, hora: c.hora, comentario: c.comentario, estado: c.estado,
  };
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
    cuenta(ip) { return vigentes(ip, Date.now()).length; },
    anotar(ip) { const t = Date.now(); const a = vigentes(ip, t); a.push(t); m.set(ip, a); },
  };
}
const limiteLogin = limitador(5, 60_000);          // pasadas 5 contraseñas malas por minuto y por IP, cada intento tarda más (nunca se bloquea)
const limiteCitas = limitador(5, 10 * 60_000);     // 5 solicitudes cada 10 min por IP
const limiteGlobal = limitador(100, 60 * 60_000);  // tope total por hora, contra robots desde muchas IP
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
function ipDe(req) {
  const directa = req.socket.remoteAddress || 'desconocida';
  if (!CONFIAR_PROXY) return directa;
  const xs = String(req.headers['x-forwarded-for'] || '').split(',').map((x) => x.trim()).filter(Boolean);
  return xs.length ? xs[xs.length - 1] : directa; // la última la añadió nuestro proxy
}

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

// Fecha y minutos del día en la zona del consultorio, no en la del servidor.
function ahoraClinica() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) };
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

  const ahora = ahoraClinica();
  const dia = diaSemana(fecha);
  if (dia === null) errores.fecha = 'Elige un día.';
  else if (dia === 0 || dia === 6) errores.fecha = 'Atendemos de lunes a viernes. Elige un día entre semana.';
  else if (fecha < ahora.fecha) errores.fecha = 'Ese día ya pasó. Elige uno a partir de hoy.';
  else if (fecha > ahora.fecha.replace(/^\d{4}/, (y) => String(+y + 1))) errores.fecha = 'Elige un día dentro del próximo año.';

  if (!/^\d{2}:\d{2}$/.test(hora)) errores.hora = 'Elige una hora.';
  else {
    const ini = aMinutos(hora);
    const dur = TRATAMIENTOS[tratamiento]?.min ?? 0;
    if (ini < APERTURA || ini % 30 !== 0) errores.hora = 'Elige una hora entre las 09:00 y las 18:00.';
    else if (dur && ini + dur > CIERRE) errores.hora = `Esa sesión dura ${dur} min y terminaría después de las 18:00. Elige una hora más temprana.`;
    else if (ini >= CIERRE) errores.hora = 'Elige una hora entre las 09:00 y las 18:00.';
    else if (fecha === ahora.fecha && !errores.fecha && ini <= ahora.minutos) errores.hora = 'Esa hora ya pasó hoy. Elige una más tarde.';
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
// Si hay `formulario`, la página trae el formulario de nuevo con lo que la persona
// escribió y el error junto a cada campo, para corregir sin volver a empezar.
const HORAS = Array.from({ length: 18 }, (_, i) => `${pad(9 + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);
function formularioHtml(datos, errores) {
  const v = (k) => esc(datos[k] ?? '');
  const err = (k) => (errores[k] ? `<p class="error" id="err-${k}">${esc(errores[k])}</p>` : '');
  const inv = (k) => (errores[k] ? ' aria-invalid="true"' : '');
  const campo = (k, etiqueta, tipo, extra = '') =>
    `<div class="campo"><label for="${k}">${etiqueta}</label><input id="${k}" name="${k}" type="${tipo}" value="${v(k)}"${extra}${inv(k)} required>${err(k)}</div>`;
  const opcion = (valor, texto, actual) => `<option value="${valor}"${actual === valor ? ' selected' : ''}>${texto}</option>`;
  return `<form class="formulario" action="/api/citas" method="post">
${campo('nombre', 'Nombre', 'text', ' maxlength="100"')}${campo('telefono', 'Teléfono', 'tel', ' maxlength="40"')}${campo('correo', 'Correo electrónico', 'email', ' maxlength="150"')}
<div class="campo"><label for="tratamiento">Tratamiento</label><select id="tratamiento" name="tratamiento" required${inv('tratamiento')}>
<option value="">Elige un tratamiento</option>${Object.entries(TRATAMIENTOS).map(([k, t]) => opcion(k, `${esc(t.nombre)} (${t.min} min)`, datos.tratamiento)).join('')}</select>${err('tratamiento')}</div>
${campo('fecha', 'Día preferido (lunes a viernes)', 'date')}
<div class="campo"><label for="hora">Hora preferida</label><select id="hora" name="hora" required${inv('hora')}>
<option value="">Elige una hora</option>${HORAS.map((h) => opcion(h, h, datos.hora)).join('')}</select>${err('hora')}</div>
<div class="campo"><label for="comentario">Comentario <span class="opcional">(opcional)</span></label><textarea id="comentario" name="comentario" rows="3" maxlength="500">${v('comentario')}</textarea></div>
<button class="boton" type="submit">Pedir cita</button></form>`;
}
function paginaResultado(res, estado, titulo, parrafos, formulario) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titulo)} · Fisio Andares</title>
<link rel="stylesheet" href="/estilos.css"></head><body><main class="pagina-simple">
<h1>${esc(titulo)}</h1>${parrafos.map((p) => `<p>${esc(p)}</p>`).join('')}
${formulario ? formularioHtml(formulario.datos, formulario.errores) : ''}
<p><a class="boton ${formulario ? 'boton-sec' : ''}" href="/">Volver al inicio</a></p></main></body></html>`;
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
  const responder = (estado, cuerpo, titulo, parrafos, formulario) =>
    quiereJson ? json(res, estado, cuerpo) : paginaResultado(res, estado, titulo, parrafos, formulario);

  let entrada;
  try {
    entrada = await leerCuerpo(req);
  } catch (e) {
    if (!e.estado) throw e;
    res.setHeader('Connection', 'close');
    const msg = e.estado === 413 ? 'El mensaje es demasiado largo.' : 'No pudimos leer tu solicitud.';
    return responder(e.estado, { error: msg }, msg, [`Vuelve al inicio, revisa los datos (el comentario admite hasta 500 caracteres) o llámanos al ${TELEFONO}.`]);
  }

  // Trampa para robots: este campo está oculto para las personas. Si viene lleno,
  // se responde "ok" pero no se guarda nada.
  if (String(entrada.sitio_web ?? '').trim()) {
    return responder(201, { ok: true }, 'Solicitud recibida', ['Gracias. Te contactaremos pronto.']);
  }

  const { errores, datos } = validar(entrada);
  if (Object.keys(errores).length) {
    return responder(422, { errores }, 'Revisa tu solicitud', ['Corrige lo marcado y vuelve a enviar. Lo que escribiste sigue aquí.'], { datos, errores });
  }
  // Los límites van después de validar: un error de captura no debe tapar el mensaje
  // del campo ni gastar el cupo de la persona.
  const espera = Math.max(limiteCitas.espera(ip), limiteGlobal.espera('todos'));
  if (espera) {
    res.setHeader('Retry-After', espera);
    const msg = `Hay muchas solicitudes en este momento. Llámanos al ${TELEFONO} o intenta de nuevo en unos minutos.`;
    return responder(429, { error: msg }, 'Demasiadas solicitudes', [msg], { datos, errores: {} });
  }
  limiteCitas.anotar(ip);
  limiteGlobal.anotar('todos');
  try {
    guardarCita(datos);
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

function filtrosDe(params) {
  const e = params.get('estado');
  return {
    estado: ESTADOS.includes(e) ? e : '',
    q: String(params.get('q') ?? '').trim().toLowerCase().slice(0, 100),
    desde: Math.max(0, Math.floor(Number(params.get('desde'))) || 0),
  };
}

async function admin(req, res, url, ip) {
  const ruta = url.pathname;
  if (req.method !== 'GET' && !origenValido(req)) return json(res, 403, { error: 'Origen no permitido' });

  if (ruta === '/api/admin/login' && req.method === 'POST') {
    // Nunca se rechaza una contraseña correcta (así nadie puede dejar fuera al dueño
    // desde su misma IP); a quien falla de más se le hace esperar cada vez más.
    const { contrasena } = await leerCuerpo(req);
    const ok = crypto.timingSafeEqual(huella(contrasena ?? ''), HUELLA_CONTRASENA);
    if (!ok) {
      limiteLogin.anotar(ip);
      const fallos = limiteLogin.cuenta(ip);
      if (fallos > 5) await dormir(Math.min(5000, (fallos - 5) * 1000));
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
    const { estado, q, desde } = filtrosDe(url.searchParams);
    const { pagina, coinciden } = buscar(estado, q, desde, POR_PAGINA);
    return json(res, 200, { citas: pagina.map(citaPublica), desde, coinciden, conteo: conteo(), danadas: danadasAlArrancar });
  }

  if (ruta === '/api/admin/citas/eliminar' && req.method === 'POST') {
    const cuerpo = await leerCuerpo(req);
    const { estado, q } = filtrosDe(new URLSearchParams({ estado: cuerpo.estado ?? '', q: cuerpo.q ?? '' }));
    if (!estado && !q) return json(res, 400, { error: 'Elige un estado o escribe una búsqueda antes de eliminar en bloque.' });
    return json(res, 200, { ok: true, eliminadas: borrarLote(estado, q), conteo: conteo() });
  }

  const m = /^\/api\/admin\/citas\/([\w-]{1,64})(\/estado)?$/.exec(ruta);
  if (m) {
    const id = m[1];
    if (!porId.has(id)) return json(res, 404, { error: 'Esa solicitud ya no existe.' });
    if (m[2] && req.method === 'POST') {
      const { estado } = await leerCuerpo(req);
      if (!ESTADOS.includes(estado)) return json(res, 400, { error: 'Estado no válido.' });
      cambiarEstado(id, estado);
    } else if (!m[2] && req.method === 'DELETE') {
      borrarUna(id);
    } else return json(res, 405, { error: 'Método no permitido' });
    return json(res, 200, { ok: true, conteo: conteo() });
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
  const ip = ipDe(req);
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/ahora' && req.method === 'GET') return json(res, 200, ahoraClinica());
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

cargarArchivo();
servidor.listen(PUERTO, HOST, () => {
  console.log(`Fisio Andares en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`);
  console.log(`Panel del consultorio: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}/admin.html`);
  if (process.env.CONTRASENA_ADMIN) console.log('Contraseña del panel: la de la variable CONTRASENA_ADMIN');
  else if (CONTRASENA.nueva) console.log(`Contraseña del panel (se muestra solo esta vez): ${CONTRASENA.valor}\n  Queda guardada en ${CONTRASENA.origen}; puedes cambiarla editando ese archivo.`);
  else console.log(`Contraseña del panel: está en ${CONTRASENA.origen}`);
});
