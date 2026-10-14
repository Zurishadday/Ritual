// Servidor de Taller Rueda Libre. Sin dependencias: node servidor.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
const DATOS = path.join(RAIZ, 'datos');
const ARCHIVO = path.join(DATOS, 'mensajes.jsonl');
const PUERTO = Number(process.env.PORT) || 3000;

const MAX_CUERPO = 16 * 1024; // bytes por petición
const MAX_MENSAJES = 5000; // tope del buzón
const POR_PAGINA = 50;
const LIMITE_CONTACTO = { max: 5, ventanaMs: 10 * 60 * 1000 }; // por IP
const LIMITE_LOGIN = { max: 5, ventanaMs: 60 * 1000 }; // fallos por IP

fs.mkdirSync(DATOS, { recursive: true });

// ---------- Clave de administración ----------
function cargarClave() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const f = path.join(DATOS, 'clave-admin.txt');
  try {
    const c = fs.readFileSync(f, 'utf8').trim();
    if (c) return c;
  } catch {}
  const c = crypto.randomBytes(12).toString('base64url');
  fs.writeFileSync(f, c + '\n');
  return c;
}
const CLAVE = cargarClave();

// ---------- Almacén (un registro JSON por línea) ----------
// Cada escritura empieza con "\n": si una línea anterior quedó a medias,
// el siguiente mensaje no se pega a ella. Al leer se saltan las líneas dañadas.
function leerLineas() {
  try {
    return fs.readFileSync(ARCHIVO, 'utf8').split('\n').filter((l) => l.trim());
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}
function analizar(linea) {
  try {
    const m = JSON.parse(linea);
    return m && typeof m.id === 'string' ? m : null;
  } catch {
    return null;
  }
}
function leerMensajes() {
  const mensajes = [];
  let danadas = 0;
  for (const l of leerLineas()) {
    const m = analizar(l);
    if (m) mensajes.push(m);
    else danadas++;
  }
  return { mensajes, danadas };
}
let total = 0;
try {
  total = leerLineas().length;
} catch (e) {
  console.error('No se pudo leer el archivo de mensajes:', e.message);
}
function guardar(m) {
  fs.appendFileSync(ARCHIVO, '\n' + JSON.stringify(m) + '\n');
  total++;
}
function borrar(ids) {
  const quedan = leerLineas().filter((l) => {
    const m = analizar(l);
    return !(m && ids.has(m.id)); // las líneas dañadas se conservan
  });
  const tmp = ARCHIVO + '.tmp';
  fs.writeFileSync(tmp, quedan.length ? quedan.join('\n') + '\n' : '');
  fs.renameSync(tmp, ARCHIVO);
  total = quedan.length;
}

// ---------- Utilidades ----------
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const intentos = new Map(); // clave -> { n, hasta }
function excedido(mapa, ip, lim, contar) {
  const ahora = Date.now();
  let r = mapa.get(ip);
  if (!r || r.hasta <= ahora) {
    r = { n: 0, hasta: ahora + lim.ventanaMs };
    mapa.set(ip, r);
  }
  if (contar) r.n++;
  return r.n > lim.max ? Math.ceil((r.hasta - ahora) / 1000) : 0; // segundos de espera
}
const contactos = new Map();
const fallosLogin = new Map();
setInterval(() => {
  const ahora = Date.now();
  for (const m of [contactos, fallosLogin]) for (const [k, v] of m) if (v.hasta <= ahora) m.delete(k);
}, 60 * 1000).unref();

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let largo = 0;
    const partes = [];
    req.on('data', (c) => {
      largo += c.length;
      if (largo > MAX_CUERPO) {
        reject(Object.assign(new Error('Cuerpo demasiado grande'), { estado: 413 }));
        req.destroy();
      } else partes.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

function mismoOrigen(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try {
    return new URL(o).host === req.headers.host;
  } catch {
    return false;
  }
}

const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'",
};
function enviar(res, estado, tipo, cuerpo, extra = {}) {
  res.writeHead(estado, { 'Content-Type': tipo, ...CABECERAS, ...extra });
  res.end(cuerpo);
}
const json = (res, estado, obj) => enviar(res, estado, 'application/json; charset=utf-8', JSON.stringify(obj));
const html = (res, estado, cuerpo, extra) => enviar(res, estado, 'text/html; charset=utf-8', cuerpo, { 'Cache-Control': 'no-store', ...extra });

function pagina(titulo, cuerpo, clase = '') {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Taller Rueda Libre</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="/estilos.css"></head>
<body class="simple ${clase}"><main class="caja">${cuerpo}</main></body></html>`;
}

// ---------- Contacto ----------
function validar(d) {
  const limpio = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max + 1);
  const v = { nombre: limpio(d.nombre, 100), correo: limpio(d.correo, 200), mensaje: limpio(d.mensaje, 2000) };
  const errores = {};
  if (!v.nombre) errores.nombre = 'Escribe tu nombre.';
  else if (v.nombre.length > 100) errores.nombre = 'El nombre es muy largo (máximo 100 letras).';
  if (!v.correo) errores.correo = 'Escribe tu correo.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo) || v.correo.length > 200)
    errores.correo = 'Revisa el correo; debe verse como nombre@ejemplo.com.';
  if (!v.mensaje) errores.mensaje = 'Escribe tu mensaje.';
  else if (v.mensaje.length < 5) errores.mensaje = 'El mensaje es muy corto.';
  else if (v.mensaje.length > 2000) errores.mensaje = 'El mensaje es muy largo (máximo 2000 letras).';
  return { v, errores };
}

function recibirContacto(req, ip, datos) {
  // Trampa para bots: campo oculto que una persona no llena. Se responde "ok" sin guardar.
  if (datos.web) return { estado: 200, ok: true };
  // Solo cuentan los mensajes guardados: equivocarse al escribir no bloquea a nadie.
  const espera = excedido(contactos, ip, LIMITE_CONTACTO, false);
  if (espera)
    return { estado: 429, ok: false, mensaje: `Has enviado varios mensajes seguidos. Intenta de nuevo en ${Math.ceil(espera / 60)} minuto(s).` };
  const { v, errores } = validar(datos);
  if (Object.keys(errores).length)
    return { estado: 400, ok: false, errores, valores: v, mensaje: 'Revisa los campos marcados.' };
  if (total >= MAX_MENSAJES) {
    console.warn('Buzón lleno: se rechazó un mensaje. Borra mensajes en /admin.');
    return { estado: 503, ok: false, valores: v, mensaje: 'Ahora mismo no podemos recibir mensajes. Pasa por el taller, por favor.' };
  }
  try {
    guardar({ id: crypto.randomUUID(), fecha: new Date().toISOString(), ...v });
    excedido(contactos, ip, LIMITE_CONTACTO, true);
  } catch (e) {
    console.error('No se pudo guardar el mensaje:', e.message);
    return { estado: 500, ok: false, valores: v, mensaje: 'No pudimos guardar tu mensaje. Inténtalo de nuevo en unos minutos.' };
  }
  return { estado: 200, ok: true };
}

function formularioPrellenado(v = {}, errores = {}) {
  const campo = (n, et, ctrl) =>
    `<p><label for="${n}">${et}</label>${ctrl}${errores[n] ? `<span class="error">${esc(errores[n])}</span>` : ''}</p>`;
  return `<form method="post" action="/contacto">
${campo('nombre', 'Nombre', `<input id="nombre" name="nombre" required maxlength="100" value="${esc(v.nombre || '')}">`)}
${campo('correo', 'Correo', `<input id="correo" name="correo" type="email" required maxlength="200" value="${esc(v.correo || '')}">`)}
${campo('mensaje', 'Mensaje', `<textarea id="mensaje" name="mensaje" rows="5" required maxlength="2000">${esc(v.mensaje || '')}</textarea>`)}
<button class="boton">Enviar mensaje</button></form>`;
}

// ---------- Administración ----------
function autorizar(req, res, ip) {
  const espera = excedido(fallosLogin, ip, LIMITE_LOGIN, false);
  if (espera) {
    html(res, 429, pagina('Demasiados intentos', `<h1>Demasiados intentos</h1><p>Espera ${espera} segundos y vuelve a intentar.</p>`), { 'Retry-After': String(espera) });
    return false;
  }
  const h = req.headers.authorization || '';
  if (h.startsWith('Basic ')) {
    const [u, ...resto] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
    const a = crypto.createHash('sha256').update(resto.join(':')).digest();
    const b = crypto.createHash('sha256').update(CLAVE).digest();
    if (u === 'admin' && crypto.timingSafeEqual(a, b)) return true;
    excedido(fallosLogin, ip, LIMITE_LOGIN, true); // cuenta un fallo
  }
  html(res, 401, pagina('Acceso', '<h1>Acceso restringido</h1><p>Necesitas usuario y clave.</p>'), {
    'WWW-Authenticate': 'Basic realm="Administracion Rueda Libre", charset="UTF-8"',
  });
  return false;
}

function paginaAdmin(url) {
  const { mensajes, danadas } = leerMensajes();
  mensajes.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const paginas = Math.max(1, Math.ceil(mensajes.length / POR_PAGINA));
  const p = Math.min(paginas, Math.max(1, parseInt(url.searchParams.get('pagina'), 10) || 1));
  const visibles = mensajes.slice((p - 1) * POR_PAGINA, p * POR_PAGINA);
  const fmt = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? esc(iso) : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  };
  const items = visibles
    .map(
      (m) => `<article class="mensaje">
<header><strong>${esc(m.nombre)}</strong> · <a href="mailto:${esc(m.correo)}">${esc(m.correo)}</a><time>${fmt(m.fecha)}</time></header>
<p>${esc(m.mensaje)}</p>
<form method="post" action="/admin/borrar"><input type="hidden" name="id" value="${esc(m.id)}"><button class="boton secundario">Borrar</button></form>
</article>`
    )
    .join('');
  const nav =
    paginas > 1
      ? `<nav class="paginas">${p > 1 ? `<a href="/admin?pagina=${p - 1}">← Más recientes</a>` : ''} Página ${p} de ${paginas} ${p < paginas ? `<a href="/admin?pagina=${p + 1}">Más antiguos →</a>` : ''}</nav>`
      : '';
  const avisos =
    (danadas ? `<p class="aviso">Hay ${danadas} línea(s) dañada(s) en el archivo de mensajes; se omiten aquí pero siguen en <code>datos/mensajes.jsonl</code>.</p>` : '') +
    (total >= MAX_MENSAJES ? '<p class="aviso">El buzón está lleno: ya no se reciben mensajes nuevos hasta que borres algunos.</p>' : '');
  return pagina(
    'Mensajes',
    `<h1>Mensajes recibidos</h1><p>${mensajes.length} mensaje(s). <a href="/">Ver sitio</a>${mensajes.length ? ' · <a href="/admin/borrar-todos">Borrar todos…</a>' : ''}</p>${avisos}${items || '<p>Todavía no hay mensajes.</p>'}${nav}`,
    'admin'
  );
}

// ---------- Archivos estáticos ----------
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};
function estatico(res, ruta) {
  const rel = ruta === '/' ? '/index.html' : ruta;
  const archivo = path.normalize(path.join(PUBLICO, decodeURIComponent(rel)));
  if (!archivo.startsWith(PUBLICO + path.sep)) return false;
  let datos;
  try {
    datos = fs.readFileSync(archivo);
  } catch {
    return false;
  }
  const ext = path.extname(archivo).toLowerCase();
  enviar(res, 200, TIPOS[ext] || 'application/octet-stream', datos, {
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  return true;
}

// ---------- Rutas ----------
const servidor = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || '?';
  try {
    const url = new URL(req.url, 'http://x');
    const ruta = url.pathname;

    if (req.method === 'POST' && ruta === '/api/contacto') {
      if (!mismoOrigen(req)) return json(res, 403, { ok: false, mensaje: 'Origen no permitido.' });
      let datos;
      try {
        datos = JSON.parse(await leerCuerpo(req));
      } catch (e) {
        return json(res, e.estado || 400, { ok: false, mensaje: 'No entendimos el mensaje enviado.' });
      }
      const r = recibirContacto(req, ip, datos && typeof datos === 'object' ? datos : {});
      return json(res, r.estado, { ok: r.ok, errores: r.errores, mensaje: r.mensaje });
    }

    // Respaldo sin JavaScript: el formulario también funciona con un POST normal.
    if (req.method === 'POST' && ruta === '/contacto') {
      if (!mismoOrigen(req)) return html(res, 403, pagina('Error', '<h1>Origen no permitido</h1>'));
      let datos;
      try {
        datos = Object.fromEntries(new URLSearchParams(await leerCuerpo(req)));
      } catch (e) {
        return html(res, e.estado || 400, pagina('Error', '<h1>Mensaje demasiado grande</h1><p><a href="/#contacto">Volver</a></p>'));
      }
      const r = recibirContacto(req, ip, datos);
      if (r.ok)
        return html(res, 200, pagina('Gracias', '<h1>¡Gracias!</h1><p>Recibimos tu mensaje y te responderemos pronto.</p><p><a class="boton" href="/">Volver al inicio</a></p>'));
      return html(
        res,
        r.estado,
        pagina('Revisa tu mensaje', `<h1>No pudimos enviar tu mensaje</h1><p class="aviso">${esc(r.mensaje)}</p>${r.valores ? formularioPrellenado(r.valores, r.errores) : ''}<p><a href="/">Volver al inicio</a></p>`)
      );
    }

    if (ruta === '/admin' || ruta.startsWith('/admin/')) {
      if (!autorizar(req, res, ip)) return;
      if (req.method === 'GET' && ruta === '/admin') return html(res, 200, paginaAdmin(url));
      if (req.method === 'GET' && ruta === '/admin/borrar-todos')
        return html(
          res,
          200,
          pagina('Borrar todos', `<h1>¿Borrar todos los mensajes?</h1><p>Se borrarán ${total} mensaje(s). No se puede deshacer.</p><form method="post" action="/admin/borrar-todos"><button class="boton">Sí, borrar todos</button> <a href="/admin">Cancelar</a></form>`)
        );
      if (req.method === 'POST' && (ruta === '/admin/borrar' || ruta === '/admin/borrar-todos')) {
        if (!mismoOrigen(req)) return html(res, 403, pagina('Error', '<h1>Origen no permitido</h1>'));
        const datos = Object.fromEntries(new URLSearchParams(await leerCuerpo(req)));
        if (ruta === '/admin/borrar') borrar(new Set([String(datos.id)]));
        else borrar(new Set(leerMensajes().mensajes.map((m) => m.id)));
        return enviar(res, 303, 'text/plain', '', { Location: '/admin' });
      }
      return html(res, 404, pagina('No encontrado', '<h1>No encontrado</h1>'));
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && estatico(res, ruta)) return;
    html(res, 404, pagina('No encontrado', '<h1>Página no encontrada</h1><p><a href="/">Ir al inicio</a></p>'));
  } catch (e) {
    console.error('Error:', e);
    if (!res.headersSent) html(res, 500, pagina('Error', '<h1>Algo salió mal</h1><p>Inténtalo de nuevo en un momento.</p>'));
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Taller Rueda Libre en http://localhost:${PUERTO}`);
  console.log(`Administración: http://localhost:${PUERTO}/admin   usuario: admin`);
  console.log(
    process.env.ADMIN_PASSWORD
      ? '  clave: la de la variable ADMIN_PASSWORD'
      : `  clave: ${CLAVE}   (guardada en datos/clave-admin.txt)`
  );
});
