// Prueba de humo: node prueba.mjs  (arranca su propio servidor en el puerto 3111 con datos temporales)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const datos = path.join(raiz, 'datos');
const respaldo = path.join(raiz, 'datos.respaldo');
if (fs.existsSync(datos)) fs.renameSync(datos, respaldo);
const srv = spawn(process.execPath, ['servidor.mjs'], { cwd: raiz, env: { ...process.env, PORT: '3111', ADMIN_PASSWORD: 'secreta' }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const B = 'http://127.0.0.1:3111';
let fallos = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fallos++; };
const sig = new Date(); do { sig.setDate(sig.getDate() + 1); } while (sig.getDay() === 0 || sig.getDay() === 6);
const fecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const buena = { nombre: 'Ana Pérez', telefono: '55 1234 5678', correo: 'ana@correo.com', tratamiento: 'rodilla', fecha: fecha(sig), hora: '10:30', comentario: '<b>hola</b>' };
const post = (url, obj, h = {}) => fetch(B + url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...h }, body: JSON.stringify(obj) });

try {
  for (const p of ['/', '/admin.html', '/img/portada.svg', '/cita.js']) ok((await fetch(B + p)).status === 200, 'GET ' + p);
  ok((await fetch(B + '/..%2f..%2fservidor.mjs')).status !== 200, 'no sale de public');
  ok((await fetch(B + '/datos/citas.jsonl')).status === 404, 'datos no son públicos');
  ok((await fetch(B + '/api/admin/citas')).status === 401, 'lista sin sesión → 401');

  const vacia = { nombre: '', telefono: '', correo: '', tratamiento: '', fecha: '', hora: '', comentario: '' };
  const rech = []; for (let i = 0; i < 6; i++) rech.push((await post('/api/citas', vacia)).status);
  ok(rech.every((s) => s === 422), 'seis envíos vacíos → 422');
  let r = await post('/api/citas', buena); ok(r.status === 201, 'tras 6 rechazados, una cita válida → 201 (49)');
  const sab = new Date(sig); while (sab.getDay() !== 6) sab.setDate(sab.getDate() + 1);
  r = await post('/api/citas', { ...buena, fecha: fecha(sab) }); ok(r.status === 422 && (await r.json()).errores.fecha, 'sábado rechazado');
  r = await post('/api/citas', { ...buena, hora: '18:00' }); ok(r.status === 422, 'hora 18:00 rechazada');
  r = await post('/api/citas', { ...buena, correo: 'x', telefono: 'abc' }); const e = (await r.json()).errores; ok(r.status === 422 && e.correo && e.telefono, 'correo y teléfono malos');
  r = await post('/api/citas', { ...buena, sitio_web: 'http://spam' }); ok(r.status === 201, 'bot (campo trampa) finge éxito');
  r = await fetch(B + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(buena), redirect: 'manual' });
  ok(r.status === 303 && r.headers.get('location') === '/gracias.html', 'envío sin JS → redirige a gracias');
  r = await fetch(B + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...buena, correo: 'x' }) });
  ok(r.status === 422 && (r.headers.get('content-type') || '').includes('html'), 'sin JS con error → página HTML');
  r = await fetch(B + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(20000) }); ok(r.status === 413 || r.status === 0, 'cuerpo enorme rechazado');

  // dañar el archivo: una línea rota no debe afectar a las demás
  fs.appendFileSync(path.join(datos, 'citas.jsonl'), '{"id":"roto","nom');
  r = await post('/api/citas', { ...buena, nombre: 'Luis Gómez' }); ok(r.status === 201, 'cita tras archivo dañado → 201');

  // spam: 6.ª solicitud válida en 10 min desde la misma IP
  let ult; for (let i = 0; i < 4; i++) ult = await post('/api/citas', buena); ok(ult.status === 429, 'límite de envíos → 429');

  // login
  r = await post('/api/admin/entrar', { clave: 'mala' }); ok(r.status === 401, 'contraseña mala → 401');
  for (let i = 0; i < 4; i++) r = await post('/api/admin/entrar', { clave: 'mala' });
  r = await post('/api/admin/entrar', { clave: 'secreta' }); ok(r.status === 429, 'tras 5 fallos, ni la correcta entra (429)');
  srv.kill(); await new Promise((x) => setTimeout(x, 300));
  const srv2 = spawn(process.execPath, ['servidor.mjs'], { cwd: raiz, env: { ...process.env, PORT: '3111', ADMIN_PASSWORD: 'secreta' }, stdio: 'ignore' });
  await new Promise((x) => setTimeout(x, 800));
  try {
    r = await post('/api/admin/entrar', { clave: 'secreta' }); ok(r.status === 200, 'contraseña correcta → 200');
    const cookie = r.headers.get('set-cookie').split(';')[0];
    ok(/HttpOnly/.test(r.headers.get('set-cookie')), 'cookie HttpOnly');
    r = await fetch(B + '/api/admin/citas', { headers: { cookie } }); const l = await r.json();
    ok(l.citas.length >= 3 && l.danadas === 1, `lista: ${l.citas.length} citas, ${l.danadas} línea dañada`);
    ok(l.citas.every((c, i) => !i || l.citas[i - 1].creada >= c.creada), 'más nuevas primero');
    const id = l.citas[0].id;
    r = await fetch(B + '/api/admin/citas/' + id, { method: 'PATCH', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'confirmada' }) });
    ok(r.status === 200, 'marcar confirmada');
    r = await fetch(B + '/api/admin/citas/' + id, { method: 'PATCH', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'xx' }) }); ok(r.status === 422, 'estado inválido → 422');
    r = await fetch(B + '/api/admin/citas/' + id, { method: 'PATCH', headers: { cookie, 'Content-Type': 'text/plain' }, body: '{"estado":"cancelada"}' }); ok(r.status === 415, 'PATCH sin JSON → 415 (anti-CSRF)');
    r = await fetch(B + '/api/admin/citas', { headers: { cookie } }); const l2 = await r.json();
    ok(l2.citas.find((c) => c.id === id).estado === 'confirmada' && l2.danadas === 1, 'estado persistido y línea dañada conservada');
    r = await fetch(B + '/api/admin/citas/' + id, { method: 'DELETE', headers: { cookie, 'Content-Type': 'application/json' }, body: '{}' }); ok(r.status === 200, 'eliminar');
    r = await fetch(B + '/api/admin/citas', { headers: { cookie } }); ok((await r.json()).citas.length === l.citas.length - 1, 'una menos tras eliminar');
  } finally { srv2.kill(); }
} finally {
  srv.kill();
  await new Promise((x) => setTimeout(x, 300));
  fs.rmSync(datos, { recursive: true, force: true });
  if (fs.existsSync(respaldo)) fs.renameSync(respaldo, datos);
}
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
