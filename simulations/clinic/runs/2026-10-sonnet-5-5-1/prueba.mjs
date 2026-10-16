import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
const P = 3057, B = `http://127.0.0.1:${P}`;
const srv = spawn('node', ['servidor.mjs'], { env: { ...process.env, PORT: P, ADMIN_PASSWORD: 'clave-de-prueba' }, stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 800));
const j = (u, o = {}) => fetch(B + u, o).then(async (r) => [r.status, await r.text()]);
const post = (u, d, h = {}) => j(u, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(d) });
const sig = new Date(); do { sig.setDate(sig.getDate() + 1); } while (sig.getDay() % 6 === 0);
const f = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ok = { nombre: 'Ana', telefono: '555 123 4567', correo: 'a@b.co', tratamiento: 'rodilla', fecha: f(sig), hora: '10:30', comentario: '<b>hola</b>' };
try {
  console.log('index', (await j('/'))[0], 'admin', (await j('/admin'))[0], 'svg', (await j('/img/portada.svg'))[0]);
  console.log('traversal', (await j('/..%2fservidor.mjs'))[0], (await j('/%2e%2e/servidor.mjs'))[0]);
  console.log('cita ok', await post('/api/citas', ok));
  console.log('cita 2', await post('/api/citas', { ...ok, nombre: 'Beto', hora: '17:00' }));
  console.log('sábado', await post('/api/citas', { ...ok, fecha: '2030-01-05' }));
  console.log('hora 18:00', await post('/api/citas', { ...ok, hora: '18:00' }));
  console.log('trat malo', await post('/api/citas', { ...ok, tratamiento: 'x' }));
  console.log('admin sin token', await j('/api/admin/citas'));
  console.log('login mal', await post('/api/admin/login', { clave: 'no' }));
  const [, t] = await post('/api/admin/login', { clave: 'clave-de-prueba' });
  const H = { Authorization: 'Bearer ' + JSON.parse(t).token };
  const [, l] = await j('/api/admin/citas', { headers: H });
  const { citas } = JSON.parse(l);
  console.log('orden', citas.map((c) => c.nombre));
  console.log('patch', await j('/api/admin/citas/' + citas[0].id, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'confirmada' }) }).then((r) => r[0]));
} finally {
  srv.kill();
  await new Promise((r) => setTimeout(r, 200));
  await rm('datos', { recursive: true, force: true });
}
