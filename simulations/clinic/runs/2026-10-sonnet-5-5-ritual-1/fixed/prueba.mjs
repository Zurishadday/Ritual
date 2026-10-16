// Prueba automática: node prueba.mjs  (arranca su propio servidor con datos temporales)
import { spawn } from 'node:child_process';
import { mkdtempSync, appendFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const datos = mkdtempSync(path.join(tmpdir(), 'fisio-'));
const PORT = 3999;
const base = `http://localhost:${PORT}`;
const env = { ...process.env, PORT: String(PORT), DATOS_DIR: datos, ADMIN_PASSWORD: 'secreta123' };
let srv;
let fallos = 0;
const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallos++; };
const J = { 'Content-Type': 'application/json', Accept: 'application/json' };

function proximoLaborable(extra = 0) {
  const d = new Date(); d.setDate(d.getDate() + 3 + extra);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function proximoSabado() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const buena = (o = {}) => ({ nombre: 'Ana Pérez', telefono: '55 1234 5678', correo: 'ana@correo.com', tratamiento: 'rodilla', dia: proximoLaborable(), hora: '10:00', comentario: '<b>hola</b>', ...o });
const post = (cuerpo, h = J) => fetch(base + '/api/citas', { method: 'POST', headers: h, body: JSON.stringify(cuerpo), redirect: 'manual' });

function arrancar() {
  return new Promise((res) => {
    srv = spawn(process.execPath, ['servidor.mjs'], { env, cwd: path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')) });
    srv.stdout.on('data', (d) => { if (String(d).includes('Fisio Andares en')) res(); });
    srv.stderr.on('data', (d) => process.stderr.write(d));
  });
}

await arrancar();
try {
  ok((await fetch(base + '/')).status === 200, 'portada responde');
  ok((await fetch(base + '/privado/admin.html')).status === 404, 'archivos privados no se sirven');
  ok((await fetch(base + '/..%2fservidor.mjs')).status !== 200, 'no se sale de la carpeta pública');
  ok((await fetch(base + '/admin.js')).status === 401, 'admin.js requiere sesión');
  ok((await fetch(base + '/api/admin/citas')).status === 401, 'lista requiere sesión');

  let r = await post(buena());
  ok(r.status === 201, 'cita válida se guarda (201)');
  r = await post(buena({ dia: proximoSabado() }));
  ok(r.status === 400 && (await r.json()).errores.dia, 'sábado rechazado');
  r = await post(buena({ nombre: '', correo: 'x', hora: '18:30', tratamiento: 'otro' }));
  const e = (await r.json()).errores;
  ok(r.status === 400 && e.nombre && e.correo && e.hora && e.tratamiento, 'campos vacíos/incorrectos rechazados');
  r = await post(buena({ nombre: 'Bot Spam', sitio_web: 'http://spam' }));
  ok(r.status === 201, 'bot (campo trampa) recibe ok');
  r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(buena({ nombre: 'Luis', dia: proximoLaborable(1) })), redirect: 'manual' });
  ok(r.status === 303 && r.headers.get('location') === '/gracias.html', 'envío sin JavaScript redirige a gracias');
  r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(buena({ correo: 'mal' })) });
  ok(r.status === 400 && (await r.text()).includes('Revisa tu solicitud'), 'sin JavaScript, error legible en HTML');
  r = await fetch(base + '/api/citas', { method: 'POST', headers: J, body: 'x'.repeat(20000) });
  ok(r.status === 413, 'cuerpo gigante rechazado (413)');
  r = await fetch(base + '/api/citas', { method: 'POST', headers: J, body: '{roto' });
  ok(r.status === 400, 'JSON roto → 400, el servidor sigue vivo');

  // tipos raros: nunca 500 ni basura guardada
  for (const raro of ['null', '[]', '"x"', '{"nombre":{"toString":1}}', '{"nombre":["a","b"]}']) {
    r = await fetch(base + '/api/citas', { method: 'POST', headers: J, body: raro });
    ok(r.status === 400, 'cuerpo de tipo raro ' + raro + ' → 400 (' + r.status + ')');
  }
  r = await fetch(base + '/admin/login', { method: 'POST', headers: J, body: 'null' });
  ok(r.status === 400, 'login con null → 400');

  // la página de error sin JS no usa javascript: (la CSP lo bloquea)
  r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(buena({ dia: proximoSabado() })) });
  const html = await r.text();
  ok(r.status === 400 && !/javascript:/i.test(html) && html.includes('href="/#cita"'), 'página de error: enlace real de vuelta al formulario');

  // límite: los envíos inválidos no gastan el cupo
  for (let i = 0; i < 12; i++) await post(buena({ correo: 'mal' }));
  r = await post(buena({ nombre: 'Tras errores', hora: '11:00' }));
  ok(r.status === 201, '12 envíos inválidos y luego uno válido → 201');
  r = await post(buena({ nombre: 'Tras errores', hora: '11:00' }));
  ok(r.status === 201, 'mismo envío repetido no se duplica');
  let ultimo;
  for (const h of ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00']) ultimo = await post(buena({ nombre: 'N' + h, hora: h }));
  ok(ultimo.status === 429, 'límite de solicitudes guardadas por IP (429)');

  // login
  r = await fetch(base + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'clave=mala', redirect: 'manual' });
  ok(r.status === 401, 'contraseña mala → 401');
  r = await fetch(base + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'clave=secreta123', redirect: 'manual' });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  ok(r.status === 303 && cookie.startsWith('sid=') && /HttpOnly/i.test(r.headers.get('set-cookie')), 'contraseña buena → sesión HttpOnly');
  const H = { ...J, Cookie: cookie };
  r = await fetch(base + '/api/admin/citas', { headers: H });
  let lista = (await r.json()).citas;
  const antes = lista.length;
  ok(antes >= 2 && !lista.some((c) => c.nombre === 'Bot Spam'), 'panel ve las solicitudes reales y no la del bot');
  ok(lista[0].creada >= lista[1].creada, 'más nuevas primero');
  ok(lista.some((c) => c.comentario === '<b>hola</b>'), 'comentario guardado como texto tal cual');
  r = await fetch(base + '/api/admin/citas?limite=2&desde=0', { headers: H });
  const pag = await r.json();
  ok(pag.citas.length === 2 && pag.hayMas === true && pag.cuentas.pendiente >= 3, 'lista paginada con totales');
  r = await fetch(base + '/api/admin/citas?estado=confirmada', { headers: H });
  ok((await r.json()).citas.length === 0, 'filtro por estado en el servidor');
  const id = lista[0].id;
  r = await fetch(base + '/api/admin/citas/' + id, { method: 'PATCH', headers: H, body: JSON.stringify({ estado: 'confirmada' }) });
  ok(r.status === 200, 'marcar confirmada');
  r = await fetch(base + '/api/admin/citas/' + id, { method: 'PATCH', headers: { ...H, 'Content-Type': 'text/plain' }, body: '{"estado":"cancelada"}' });
  ok(r.status === 415, 'cambio de estado solo con JSON (anti-CSRF)');
  r = await fetch(base + '/api/admin/citas/' + id, { method: 'PATCH', headers: H, body: JSON.stringify({ estado: 'raro' }) });
  ok(r.status === 400, 'estado inválido rechazado');
  r = await fetch(base + '/api/admin/citas/eliminar', { method: 'POST', headers: H, body: JSON.stringify({ estado: 'confirmada' }) });
  ok(r.status === 200 && (await r.json()).eliminadas === 1, 'eliminar en bloque las confirmadas');
  r = await fetch(base + '/admin', { headers: { Cookie: cookie } });
  ok((await r.text()).includes('Solicitudes de cita'), '/admin con sesión muestra el panel');

  // línea dañada en el almacén no tumba nada; se reinicia y se conserva el estado
  appendFileSync(path.join(datos, 'citas.jsonl'), '{"id":"roto"');
  srv.kill();
  await new Promise((x) => setTimeout(x, 300));
  await arrancar();
  r = await fetch(base + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'clave=secreta123', redirect: 'manual' });
  const c2 = (r.headers.get('set-cookie') || '').split(';')[0];
  lista = (await (await fetch(base + '/api/admin/citas', { headers: { ...J, Cookie: c2 } })).json()).citas;
  ok(lista.length === antes - 1 && !lista.some((c) => c.id === id), 'tras reiniciar con una línea dañada: datos y borrados intactos');
  r = await post(buena({ nombre: 'Después del daño', hora: '17:00' }));
  ok(r.status === 201, 'la siguiente solicitud se guarda bien');
  ok(readFileSync(path.join(datos, 'citas.jsonl'), 'utf8').split('\n').some((l) => l.startsWith('{') && l.includes('Después del daño')), 'y quedó en su propia línea');

  // fuerza bruta
  let codigo;
  for (let i = 0; i < 5; i++) {
    codigo = (await fetch(base + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'clave=nope' + i })).status;
  }
  ok(codigo === 429, 'al 5.º intento fallido se bloquea (429)');
  r = await fetch(base + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'clave=secreta123', redirect: 'manual' });
  ok(r.status === 429, 'bloqueado: ni la clave correcta entra');
} finally {
  srv.kill();
}
console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
