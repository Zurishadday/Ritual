// Prueba automática: arranca el servidor con datos temporales y recorre los casos principales.
// Uso: node prueba.mjs     (termina con "Todo bien" y código 0, o con la lista de fallos)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fisio-'));
const base = 'http://127.0.0.1:3917';
let srv;
async function arrancar(extra = {}) {
  srv = spawn(process.execPath, ['servidor.mjs'], { env: { ...process.env, PORT: '3917', DATOS_DIR: dir, CONTRASENA_ADMIN: 'clave-de-prueba', ...extra }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
}
async function parar() { srv.kill(); await new Promise((r) => srv.once('exit', r)); }

let fallos = 0;
const ok = (c, msg) => { console.log((c ? 'OK    ' : 'FALLA ') + msg); if (!c) fallos++; };
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const proximo = (dia) => { const d = new Date(); d.setDate(d.getDate() + 2); while (d.getDay() !== dia) d.setDate(d.getDate() + 1); return fmt(d); };
const buena = { nombre: 'Ana Pérez', telefono: '55 1111 2222', correo: 'ana@correo.com', tratamiento: 'rodilla', fecha: proximo(2), hora: '10:00', comentario: 'Me duele al bajar escaleras <b>x</b>' };
const enviar = (o, extra = {}) => fetch(base + '/api/citas', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o), ...extra });
const login = (c) => fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contrasena: c }) });

