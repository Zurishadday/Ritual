// Comprueba los arreglos de la revisión contra un servidor temporal. Uso: node herramientas/verificar-arreglos.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(path.join(os.tmpdir(), 'fa-'));
const p = spawn('node', ['servidor.mjs'], { env: { ...process.env, PORT: '3917', DATOS_DIR: dir, ADMIN_PASSWORD: 'secreta' }, cwd: raiz });
await new Promise((r) => setTimeout(r, 800));
const B = 'http://localhost:3917';
const post = (u, b, h = {}) => fetch(B + u, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', ...h }, body: JSON.stringify(b) });
const f = new Date(Date.now() + 7 * 864e5);
while ([0, 6].includes(f.getDay())) f.setDate(f.getDate() + 1);
const fecha = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
const base = { nombre: 'Ana "x"', telefono: '5512345678', correo: 'a@b.com', tratamiento: 'rodilla', fecha, hora: '10:00' };
let fallos = 0;
const ok = (c, m) => { console.log(c ? 'OK  ' : 'FALLA', m); if (!c) fallos++; };
try {
  for (const t of ['toString', '__proto__', 'constructor']) ok((await post('/api/citas', { ...base, tratamiento: t })).status === 422, 'tratamiento ' + t + ' rechazado');
  ok((await post('/api/citas', base)).status === 200, 'cita válida guardada');
  const r = await fetch(B + '/api/citas', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...base, telefono: 'abc', nombre: 'Ana "q"' }) });
  const h = await r.text();
  ok(r.status === 422 && h.includes('value="Ana &quot;q&quot;"') && h.includes('Volver al formulario'), 'sin JS: la página de error conserva lo escrito');
  for (let i = 0; i < 5; i++) await post('/api/admin/login', { clave: 'mal' });
  ok((await post('/api/admin/login', { clave: 'mal' })).status === 429, 'clave mala tras 5 fallos: 429');
  const l = await post('/api/admin/login', { clave: 'secreta' });
  ok(l.status === 200, 'clave correcta entra aun tras 5 fallos');
  const ck = l.headers.get('set-cookie').split(';')[0];
  const get = async () => (await fetch(B + '/api/admin/citas', { headers: { cookie: ck } })).json();
  const lista = await get();
  ok(lista.citas.length === 1 && lista.maximo === 5000, 'panel lista 1 cita y expone el máximo');
  await post('/api/admin/estado', { id: lista.citas[0].id, estado: 'cancelada' }, { cookie: ck });
  const b = await (await post('/api/admin/borrar', { canceladas: true }, { cookie: ck })).json();
  ok(b.ok && b.borradas === 1 && (await get()).citas.length === 0, 'borrar canceladas funciona');
  ok((await post('/api/admin/borrar', { id: 'x' })).status === 401, 'borrar exige sesión');
} finally { p.kill(); }
process.exit(fallos ? 1 : 0);
