// Fisio Andares: servidor sin dependencias. Uso: node servidor.mjs
import http from 'node:http';
import { readFile, writeFile, rename, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DATOS = process.env.DATOS_DIR ? path.resolve(process.env.DATOS_DIR) : path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'solicitudes.jsonl');
const ARCHIVO_VIEJO = path.join(DATOS, 'solicitudes.json'); // formato anterior (una lista JSON); se importa una vez
const ARCHIVO_CLAVE = path.join(DATOS, 'clave.txt');
const PUERTO = process.env.PORT !== undefined && process.env.PORT !== '' ? Number(process.env.PORT) : 3000;
// Detrás de un proxy (nginx, Cloudflare...) todas las visitas llegan desde la misma dirección:
// con TRUST_PROXY=1 se usa la última dirección de X-Forwarded-For, que es la que añade el proxy.
const CONFIAR_PROXY = Boolean(process.env.TRUST_PROXY);

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
const POR_PAGINA = 50;
const TOPE_PENDIENTES = 20_000;   // protege el disco; el panel permite borrar en bloque si se llega
const MAX_PENDIENTES_POR_TELEFONO = 3;

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
// Archivo de líneas (datos/solicitudes.jsonl): cada línea es una solicitud completa (si el id ya existía, la
// reemplaza) o {"id":..., "eliminar":true}. Guardar o cambiar una solicitud solo AÑADE una línea, así que el costo
// no crece con la cantidad guardada. Al arrancar se lee todo y, si hace falta, se compacta con escritura atómica.
// Una línea mala nunca tumba el resto: se salta, y el archivo original se copia aparte para no perderlo.
let lista = [];                 // solicitudes, de la más vieja a la más nueva
const porId = new Map();
const cuentas = { pendiente: 0, confirmada: 0, cancelada: 0 };
const pendientesIguales = new Map(); // telefono|fecha|hora|tratamiento -> cuántas pendientes (evita duplicados por doble clic)
const pendientesPorTel = new Map();  // solo dígitos del teléfono -> cuántas pendientes

