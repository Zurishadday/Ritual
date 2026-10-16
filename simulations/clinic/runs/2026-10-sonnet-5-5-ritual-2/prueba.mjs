// Prueba de humo: con el servidor corriendo, ejecuta `node prueba.mjs`.
// Deja los datos como estaban (borra las solicitudes de prueba que crea).
import { readFile } from 'node:fs/promises';
const base = process.env.BASE || 'http://localhost:3000';
const clave = process.env.CLAVE_ADMIN || (await readFile(new URL('./datos/clave.txt', import.meta.url), 'utf8')).trim();
let fallos = 0;
const ok = (c, t) => { console.log((c ? 'OK    ' : 'FALLA ') + t); if (!c) fallos++; };

function proximoDia(dow) { const d = new Date(); do d.setDate(d.getDate() + 1); while (d.getDay() !== dow); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const buena = { nombre: 'Prueba Uno', telefono: '33 1111 2222', correo: 'prueba@ejemplo.com', tratamiento: 'espalda', fecha: proximoDia(2), hora: '10:30', comentario: '<b>hola</b>' };
const post = (cuerpo, extra = {}) => fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(cuerpo), ...extra });

for (const p of ['/', '/admin', '/estilo.css', '/app.js', '/img/portada.svg', '/gracias.html']) ok((await fetch(base + p)).status === 200, `GET ${p}`);
ok((await fetch(base + '/..%2fservidor.mjs')).status !== 200, 'no se sale de la carpeta pública');
ok((await fetch(base + '/datos/solicitudes.json')).status === 404, 'datos no se sirven');
ok((await fetch(base + '/api/admin/citas')).status === 401, 'lista sin sesión → 401');

let r = await post(buena); ok(r.status === 201, 'solicitud válida → 201');
r = await post(buena); ok(r.status === 201, 'doble envío idéntico no da error');
r = await post({ ...buena, fecha: proximoDia(6) }); let j = await r.json(); ok(r.status === 400 && j.errores[0].campo === 'fecha', 'sábado → 400 con error en fecha');
r = await post({ ...buena, sitio_web: 'http://spam' }); ok(r.status === 201, 'trampa de bots responde éxito falso');
r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...buena, nombre: 'Sin JS', hora: '09:00' }), redirect: 'manual' });
ok(r.status === 303 && r.headers.get('location') === '/gracias.html', 'envío de formulario sin JS → redirige a gracias');
r = await post(buena); ok(r.status === 201, 'los rechazados no gastan el cupo: un envío bueno después de errores pasa');
const s = []; for (let i = 0; i < 3; i++) s.push((await post(buena)).status);
ok(s.join() === '201,429,429', `tras 5 aceptados llega el freno: ${s.join()} (esperado 201,429,429)`);

// Panel
r = await fetch(base + '/api/admin/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }) });
ok(r.status === 200, 'login correcto');
const cookie = r.headers.get('set-cookie').split(';')[0];
const h = { 'Content-Type': 'application/json', Cookie: cookie };
j = await (await fetch(base + '/api/admin/citas', { headers: h })).json();
const mias = j.citas.filter((c) => c.nombre.startsWith('Prueba') || c.nombre === 'Sin JS');
ok(mias.length === 2, `se guardaron 2 solicitudes de prueba (hay ${mias.length}; la repetida y la trampa no)`);
ok(j.citas.every((c, i, a) => !i || a[i - 1].creada >= c.creada), 'orden: más nuevas primero');
const id = mias[0].id;
r = await fetch(base + '/api/admin/citas/' + id, { method: 'PATCH', headers: h, body: JSON.stringify({ estado: 'confirmada' }) });
ok((await r.json()).cita?.estado === 'confirmada', 'marcar confirmada');
r = await fetch(base + '/api/admin/citas/' + id, { method: 'PATCH', headers: h, body: JSON.stringify({ estado: 'raro' }) });
ok(r.status === 400, 'estado inválido → 400');
for (const c of mias) await fetch(base + '/api/admin/citas/' + c.id, { method: 'DELETE', headers: h });
j = await (await fetch(base + '/api/admin/citas', { headers: h })).json();
ok(!j.citas.some((c) => c.nombre.startsWith('Prueba') || c.nombre === 'Sin JS'), 'eliminar funciona (datos de prueba borrados)');

// Límite de intentos (al final: bloquea el login ~1 min)
const codigos = [];
for (let i = 0; i < 7; i++) codigos.push((await fetch(base + '/api/admin/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'mala' + i }) })).status);
ok(codigos.slice(0, 5).every((c) => c === 401) && codigos[5] === 429 && codigos[6] === 429, `contraseñas malas: ${codigos.join(',')} (esperado 401×5 luego 429)`);

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
