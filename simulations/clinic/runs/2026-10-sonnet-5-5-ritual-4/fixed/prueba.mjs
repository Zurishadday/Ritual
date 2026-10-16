// Prueba de humo: node prueba.mjs
// Arranca sus propios servidores (puerto 3111) con una carpeta de datos TEMPORAL (DATOS_DIR):
// nunca toca la carpeta datos/ real, aunque se interrumpa.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const datos = fs.mkdtempSync(path.join(os.tmpdir(), 'fisio-prueba-'));
const archivo = path.join(datos, 'citas.jsonl');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const hijos = [];
const arrancar = async (env = {}) => {
  const p = spawn(process.execPath, ['servidor.mjs'], { cwd: raiz, env: { ...process.env, PORT: '3111', ADMIN_PASSWORD: 'secreta', DATOS_DIR: datos, ...env }, stdio: 'ignore' });
  hijos.push(p);
  await espera(800);
  return p;
};
const limpiar = () => { for (const p of hijos) p.kill(); try { fs.rmSync(datos, { recursive: true, force: true }); } catch {} };
process.on('SIGINT', () => { limpiar(); process.exit(130); });
process.on('SIGTERM', () => { limpiar(); process.exit(143); });

const B = 'http://127.0.0.1:3111';
let fallos = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fallos++; };
const fecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sig = new Date(); do { sig.setDate(sig.getDate() + 1); } while (sig.getDay() === 0 || sig.getDay() === 6);
const buena = { nombre: 'Ana Pérez', telefono: '55 1234 5678', correo: 'ana@correo.com', tratamiento: 'rodilla', fecha: fecha(sig), hora: '10:30', comentario: '<b>hola</b>' };
const post = (url, obj, h = {}) => fetch(B + url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...h }, body: JSON.stringify(obj) });
const J = { 'Content-Type': 'application/json' };

