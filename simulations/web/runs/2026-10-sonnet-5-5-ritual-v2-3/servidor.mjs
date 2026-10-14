// Servidor de «Taller Rueda Libre». Sin dependencias: node servidor.mjs
//
//   PORT         puerto (por defecto 3000)
//   HOST         dirección (por defecto 127.0.0.1; usa 0.0.0.0 para entrar desde el celular)
//   CLAVE_ADMIN  contraseña de /admin (si no existe, se genera y se guarda en datos/clave-admin.txt)
import http from 'node:http';
import { readFile, appendFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(AQUI, 'publico');
const DATOS = path.join(AQUI, 'datos');
const ARCHIVO = path.join(DATOS, 'mensajes.jsonl');
const ARCHIVO_CLAVE = path.join(DATOS, 'clave-admin.txt');
const PUERTO = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const POR_PAGINA = 50;

// ---------- Contraseña de administración ----------
await mkdir(DATOS, { recursive: true });
let clave = (process.env.CLAVE_ADMIN || '').trim();
let claveGenerada = false;
if (!clave && existsSync(ARCHIVO_CLAVE)) clave = readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
if (!clave) {
  clave = randomBytes(9).toString('base64url');
  writeFileSync(ARCHIVO_CLAVE, clave + '\n');
  claveGenerada = true;
}
const hash = (s) => createHash('sha256').update(s).digest();
const claveHash = hash(clave);
const claveCorrecta = (candidata) => timingSafeEqual(hash(candidata), claveHash);

// ---------- Límites de uso ----------
function hacerLimite(max, ventanaMs) {
  const m = new Map();
  setInterval(() => {
    const corte = Date.now() - ventanaMs;
    for (const [k, v] of m) if (v.at(-1) < corte) m.delete(k);
  }, 60_000).unref();
  const vigentes = (k) => {
    const v = (m.get(k) || []).filter((t) => t > Date.now() - ventanaMs);
    m.set(k, v);
    return v;
  };
  return {
    excedido: (k) => vigentes(k).length >= max,
    anotar: (k) => vigentes(k).push(Date.now()),
    espera: (k) => {
      const v = vigentes(k);
      return v.length ? Math.max(1, Math.ceil((v[0] + ventanaMs - Date.now()) / 1000)) : 0;
    },
  };
}
const limiteEnvios = hacerLimite(8, 10 * 60_000); // por IP
const limiteGuardados = hacerLimite(100, 60 * 60_000); // total por hora
const limiteClave = hacerLimite(5, 60_000); // intentos fallidos por IP

// ---------- Almacén: una línea JSON por mensaje ----------
let cola = Promise.resolve();
const enCola = (fn) => {
  const r = cola.then(fn);
  cola = r.catch(() => {});
  return r;
};
const txt = (v) => (typeof v === 'string' ? v : '');

async function leerTodo() {
  let texto = '';
  try {
    texto = await readFile(ARCHIVO, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const registros = [];
  let danadas = 0;
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    try {
      const r = JSON.parse(linea);
      if (r && typeof r.id === 'string') {
        registros.push({ id: r.id, fecha: txt(r.fecha), nombre: txt(r.nombre), correo: txt(r.correo), mensaje: txt(r.mensaje) });
      } else danadas++;
    } catch {
      danadas++;
    }
  }
  return { registros, danadas, texto };
}

// El "\n" inicial aísla el registro nuevo aunque la última línea haya quedado a medias.
const guardar = (registro) => enCola(() => appendFile(ARCHIVO, '\n' + JSON.stringify(registro) + '\n'));

const borrar = (ids) =>
  enCola(async () => {
    const { texto } = await leerTodo();
    let quitados = 0;
    const quedan = [];
    for (const linea of texto.split('\n')) {
      if (!linea.trim()) continue;
      let id = null;
      try {
        id = JSON.parse(linea)?.id;
      } catch {}
      if (typeof id === 'string' && ids.has(id)) quitados++;
      else quedan.push(linea); // las líneas dañadas se conservan tal cual
    }
    const tmp = ARCHIVO + '.tmp';
    await writeFile(tmp, quedan.length ? quedan.join('\n') + '\n' : '');
    await rename(tmp, ARCHIVO);
    return quitados;
  });

// ---------- Utilidades HTTP ----------
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CSP =
  "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

function enviar(res, estado, tipo, cuerpo, extra = {}) {
  res.writeHead(estado, {
    'Content-Type': tipo,
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    ...extra,
  });
  res.end(cuerpo);
}
const html = (res, estado, cuerpo, extra) => enviar(res, estado, 'text/html; charset=utf-8', cuerpo, extra);
const json = (res, estado, obj, extra) => enviar(res, estado, 'application/json; charset=utf-8', JSON.stringify(obj), extra);
const redirigir = (res, destino) => {
  res.writeHead(303, { Location: destino, 'Content-Length': 0 });
  res.end();
};

function leerCuerpo(req, max) {
  return new Promise((ok, mal) => {
    const trozos = [];
    let n = 0;
    let grande = false;
    req.on('data', (c) => {
      if (grande) return;
      n += c.length;
      if (n > max) {
        grande = true;
        trozos.length = 0;
        return;
      }
      trozos.push(c);
    });
    req.on('end', () => (grande ? mal(Object.assign(new Error('Cuerpo demasiado grande'), { estado: 413 })) : ok(Buffer.concat(trozos).toString('utf8'))));
    req.on('error', mal);
  });
}

const mismoOrigen = (req) => {
  const o = req.headers.origin;
  if (!o) return true;
  try {
    return new URL(o).host === req.headers.host;
  } catch {
    return false;
  }
};

// ---------- Páginas generadas por el servidor ----------
function paginaBase(titulo, cuerpo, { admin = false } = {}) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${admin ? '<meta name="robots" content="noindex">' : ''}
<title>${esc(titulo)}</title>
<link rel="stylesheet" href="/estilos.css">
${admin ? '<link rel="stylesheet" href="/admin.css">' : ''}
</head>
<body>
${cuerpo}
</body>
</html>`;
}

// Formulario que se muestra cuando se envía sin JavaScript y hay algo que corregir.
function paginaFormulario(valores, errores, aviso) {
  const campo = (id, etiqueta, control) => `
    <div class="campo">
      <label for="${id}">${etiqueta}</label>
      ${control}
      <p class="error" id="error-${id}">${esc(errores[id] || '')}</p>
    </div>`;
  const attrs = (id) => (errores[id] ? ` aria-invalid="true" aria-describedby="error-${id}"` : '');
  const cuerpo = `
<main class="contenedor estrecho seccion">
  <h1>Contacto</h1>
  <p class="estado estado-error" role="alert">${esc(aviso)}</p>
  <form action="/contacto" method="post" class="formulario">
    ${campo('nombre', 'Nombre', `<input id="nombre" name="nombre" type="text" autocomplete="name" required maxlength="100" value="${esc(valores.nombre)}"${attrs('nombre')}>`)}
    ${campo('correo', 'Correo electrónico', `<input id="correo" name="correo" type="email" autocomplete="email" required maxlength="200" value="${esc(valores.correo)}"${attrs('correo')}>`)}
    ${campo('mensaje', 'Mensaje', `<textarea id="mensaje" name="mensaje" rows="6" required maxlength="2000"${attrs('mensaje')}>${esc(valores.mensaje)}</textarea>`)}
    <div class="trampa" aria-hidden="true"><label>No llenes este campo <input name="sitio_web" tabindex="-1" autocomplete="off"></label></div>
    <button type="submit" class="boton">Enviar mensaje</button>
  </form>
  <p><a href="/">Volver al inicio</a></p>
</main>`;
  return paginaBase('Revisa tu mensaje · Taller Rueda Libre', cuerpo);
}

function paginaAviso(titulo, texto) {
  return paginaBase(titulo + ' · Taller Rueda Libre', `<main class="contenedor estrecho seccion"><h1>${esc(titulo)}</h1><p>${esc(texto)}</p><p><a href="/">Volver al inicio</a></p></main>`);
}

const fechaLegible = (f) => {
  const d = new Date(f);
  return Number.isNaN(d.getTime()) ? f : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
};

function paginaAdmin({ lista, total, danadas, pagina, paginas, aviso }) {
  const tarjetas = lista
    .map((m) => {
      const enlace = /https?:\/\/|www\./i.test(m.mensaje + ' ' + m.nombre);
      return `
    <article class="mensaje">
      <label class="seleccion"><input type="checkbox" name="id" value="${esc(m.id)}"><span class="solo-lectores">Seleccionar el mensaje de ${esc(m.nombre)}</span></label>
      <div class="meta">
        <strong>${esc(m.nombre)}</strong> ·
        <a href="mailto:${esc(m.correo)}">${esc(m.correo)}</a> ·
        <time datetime="${esc(m.fecha)}">${esc(fechaLegible(m.fecha))}</time>
        ${enlace ? '<span class="insignia">contiene enlace</span>' : ''}
      </div>
      <p class="texto">${esc(m.mensaje)}</p>
    </article>`;
    })
    .join('');
  const nav = paginas > 1
    ? `<nav class="paginas" aria-label="Páginas">
        ${pagina > 1 ? `<a href="/admin?pagina=${pagina - 1}">← Más recientes</a>` : '<span></span>'}
        <span>Página ${pagina} de ${paginas}</span>
        ${pagina < paginas ? `<a href="/admin?pagina=${pagina + 1}">Más antiguos →</a>` : '<span></span>'}
      </nav>`
    : '';
  const cuerpo = `
<main class="contenedor admin">
  <h1>Mensajes recibidos <span class="cuenta">(${total})</span></h1>
  <p><a href="/">← Ver el sitio</a></p>
  ${aviso ? `<p class="estado" role="status">${esc(aviso)}</p>` : ''}
  ${danadas ? `<p class="estado estado-error">Hay ${danadas} línea(s) dañada(s) en el archivo de mensajes; se ignoran al mostrar pero no se borran.</p>` : ''}
  ${total === 0 ? '<p>Todavía no hay mensajes.</p>' : `
  <form method="post" action="/admin/borrar" id="form-borrar">
    <input type="hidden" name="pagina" value="${pagina}">
    <div class="barra"><span id="marcar-todos-lugar"></span><button type="submit" class="boton boton-peligro">Borrar seleccionados</button></div>
    ${tarjetas}
    <div class="barra"><button type="submit" class="boton boton-peligro">Borrar seleccionados</button></div>
  </form>
  ${nav}`}
</main>
<script src="/admin.js"></script>`;
  return paginaBase('Administración · Taller Rueda Libre', cuerpo, { admin: true });
}

// ---------- Contacto ----------
function validar(d) {
  const limpia = (v) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  const valores = {
    nombre: limpia(d.nombre),
    correo: limpia(d.correo),
    mensaje: String(d.mensaje ?? '').replace(/\r\n/g, '\n').trim(),
  };
  const errores = {};
  if (!valores.nombre) errores.nombre = 'Escribe tu nombre.';
  else if (valores.nombre.length > 100) errores.nombre = 'El nombre es demasiado largo (máximo 100 caracteres).';
  if (!valores.correo) errores.correo = 'Escribe tu correo para poder responderte.';
  else if (valores.correo.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.correo))
    errores.correo = 'Ese correo no parece válido. Revisa que tenga la forma nombre@ejemplo.com.';
  if (!valores.mensaje) errores.mensaje = 'Escribe tu mensaje.';
  else if (valores.mensaje.length > 2000) errores.mensaje = 'El mensaje es demasiado largo (máximo 2000 caracteres).';
  return { valores, errores };
}

async function contacto(req, res) {
  const ip = req.socket.remoteAddress || 'desconocida';
  const esJson = (req.headers['content-type'] || '').startsWith('application/json');
  const responderLimite = (mensaje, espera) =>
    esJson
      ? json(res, 429, { ok: false, mensaje }, { 'Retry-After': String(espera) })
      : html(res, 429, paginaAviso('Demasiados mensajes', mensaje), { 'Retry-After': String(espera) });

  if (limiteEnvios.excedido(ip)) {
    return responderLimite('Has enviado demasiados mensajes seguidos. Inténtalo de nuevo en unos minutos.', limiteEnvios.espera(ip));
  }
  limiteEnvios.anotar(ip);

  let datos;
  try {
    const crudo = await leerCuerpo(req, 10_000);
    datos = esJson ? JSON.parse(crudo) : Object.fromEntries(new URLSearchParams(crudo));
    if (!datos || typeof datos !== 'object') throw new Error('forma');
  } catch (e) {
    if (e.estado === 413) throw e;
    return esJson
      ? json(res, 400, { ok: false, mensaje: 'No pudimos leer tu mensaje.' })
      : html(res, 400, paginaAviso('No pudimos leer tu mensaje', 'Vuelve a intentarlo desde el formulario.'));
  }

  // Trampa para bots: un campo que las personas no ven. Se responde "ok" sin guardar nada.
  if (String(datos.sitio_web ?? '').trim()) {
    return esJson ? json(res, 200, { ok: true }) : redirigir(res, '/gracias.html');
  }

  const { valores, errores } = validar(datos);
  if (Object.keys(errores).length) {
    return esJson
      ? json(res, 422, { ok: false, errores })
      : html(res, 422, paginaFormulario(valores, errores, 'Revisa los campos marcados y vuelve a enviar.'));
  }

  if (limiteGuardados.excedido('todos')) {
    return responderLimite('Estamos recibiendo muchos mensajes en este momento. Inténtalo de nuevo en un rato o visítanos en el taller.', limiteGuardados.espera('todos'));
  }
  limiteGuardados.anotar('todos');

  await guardar({ id: randomUUID(), fecha: new Date().toISOString(), ...valores });
  return esJson ? json(res, 200, { ok: true }) : redirigir(res, '/gracias.html');
}

// ---------- Administración ----------
function autenticar(req, res) {
  const ip = req.socket.remoteAddress || 'desconocida';
  if (limiteClave.excedido(ip)) {
    const espera = limiteClave.espera(ip);
    html(res, 429, paginaAviso('Demasiados intentos', `Espera ${espera} segundos antes de volver a probar la contraseña.`), {
      'Retry-After': String(espera),
      'Cache-Control': 'no-store',
    });
    return false;
  }
  const cab = req.headers.authorization || '';
  if (cab.startsWith('Basic ')) {
    const decodificado = Buffer.from(cab.slice(6), 'base64').toString('utf8');
    const candidata = decodificado.slice(decodificado.indexOf(':') + 1);
    if (claveCorrecta(candidata)) return true;
    limiteClave.anotar(ip);
  }
  enviar(res, 401, 'text/plain; charset=utf-8', 'Se necesita la contraseña de administración.', {
    'WWW-Authenticate': 'Basic realm="Administracion Taller Rueda Libre", charset="UTF-8"',
    'Cache-Control': 'no-store',
  });
  return false;
}

async function admin(req, res, url) {
  if (!autenticar(req, res)) return;
  const { registros, danadas } = await leerTodo();
  const orden = registros.reverse(); // más recientes primero
  const paginas = Math.max(1, Math.ceil(orden.length / POR_PAGINA));
  const pagina = Math.min(paginas, Math.max(1, parseInt(url.searchParams.get('pagina'), 10) || 1));
  const lista = orden.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  let aviso = '';
  if (url.searchParams.has('borrados')) {
    const n = parseInt(url.searchParams.get('borrados'), 10) || 0;
    aviso = n === 0 ? 'No seleccionaste ningún mensaje.' : n === 1 ? 'Se borró 1 mensaje.' : `Se borraron ${n} mensajes.`;
  }
  html(res, 200, paginaAdmin({ lista, total: orden.length, danadas, pagina, paginas, aviso }), {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
  });
}

async function adminBorrar(req, res) {
  if (!autenticar(req, res)) return;
  if (!mismoOrigen(req)) return html(res, 403, paginaAviso('Solicitud rechazada', 'La solicitud no viene de esta página.'));
  const params = new URLSearchParams(await leerCuerpo(req, 50_000));
  const ids = new Set(params.getAll('id'));
  const n = ids.size ? await borrar(ids) : 0;
  const pagina = parseInt(params.get('pagina'), 10) || 1;
  redirigir(res, `/admin?pagina=${pagina}&borrados=${n}`);
}

// ---------- Archivos estáticos ----------
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

async function estatico(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return enviar(res, 405, 'text/plain; charset=utf-8', 'Método no permitido', { Allow: 'GET, HEAD' });
  }
  let ruta;
  try {
    ruta = decodeURIComponent(url.pathname);
  } catch {
    return enviar(res, 400, 'text/plain; charset=utf-8', 'Solicitud inválida');
  }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const partes = ruta.split('/').filter(Boolean);
  if (ruta.includes('\0') || partes.some((p) => p.startsWith('.') || p.includes('\\'))) return noEncontrado(res);
  const archivo = path.join(PUBLICO, ...partes);
  if (!archivo.startsWith(PUBLICO + path.sep)) return noEncontrado(res);
  const tipo = TIPOS[path.extname(archivo).toLowerCase()];
  if (!tipo) return noEncontrado(res);
  let datos;
  try {
    datos = await readFile(archivo);
  } catch {
    return noEncontrado(res);
  }
  const cache = tipo.startsWith('image/') ? 'public, max-age=3600' : 'no-cache';
  res.writeHead(200, {
    'Content-Type': tipo,
    'Content-Length': datos.length,
    'Cache-Control': cache,
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(req.method === 'HEAD' ? undefined : datos);
}

const noEncontrado = (res) => html(res, 404, paginaAviso('Página no encontrada', 'No encontramos lo que buscabas.'));

// ---------- Servidor ----------
const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    if (p === '/contacto' && req.method === 'POST') return await contacto(req, res);
    if ((p === '/admin' || p === '/admin/') && (req.method === 'GET' || req.method === 'HEAD')) return await admin(req, res, url);
    if (p === '/admin/borrar' && req.method === 'POST') return await adminBorrar(req, res);
    return await estatico(req, res, url);
  } catch (e) {
    if (e.estado === 413) {
      return enviar(res, 413, 'text/plain; charset=utf-8', 'El mensaje es demasiado grande.', { Connection: 'close' });
    }
    console.error(e);
    if (!res.headersSent) enviar(res, 500, 'text/plain; charset=utf-8', 'Error interno. Inténtalo de nuevo.');
    else res.end();
  }
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Taller Rueda Libre en  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`);
  console.log(`Administración en      http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}/admin   (usuario: cualquiera)`);
  if (process.env.CLAVE_ADMIN) console.log('Contraseña: la de la variable CLAVE_ADMIN');
  else console.log(`Contraseña: ${clave}${claveGenerada ? '   (generada ahora; queda en datos/clave-admin.txt)' : '   (de datos/clave-admin.txt)'}`);
});
