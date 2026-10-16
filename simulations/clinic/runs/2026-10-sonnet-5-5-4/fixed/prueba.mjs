// Prueba rápida: arranca el servidor en otro puerto, con una carpeta de datos TEMPORAL (nunca toca ./datos), y ejercita la API.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const P = 3111, B = `http://localhost:${P}`;
const datosDir = await mkdtemp(join(tmpdir(), 'fisio-prueba-'));
const archivo = join(datosDir, 'solicitudes.json');
let srv;
const arrancar = async () => {
  srv = spawn('node', ['servidor.mjs'], { env: { ...process.env, PORT: P, ADMIN_PASSWORD: 'secreta', DATOS_DIR: datosDir }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
};
const parar = () => new Promise(r => { srv.once('exit', r); srv.kill(); });
const post = (u, b, h = {}) => fetch(B + u, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(b) });
const dia = (extra = 0) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7) + extra); return d.toISOString().slice(0, 10); };
const proximoLunes = () => dia(0), sabado = () => dia(5), lunesPasado = () => dia(-7);
const ok = { nombre: '<b>Ana</b>', telefono: '555 123 4567', correo: 'a@b.co', tratamiento: 'rodilla', fecha: proximoLunes(), hora: '10:00', comentario: 'hola' };
let fallas = 0;
const t = (n, c) => { if (!c) fallas++; console.log(c ? 'OK  ' : 'FALLA', n); };
try {
  await arrancar();
  t('inicio 200', (await fetch(B + '/')).status === 200);
  t('imagen svg', (await fetch(B + '/img/portada.svg')).status === 200);
  t('path traversal bloqueado', (await fetch(B + '/..%2fservidor.mjs')).status !== 200);
  t('solicitud válida 201', (await post('/api/solicitudes', ok)).status === 201);
  t('misma solicitud repetida no se duplica', (await post('/api/solicitudes', ok)).status === 201);
  t('sábado rechazado', (await post('/api/solicitudes', { ...ok, fecha: sabado() })).status === 400);
  t('fecha pasada rechazada', (await post('/api/solicitudes', { ...ok, fecha: lunesPasado() })).status === 400);
  t('hora fuera de la rejilla (09:07) rechazada', (await post('/api/solicitudes', { ...ok, hora: '09:07' })).status === 400);
  t('rodilla 17:30 rechazada (acaba 18:30)', (await post('/api/solicitudes', { ...ok, hora: '17:30' })).status === 400);
  t('masaje 17:30 aceptado', (await post('/api/solicitudes', { ...ok, tratamiento: 'masaje', hora: '17:30', nombre: 'Luis', telefono: '555 999 8888' })).status === 201);
  t('hora 08:00 rechazada', (await post('/api/solicitudes', { ...ok, hora: '08:00' })).status === 400);
  t('teléfono con letras rechazado', (await post('/api/solicitudes', { ...ok, telefono: 'abc-defg-hij' })).status === 400);
  t('tratamiento heredado ("constructor") rechazado', (await post('/api/solicitudes', { ...ok, tratamiento: 'constructor', hora: '23:00' })).status === 400);
  t('cuerpo JSON null → 400', (await fetch(B + '/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' })).status === 400);
  t('text/plain (POST entre sitios) → 415', (await fetch(B + '/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(ok) })).status === 415);
  t('Origin de otro sitio → 403', (await post('/api/solicitudes', { ...ok, nombre: 'X' }, { Origin: 'http://malo.example' })).status === 403);
  t('honeypot: responde ok pero no guarda', (await post('/api/solicitudes', { ...ok, nombre: 'Bot', telefono: '555 000 1111', sitio_web: 'http://spam' })).status === 201);
  const f = await fetch(B + '/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...ok, nombre: 'SinJS', telefono: '555 222 3333', hora: '11:00' }) });
  t('formulario sin JavaScript (urlencoded) → página HTML 200', f.status === 200 && (f.headers.get('content-type') || '').startsWith('text/html'));
  const fm = await fetch(B + '/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...ok, telefono: 'x' }) });
  t('sin JavaScript con errores → HTML 400 con motivos', fm.status === 400 && (await fm.text()).includes('teléfono'));
  t('admin sin sesión 401', (await fetch(B + '/api/admin/solicitudes')).status === 401);
  t('clave mala 401', (await post('/api/admin/login', { clave: 'x' })).status === 401);
  const l = await post('/api/admin/login', { clave: 'secreta' });
  t('login 200', l.status === 200);
  const cookie = l.headers.get('set-cookie').split(';')[0];
  const lista = await (await fetch(B + '/api/admin/solicitudes', { headers: { cookie } })).json();
  t('lista: 3 (sin duplicado ni bot), más nueva primero', lista.length === 3 && lista[0].nombre === 'SinJS');
  const url = id => `${B}/api/admin/solicitudes/${id}`;
  const json = { cookie, 'Content-Type': 'application/json' };
  const p = await fetch(url(lista[0].id), { method: 'PATCH', headers: json, body: JSON.stringify({ estado: 'confirmada' }) });
  t('confirmar', p.status === 200 && (await p.json()).estado === 'confirmada');
  t('estado inválido 400', (await fetch(url(lista[0].id), { method: 'PATCH', headers: json, body: JSON.stringify({ estado: 'x' }) })).status === 400);

  // límite de envíos por IP (5 guardadas por 10 min; ya van 3)
  const extra = [];
  for (let i = 0; i < 3; i++) extra.push((await post('/api/solicitudes', { ...ok, nombre: 'N' + i, telefono: '555 70' + i + ' 0000', hora: '12:00' })).status);
  t('límite de envíos: 2 pasan, el siguiente 429', extra.join() === '201,201,429');

  // eliminar
  const lista2 = await (await fetch(B + '/api/admin/solicitudes', { headers: { cookie } })).json();
  t('eliminar solicitud', (await fetch(url(lista2[0].id), { method: 'DELETE', headers: { cookie } })).status === 200
    && (await (await fetch(B + '/api/admin/solicitudes', { headers: { cookie } })).json()).length === lista2.length - 1);
  t('eliminar sin sesión 401', (await fetch(url(lista2[1].id), { method: 'DELETE' })).status === 401);

  // un fallo de escritura no envenena la cola ni deja datos fantasma
  await parar(); await rm(datosDir, { recursive: true, force: true });
  await mkdir(join(datosDir, 'solicitudes.json.tmp'), { recursive: true }); // hace fallar writeFile (EISDIR)
  await arrancar();
  t('escritura fallida → 500', (await post('/api/solicitudes', ok)).status === 500);
  await rm(join(datosDir, 'solicitudes.json.tmp'), { recursive: true });
  t('con el disco sano, la siguiente se guarda (201)', (await post('/api/solicitudes', ok)).status === 201);
  const l2 = await post('/api/admin/login', { clave: 'secreta' });
  const c2 = l2.headers.get('set-cookie').split(';')[0];
  t('el admin ve 1 (la fallida no quedó en memoria)', (await (await fetch(B + '/api/admin/solicitudes', { headers: { cookie: c2 } })).json()).length === 1);

  // archivo dañado: se aparta, no se sobrescribe
  await parar();
  await writeFile(archivo, JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'c' }], null, 2).slice(0, 40));
  await arrancar();
  t('archivo dañado: el servidor arranca y responde', (await fetch(B + '/')).status === 200);
  const arch = await readdir(datosDir);
  t('archivo dañado: se conserva una copia', arch.some(n => n.includes('.danado-')));
} finally {
  srv && srv.kill();
  await rm(datosDir, { recursive: true, force: true }); // solo la carpeta temporal de la prueba
}
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo bien');
process.exitCode = fallas ? 1 : 0;
