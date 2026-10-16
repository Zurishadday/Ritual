// Prueba automática: node prueba.mjs  (arranca su propio servidor con datos temporales)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const datos = fs.mkdtempSync(path.join(os.tmpdir(), 'fisio-'));
// Una línea dañada ya guardada: no debe tumbar el arranque ni las citas nuevas
fs.writeFileSync(path.join(datos, 'citas.jsonl'), '{"id":"vieja","creada":"2020-01-01T00:00:00.000Z","nombre":"Vieja","telefono":"5512345678","correo":"a@b.co","tratamiento":"masaje","fecha":"2030-01-07","hora":"10:00","comentario":"","estado":"pendiente"}\n{esto no es json');
const PUERTO = 3917;
const base = `http://localhost:${PUERTO}`;
const entorno = { ...process.env, PORT: PUERTO, DATOS_DIR: datos, ADMIN_PASSWORD: 'secreta', LIMITE_CITAS: '100' };
const srv = spawn(process.execPath, [path.join(raiz, 'servidor.mjs')], { env: entorno, stdio: 'pipe' });
let salida = '';
srv.stdout.on('data', (d) => (salida += d));
srv.stderr.on('data', (d) => (salida += d));
await new Promise((r) => setTimeout(r, 800));

let fallos = 0;
const ok = (cond, nombre) => {
  console.log((cond ? 'OK     ' : 'FALLA  ') + nombre);
  if (!cond) fallos++;
};
const post = (url, cuerpo, extra = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...extra }, body: JSON.stringify(cuerpo) });

// Próximo lunes y sábado
const d = new Date();
const sig = (dow) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); while (x.getDay() !== dow) x.setDate(x.getDate() + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const buena = { nombre: 'Ana <b>Pérez</b>', telefono: '55 1234 5678', correo: 'ana@correo.com', tratamiento: 'rodilla', fecha: sig(1), hora: '10:00', comentario: 'Me duele al bajar escaleras' };

try {
  ok((await fetch(base + '/')).status === 200, 'portada carga');
  ok((await fetch(base + '/img/portada.svg')).status === 200, 'imagen carga');
  ok((await fetch(base + '/..%2fservidor.mjs')).status === 404, 'no se sale de la carpeta pública');
  ok((await fetch(base + '/datos/citas.jsonl')).status === 404, 'datos no son públicos');

  let r = await post('/api/citas', buena);
  ok(r.status === 201, 'cita válida se guarda');
  r = await post('/api/citas', buena);
  ok(r.status === 201, 'reenvío idéntico responde bien');
  r = await post('/api/citas', { ...buena, fecha: sig(6) });
  ok(r.status === 422 && (await r.json()).errores.fecha, 'sábado rechazado');
  r = await post('/api/citas', { ...buena, hora: '17:30' });
  ok(r.status === 422 && (await r.json()).errores.hora, 'hora que no alcanza rechazada');
  r = await post('/api/citas', { ...buena, nombre: '', correo: 'x', telefono: 'abc', tratamiento: 'otro' });
  const e = (await r.json()).errores;
  ok(r.status === 422 && e.nombre && e.correo && e.telefono && e.tratamiento, 'datos vacíos/mal escritos dan error por campo');
  r = await post('/api/citas', { ...buena, telefono: '5599999999', sitio: 'http://spam' });
  ok(r.status === 201, 'bot con campo trampa recibe "ok"');
  r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...buena, telefono: '5588888888' }) });
  ok(r.status === 200 && (await r.text()).includes('Solicitud recibida'), 'envío sin JavaScript (HTML) funciona');
  r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...buena, nombre: '' }) });
  ok(r.status === 422 && (await r.text()).includes('Revisa tu solicitud'), 'error sin JavaScript muestra página con el motivo');

  ok((await fetch(base + '/api/admin/citas')).status === 401, 'lista sin sesión → 401');

  r = await post('/api/admin/entrar', { clave: 'mala' });
  ok(r.status === 401, 'contraseña incorrecta → 401');
  for (let i = 0; i < 4; i++) await post('/api/admin/entrar', { clave: 'mala' });
  r = await post('/api/admin/entrar', { clave: 'secreta' });
  ok(r.status === 429, 'tras 5 fallos, bloqueo temporal (incluso con la clave buena)');

  // Segundo bloqueo evitado: reiniciamos el servidor para probar el acceso bueno
  srv.kill();
  await new Promise((r) => setTimeout(r, 300));
  const srv2 = spawn(process.execPath, [path.join(raiz, 'servidor.mjs')], { env: entorno, stdio: 'pipe' });
  srv.kill = () => srv2.kill();
  await new Promise((r) => setTimeout(r, 800));

  r = await post('/api/admin/entrar', { clave: 'secreta' });
  ok(r.status === 200, 'contraseña correcta entra');
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const h = { Cookie: cookie };
  r = await fetch(base + '/api/admin/citas', { headers: h });
  const lista = await r.json();
  ok(r.status === 200 && lista.citas.length === 3, 'lista con sesión (la cita vieja + 2 nuevas; la línea dañada no estorba) → ' + lista.citas.length);
  ok(lista.citas[0].creada >= lista.citas[1].creada && lista.citas.at(-1).id === 'vieja', 'más nuevas primero');
  ok(lista.citas.some((c) => c.nombre.includes('<b>')), 'el HTML del nombre se guarda como texto (se muestra con textContent)');
  ok(fs.existsSync(path.join(datos, 'citas.corruptas.log')), 'línea dañada apartada en citas.corruptas.log');

  const id = lista.citas[0].id;
  r = await fetch(base + `/api/admin/citas/${id}`, { method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'confirmada' }) });
  ok(r.status === 200, 'confirmar');
  r = await fetch(base + `/api/admin/citas/${id}`, { method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'rara' }) });
  ok(r.status === 400, 'estado inválido rechazado');
  r = await fetch(base + `/api/admin/citas/${id}`, { method: 'PATCH', headers: { ...h, 'Content-Type': 'text/plain' }, body: '{"estado":"cancelada"}' });
  ok(r.status === 415, 'cambio sin JSON rechazado (anti-CSRF)');
  r = await fetch(base + `/api/admin/citas/${id}`, { method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'cancelada' }) });
  r = await fetch(base + '/api/admin/citas?estado=cancelada', { method: 'DELETE', headers: { ...h, 'X-Requested-With': 'fisio' } });
  ok((await r.json()).borradas === 1, 'borrar todas las canceladas');
  r = await fetch(base + '/api/admin/citas', { headers: h });
  ok((await r.json()).total === 2, 'quedan 2');
  ok(fs.readFileSync(path.join(datos, 'citas.jsonl'), 'utf8').trim().split('\n').every((l) => JSON.parse(l)), 'archivo sigue siendo válido');
} finally {
  srv.kill();
  fs.rmSync(datos, { recursive: true, force: true });
}
console.log(fallos ? `\n${fallos} prueba(s) fallaron\n${salida}` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
