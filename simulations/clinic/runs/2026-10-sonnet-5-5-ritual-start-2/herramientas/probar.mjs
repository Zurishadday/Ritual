// Prueba de humo: arranca el servidor con datos temporales y recorre los casos. Uso: node herramientas/probar.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, appendFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const datos = mkdtempSync(path.join(tmpdir(), 'fisio-'));
// Archivo con una línea dañada y otra cortada al final, para probar la recuperación
writeFileSync(path.join(datos, 'citas.jsonl'), '{"t":"cita","id":"viejo","cita":{"nombre":"Vieja","telefono":"5551112222","correo":"a@b.co","tratamiento":"masaje","fecha":"2030-01-01","hora":"09:00","comentario":"","creada":"2020-01-01T00:00:00.000Z","estado":"pendiente"}}\nBASURA{{\n{"t":"cita","id":"cort');
const PUERTO = 3917;
const srv = spawn(process.execPath, ['servidor.mjs'], { env: { ...process.env, PORT: PUERTO, DATOS_DIR: datos, ADMIN_PASSWORD: 'secreta123' } });
let salida = '';
srv.stdout.on('data', (d) => (salida += d));
srv.stderr.on('data', (d) => (salida += d));
await new Promise((r) => setTimeout(r, 800));

const base = `http://localhost:${PUERTO}`;
let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALLA'), msg); if (!cond) fallos++; };
const post = (ruta, cuerpo, extra = {}) => fetch(base + ruta, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...extra }, body: JSON.stringify(cuerpo) });

function proximoDia(dow) { // próximo día de la semana (0=dom) a partir de mañana
  const d = new Date(); d.setDate(d.getDate() + 1);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const buena = { nombre: 'Ana Pérez', telefono: '55 1234 5678', correo: 'ana@correo.com', tratamiento: 'rodilla', fecha: proximoDia(2), hora: '10:00', comentario: '<b>hola</b>' };

ok(salida.includes('dañada'), 'arranque avisa de la línea dañada');
ok((await fetch(base + '/')).status === 200, 'portada carga');
for (const f of ['/estilos.css', '/app.js', '/admin.html', '/admin.js', '/img/portada.svg', '/img/rodilla.svg', '/img/espalda.svg', '/img/masaje.svg', '/gracias.html'])
  ok((await fetch(base + f)).status === 200, 'carga ' + f);
ok((await fetch(base + '/..%2fservidor.mjs')).status === 404, 'no se sale de public/');
ok((await fetch(base + '/datos/citas.jsonl')).status === 404, 'datos no son públicos');

ok((await fetch(base + '/api/admin/citas')).status === 401, 'admin sin sesión: 401');

let r = await post('/api/citas', buena);
ok(r.status === 200, 'cita válida se guarda');
r = await post('/api/citas', { ...buena, fecha: proximoDia(6) });
let d = await r.json();
ok(r.status === 422 && d.errores.fecha, 'sábado se rechaza: ' + d.errores?.fecha);
r = await post('/api/citas', { ...buena, fecha: proximoDia(0) });
ok(r.status === 422, 'domingo se rechaza');
r = await post('/api/citas', { ...buena, hora: '18:00' });
ok(r.status === 422, 'hora fuera de horario se rechaza');
r = await post('/api/citas', { ...buena, fecha: '2020-01-06' });
ok(r.status === 422, 'fecha pasada se rechaza');
r = await post('/api/citas', { nombre: '', telefono: 'abc', correo: 'x', tratamiento: 'z', fecha: '', hora: '' });
d = await r.json();
ok(r.status === 422 && Object.keys(d.errores).length === 6, 'formulario vacío: 6 errores');
r = await post('/api/citas', { ...buena, sitio_web: 'http://spam' });
ok(r.status === 200, 'trampa para bots: finge éxito');
r = await fetch(base + '/api/citas', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(buena) });
ok(r.status === 303 && r.headers.get('location') === '/gracias.html', 'envío sin JavaScript: redirige a gracias');
r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'nombre=x' });
const html = await r.text();
ok(r.status === 422 && html.includes('Volver al formulario') && html.includes('Escribe un teléfono'), 'sin JavaScript, errores en página legible');
r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(20000) });
ok(r.status === 413, 'cuerpo enorme: 413');
// límite por IP: 5 envíos válidos por 10 min (los errores de validación no cuentan; ya van 3)
for (let i = 0; i < 2; i++) ok((await post('/api/citas', buena)).status === 200, 'envío válido ' + (i + 4));
r = await post('/api/citas', buena);
ok(r.status === 429, 'límite de solicitudes por IP: 429');

// Administración
r = await post('/api/admin/login', { clave: 'secreta123' });
ok(r.status === 200, 'login correcto');
const cookie = r.headers.get('set-cookie').split(';')[0];
ok(/HttpOnly/.test(r.headers.get('set-cookie')) && /SameSite=Strict/.test(r.headers.get('set-cookie')), 'cookie HttpOnly y SameSite=Strict');
const conSesion = { Cookie: cookie };
d = await (await fetch(base + '/api/admin/citas', { headers: conSesion })).json();
ok(d.ok && d.lineasDanadas === 2, 'lista: 2 líneas dañadas contadas y avisadas: ' + d.lineasDanadas);
ok(d.citas.length === 5 && d.citas[0].creada >= d.citas[1].creada && d.citas.at(-1).id === 'viejo', 'lista: 5 citas (la trampa no guarda), más nuevas primero (la vieja al final)');
ok(d.citas.some((c) => c.comentario === '<b>hola</b>'), 'el comentario se guarda tal cual (se muestra como texto)');
const id = d.citas[0].id;
r = await post('/api/admin/estado', { id, estado: 'confirmada' }, conSesion);
ok(r.status === 200, 'marcar confirmada');
r = await post('/api/admin/estado', { id, estado: 'rara' }, conSesion);
ok(r.status === 400, 'estado inventado: 400');
r = await post('/api/admin/estado', { id, estado: 'cancelada' });
ok(r.status === 401, 'cambiar estado sin sesión: 401');
d = await (await fetch(base + '/api/admin/citas', { headers: conSesion })).json();
ok(d.citas.find((c) => c.id === id).estado === 'confirmada', 'el estado quedó guardado');

// Reinicio: lo guardado sobrevive y la línea cortada no estorba
srv.kill();
await new Promise((r) => setTimeout(r, 300));
appendFileSync(path.join(datos, 'citas.jsonl'), '');
const srv2 = spawn(process.execPath, ['servidor.mjs'], { env: { ...process.env, PORT: PUERTO, DATOS_DIR: datos, ADMIN_PASSWORD: 'secreta123' } });
await new Promise((r) => setTimeout(r, 800));
r = await post('/api/admin/login', { clave: 'secreta123' });
const cookie2 = r.headers.get('set-cookie').split(';')[0];
d = await (await fetch(base + '/api/admin/citas', { headers: { Cookie: cookie2 } })).json();
ok(d.citas.find((c) => c.id === id)?.estado === 'confirmada', 'tras reiniciar el servidor, la cita y su estado siguen ahí');

r = await post('/api/admin/login', { clave: 'mala' });
ok(r.status === 401, 'contraseña incorrecta: 401');
for (let i = 0; i < 4; i++) await post('/api/admin/login', { clave: 'mala' });
r = await post('/api/admin/login', { clave: 'secreta123' });
ok(r.status === 429 && r.headers.get('retry-after'), 'tras 5 fallos bloquea incluso la contraseña correcta (429)');
srv2.kill();
console.log(fallos ? `\n${fallos} PRUEBA(S) FALLARON` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