const esTexto = (v) => typeof v === 'string';
function normalizar(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  if (!esTexto(o.id) || !o.id || !ESTADOS.includes(o.estado)) return null;
  for (const k of ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora']) if (!esTexto(o[k])) return null;
  if (!esTexto(o.creada) || Number.isNaN(Date.parse(o.creada))) return null;
  return { id: o.id, creada: o.creada, estado: o.estado, nombre: o.nombre, telefono: o.telefono, correo: o.correo, tratamiento: o.tratamiento, fecha: o.fecha, hora: o.hora, comentario: esTexto(o.comentario) ? o.comentario : '' };
}
const soloDigitos = (t) => t.replace(/\D/g, '');
const claveIgual = (c) => `${soloDigitos(c.telefono)}|${c.fecha}|${c.hora}|${c.tratamiento}`;
function contar(mapa, k, d) { const n = (mapa.get(k) || 0) + d; if (n > 0) mapa.set(k, n); else mapa.delete(k); }
function indexar(c, d) {
  cuentas[c.estado] += d;
  if (c.estado === 'pendiente') { contar(pendientesIguales, claveIgual(c), d); contar(pendientesPorTel, soloDigitos(c.telefono), d); }
}
function reconstruir(nueva) {
  lista = nueva;
  porId.clear(); pendientesIguales.clear(); pendientesPorTel.clear();
  cuentas.pendiente = cuentas.confirmada = cuentas.cancelada = 0;
  for (const c of lista) { porId.set(c.id, c); indexar(c, 1); }
}

async function reescribir() {
  const tmp = ARCHIVO + '.tmp';
  await writeFile(tmp, lista.map((c) => JSON.stringify(c) + '\n').join(''));
  await rename(tmp, ARCHIVO);
}

async function cargar() {
  let texto = null, viejo = false;
  try { texto = await readFile(ARCHIVO, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (texto === null) {
    try { texto = await readFile(ARCHIVO_VIEJO, 'utf8'); viejo = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  if (texto === null) return;
  const mapa = new Map();
  let malas = 0, lineas = 0;
  const aplicar = (o) => {
    lineas++;
    if (o && typeof o === 'object' && !Array.isArray(o) && o.eliminar === true && esTexto(o.id)) { mapa.delete(o.id); return; }
    const c = normalizar(o);
    if (c) mapa.set(c.id, c); else malas++;
  };
  if (texto.trimStart().startsWith('[')) { // lista JSON del formato anterior
    try { const arr = JSON.parse(texto); if (!Array.isArray(arr)) throw new Error('no es una lista'); arr.forEach(aplicar); } catch { malas++; }
  } else {
    for (const linea of texto.split('\n')) {
      if (!linea.trim()) continue;
      try { aplicar(JSON.parse(linea)); } catch { lineas++; malas++; }
    }
  }
  reconstruir([...mapa.values()].sort((a, b) => (a.creada < b.creada ? -1 : a.creada > b.creada ? 1 : 0)));
  if (malas) {
    const apartado = path.join(DATOS, `solicitudes.danado-${Date.now()}.txt`);
    await writeFile(apartado, texto);
    console.error(`\n!! ${malas} registro(s) de ${viejo ? ARCHIVO_VIEJO : ARCHIVO} estaban dañados y se omitieron. Se conservaron ${lista.length}. Copia del original: ${apartado}\n`);
  }
  const sinSaltoFinal = texto.length > 0 && !texto.endsWith('\n');
  if (malas || viejo || sinSaltoFinal || lineas > 2 * lista.length + 100) await reescribir();
  if (viejo) await rename(ARCHIVO_VIEJO, ARCHIVO_VIEJO + '.migrado');
}
await cargar();

let cola = Promise.resolve();
// Ejecuta en serie: la función decide qué líneas añadir; se escriben primero y solo entonces se aplican en memoria.
function transaccion(trabajo) {
  const paso = cola.then(async () => {
    const r = await trabajo();
    if (r.lineas?.length) await appendFile(ARCHIVO, r.lineas.map((l) => JSON.stringify(l) + '\n').join(''));
    r.aplicar?.();
    return r.resultado;
  });
  cola = paso.catch(() => {});
  return paso;
}

function coincide(c, estado, q) {
  if (estado !== 'todas' && c.estado !== estado) return false;
  return !q || `${c.nombre}\n${c.telefono}\n${c.correo}`.toLowerCase().includes(q);
}
function parametrosFiltro(url) {
  const e = url.searchParams.get('estado') || 'todas';
  return { estado: e === 'todas' || ESTADOS.includes(e) ? e : null, q: (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 80) };
}

// ---------- Límites de intentos ----------
function limitador(max, ventanaMs) {
  const mapa = new Map();
  return {
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
const intentosLogin = limitador(5, 60_000);      // 5 contraseñas malas por minuto y por dirección
// Tope por dirección solo contra abusos de volumen: un consultorio detrás de un proxy o una red Wi-Fi compartida
// ve muchas personas con la misma dirección, así que es holgado. El control fino es por teléfono (abajo).
const envios = limitador(60, 10 * 60_000);
const rechazos = limitador(60, 10 * 60_000);
const sesiones = new Map(); // token -> expiración
setInterval(() => { intentosLogin.limpiar(); envios.limpiar(); rechazos.limpiar(); for (const [t, e] of sesiones) if (e < Date.now()) sesiones.delete(t); }, 60_000).unref();

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
    let c;
    if (tipo.includes('application/json')) c = JSON.parse(texto || '{}');
    else if (tipo.includes('application/x-www-form-urlencoded')) c = Object.fromEntries(new URLSearchParams(texto));
    if (c && typeof c === 'object' && !Array.isArray(c)) return c;
  } catch { /* cae abajo */ }
  const e = new Error('Datos no válidos'); e.estado = 400; throw e;
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, v.join('=')]));
}
const haySesion = (req) => { const e = sesiones.get(cookies(req).sesion); return Boolean(e && e > Date.now()); };
function ipDe(req) {
  if (CONFIAR_PROXY) {
    const ult = String(req.headers['x-forwarded-for'] || '').split(',').pop().trim();
    if (ult) return ult;
  }
  return req.socket.remoteAddress || 'desconocida';
}
function hoyLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// Formulario para la página de error cuando el navegador no ejecutó JavaScript: conserva lo que la persona escribió.
function formularioHtml(d = {}, errores = []) {
  const err = Object.fromEntries(errores.filter((e) => e.campo).map((e) => [e.campo, e.mensaje]));
  const v = (c) => esc(typeof d[c] === 'string' ? d[c] : '');
  const inv = (c) => (err[c] ? ` aria-invalid="true" aria-describedby="error-${c}"` : '');
  const msg = (c) => (err[c] ? `<p class="error" id="error-${c}">${esc(err[c])}</p>` : '');
  const opcion = (valor, texto, actual) => `<option value="${esc(valor)}"${valor === actual ? ' selected' : ''}>${esc(texto)}</option>`;
  const trat = [opcion('', 'Elige uno…', d.tratamiento), ...Object.entries(TRATAMIENTOS).map(([k, n]) => opcion(k, n, d.tratamiento))].join('');
  const horas = [opcion('', 'Elige una…', d.hora), ...HORAS.map((h) => opcion(h, h, d.hora))].join('');
  return `<form action="/api/citas" method="post" novalidate>
<div class="campo"><label for="nombre">Nombre</label><input id="nombre" name="nombre" type="text" autocomplete="name" required maxlength="80" value="${v('nombre')}"${inv('nombre')}>${msg('nombre')}</div>
<div class="campo"><label for="telefono">Teléfono</label><input id="telefono" name="telefono" type="tel" autocomplete="tel" required maxlength="25" value="${v('telefono')}"${inv('telefono')}>${msg('telefono')}</div>
<div class="campo"><label for="correo">Correo</label><input id="correo" name="correo" type="email" autocomplete="email" required maxlength="120" value="${v('correo')}"${inv('correo')}>${msg('correo')}</div>
<div class="campo"><label for="tratamiento">Tratamiento</label><select id="tratamiento" name="tratamiento" required${inv('tratamiento')}>${trat}</select>${msg('tratamiento')}</div>
<div class="fila"><div class="campo"><label for="fecha">Día (lunes a viernes)</label><input id="fecha" name="fecha" type="date" required min="${hoyLocal()}" value="${v('fecha')}"${inv('fecha')}>${msg('fecha')}</div>
<div class="campo"><label for="hora">Hora</label><select id="hora" name="hora" required${inv('hora')}>${horas}</select>${msg('hora')}</div></div>
<div class="campo"><label for="comentario">Comentario (opcional)</label><textarea id="comentario" name="comentario" rows="3" maxlength="500"${inv('comentario')}>${v('comentario')}</textarea>${msg('comentario')}</div>
<button class="boton" type="submit">Enviar solicitud</button></form>`;
}

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

// Respuesta a un envío del formulario público: JSON para app.js, redirección o página con el formulario para el envío normal.
function responderCita(req, res, estado, cuerpo, datosForm) {
  if ((req.headers.accept || '').includes('application/json')) return json(res, estado, cuerpo);
  if (estado === 201) { res.writeHead(303, { Location: '/gracias.html' }); return res.end(); }
  const errores = cuerpo.errores || [];
  const mensajes = errores.length ? errores.map((e) => e.mensaje) : [cuerpo.mensaje];
  const lista = mensajes.map((m) => `<li>${esc(m)}</li>`).join('');
  return pagina(res, estado, 'No pudimos guardar tu solicitud', `<ul>${lista}</ul><p>Lo que escribiste sigue aquí abajo. Corrige y vuelve a enviar.</p>${formularioHtml(datosForm, errores)}<p><a href="/">Ir al inicio</a></p>`);
}

// ---------- Rutas ----------
async function api(req, res, url) {
  const ruta = url.pathname;
  const ip = ipDe(req);

  if (req.method === 'POST' && ruta === '/api/citas') {
    const cuerpo = await leerCuerpo(req);
    const espera = Math.max(envios.bloqueado(ip), rechazos.bloqueado(ip));
    if (espera) { res.setHeader('Retry-After', espera); return responderCita(req, res, 429, { mensaje: 'Se han enviado demasiadas solicitudes desde tu conexión. Intenta de nuevo en unos minutos, o llámanos.' }, cuerpo); }
    if (typeof cuerpo.sitio_web === 'string' && cuerpo.sitio_web !== '') { rechazos.golpe(ip); return responderCita(req, res, 201, { ok: true }, cuerpo); } // trampa para bots: se finge éxito y no se guarda
    const { errores, datos } = validar(cuerpo);
    if (errores.length) { rechazos.golpe(ip); return responderCita(req, res, 400, { errores }, cuerpo); }
    const r = await transaccion(async () => {
      if (cuentas.pendiente >= TOPE_PENDIENTES) return { resultado: 'lleno' };
      if (pendientesIguales.has(claveIgual({ ...datos, estado: 'pendiente' }))) return { resultado: 'repetida' }; // doble clic: no se duplica
      if ((pendientesPorTel.get(soloDigitos(datos.telefono)) || 0) >= MAX_PENDIENTES_POR_TELEFONO) return { resultado: 'telefono' };
      const c = { id: randomUUID(), creada: new Date().toISOString(), estado: 'pendiente', ...datos };
      return { lineas: [c], aplicar() { lista.push(c); porId.set(c.id, c); indexar(c, 1); }, resultado: 'ok' };
    });
    if (r === 'lleno') return responderCita(req, res, 503, { mensaje: 'Ahora mismo no podemos recibir más solicitudes en línea. Por favor llámanos.' }, cuerpo);
    if (r === 'telefono') return responderCita(req, res, 400, { errores: [{ campo: 'telefono', mensaje: `Ya tienes ${MAX_PENDIENTES_POR_TELEFONO} solicitudes pendientes con este teléfono. Te contactaremos pronto; si es urgente, llámanos.` }] }, cuerpo);
    if (r === 'ok') envios.golpe(ip);
    return responderCita(req, res, 201, { ok: true }, cuerpo);
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

    // Lista paginada (50 por página), más nuevas primero. Filtros: ?estado=pendiente|confirmada|cancelada|todas &q=texto &pagina=N
    if (req.method === 'GET' && ruta === '/api/admin/citas') {
      const { estado, q } = parametrosFiltro(url);
      if (!estado) return json(res, 400, { mensaje: 'Estado no válido.' });
      const filtrando = estado !== 'todas' || q;
      const total = filtrando ? lista.reduce((n, c) => n + (coincide(c, estado, q) ? 1 : 0), 0) : lista.length;
      const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
      const pag = Math.min(Math.max(1, parseInt(url.searchParams.get('pagina'), 10) || 1), paginas);
      const desde = (pag - 1) * POR_PAGINA;
      const citas = [];
      let visto = 0;
      for (let i = lista.length - 1; i >= 0 && citas.length < POR_PAGINA; i--) {
        if (!coincide(lista[i], estado, q)) continue;
        if (visto++ >= desde) citas.push(lista[i]);
      }
      return json(res, 200, { citas, total, pagina: pag, paginas, cuentas: { ...cuentas, todas: lista.length } });
    }
    // Borrado en bloque de lo que coincide con el filtro: DELETE /api/admin/citas?estado=cancelada[&q=texto]
    if (req.method === 'DELETE' && ruta === '/api/admin/citas') {
      if (!url.searchParams.has('estado')) return json(res, 400, { mensaje: 'Indica qué estado borrar (estado=todas, pendiente, confirmada o cancelada).' });
      const { estado, q } = parametrosFiltro(url);
      if (!estado) return json(res, 400, { mensaje: 'Estado no válido.' });
      const eliminadas = await transaccion(async () => {
        const quitar = lista.filter((c) => coincide(c, estado, q));
        if (!quitar.length) return { resultado: 0 };
        const ids = new Set(quitar.map((c) => c.id));
        return { lineas: quitar.map((c) => ({ id: c.id, eliminar: true })), aplicar() { reconstruir(lista.filter((c) => !ids.has(c.id))); }, resultado: quitar.length };
      });
      return json(res, 200, { eliminadas });
    }
    const m = /^\/api\/admin\/citas\/([\w-]+)$/.exec(ruta);
    if (m && req.method === 'PATCH') {
      const { estado } = await leerCuerpo(req);
      if (!ESTADOS.includes(estado)) return json(res, 400, { mensaje: 'Estado no válido.' });
      const cita = await transaccion(async () => {
        const c = porId.get(m[1]);
        if (!c) return { resultado: null };
        const nueva = { ...c, estado };
        return { lineas: [nueva], aplicar() { indexar(c, -1); c.estado = estado; indexar(c, 1); }, resultado: nueva };
      });
      return cita ? json(res, 200, { cita }) : json(res, 404, { mensaje: 'Esa solicitud ya no existe.' });
    }
    if (m && req.method === 'DELETE') {
      const hubo = await transaccion(async () => {
        const c = porId.get(m[1]);
        if (!c) return { resultado: false };
        return { lineas: [{ id: c.id, eliminar: true }], aplicar() { reconstruir(lista.filter((x) => x !== c)); }, resultado: true };
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
  // Todo el HTML, CSS y JS propio sale de archivos externos: no hay scripts ni estilos en línea.
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; form-action 'self'");
  let url;
  try {
    url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return await estatico(req, res, url);
  } catch (e) {
    const formularioPublico = req.method === 'POST' && url?.pathname === '/api/citas' && !(req.headers.accept || '').includes('application/json');
    if (!e.estado) console.error(e);
    if (res.headersSent) return res.end();
    if (formularioPublico) {
      return pagina(res, e.estado || 500, 'No pudimos guardar tu solicitud', `<p>${esc(e.estado ? e.message : 'Algo salió mal en el servidor. Intenta de nuevo o llámanos.')}</p><p><a class="boton" href="/#cita">Volver al formulario</a></p>`);
    }
    if (e.estado) return json(res, e.estado, { mensaje: e.message });
    return json(res, 500, { mensaje: 'Algo salió mal en el servidor. Intenta de nuevo o llámanos.' });
  }
});
servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\nEl puerto ${PUERTO} ya está en uso por otro programa. Usa otro, por ejemplo:\n  PowerShell:  $env:PORT=8081; node servidor.mjs\n  Mac/Linux:   PORT=8081 node servidor.mjs\n`);
  else console.error(e);
  process.exit(1);
});
servidor.listen(PUERTO, () => {
  const p = servidor.address().port;
  console.log(`Fisio Andares en http://localhost:${p}`);
  console.log(`Panel de la dueña: http://localhost:${p}/admin   (contraseña: ${CLAVE}, desde ${origenClave})`);
});
