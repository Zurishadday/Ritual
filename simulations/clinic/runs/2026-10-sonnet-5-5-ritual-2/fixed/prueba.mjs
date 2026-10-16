// Prueba de humo: `node prueba.mjs`. Arranca su propio servidor con datos temporales (no toca datos/).
import { readFile } from 'node:fs/promises';
import { arrancar, verificador, entrar, buena, enviar, fechaDe } from './ayuda-prueba.mjs';
const { ok, fin } = verificador();
const srv = await arrancar();
const base = srv.base;
const h = await entrar(base);
const lista = async (q = '') => (await fetch(base + '/api/admin/citas' + q, { headers: h })).json();

for (const p of ['/', '/admin', '/estilo.css', '/app.js', '/admin.js', '/img/portada.svg', '/gracias.html']) ok((await fetch(base + p)).status === 200, `GET ${p}`);
ok((await fetch(base + '/..%2fservidor.mjs')).status !== 200, 'no se sale de la carpeta pública');
ok((await fetch(base + '/datos/solicitudes.jsonl')).status === 404, 'datos no se sirven');
ok((await fetch(base + '/api/admin/citas')).status === 401, 'lista sin sesión → 401');

// Páginas: sin manejadores ni scripts/estilos en línea (la CSP los bloquearía) y con los datos de ejemplo marcados
for (const p of ['/', '/admin', '/gracias.html']) {
  const t = await (await fetch(base + p)).text();
  ok(!/\son[a-z]+\s*=|<script(?![^>]*\ssrc=)|\sstyle\s*=/i.test(t), `${p}: nada en línea que la CSP bloquee`);
}
const inicio = await (await fetch(base + '/')).text();
ok(/ejemplo/i.test(inicio) && /reemplaza/i.test(inicio), 'portada: dirección/teléfono/precios marcados como ejemplo');

let r = await enviar(base, buena()); ok(r.status === 201, 'solicitud válida → 201');
r = await enviar(base, buena()); ok(r.status === 201, 'doble envío idéntico no da error');
r = await enviar(base, buena({ fecha: fechaDe(6) })); let j = await r.json(); ok(r.status === 400 && j.errores[0].campo === 'fecha', 'sábado → 400 con error en fecha');
r = await enviar(base, { ...buena(), sitio_web: 'http://spam' }); ok(r.status === 201, 'trampa de bots responde éxito falso');

// Sin JavaScript: éxito y error, en el formato que ve la persona (HTML), con CSP respetada
const formulario = (cuerpo) => fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(cuerpo), redirect: 'manual' });
r = await formulario(buena({ nombre: 'Sin JS', telefono: '33 4444 5555', hora: '09:00' }));
ok(r.status === 303 && r.headers.get('location') === '/gracias.html', 'envío sin JS → redirige a gracias');
r = await formulario(buena({ nombre: 'María "Q" <b>', telefono: '33 9999 0000', comentario: 'me duele <la> rodilla', correo: 'malo', fecha: fechaDe(6) }));
let t = await r.text();
ok(r.status === 400 && /text\/html/.test(r.headers.get('content-type')), 'error sin JS → página HTML 400');
ok(!/\son[a-z]+\s*=|<script/i.test(t) && /default-src 'self'/.test(r.headers.get('content-security-policy')), 'página de error sin manejadores en línea (la CSP no bloquea nada)');
ok(t.includes('value="María &quot;Q&quot; &lt;b&gt;"') && t.includes('me duele &lt;la&gt; rodilla') && t.includes('value="malo"') && t.includes('value="33 9999 0000"'), 'la página de error conserva y escapa lo escrito (nombre, comentario, correo, teléfono)');
ok(t.includes('<form action="/api/citas"') && /id="error-correo"/.test(t) && /id="error-fecha"/.test(t), 'la página de error trae el formulario con el aviso junto a cada campo');
ok(t.includes(`<option value="espalda" selected>`) && t.includes('<option value="10:30" selected>'), 'conserva tratamiento y hora elegidos');

