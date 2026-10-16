// Prueba de humo: arranca el servidor con datos temporales y recorre los casos principales.
// Uso: node prueba.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fisio-'));
const base = 'http://127.0.0.1:3917';
const srv = spawn(process.execPath, ['servidor.mjs'], { env: { ...process.env, PORT: '3917', DATOS_DIR: dir, CONTRASENA_ADMIN: 'clave-de-prueba' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => srv.stdout.once('data', r));

let fallos = 0;
const ok = (c, msg) => { console.log((c ? 'OK    ' : 'FALLA ') + msg); if (!c) fallos++; };
const proximo = (dia) => { const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() !== dia) d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const buena = { nombre: 'Ana Pérez', telefono: '55 1111 2222', correo: 'ana@correo.com', tratamiento: 'rodilla', fecha: proximo(2), hora: '10:00', comentario: 'Me duele al bajar escaleras <b>x</b>' };
const enviar = (o, extra = {}) => fetch(base + '/api/citas', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o), ...extra });

try {
  ok((await fetch(base + '/')).status === 200, 'portada responde');
  ok((await fetch(base + '/img/portada.svg')).status === 200, 'imagen responde');
  ok((await fetch(base + '/..%2fservidor.mjs')).status !== 200, 'no sirve archivos fuera de publico');
  ok((await fetch(base + '/datos/citas.jsonl')).status === 404, 'datos no son públicos');

  let r = await enviar(buena);
  ok(r.status === 201, 'solicitud válida se guarda');
  await enviar({ ...buena, nombre: 'Beto Ruiz', tratamiento: 'masaje', hora: '17:30' });
  r = await enviar({ ...buena, fecha: proximo(6) });
  ok(r.status === 422 && (await r.json()).errores.fecha, 'sábado se rechaza');
  r = await enviar({ ...buena, hora: '17:30' });
  ok(r.status === 422 && (await r.json()).errores.hora, 'rodilla a las 17:30 se rechaza (terminaría tras las 18:00)');
  r = await enviar({});
  ok(r.status === 422, 'formulario vacío da errores');
  r = await enviar({ ...buena, sitio_web: 'http://spam' });
  ok(r.status === 201, 'robot recibe "ok"');
  r = await fetch(base + '/api/citas', { method: 'POST', body: new URLSearchParams(buena) });
  ok((await r.text()).includes('<html'), 'sin JavaScript se responde una página HTML');

  ok((await fetch(base + '/api/admin/citas')).status === 401, 'lista sin sesión: 401');
  const login = (c) => fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contrasena: c }) });
  r = await login('clave-de-prueba');
  const cookie = r.headers.get('set-cookie').split(';')[0];
  ok(r.status === 200 && cookie.startsWith('sesion='), 'contraseña correcta inicia sesión');
  const adm = (ruta, o = {}) => fetch(base + ruta, { ...o, headers: { 'Content-Type': 'application/json', Cookie: cookie } });
  let lista = await (await adm('/api/admin/citas')).json();
  ok(lista.citas.length === 3 && lista.citas[0].creada >= lista.citas[2].creada, 'lista: 3 solicitudes (la del robot no), la más nueva primero');
  ok(lista.citas.some((c) => c.comentario.includes('<b>')), 'el comentario se guarda tal cual (el panel lo muestra como texto)');
  r = await adm(`/api/admin/citas/${lista.citas[0].id}/estado`, { method: 'POST', body: JSON.stringify({ estado: 'confirmada' }) });
  ok(r.status === 200 && (await r.json()).conteo.confirmada === 1, 'confirmar funciona');
  lista = await (await adm('/api/admin/citas?estado=confirmada')).json();
  ok(lista.citas.length === 1, 'filtro por confirmadas');
  r = await adm(`/api/admin/citas/${lista.citas[0].id}`, { method: 'DELETE' });
  ok(r.status === 200 && (await r.json()).conteo.total === 2, 'eliminar funciona');
  // Archivo dañado: una línea rota y una cita cortada a medias no tumban las demás.
  fs.appendFileSync(path.join(dir, 'citas.jsonl'), '{"tipo":"cita","id":"roto","nom');
  r = await enviar({ ...buena, nombre: 'Carla Sol' });
  lista = await (await adm('/api/admin/citas')).json();
  ok(r.status === 201 && lista.citas.length === 3 && lista.danadas === 1 && lista.citas.some((c) => c.nombre === 'Carla Sol'), 'línea dañada: la cita siguiente se guarda y el panel avisa');
  let estados = [];
  for (let i = 0; i < 7; i++) estados.push((await login('mala' + i)).status);
  ok(estados.join() === '401,401,401,401,401,429,429', 'tras 5 contraseñas malas se bloquea: ' + estados.join());
  ok((await login('clave-de-prueba')).status === 429, 'bloqueo también frena la contraseña correcta');
  srv.kill();
  await new Promise((r) => setTimeout(r, 300));
  console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien (parte 1)');
} catch (e) { console.error(e); fallos++; srv.kill(); }
console.log('datos temporales en', dir);
process.exitCode = fallos ? 1 : 0;
