// Pruebas de extremo a extremo: node pruebas.mjs
// Arranca el servidor en otro puerto con una carpeta de datos temporal; no toca tus datos.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const DATA = mkdtempSync(path.join(tmpdir(), 'fisio-'));
const PUERTO = 3917;
const BASE = `http://127.0.0.1:${PUERTO}`;
const CLAVE = 'clave-de-prueba';
let hijo;
let fallos = 0;

function ok(cond, nombre, detalle = '') {
  console.log(`${cond ? 'OK   ' : 'FALLA'} ${nombre}${!cond && detalle ? '  → ' + detalle : ''}`);
  if (!cond) fallos++;
}

function arrancar() {
  return new Promise((resolve, reject) => {
    hijo = spawn(process.execPath, [path.join(RAIZ, 'servidor.mjs')], {
      env: { ...process.env, PORT: String(PUERTO), DATA_DIR: DATA, ADMIN_PASSWORD: CLAVE },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    hijo.stderr.on('data', () => {});
    hijo.stdout.on('data', (d) => { if (String(d).includes('Fisio Andares en')) resolve(); });
    hijo.on('error', reject);
    setTimeout(() => reject(new Error('el servidor no arrancó')), 5000);
  });
}
const parar = () => new Promise((r) => { hijo.once('exit', r); hijo.kill(); });

function fechaHabil(extraDias = 3, tipo = 'habil') {
  const d = new Date();
  d.setDate(d.getDate() + extraDias);
  while (tipo === 'habil' ? [0, 6].includes(d.getDay()) : d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const cita = (extra = {}) => ({
  nombre: 'Ana Pérez', telefono: '33 1111 2222', correo: 'ana@ejemplo.com',
  tratamiento: 'rodilla', fecha: fechaHabil(), hora: '10:00', comentario: '<b>me duele</b>', ...extra,
});
const post = (ruta, cuerpo, cookie, extra = {}) => fetch(BASE + ruta, {
  method: 'POST', redirect: 'manual',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: JSON.stringify(cuerpo), ...extra,
});

try {
  await arrancar();

  // --- Páginas y archivos ---
  let r = await fetch(BASE + '/');
  const html = await r.text();
  ok(r.status === 200 && html.includes('Fisio Andares'), 'portada responde');
  ok((await fetch(BASE + '/estilos.css')).status === 200, 'css responde');
  ok((await fetch(BASE + '/img/portada.svg')).headers.get('content-type') === 'image/svg+xml', 'imagen con tipo correcto');
  ok((await fetch(BASE + '/admin')).status === 200, '/admin responde');
  ok((await fetch(BASE + '/%2e%2e%2fservidor.mjs')).status === 404, 'no se sirve código fuera de publico/');
  ok((await fetch(BASE + '/..%5cservidor.mjs')).status === 404, 'no se sirve con barra invertida');
  ok((await fetch(BASE + '/%00')).status === 404, 'byte nulo -> 404');

  // --- Validación ---
  r = await post('/api/citas', {});
  let j = await r.json();
  ok(r.status === 400 && Object.keys(j.errores).length === 6, 'formulario vacío: 6 errores', JSON.stringify(j));
  r = await post('/api/citas', cita({ fecha: fechaHabil(3, 'sabado') }));
  ok(r.status === 400 && (await r.json()).errores.fecha.includes('lunes a viernes'), 'sábado rechazado');
  r = await post('/api/citas', cita({ hora: '18:00' }));
  ok(r.status === 400, 'hora 18:00 rechazada');
  r = await post('/api/citas', cita({ hora: '08:30' }));
  ok(r.status === 400, 'hora 08:30 rechazada');
  r = await post('/api/citas', cita({ fecha: '2020-01-06' }));
  ok(r.status === 400, 'fecha pasada rechazada');
  r = await post('/api/citas', cita({ fecha: '2026-02-31' }));
  ok(r.status === 400, 'fecha inexistente rechazada');
  r = await post('/api/citas', cita({ correo: 'sin-arroba' }));
  ok(r.status === 400, 'correo inválido rechazado');
  r = await post('/api/citas', cita({ tratamiento: 'otro' }));
  ok(r.status === 400, 'tratamiento desconocido rechazado');
  r = await fetch(BASE + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{roto' });
  ok(r.status === 400, 'JSON roto -> 400');
  r = await fetch(BASE + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(50000) });
  ok(r.status === 413, 'cuerpo enorme -> 413');

  // --- Guardado, doble clic, formulario sin JS, bots ---
  r = await post('/api/citas', cita());
  ok(r.status === 201, 'solicitud válida guardada');
  r = await post('/api/citas', cita());
  ok(r.status === 201, 'reenvío idéntico responde bien');
  r = await post('/api/citas', cita({ telefono: '33 3333 4444', nombre: 'Beto' }), null, {});
  const form = await fetch(BASE + '/api/citas', {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(cita({ telefono: '33 5555 6666', nombre: 'Carla', tratamiento: 'espalda', hora: '17:00' })),
  });
  ok(form.status === 303 && form.headers.get('location') === '/cita-enviada.html', 'envío sin JavaScript redirige a gracias');
  const formMal = await fetch(BASE + '/api/citas', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'nombre=x',
  });
  const htmlMal = await formMal.text();
  ok(formMal.status === 400 && htmlMal.includes('Revisa estos datos') && htmlMal.includes('<ul>'), 'envío sin JS con errores muestra una página legible');
  const bot = await post('/api/citas', cita({ nombre: 'Bot', sitio_web: 'http://spam.example' }));
  ok(bot.status === 201, 'bot (campo trampa) recibe «ok»');
  await post('/api/citas', cita({ telefono: '33 7777 8888', nombre: 'Diego', tratamiento: 'masaje', hora: '09:30' }));

  // --- Panel: acceso ---
  r = await fetch(BASE + '/api/admin/citas');
  ok(r.status === 401, 'lista sin sesión -> 401');
  r = await fetch(BASE + '/api/admin/citas', { headers: { Cookie: 'sesion=' + 'a'.repeat(64) } });
  ok(r.status === 401, 'cookie falsa -> 401');
  r = await post('/api/admin/login', { clave: CLAVE });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  ok(r.status === 200 && cookie.startsWith('sesion=') && /HttpOnly/i.test(r.headers.get('set-cookie')), 'login correcto con cookie HttpOnly');

  r = await fetch(BASE + '/api/admin/citas', { headers: { Cookie: cookie } });
  j = await r.json();
  const nombres = j.citas.map((c) => c.nombre);
  ok(JSON.stringify(nombres) === JSON.stringify(['Diego', 'Carla', 'Beto', 'Ana Pérez']), 'más nuevas primero, sin duplicado ni bot', nombres.join(','));
  ok(j.citas[0].tratamientoNombre === 'Masaje deportivo', 'nombre de tratamiento legible');
  ok(j.citas[3].comentario === '<b>me duele</b>', 'comentario guardado tal cual (el panel lo muestra como texto)');

  // --- Panel: cambiar estado ---
  const id = j.citas[3].id;
  const patch = (idc, estado) => fetch(`${BASE}/api/admin/citas/${idc}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ estado }) });
  r = await patch(id, 'confirmada');
  ok(r.status === 200 && (await r.json()).cita.estado === 'confirmada', 'marcar confirmada');
  r = await patch(id, 'cancelada');
  ok((await r.json()).cita.estado === 'cancelada', 'marcar cancelada');
  r = await patch(id, 'lo-que-sea');
  ok(r.status === 400, 'estado inválido -> 400');
  r = await patch('00000000-0000-0000-0000-000000000000', 'confirmada');
  ok(r.status === 404, 'solicitud inexistente -> 404');
  r = await fetch(`${BASE}/api/admin/citas/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"estado":"confirmada"}' });
  ok(r.status === 401, 'cambiar estado sin sesión -> 401');
  const guardado = JSON.parse(readFileSync(path.join(DATA, 'solicitudes.json'), 'utf8'));
  ok(guardado.find((c) => c.id === id).estado === 'cancelada', 'el cambio quedó en el disco');
  r = await fetch(`${BASE}/api/admin/citas/${j.citas[0].id}`, { method: 'DELETE', headers: { Cookie: cookie } });
  ok(r.status === 200, 'eliminar solicitud');
  r = await fetch(BASE + '/api/admin/citas', { headers: { Cookie: cookie } });
  ok((await r.json()).citas.length === 3, 'quedan 3 tras eliminar');

  // --- Una IP compartida no limita a personas distintas; el mismo teléfono sí se frena ---
  const estados = [];
  for (let i = 0; i < 8; i++) estados.push((await post('/api/citas', cita({ telefono: `33 9999 00${10 + i}`, nombre: 'Persona ' + i }))).status);
  ok(estados.every((s) => s === 201), '8 personas distintas desde la misma IP: todas se guardan', estados.join(','));
  const mismos = [];
  for (let i = 0; i < 6; i++) mismos.push((await post('/api/citas', cita({ telefono: '33 8888 0000', hora: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'][i] }))).status);
  ok(mismos[5] === 429 && mismos[0] === 201, 'el mismo teléfono se limita tras 5 envíos', mismos.join(','));

  // --- Logout ---
  r = await post('/api/admin/logout', {}, cookie);
  r = await fetch(BASE + '/api/admin/citas', { headers: { Cookie: cookie } });
  ok(r.status === 401, 'tras salir, la cookie ya no sirve');

  // --- Fuerza bruta: 5 fallos y se bloquea ---
  const codigos = [];
  for (let i = 0; i < 5; i++) codigos.push((await post('/api/admin/login', { clave: 'mala' + i })).status);
  ok(JSON.stringify(codigos) === '[401,401,401,401,429]', 'contraseña mala: 4×401 y a la 5.ª se bloquea', codigos.join(','));
  r = await post('/api/admin/login', { clave: CLAVE });
  ok(r.status === 429 && Number(r.headers.get('retry-after')) > 0, 'bloqueado aun con la clave buena, con Retry-After');

  // --- Archivo dañado: la siguiente solicitud no se pierde y se avisa ---
  await parar();
  writeFileSync(path.join(DATA, 'solicitudes.json'), '[{"id": roto');
  await arrancar();
  r = await post('/api/citas', cita({ nombre: 'Fátima', telefono: '33 2222 3333' }));
  ok(r.status === 201, 'con el archivo dañado, la nueva solicitud se guarda');
  r = await post('/api/admin/login', { clave: CLAVE });
  const cookie2 = (r.headers.get('set-cookie') || '').split(';')[0];
  j = await (await fetch(BASE + '/api/admin/citas', { headers: { Cookie: cookie2 } })).json();
  ok(j.citas.length === 1 && j.citas[0].nombre === 'Fátima', 'la lista tiene solo la nueva');
  ok(j.aviso.includes('dañado'), 'el panel recibe un aviso del archivo dañado');
  ok(readdirSync(DATA).some((f) => f.includes('.danado-')), 'el archivo dañado se conservó aparte');

  // --- Un registro dañado dentro de la lista no tumba a los demás ---
  await parar();
  writeFileSync(path.join(DATA, 'solicitudes.json'), '[null, 5, {"nombre":"Sin campos"}]');
  await arrancar();
  r = await post('/api/citas', cita({ nombre: 'Gaby', telefono: '33 4444 5555' }));
  ok(r.status === 201, 'con [null] en el archivo, la solicitud se guarda', String(r.status));
  r = await post('/api/admin/login', { clave: CLAVE });
  const cookie3 = (r.headers.get('set-cookie') || '').split(';')[0];
  r = await fetch(BASE + '/api/admin/citas', { headers: { Cookie: cookie3 } });
  j = await r.json();
  ok(r.status === 200 && j.citas.length === 2 && j.aviso.includes('dañados'), 'el panel lista los registros sanos y avisa', JSON.stringify(j).slice(0, 200));

  // --- Lista enorme: nunca se rechaza a un paciente; el panel avisa ---
  await parar();
  const base = { id: '00000000-0000-4000-8000-000000000000', creadaEn: new Date().toISOString(), estado: 'cancelada', nombre: 'Bot', telefono: '1', correo: 'a@b.cc', tratamiento: 'rodilla', fecha: '2030-01-01', hora: '09:00', comentario: '' };
  writeFileSync(path.join(DATA, 'solicitudes.json'), JSON.stringify(Array.from({ length: 5001 }, () => base)));
  await arrancar();
  r = await post('/api/citas', cita({ nombre: 'Hilda', telefono: '33 6666 7777' }));
  ok(r.status === 201, 'con 5001 solicitudes guardadas, la siguiente se acepta', String(r.status));
  r = await post('/api/admin/login', { clave: CLAVE });
  const cookie4 = (r.headers.get('set-cookie') || '').split(';')[0];
  j = await (await fetch(BASE + '/api/admin/citas', { headers: { Cookie: cookie4 } })).json();
  ok(j.aviso.includes('5002 solicitudes'), 'el panel avisa que la lista está grande', j.aviso);
  r = await fetch(BASE + '/api/admin/citas?estado=cancelada', { method: 'DELETE', headers: { Cookie: cookie4 } });
  ok((await r.json()).borradas === 5001, 'se pueden eliminar todas las canceladas de una vez');
} catch (e) {
  console.error('Error en las pruebas:', e);
  fallos++;
} finally {
  if (hijo && hijo.exitCode === null) hijo.kill();
  rmSync(DATA, { recursive: true, force: true });
}
console.log(fallos ? `\n${fallos} prueba(s) con problemas` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
