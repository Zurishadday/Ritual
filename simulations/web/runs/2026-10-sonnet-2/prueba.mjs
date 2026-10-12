// Prueba: node prueba.mjs  (usa un archivo temporal, no toca mensajes.jsonl)
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { rmSync } from 'node:fs';

const archivo = path.join(os.tmpdir(), `rl-${Date.now()}.jsonl`);
process.env.MENSAJES = archivo;
process.env.ADMIN_CLAVE = 'secreta';
const { servidor } = await import('./servidor.mjs');
await new Promise((r) => servidor.listen(0, r));
const base = `http://localhost:${servidor.address().port}`;
const enviar = (cuerpo) => fetch(`${base}/contacto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
const basic = (clave) => ({ Authorization: 'Basic ' + Buffer.from('x:' + clave).toString('base64') });

try {
  assert.equal((await fetch(base)).status, 200, 'portada');
  assert.equal((await fetch(`${base}/img/frenos.svg`)).status, 200, 'imagen');
  assert.equal((await fetch(`${base}/%2e%2e/servidor.mjs`)).status, 404, 'no sale de publico/');
  assert.equal((await fetch(`${base}/..%2fservidor.mjs`)).status, 404, 'no sale de publico/ (2)');

  assert.equal((await enviar({ nombre: 'Ana', correo: 'no-es-correo', mensaje: 'hola' })).status, 400, 'correo malo');
  assert.equal((await enviar({ nombre: '', correo: 'a@b.co', mensaje: 'hola' })).status, 400, 'nombre vacío');
  assert.equal((await enviar({ nombre: 5, correo: 'a@b.co', mensaje: 'hola' })).status, 400, 'tipo malo');
  const grande = await fetch(`${base}/contacto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'a', correo: 'a@b.co', mensaje: 'x'.repeat(20000) }) });
  assert.equal(grande.status, 400, 'cuerpo enorme');

  assert.equal((await enviar({ nombre: 'Ana', correo: 'ana@ejemplo.com', mensaje: '<script>alert(1)</script>' })).status, 201, 'mensaje bueno');

  assert.equal((await fetch(`${base}/admin`)).status, 401, 'admin sin clave');
  assert.equal((await fetch(`${base}/admin`, { headers: basic('mala') })).status, 401, 'clave mala');
  const html = await (await fetch(`${base}/admin`, { headers: basic('secreta') })).text();
  assert.ok(html.includes('ana@ejemplo.com'), 'admin muestra el mensaje');
  assert.ok(!html.includes('<script>alert'), 'admin escapa HTML');
  console.log('Todo bien.');
} finally {
  servidor.close(); servidor.closeAllConnections?.();
  rmSync(archivo, { force: true });
}
