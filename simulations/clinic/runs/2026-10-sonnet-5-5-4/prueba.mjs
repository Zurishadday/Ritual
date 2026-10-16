// Prueba rápida: arranca el servidor en otro puerto y ejercita la API.
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
const P = 3111, B = `http://localhost:${P}`;
await rm('datos', { recursive: true, force: true });
const srv = spawn('node', ['servidor.mjs'], { env: { ...process.env, PORT: P, ADMIN_PASSWORD: 'secreta' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const post = (u, b, h = {}) => fetch(B + u, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(b) });
const proximoLunes = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)); return d.toISOString().slice(0, 10); };
const sabado = () => { const d = new Date(proximoLunes()); d.setUTCDate(d.getUTCDate() + 5); return d.toISOString().slice(0, 10); };
const ok = { nombre: '<b>Ana</b>', telefono: '555 123 4567', correo: 'a@b.co', tratamiento: 'rodilla', fecha: proximoLunes(), hora: '10:00', comentario: 'hola' };
const t = (n, c) => console.log(c ? 'OK  ' : 'FALLA', n);
try {
  t('inicio 200', (await fetch(B + '/')).status === 200);
  t('imagen svg', (await fetch(B + '/img/portada.svg')).status === 200);
  t('path traversal bloqueado', (await fetch(B + '/..%2fservidor.mjs')).status !== 200);
  t('solicitud válida 201', (await post('/api/solicitudes', ok)).status === 201);
  t('sábado rechazado', (await post('/api/solicitudes', { ...ok, fecha: sabado() })).status === 400);
  t('rodilla 17:30 rechazada (acaba 18:30)', (await post('/api/solicitudes', { ...ok, hora: '17:30' })).status === 400);
  t('masaje 17:30 aceptado', (await post('/api/solicitudes', { ...ok, tratamiento: 'masaje', hora: '17:30', nombre: 'Luis' })).status === 201);
  t('hora 08:00 rechazada', (await post('/api/solicitudes', { ...ok, hora: '08:00' })).status === 400);
  t('admin sin sesión 401', (await fetch(B + '/api/admin/solicitudes')).status === 401);
  t('clave mala 401', (await post('/api/admin/login', { clave: 'x' })).status === 401);
  const l = await post('/api/admin/login', { clave: 'secreta' });
  t('login 200', l.status === 200);
  const cookie = l.headers.get('set-cookie').split(';')[0];
  const lista = await (await fetch(B + '/api/admin/solicitudes', { headers: { cookie } })).json();
  t('lista: 2, más nueva primero', lista.length === 2 && lista[0].nombre === 'Luis');
  const p = await fetch(`${B}/api/admin/solicitudes/${lista[0].id}`, { method: 'PATCH', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'confirmada' }) });
  t('confirmar', p.status === 200 && (await p.json()).estado === 'confirmada');
  t('estado inválido 400', (await fetch(`${B}/api/admin/solicitudes/${lista[0].id}`, { method: 'PATCH', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'x' }) })).status === 400);
} finally { srv.kill(); await rm('datos', { recursive: true, force: true }); }
