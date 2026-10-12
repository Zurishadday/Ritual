// Prueba de humo: node prueba.mjs  (arranca el servidor en otro puerto con un archivo temporal)
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import assert from 'node:assert/strict';

const PORT = '3999', CLAVE = 'clave-de-prueba';
const base = `http://localhost:${PORT}`;
const auth = { Authorization: 'Basic ' + Buffer.from(`admin:${CLAVE}`).toString('base64') };
const srv = spawn(process.execPath, ['servidor.mjs'], {
  env: { ...process.env, PORT, ADMIN_PASSWORD: CLAVE, DATOS: join(tmpdir(), `rl-${Date.now()}.jsonl`) },
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((ok) => srv.stdout.once('data', ok));

const crudo = (p) => new Promise((ok) => request({ port: PORT, path: p }, (r) => { r.resume(); ok(r.statusCode); }).end());
const post = (cuerpo) => fetch(`${base}/api/contacto`, { method: 'POST', body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) });

try {
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(`${base}/img/frenos.svg`)).status, 200);
  assert.equal(await crudo('/..%2fservidor.mjs'), 404, 'path traversal');
  assert.equal(await crudo('/%2e%2e/servidor.mjs'), 404, 'path traversal');
  assert.equal((await fetch(`${base}/admin`)).status, 401);
  assert.equal((await fetch(`${base}/admin`, { headers: { Authorization: 'Basic ' + btoa('admin:mala') } })).status, 401);
  assert.equal((await post({ nombre: '', correo: 'a@b.co', mensaje: 'x' })).status, 400);
  assert.equal((await post({ nombre: 'Ana', correo: 'no-correo', mensaje: 'x' })).status, 400);
  assert.equal((await post('{roto')).status, 400);
  assert.equal((await post({ nombre: 'Ana', correo: 'a@b.co', mensaje: 'x'.repeat(20000) })).status, 413);
  assert.equal((await post({ nombre: '<script>alert(1)</script>', correo: 'ana@correo.mx', mensaje: 'Hola\n<b>taller</b>' })).status, 201);
  const html = await (await fetch(`${base}/admin`, { headers: auth })).text();
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'se escapa el nombre');
  assert.ok(!html.includes('<script>alert'), 'sin HTML inyectado');
  assert.ok(html.includes('ana@correo.mx'));
  console.log('Todo bien.');
} finally {
  srv.kill();
}
