import { spawn } from 'node:child_process';
import { rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const P = 3057, B = `http://127.0.0.1:${P}`;
const arrancar = () => spawn('node', ['servidor.mjs'], { env: { ...process.env, PORT: P, ADMIN_PASSWORD: 'clave-de-prueba' }, stdio: 'inherit' });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const j = (u, o = {}) => fetch(B + u, o).then(async (r) => [r.status, await r.text()]);
const post = (u, d, h = {}) => j(u, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(d) });
const p2 = (n) => String(n).padStart(2, '0');
const f = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const sig = new Date(); do { sig.setDate(sig.getDate() + 1); } while (sig.getDay() % 6 === 0);
const ok = { nombre: 'Ana', telefono: '555 123 4567', correo: 'a@b.co', tratamiento: 'rodilla', fecha: f(sig), hora: '10:30', comentario: '<b>hola</b>' };
await rm('datos', { recursive: true, force: true });
let srv = arrancar();
try {
  await esperar(800);
  assert.equal((await j('/'))[0], 200);
  assert.equal((await j('/..%2fservidor.mjs'))[0] >= 400, true);
  assert.equal((await post('/api/citas', ok))[0], 201);
  assert.equal((await post('/api/citas', { ...ok, nombre: 'Beto' }))[0], 201);
  // errores de campo no gastan el cupo y no los pisa el 429
  for (let i = 0; i < 12; i++) {
    const [s, t] = await post('/api/citas', { ...ok, telefono: 'abc' });
    assert.equal(s, 400); assert.equal(JSON.parse(t).campo, 'telefono');
  }
  assert.equal((await post('/api/citas', ok))[0], 201);
  // hora pasada de hoy
  const hoy = new Date();
  if (hoy.getDay() % 6 !== 0 && hoy.getHours() >= 10 && hoy.getHours() < 18)
    assert.equal((await post('/api/citas', { ...ok, fecha: f(hoy), hora: '09:00' }))[0], 400);
  // señuelo
  assert.equal((await post('/api/citas', { ...ok, nombre: 'Bot', sitio: 'x' }))[0], 201);
  // sin JS
  const r = await fetch(B + '/cita', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(ok) });
  assert.equal(r.status, 201);
  // login: una clave correcta entra aunque haya fallos previos
  for (let i = 0; i < 12; i++) await post('/api/admin/login', { clave: 'no' });
  const [s, t] = await post('/api/admin/login', { clave: 'clave-de-prueba' });
  assert.equal(s, 200);
  const H = { Authorization: 'Bearer ' + JSON.parse(t).token };
  const lista = JSON.parse((await j('/api/admin/citas?estado=pendiente&q=beto', { headers: H }))[1]);
  assert.equal(lista.total, 1);
  const todas = JSON.parse((await j('/api/admin/citas', { headers: H }))[1]);
  assert.equal(todas.conteos.pendiente, 4);
  assert.equal((await j('/api/admin/citas/' + todas.citas[0].id, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'confirmada' }) }))[0], 200);
  assert.equal((await j('/api/admin/citas/' + todas.citas[1].id, { method: 'DELETE', headers: H }))[0], 200);
  // archivo dañado: arranca igual, conserva lo bueno y sigue guardando
  srv.kill(); await esperar(300);
  const txt = await readFile('datos/solicitudes.jsonl', 'utf8');
  await writeFile('datos/solicitudes.jsonl', txt + '\n{"op":"nueva","id":"x","nom');
  srv = arrancar(); await esperar(800);
  const [s2, t2] = await post('/api/admin/login', { clave: 'clave-de-prueba' });
  const H2 = { Authorization: 'Bearer ' + JSON.parse(t2).token };
  const l2 = JSON.parse((await j('/api/admin/citas', { headers: H2 }))[1]);
  assert.equal(l2.total, 3);
  assert.equal((await post('/api/citas', ok))[0], 201);
  console.log('Todo bien');
} finally {
  srv.kill();
  await esperar(300);
  await rm('datos', { recursive: true, force: true });
}