try {
  await arrancar();
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

  // Hora de hoy que ya pasó (solo se puede comprobar si hoy es día hábil y ya pasaron las 09:00 en el consultorio).
  const ahora = await (await fetch(base + '/api/ahora')).json();
  const [y, m, d] = ahora.fecha.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  if (dow >= 1 && dow <= 5 && ahora.minutos > 9 * 60) {
    r = await enviar({ ...buena, fecha: ahora.fecha, hora: '09:00' });
    ok(r.status === 422 && (await r.json()).errores.hora, 'hora de hoy que ya pasó se rechaza');
  } else console.log('OMITIDA hora de hoy que ya pasó (hoy no es día hábil o aún no son las 09:00)');

  // Sin JavaScript: el error conserva lo escrito y no lo tapa el límite de solicitudes.
  await enviar({ ...buena, nombre: 'Carla Sol' });
  await enviar({ ...buena, nombre: 'Dani Paz' });
  await enviar({ ...buena, nombre: 'Eva Ríos' }); // 5 válidas guardadas desde esta IP
  r = await fetch(base + '/api/citas', { method: 'POST', body: new URLSearchParams({ ...buena, nombre: 'Zoe Ñandú', fecha: proximo(0) }) });
  let html = await r.text();
  ok(r.status === 422 && html.includes('Atendemos de lunes a viernes') && html.includes('value="Zoe Ñandú"') && html.includes('ana@correo.com'), 'sin JavaScript: error de fecha (no 429) y el formulario conserva lo escrito');
  r = await fetch(base + '/api/citas', { method: 'POST', body: new URLSearchParams(buena) });
  ok(r.status === 429 && (await r.text()).includes('<html'), 'sexta solicitud válida: límite por IP, en página HTML');
  r = await fetch(base + '/api/citas', { method: 'POST', body: 'x=' + 'a'.repeat(100_000) });
  ok(r.status === 413 && (await r.text()).includes('<html'), 'sin JavaScript: 100 KB devuelve una página, no JSON');

  ok((await fetch(base + '/api/admin/citas')).status === 401, 'lista sin sesión: 401');
  r = await login('clave-de-prueba');
  const cookie = r.headers.get('set-cookie').split(';')[0];
  ok(r.status === 200 && cookie.startsWith('sesion='), 'contraseña correcta inicia sesión');
  const adm = (ruta, o = {}) => fetch(base + ruta, { ...o, headers: { 'Content-Type': 'application/json', Cookie: cookie } });
  let lista = await (await adm('/api/admin/citas')).json();
  ok(lista.citas.length === 5 && lista.citas[0].creada >= lista.citas[4].creada, 'lista: 5 solicitudes (la del robot no), la más nueva primero');
  ok(lista.citas.some((c) => c.comentario.includes('<b>')), 'el comentario se guarda tal cual (el panel lo muestra como texto)');
  r = await adm(`/api/admin/citas/${lista.citas[0].id}/estado`, { method: 'POST', body: JSON.stringify({ estado: 'confirmada' }) });
  ok(r.status === 200 && (await r.json()).conteo.confirmada === 1, 'confirmar funciona');
  lista = await (await adm('/api/admin/citas?estado=confirmada')).json();
  ok(lista.citas.length === 1, 'filtro por confirmadas');
  lista = await (await adm('/api/admin/citas?q=ríos')).json();
  ok(lista.citas.length === 1 && lista.citas[0].nombre === 'Eva Ríos', 'búsqueda por nombre');
  r = await adm(`/api/admin/citas/${lista.citas[0].id}`, { method: 'DELETE' });
  ok(r.status === 200 && (await r.json()).conteo.total === 4, 'eliminar funciona');
  r = await adm('/api/admin/citas/eliminar', { method: 'POST', body: JSON.stringify({}) });
  ok(r.status === 400, 'eliminar en bloque exige un filtro');
  r = await adm('/api/admin/citas/eliminar', { method: 'POST', body: JSON.stringify({ q: 'dani' }) });
  ok(r.status === 200 && (await r.json()).eliminadas === 1, 'eliminar en bloque por búsqueda');

  // 5 contraseñas malas no dejan fuera al dueño.
  const t0 = Date.now();
  for (let i = 0; i < 6; i++) await login('mala' + i);
  ok((await login('clave-de-prueba')).status === 200, 'tras contraseñas malas, la correcta sigue entrando');
  ok(Date.now() - t0 >= 900, 'el sexto intento malo se hizo esperar');

  // Reinicio con una línea rota: nada se pierde y el panel avisa.
  await parar();
  fs.appendFileSync(path.join(dir, 'citas.jsonl'), '{"tipo":"cita","id":"roto","nom');
  await arrancar();
  const c2 = (await login('clave-de-prueba')).headers.get('set-cookie').split(';')[0];
  lista = await (await fetch(base + '/api/admin/citas', { headers: { Cookie: c2 } })).json();
  ok(lista.citas.length === 3 && lista.danadas === 1, 'tras reiniciar con una línea dañada: 3 citas y aviso');
  ok(fs.existsSync(path.join(dir, 'lineas-danadas.txt')), 'la línea dañada se guardó aparte');

  // Volumen: 20 000 citas en el archivo, listar y cambiar un estado deben seguir siendo rápidos.
  await parar();
  const lineas = [];
  for (let i = 0; i < 20000; i++) lineas.push(JSON.stringify({ tipo: 'cita', id: 'x' + i, creada: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(), nombre: 'Bot ' + i, telefono: '5511112222', correo: 'b@b.com', tratamiento: 'masaje', fecha: buena.fecha, hora: '09:00', comentario: '' }));
  fs.appendFileSync(path.join(dir, 'citas.jsonl'), '\n' + lineas.join('\n') + '\n');
  await arrancar();
  const c3 = (await login('clave-de-prueba')).headers.get('set-cookie').split(';')[0];
  const admC = (ruta, o = {}) => fetch(base + ruta, { ...o, headers: { 'Content-Type': 'application/json', Cookie: c3 } });
  let t = Date.now();
  await Promise.all(Array.from({ length: 10 }, () => admC('/api/admin/citas').then((x) => x.json())));
  ok(Date.now() - t < 500, `10 listados en paralelo con 20 000 citas: ${Date.now() - t} ms`);
  t = Date.now();
  r = await admC('/api/admin/citas/x5/estado', { method: 'POST', body: JSON.stringify({ estado: 'cancelada' }) });
  ok(r.status === 200 && Date.now() - t < 100, `cambiar un estado con 20 000 citas: ${Date.now() - t} ms`);
  lista = await (await admC('/api/admin/citas?desde=50')).json();
  ok(lista.citas.length === 50 && lista.coinciden === 20003 && lista.citas[0].creada >= lista.citas[49].creada, 'paginación: segunda página de 50, orden descendente');
  await parar();
  console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
} catch (e) { console.error(e); fallos++; srv?.kill(); }
console.log('datos temporales en', dir);
process.exitCode = fallos ? 1 : 0;