try {
  let srv = await arrancar({ LIMITE_GLOBAL_HORA: '1000' });
  for (const p of ['/', '/admin.html', '/img/portada.svg', '/cita.js']) ok((await fetch(B + p)).status === 200, 'GET ' + p);
  ok((await fetch(B + '/..%2f..%2fservidor.mjs')).status !== 200, 'no sale de public');
  ok((await fetch(B + '/datos/citas.jsonl')).status === 404, 'datos no son públicos');
  ok((await fetch(B + '/api/admin/citas')).status === 401, 'lista sin sesión → 401');

  const vacia = { nombre: '', telefono: '', correo: '', tratamiento: '', fecha: '', hora: '', comentario: '' };
  const rech = []; for (let i = 0; i < 6; i++) rech.push((await post('/api/citas', vacia)).status);
  ok(rech.every((s) => s === 422), 'seis envíos vacíos → 422');
  let r = await post('/api/citas', buena); ok(r.status === 201, 'tras 6 rechazados, una cita válida → 201');
  const sab = new Date(sig); while (sab.getDay() !== 6) sab.setDate(sab.getDate() + 1);
  r = await post('/api/citas', { ...buena, fecha: fecha(sab) }); ok(r.status === 422 && (await r.json()).errores.fecha, 'sábado rechazado');
  r = await post('/api/citas', { ...buena, hora: '18:00' }); ok(r.status === 422, 'hora 18:00 rechazada');
  r = await post('/api/citas', { ...buena, fecha: '9999-12-31' }); ok(r.status === 422 && (await r.json()).errores.fecha, 'año 9999 rechazado');
  const hoy = new Date();
  if (hoy.getDay() >= 1 && hoy.getDay() <= 5 && hoy.getHours() >= 10) {
    r = await post('/api/citas', { ...buena, fecha: fecha(hoy), hora: '09:00' });
    ok(r.status === 422 && (await r.json()).errores.hora, 'hora ya pasada de hoy rechazada');
  } else console.log('OMITIDA prueba de hora pasada (hoy es fin de semana o antes de las 10:00)');
  r = await post('/api/citas', { ...buena, correo: 'x', telefono: 'abc' }); const e = (await r.json()).errores; ok(r.status === 422 && e.correo && e.telefono, 'correo y teléfono malos');
  r = await post('/api/citas', { ...buena, sitio_web: 'http://spam' }); ok(r.status === 201, 'bot (campo trampa) finge éxito');
  r = await fetch(B + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(buena), redirect: 'manual' });
  ok(r.status === 303 && r.headers.get('location') === '/gracias.html', 'envío sin JS → redirige a gracias');
  r = await fetch(B + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...buena, correo: 'x' }) });
  ok(r.status === 422 && (r.headers.get('content-type') || '').includes('html'), 'sin JS con error → página HTML');
  r = await fetch(B + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(20000) }); ok(r.status === 413 || r.status === 0, 'cuerpo enorme rechazado');

  // dañar el archivo: una línea rota o con forma rara no debe afectar a las demás
  fs.appendFileSync(archivo, '{"id":"roto","nom');
  fs.appendFileSync(archivo, '\n{"id":"weird","creada":null}\n');
  srv.kill(); await espera(300);
  srv = await arrancar({ LIMITE_GLOBAL_HORA: '1000' });
  r = await post('/api/citas', { ...buena, nombre: 'Luis Gómez' }); ok(r.status === 201, 'cita tras archivo dañado → 201');

  // spam: 6.ª solicitud válida en 10 min desde la misma IP
  let ult; for (let i = 0; i < 5; i++) ult = await post('/api/citas', buena); ok(ult.status === 429, 'límite de envíos por IP → 429');

  // login
  r = await post('/api/admin/entrar', { clave: 'mala' }); ok(r.status === 401, 'contraseña mala → 401');
  for (let i = 0; i < 4; i++) r = await post('/api/admin/entrar', { clave: 'mala' });
  r = await post('/api/admin/entrar', { clave: 'secreta' }); ok(r.status === 429, 'tras 5 fallos, ni la correcta entra (429)');
  srv.kill(); await espera(300);
  srv = await arrancar({ LIMITE_GLOBAL_HORA: '1000' });
  r = await post('/api/admin/entrar', { clave: 'secreta' }); ok(r.status === 200, 'contraseña correcta → 200');
  const cookie = r.headers.get('set-cookie').split(';')[0];
  ok(/HttpOnly/.test(r.headers.get('set-cookie')), 'cookie HttpOnly');
  const H = { cookie, ...J };
  r = await fetch(B + '/api/admin/citas', { headers: { cookie } }); const l = await r.json();
  ok(l.citas.length >= 3 && l.danadas === 2, `lista: ${l.citas.length} citas, ${l.danadas} líneas dañadas (rota + weird)`);
  ok(l.citas.every((c, i) => !i || l.citas[i - 1].creada >= c.creada), 'más nuevas primero');
  const id = l.citas[0].id;
  r = await fetch(B + '/api/admin/citas/' + id, { method: 'PATCH', headers: H, body: JSON.stringify({ estado: 'confirmada' }) });
  ok(r.status === 200, 'marcar confirmada');
  r = await fetch(B + '/api/admin/citas/' + id, { method: 'PATCH', headers: H, body: JSON.stringify({ estado: 'xx' }) }); ok(r.status === 422, 'estado inválido → 422');
  r = await fetch(B + '/api/admin/citas/' + id, { method: 'PATCH', headers: { cookie, 'Content-Type': 'text/plain' }, body: '{"estado":"cancelada"}' }); ok(r.status === 415, 'PATCH sin JSON → 415 (anti-CSRF)');
  r = await fetch(B + '/api/admin/citas', { headers: { cookie } }); const l2 = await r.json();
  ok(l2.citas.find((c) => c.id === id).estado === 'confirmada' && l2.danadas === 2, 'estado persistido y líneas dañadas conservadas');
  ok(fs.readFileSync(archivo, 'utf8').includes('"id":"weird"'), 'línea rara sigue en el archivo tras reescribir');

  // carrera: un PATCH con cuerpo lento no debe hacer perder un POST que llega mientras tanto
  const cuerpoLento = JSON.stringify({ estado: 'cancelada' });
  const patchLento = new Promise((resolver) => {
    const rq = http.request(B + '/api/admin/citas/' + id, { method: 'PATCH', headers: { ...H, 'Content-Length': Buffer.byteLength(cuerpoLento) } }, (rs) => { rs.resume(); rs.on('end', () => resolver(rs.statusCode)); });
    rq.write(cuerpoLento.slice(0, 5));
    setTimeout(() => rq.end(cuerpoLento.slice(5)), 600);
  });
  await espera(100);
  const nombreB = 'Carrera Beta';
  r = await post('/api/citas', { ...buena, nombre: nombreB, telefono: '55 9999 0000' });
  ok(r.status === 201, 'POST durante PATCH lento → 201');
  ok((await patchLento) === 200, 'PATCH lento → 200');
  r = await fetch(B + '/api/admin/citas', { headers: { cookie } }); const l3 = await r.json();
  ok(l3.citas.some((c) => c.nombre === nombreB), 'la solicitud llegada durante el PATCH no se perdió');
  ok(l3.citas.find((c) => c.id === id).estado === 'cancelada', 'el PATCH lento también se aplicó');

  // paginación, filtro y borrado en bloque
  r = await fetch(B + '/api/admin/citas?por=2', { headers: { cookie } }); const p1 = await r.json();
  ok(p1.citas.length === 2 && p1.total === l3.total, 'paginación: por=2 devuelve 2 y el total completo');
  r = await fetch(B + '/api/admin/citas?estado=cancelada', { headers: { cookie } }); const fc = await r.json();
  ok(fc.total === 1 && fc.citas[0].id === id, 'filtro por estado');
  r = await fetch(B + '/api/admin/citas?q=carrera', { headers: { cookie } }); ok((await r.json()).total === 1, 'búsqueda por texto');
  r = await fetch(B + '/api/admin/citas', { method: 'DELETE', headers: H, body: '{}' }); ok(r.status === 422, 'borrado en bloque sin filtro → 422');
  r = await fetch(B + '/api/admin/citas', { method: 'DELETE', headers: H, body: JSON.stringify({ estado: 'cancelada' }) });
  ok(r.status === 200 && (await r.json()).eliminadas === 1, 'borrado en bloque de canceladas');
  r = await fetch(B + '/api/admin/citas/' + l3.citas[0].id, { method: 'DELETE', headers: H, body: '{}' }); ok(r.status === 200, 'eliminar una');
  r = await fetch(B + '/api/admin/citas', { headers: { cookie } }); ok((await r.json()).total === l3.total - 2, 'dos menos tras eliminar');
  srv.kill(); await espera(300);

  // tope global entre todas las IP
  srv = await arrancar({ LIMITE_GLOBAL_HORA: '3' });
  const cods = []; for (let i = 0; i < 5; i++) cods.push((await post('/api/citas', buena)).status);
  ok(cods.filter((c) => c === 201).length === 3 && cods[3] === 429, `tope global: ${cods.join(',')}`);
} finally {
  limpiar();
}
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
