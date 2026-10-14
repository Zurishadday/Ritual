// Servidor de Taller Rueda Libre. Sin dependencias: solo módulos de Node.
//   node servidor.mjs            -> http://localhost:3000
//   PORT=8080 node servidor.mjs  -> otro puerto
//   ADMIN_PASSWORD=... node servidor.mjs -> fija la clave de /admin
// Si no defines ADMIN_PASSWORD, la clave se genera una vez y queda en datos/clave-admin.txt.

import http from 'node:http';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'publico');
const DATOS = path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'mensajes.jsonl');
const PUERTO = Number(process.env.PORT) || 3000;

const MAX_CUERPO = 16 * 1024; // bytes que aceptamos por petición
const MAX_ARCHIVO = 10 * 1024 * 1024; // tope del archivo de mensajes
const POR_PAGINA = 50;
const LIMITE = { nombre: 100, correo: 200, mensaje: 2000 };

mkdirSync(DATOS, { recursive: true });

// ---------- utilidades ----------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; form-action 'self'",
};

function responder(res, estado, cuerpo, tipo = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(estado, { 'Content-Type': tipo, ...CABECERAS, ...extra });
  res.end(cuerpo);
}
const json = (res, estado, obj) => responder(res, estado, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store' });
const redirigir = (res, destino) => res.writeHead(303, { Location: destino, ...CABECERAS }).end();

async function leerCuerpo(req) {
  const trozos = [];
  let total = 0;
  for await (const t of req) {
    total += t.length;
    if (total > MAX_CUERPO) throw Object.assign(new Error('cuerpo grande'), { codigo: 413 });
    trozos.push(t);
  }
  return Buffer.concat(trozos).toString('utf8');
}

async function leerCampos(req) {
  const texto = await leerCuerpo(req);
  const tipo = req.headers['content-type'] || '';
  if (tipo.includes('application/json')) {
    try {
      const o = JSON.parse(texto);
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch {
      throw Object.assign(new Error('json'), { codigo: 400 });
    }
  }
  return Object.fromEntries(new URLSearchParams(texto));
}

// Un POST desde otro sitio web no debe poder mandar ni borrar mensajes.
function origenValido(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try {
    return new URL(o).host === req.headers.host;
  } catch {
    return false;
  }
}

const ip = (req) => req.socket.remoteAddress || 'desconocida';

// Limitador sencillo en memoria: máximo `max` eventos por ventana, por clave.
function crearLimitador(max, ventanaMs) {
  const mapa = new Map();
  setInterval(() => {
    const ahora = Date.now();
    for (const [k, v] of mapa) if (ahora - v.desde > ventanaMs) mapa.delete(k);
  }, 60_000).unref();
  return {
    bloqueado(k) {
      const v = mapa.get(k);
      if (!v) return false;
      if (Date.now() - v.desde > ventanaMs) {
        mapa.delete(k);
        return false;
      }
      return v.n >= max;
    },
    anotar(k) {
      const v = mapa.get(k);
      if (!v || Date.now() - v.desde > ventanaMs) mapa.set(k, { n: 1, desde: Date.now() });
      else v.n++;
    },
  };
}
const limiteMensajes = crearLimitador(5, 10 * 60_000); // 5 mensajes por IP cada 10 min
const limiteClave = crearLimitador(5, 60_000); // 5 claves incorrectas por IP por minuto

// ---------- almacenamiento (un mensaje JSON por línea) ----------

let cola = Promise.resolve();
function enSerie(fn) {
  const p = cola.then(fn);
  cola = p.catch(() => {});
  return p;
}

async function leerLineas() {
  try {
    const t = await fs.readFile(ARCHIVO, 'utf8');
    return t.split('\n').filter((l) => l.trim() !== '');
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

function interpretar(linea) {
  try {
    const o = JSON.parse(linea);
    if (o && typeof o.id === 'string' && typeof o.mensaje === 'string') return o;
  } catch {}
  return null;
}

async function listarMensajes() {
  const lineas = await leerLineas();
  let tamano = 0;
  try {
    tamano = (await fs.stat(ARCHIVO)).size;
  } catch {}
  const mensajes = [];
  let danadas = 0;
  for (const l of lineas) {
    const m = interpretar(l);
    if (m) mensajes.push(m);
    else danadas++;
  }
  mensajes.reverse(); // más nuevos primero
  return { mensajes, danadas, tamano };
}

function guardarMensaje(m) {
  return enSerie(async () => {
    let tamano = 0;
    try {
      tamano = (await fs.stat(ARCHIVO)).size;
    } catch {}
    if (tamano > MAX_ARCHIVO) throw Object.assign(new Error('lleno'), { codigo: 507 });
    let prefijo = '';
    if (tamano > 0) {
      // Si la última escritura quedó cortada sin salto de línea, no pegamos el mensaje nuevo a ella.
      const f = await fs.open(ARCHIVO, 'r');
      try {
        const b = Buffer.alloc(1);
        await f.read(b, 0, 1, tamano - 1);
        if (b[0] !== 0x0a) prefijo = '\n';
      } finally {
        await f.close();
      }
    }
    await fs.appendFile(ARCHIVO, prefijo + JSON.stringify(m) + '\n');
  });
}

function reescribir(filtro) {
  return enSerie(async () => {
    const lineas = await leerLineas();
    const quedan = lineas.filter((l) => {
      const m = interpretar(l);
      return m ? filtro(m) : true; // las líneas dañadas no se tocan: no perdemos nada sin avisar
    });
    const tmp = ARCHIVO + '.tmp';
    await fs.writeFile(tmp, quedan.length ? quedan.join('\n') + '\n' : '');
    await fs.rename(tmp, ARCHIVO);
    return lineas.length - quedan.length;
  });
}

// ---------- clave de administración ----------

async function cargarClave() {
  if (process.env.ADMIN_PASSWORD) return { clave: process.env.ADMIN_PASSWORD, origen: 'variable ADMIN_PASSWORD' };
  const f = path.join(DATOS, 'clave-admin.txt');
  try {
    const t = (await fs.readFile(f, 'utf8')).trim();
    if (t) return { clave: t, origen: f };
  } catch {}
  const clave = crypto.randomBytes(9).toString('base64url');
  await fs.writeFile(f, clave + '\n');
  return { clave, origen: f };
}
const { clave: CLAVE, origen: ORIGEN_CLAVE } = await cargarClave();
const hash = (s) => crypto.createHash('sha256').update(s).digest();

function autenticar(req, res) {
  const k = ip(req);
  if (limiteClave.bloqueado(k)) {
    responder(res, 429, paginaSimple('Demasiados intentos', '<p>Espera un minuto antes de volver a intentar.</p>'), undefined, {
      'Retry-After': '60',
    });
    return false;
  }
  const h = req.headers.authorization || '';
  if (h.startsWith('Basic ')) {
    const [usuario, ...resto] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
    const clave = resto.join(':');
    const okU = crypto.timingSafeEqual(hash(usuario), hash('admin'));
    const okC = crypto.timingSafeEqual(hash(clave), hash(CLAVE));
    if (okU && okC) return true;
    limiteClave.anotar(k);
  }
  responder(res, 401, paginaSimple('Acceso restringido', '<p>Escribe el usuario <strong>admin</strong> y la clave de administración.</p>'), undefined, {
    'WWW-Authenticate': 'Basic realm="Taller Rueda Libre", charset="UTF-8"',
  });
  return false;
}

// ---------- páginas generadas por el servidor ----------

function paginaSimple(titulo, cuerpo, css = '/estilos.css') {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Taller Rueda Libre</title><link rel="stylesheet" href="${css}"></head>
<body class="pagina-simple"><main class="envoltorio-simple"><h1>${esc(titulo)}</h1>${cuerpo}</main></body></html>`;
}

// Formulario para quien envía sin JavaScript (o si app.js no carga): el servidor lo vuelve a pintar con sus datos y errores.
function paginaContacto({ valores = {}, errores = {}, enviado = false, aviso = '' } = {}) {
  if (enviado) {
    return paginaSimple(
      'Mensaje enviado',
      `<p role="status">¡Gracias! Recibimos tu mensaje y te responderemos pronto.</p><p><a class="boton" href="/">Volver al inicio</a></p>`
    );
  }
  const hayErrores = Object.keys(errores).length > 0;
  const campo = (id, etiqueta, tipo, extra = '') => {
    const err = errores[id];
    const valor = valores[id] ?? '';
    const control =
      tipo === 'textarea'
        ? `<textarea id="${id}" name="${id}" rows="5" maxlength="${LIMITE[id]}" required${err ? ` aria-invalid="true" aria-describedby="e-${id}"` : ''}>${esc(valor)}</textarea>`
        : `<input id="${id}" name="${id}" type="${tipo}" maxlength="${LIMITE[id]}" value="${esc(valor)}" required${extra}${err ? ` aria-invalid="true" aria-describedby="e-${id}"` : ''}>`;
    return `<div class="campo${err ? ' con-error' : ''}"><label for="${id}">${etiqueta}</label>${control}${err ? `<p class="error-campo" id="e-${id}">${esc(err)}</p>` : ''}</div>`;
  };
  return paginaSimple(
    'Escríbenos',
    `${hayErrores || aviso ? `<p class="aviso-error" role="alert">${esc(aviso || 'Revisa los campos marcados y vuelve a enviar.')}</p>` : ''}
<form action="/contacto" method="post" class="formulario" novalidate>
${campo('nombre', 'Nombre', 'text', ' autocomplete="name"')}
${campo('correo', 'Correo electrónico', 'email', ' autocomplete="email"')}
${campo('mensaje', 'Mensaje', 'textarea')}
<div class="trampa" aria-hidden="true"><label>No llenes este campo<input name="sitio_web" tabindex="-1" autocomplete="off"></label></div>
<button class="boton" type="submit">Enviar mensaje</button>
</form><p><a href="/">← Volver al inicio</a></p>`
  );
}

function validar(c) {
  const v = {
    nombre: String(c.nombre ?? '').trim(),
    correo: String(c.correo ?? '').trim(),
    mensaje: String(c.mensaje ?? '').trim(),
  };
  const errores = {};
  if (!v.nombre) errores.nombre = 'Escribe tu nombre.';
  else if (v.nombre.length > LIMITE.nombre) errores.nombre = `Máximo ${LIMITE.nombre} caracteres.`;
  if (!v.correo) errores.correo = 'Escribe tu correo para poder responderte.';
  else if (v.correo.length > LIMITE.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo))
    errores.correo = 'Ese correo no parece válido. Ejemplo: nombre@correo.com';
  if (!v.mensaje) errores.mensaje = 'Escribe tu mensaje.';
  else if (v.mensaje.length > LIMITE.mensaje) errores.mensaje = `Máximo ${LIMITE.mensaje} caracteres.`;
  return { valores: v, errores };
}

function paginaAdmin({ mensajes, danadas, tamano }, pagina, q = '') {
  const todos = mensajes.length;
  const buscados = q
    ? mensajes.filter((m) => `${m.nombre}\n${m.correo}\n${m.mensaje}`.toLowerCase().includes(q.toLowerCase()))
    : mensajes;
  const total = buscados.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const p = Math.min(Math.max(1, pagina), paginas);
  const visibles = buscados.slice((p - 1) * POR_PAGINA, p * POR_PAGINA);
  const fmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  const tarjetas = visibles
    .map(
      (m) => `<article class="mensaje">
<header><label class="marca"><input type="checkbox" name="id" value="${esc(m.id)}"> <span class="solo-lectores">Marcar mensaje de ${esc(m.nombre)}</span></label><h2>${esc(m.nombre)}</h2><p><a href="mailto:${esc(m.correo)}">${esc(m.correo)}</a> · <time datetime="${esc(m.fecha)}">${esc(fmt.format(new Date(m.fecha)))}</time></p></header>
<p class="texto">${esc(m.mensaje)}</p>
</article>`
    )
    .join('\n');
  const qs = q ? `&q=${encodeURIComponent(q)}` : '';
  const nav =
    paginas > 1
      ? `<nav class="paginas" aria-label="Páginas">${p > 1 ? `<a href="/admin?pagina=${p - 1}${qs}">← Más nuevos</a>` : ''}<span>Página ${p} de ${paginas}</span>${p < paginas ? `<a href="/admin?pagina=${p + 1}${qs}">Más antiguos →</a>` : ''}</nav>`
      : '';
  const lleno = tamano > MAX_ARCHIVO * 0.9;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mensajes · Taller Rueda Libre</title><link rel="stylesheet" href="/admin.css"></head>
<body><main class="admin">
<h1>Mensajes recibidos</h1>
<p class="resumen"><strong>${todos}</strong> ${todos === 1 ? 'mensaje' : 'mensajes'}${q ? ` · ${total} con «${esc(q)}»` : ''} · <a href="/">Ver el sitio</a>${todos ? ' · <a href="/admin/borrar-todo">Borrar todos</a>' : ''}</p>
${lleno ? '<p class="aviso-error" role="alert">El archivo de mensajes casi está lleno y pronto dejará de aceptar mensajes nuevos. Borra los que ya no necesites.</p>' : ''}
${danadas ? `<p class="aviso-error" role="alert">Hay ${danadas} ${danadas === 1 ? 'línea dañada' : 'líneas dañadas'} en datos/mensajes.jsonl que no se pueden mostrar. No se perdió nada más; puedes revisarlas abriendo el archivo.</p>` : ''}
<form class="buscador" method="get" action="/admin" role="search"><label for="q">Buscar</label> <input id="q" name="q" type="search" value="${esc(q)}"> <button type="submit">Buscar</button>${q ? ' <a href="/admin">Quitar búsqueda</a>' : ''}</form>
${nav}
${
  visibles.length
    ? `<form method="post" action="/admin/borrar">
<p class="acciones"><button class="boton-borrar" type="submit">Borrar los mensajes marcados</button> <span>Marca los que quieras quitar; sirve para limpiar correo basura.</span></p>
${tarjetas}
<p class="acciones"><button class="boton-borrar" type="submit">Borrar los mensajes marcados</button></p>
</form>`
    : `<p class="vacio">${q ? 'Ningún mensaje coincide con la búsqueda.' : 'Todavía no hay mensajes.'}</p>`
}
${nav}
</main></body></html>`;
}

// ---------- rutas ----------

async function contacto(req, res) {
  const quiereJson = (req.headers.accept || '').includes('application/json');
  const falla = (estado, mensaje, errores) =>
    quiereJson ? json(res, estado, { ok: false, mensaje, errores }) : responder(res, estado, paginaContacto({ errores: errores || {}, aviso: mensaje }));

  if (limiteMensajes.bloqueado(ip(req))) {
    res.setHeader('Retry-After', '600');
    return falla(429, 'Has enviado varios mensajes seguidos. Espera unos minutos e inténtalo de nuevo.');
  }
  let campos;
  try {
    campos = await leerCampos(req);
  } catch (e) {
    return falla(e.codigo || 400, e.codigo === 413 ? 'El mensaje es demasiado largo.' : 'No pudimos leer el formulario.');
  }

  // Trampa para bots: un campo oculto que las personas no llenan. Fingimos éxito y no guardamos nada.
  if (String(campos.sitio_web ?? '') !== '') {
    return quiereJson ? json(res, 200, { ok: true }) : responder(res, 200, paginaContacto({ enviado: true }));
  }

  const { valores, errores } = validar(campos);
  if (Object.keys(errores).length) {
    if (quiereJson) return json(res, 400, { ok: false, mensaje: 'Revisa los campos marcados.', errores });
    return responder(res, 400, paginaContacto({ valores, errores }));
  }

  limiteMensajes.anotar(ip(req));
  try {
    await guardarMensaje({ id: crypto.randomUUID(), fecha: new Date().toISOString(), ...valores });
  } catch (e) {
    console.error('No se pudo guardar el mensaje:', e);
    return falla(503, 'No pudimos guardar tu mensaje. Inténtalo de nuevo en unos minutos o escríbenos por teléfono.');
  }
  return quiereJson ? json(res, 200, { ok: true }) : responder(res, 200, paginaContacto({ enviado: true }));
}

async function admin(req, res, url) {
  if (!autenticar(req, res)) return;
  const ruta = url.pathname.replace(/\/+$/, '');
  const noCache = { 'Cache-Control': 'no-store' };

  if (req.method === 'GET' && ruta === '/admin') {
    const pagina = parseInt(url.searchParams.get('pagina'), 10) || 1;
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    return responder(res, 200, paginaAdmin(await listarMensajes(), pagina, q), undefined, noCache);
  }
  if (req.method === 'POST' && ruta === '/admin/borrar') {
    const ids = new Set(new URLSearchParams(await leerCuerpo(req)).getAll('id'));
    if (ids.size) await reescribir((m) => !ids.has(m.id));
    return redirigir(res, '/admin');
  }
  if (req.method === 'GET' && ruta === '/admin/borrar-todo') {
    return responder(
      res,
      200,
      paginaSimple(
        '¿Borrar todos los mensajes?',
        `<p>Esta acción no se puede deshacer.</p><form method="post" action="/admin/borrar-todo"><button class="boton-borrar" type="submit">Sí, borrar todos</button> <a href="/admin">Cancelar</a></form>`,
        '/admin.css'
      ),
      undefined,
      noCache
    );
  }
  if (req.method === 'POST' && ruta === '/admin/borrar-todo') {
    await reescribir(() => false);
    return redirigir(res, '/admin');
  }
  return responder(res, 404, paginaSimple('No encontrada', '<p><a href="/admin">Volver a los mensajes</a></p>', '/admin.css'));
}

async function estatico(req, res, url) {
  let ruta;
  try {
    ruta = decodeURIComponent(url.pathname);
  } catch {
    return responder(res, 400, paginaSimple('Solicitud inválida', ''));
  }
  if (ruta.includes('\0')) return responder(res, 400, paginaSimple('Solicitud inválida', ''));
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.normalize(path.join(PUBLICO, ruta));
  if (!archivo.startsWith(PUBLICO + path.sep)) return responder(res, 404, paginaSimple('Página no encontrada', '<p><a href="/">Ir al inicio</a></p>'));
  try {
    const datos = await fs.readFile(archivo);
    const ext = path.extname(archivo).toLowerCase();
    return responder(res, 200, req.method === 'HEAD' ? undefined : datos, TIPOS[ext] || 'application/octet-stream', {
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
  } catch {
    return responder(res, 404, paginaSimple('Página no encontrada', '<p><a href="/">Ir al inicio</a></p>'));
  }
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && !origenValido(req)) return responder(res, 403, paginaSimple('Solicitud rechazada', ''));

    if (url.pathname === '/contacto') {
      if (req.method === 'POST') return await contacto(req, res);
      if (req.method === 'GET') return responder(res, 200, paginaContacto());
      return responder(res, 405, paginaSimple('Método no permitido', ''));
    }
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return await admin(req, res, url);
    if (req.method === 'GET' || req.method === 'HEAD') return await estatico(req, res, url);
    return responder(res, 405, paginaSimple('Método no permitido', ''));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) responder(res, 500, paginaSimple('Algo salió mal', '<p>Inténtalo de nuevo en un momento.</p>'));
    else res.end();
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Taller Rueda Libre en http://localhost:${PUERTO}`);
  console.log(`Mensajes:      http://localhost:${PUERTO}/admin   (usuario: admin)`);
  console.log(`Clave de admin: ${CLAVE}   (de: ${ORIGEN_CLAVE})`);
});
