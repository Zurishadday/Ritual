// Servidor de Taller Rueda Libre — Node puro, sin dependencias.
// Uso: node servidor.mjs   (puerto 3000 por defecto, o PORT=8080)
// Contraseña de administración: variable ADMIN_PASSWORD (si no existe, se genera una al arrancar).

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { join, extname, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUBLICO = resolve(RAIZ, 'publico');
const PRIVADO = resolve(RAIZ, 'privado');
const DATOS = resolve(RAIZ, 'datos');
const ARCHIVO = join(DATOS, 'mensajes.json');

const PUERTO = Number(process.env.PORT) || 3000;
const ADMIN_USUARIO = 'admin';
const generada = !process.env.ADMIN_PASSWORD;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || randomBytes(6).toString('hex');

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
};

mkdirSync(DATOS, { recursive: true });

function leerMensajes() {
  if (!existsSync(ARCHIVO)) return [];
  try {
    return JSON.parse(readFileSync(ARCHIVO, 'utf8'));
  } catch (error) {
    // No sobrescribir en silencio: se aparta el archivo dañado y se avisa en consola.
    const respaldo = join(DATOS, `mensajes.danado-${Date.now()}.json`);
    renameSync(ARCHIVO, respaldo);
    console.error(`AVISO: mensajes.json estaba dañado (${error.message}). Se guardó una copia en ${respaldo}`);
    return [];
  }
}

function guardarMensajes(lista) {
  const temporal = ARCHIVO + '.tmp';
  writeFileSync(temporal, JSON.stringify(lista, null, 2));
  renameSync(temporal, ARCHIVO); // escritura atómica: nunca queda un archivo a medias
}

function igual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function autorizado(req) {
  const cabecera = req.headers.authorization || '';
  if (!cabecera.startsWith('Basic ')) return false;
  const [usuario, ...resto] = Buffer.from(cabecera.slice(6), 'base64').toString('utf8').split(':');
  return igual(usuario, ADMIN_USUARIO) && igual(resto.join(':'), ADMIN_PASSWORD);
}

function pedirClave(res) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Administracion Taller Rueda Libre", charset="UTF-8"',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end('Se requiere autenticación.');
}

function json(res, codigo, objeto) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(objeto));
}

function leerCuerpo(req, limite = 10_000) {
  return new Promise((ok, fallo) => {
    let tamano = 0;
    const partes = [];
    req.on('data', (parte) => {
      tamano += parte.length;
      if (tamano > limite) {
        fallo(new Error('demasiado grande'));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => ok(Buffer.concat(partes).toString('utf8')));
    req.on('error', fallo);
  });
}

// Límites sencillos por IP, en memoria: cuenta eventos en la última hora/minuto.
function crearLimite(maximo, ventanaMs) {
  const registro = new Map();
  return (ip) => {
    const ahora = Date.now();
    const recientes = (registro.get(ip) || []).filter((t) => ahora - t < ventanaMs);
    recientes.push(ahora);
    registro.set(ip, recientes);
    return recientes.length > maximo;
  };
}
const demasiadosEnvios = crearLimite(5, 60_000); // 5 mensajes por minuto
const demasiadosFallos = crearLimite(10, 60_000); // 10 contraseñas incorrectas por minuto

function servirArchivo(res, ruta) {
  let info;
  try {
    info = statSync(ruta);
  } catch {
    return false;
  }
  if (!info.isFile()) return false;
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(ruta).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,
  });
  createReadStream(ruta).pipe(res);
  return true;
}

function noEncontrado(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('No encontrado');
}

const servidor = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const ruta = url.pathname;

    // --- Formulario de contacto ---
    if (req.method === 'POST' && ruta === '/api/contacto') {
      if (demasiadosEnvios(req.socket.remoteAddress)) {
        return json(res, 429, { error: 'Demasiados envíos. Intenta de nuevo en un minuto.' });
      }
      // Acepta JSON (con JavaScript) o formulario clásico (sin JavaScript).
      const clasico = !(req.headers['content-type'] || '').includes('application/json');
      const responder = (codigo, objeto) => {
        if (!clasico) return json(res, codigo, objeto);
        if (codigo >= 400) {
          res.writeHead(codigo, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end(objeto.error);
        }
        res.writeHead(303, { Location: '/?enviado=1#contacto' });
        return res.end();
      };
      let datos;
      try {
        const cuerpo = await leerCuerpo(req);
        datos = clasico ? Object.fromEntries(new URLSearchParams(cuerpo)) : JSON.parse(cuerpo);
      } catch {
        return responder(400, { error: 'Solicitud inválida.' });
      }
      if (datos.sitio) return responder(200, { ok: true }); // campo trampa para bots
      const nombre = String(datos.nombre || '').trim();
      const correo = String(datos.correo || '').trim();
      const mensaje = String(datos.mensaje || '').trim();
      if (!nombre || nombre.length > 100) return responder(400, { error: 'Escribe tu nombre (máx. 100 caracteres).' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 150) {
        return responder(400, { error: 'Escribe un correo válido.' });
      }
      if (!mensaje || mensaje.length > 2000) return responder(400, { error: 'Escribe un mensaje (máx. 2000 caracteres).' });
      const lista = leerMensajes();
      lista.push({ id: randomUUID(), fecha: new Date().toISOString(), nombre, correo, mensaje });
      guardarMensajes(lista);
      return responder(201, { ok: true });
    }

    // --- Administración (protegida) ---
    if (ruta === '/admin' || ruta.startsWith('/admin/') || ruta.startsWith('/api/admin/')) {
      if (!autorizado(req)) {
        if (req.headers.authorization && demasiadosFallos(req.socket.remoteAddress)) {
          res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Demasiados intentos. Espera un minuto.');
        }
        return pedirClave(res);
      }

      if (req.method === 'GET' && (ruta === '/admin' || ruta === '/admin/')) {
        if (!servirArchivo(res, join(PRIVADO, 'admin.html'))) noEncontrado(res);
        return;
      }
      if (req.method === 'GET' && ruta === '/api/admin/mensajes') {
        return json(res, 200, leerMensajes().reverse());
      }
      if (req.method === 'POST' && ruta === '/api/admin/borrar') {
        let id;
        try {
          id = JSON.parse(await leerCuerpo(req)).id;
        } catch {
          return json(res, 400, { error: 'Solicitud inválida.' });
        }
        guardarMensajes(leerMensajes().filter((m) => m.id !== id));
        return json(res, 200, { ok: true });
      }
      return noEncontrado(res);
    }

    // --- Archivos estáticos ---
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD, POST' });
      return res.end();
    }
    let relativa;
    try {
      relativa = decodeURIComponent(ruta);
    } catch {
      return noEncontrado(res);
    }
    if (relativa.endsWith('/')) relativa += 'index.html';
    const archivo = resolve(PUBLICO, '.' + relativa);
    if (archivo !== PUBLICO && !archivo.startsWith(PUBLICO + sep)) return noEncontrado(res);
    if (!servirArchivo(res, archivo)) noEncontrado(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: 'Error interno.' });
    else res.end();
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Taller Rueda Libre en http://localhost:${PUERTO}`);
  console.log(`Administración: http://localhost:${PUERTO}/admin`);
  console.log(`  usuario: ${ADMIN_USUARIO}`);
  console.log(`  contraseña: ${ADMIN_PASSWORD}${generada ? '  (generada; fija la tuya con la variable ADMIN_PASSWORD)' : ''}`);
});