// Pacientes distintos desde la misma dirección (proxy / Wi-Fi compartida) no se frenan entre sí
const cods = [];
for (let i = 0; i < 12; i++) cods.push((await enviar(base, buena({ nombre: 'Paciente ' + i, telefono: '33 70' + String(i).padStart(2, '0') + ' 0000', correo: `p${i}@x.co` }))).status);
ok(cods.every((c) => c === 201), `12 pacientes distintos desde una misma dirección: ${cods.join()}`);
r = await enviar(base, buena({ nombre: 'Otro', telefono: '33 1111 2222', hora: '11:00' }));
ok(r.status === 201, 'misma persona, otra hora: se acepta');
r = await enviar(base, buena({ nombre: 'Otro', telefono: '33 1111 2222', hora: '12:00' })); await enviar(base, buena({ hora: '13:00' }));
r = await enviar(base, buena({ hora: '14:00' })); j = await r.json();
ok(r.status === 400 && j.errores[0].campo === 'telefono', 'un mismo teléfono no acumula más de 3 pendientes');
// Con TRUST_PROXY la dirección es la del cliente real, no la del proxy
const srvP = await arrancar({ env: { TRUST_PROXY: '1' } });
const cp = [];
for (let i = 0; i < 70; i++) cp.push((await enviar(srvP.base, buena({ telefono: '33 80' + String(i).padStart(2, '0') + ' 0000' }), { 'X-Forwarded-For': '9.9.9.9' })).status);
const otro = (await enviar(srvP.base, buena({ telefono: '33 8999 0000' }), { 'X-Forwarded-For': '8.8.8.8' })).status;
ok(cp.filter((c) => c === 429).length > 0 && otro === 201, `TRUST_PROXY: un cliente abusivo se frena (${cp.filter((c) => c === 429).length} bloqueados) y otro cliente real sigue entrando (${otro})`);
await srvP.parar();

// Panel: orden, paginación, filtros, estados
j = await lista('?pagina=1');
ok(j.citas.every((c, i, a) => !i || a[i - 1].creada >= c.creada), 'orden: más nuevas primero');
ok(j.cuentas.todas === j.total && j.citas.length === Math.min(50, j.total), `lista paginada (${j.citas.length} de ${j.total})`);
const id = j.citas.find((c) => c.nombre === 'Sin JS').id;
r = await fetch(base + '/api/admin/citas/' + id, { method: 'PATCH', headers: h, body: JSON.stringify({ estado: 'confirmada' }) });
ok((await r.json()).cita?.estado === 'confirmada', 'marcar confirmada');
ok((await lista('?estado=confirmada')).total === 1 && (await lista('?q=sin%20js')).total === 1, 'filtros por estado y búsqueda');
r = await fetch(base + '/api/admin/citas/' + id, { method: 'PATCH', headers: h, body: JSON.stringify({ estado: 'raro' }) });
ok(r.status === 400, 'estado inválido → 400');

// Muchas solicitudes de bots: la gente real sigue entrando y la dueña puede limpiar de una vez
const bots = await arrancar({ env: { TRUST_PROXY: '1' } }); // cada bot llega con una dirección distinta, como en el ataque real
const hb = await entrar(bots.base);
await Promise.all(Array.from({ length: 520 }, (_, i) => enviar(bots.base, buena({ nombre: 'Bot ' + i, telefono: '55 ' + String(10000000 + i), correo: `b${i}@spam.co` }), { 'X-Forwarded-For': `10.0.${i >> 8}.${i & 255}` })));
const botsTotal = (await (await fetch(bots.base + '/api/admin/citas?q=bot', { headers: hb })).json()).total;
ok(botsTotal === 520, `520 solicitudes de bots guardadas, ninguna rechazada por tope (${botsTotal})`);
r = await enviar(bots.base, buena({ nombre: 'Paciente real', telefono: '33 5555 0001' }));
ok(r.status === 201, 'tras 520 bots, una paciente real se acepta (no hay 503)');
ok((await fetch(bots.base + '/api/admin/citas', { method: 'DELETE', headers: hb })).status === 400, 'DELETE sin estado → 400 (no borra por accidente)');
r = await fetch(bots.base + '/api/admin/citas?estado=todas&q=bot', { method: 'DELETE', headers: hb });
ok((await r.json()).eliminadas === 520, 'borrado en bloque de las 520 de un golpe, por búsqueda');
const resto = await (await fetch(bots.base + '/api/admin/citas', { headers: hb })).json();
ok(resto.total === 1 && resto.citas[0].nombre === 'Paciente real', 'solo queda la paciente real');
await bots.parar();

// Eliminar una y que persista tras reiniciar
r = await fetch(base + '/api/admin/citas/' + id, { method: 'DELETE', headers: h });
ok(r.status === 200 && (await fetch(base + '/api/admin/citas/' + id, { method: 'DELETE', headers: h })).status === 404, 'eliminar una solicitud');
const antes = (await lista()).total;
const texto = await readFile(srv.dir + '/solicitudes.jsonl', 'utf8');
const otroSrv = await arrancar({ archivos: { 'solicitudes.jsonl': texto } });
const despues = (await (await fetch(otroSrv.base + '/api/admin/citas', { headers: await entrar(otroSrv.base) })).json()).total;
ok(antes === despues, `los datos sobreviven a un reinicio (${antes} = ${despues})`);
await otroSrv.parar();

// Límite de intentos (al final: bloquea el login ~1 min)
const codigos = [];
for (let i = 0; i < 7; i++) codigos.push((await fetch(base + '/api/admin/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'mala' + i }) })).status);
ok(codigos.slice(0, 5).every((c) => c === 401) && codigos[5] === 429 && codigos[6] === 429, `contraseñas malas: ${codigos.join(',')} (esperado 401×5 luego 429)`);

await srv.parar();
fin();
