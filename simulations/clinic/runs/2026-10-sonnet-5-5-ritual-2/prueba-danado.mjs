// Prueba del archivo dañado: estropea datos/solicitudes.json a propósito, arranca el servidor y
// comprueba que la siguiente solicitud se guarda y que el archivo roto se conserva aparte.
// ¡Reemplaza datos/solicitudes.json! Úsala solo con datos de prueba (la dejará vacía al terminar).
import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
const datos = new URL('./datos/', import.meta.url);
const PUERTO = 8086, base = `http://localhost:${PUERTO}`;
let fallos = 0;
const ok = (c, t) => { console.log((c ? 'OK    ' : 'FALLA ') + t); if (!c) fallos++; };

await writeFile(new URL('solicitudes.json', datos), '{"roto": [ {"id":');
const hijo = spawn(process.execPath, ['servidor.mjs'], { cwd: new URL('./', import.meta.url), env: { ...process.env, PORT: String(PUERTO) } });
let salida = '', errores = '';
hijo.stdout.on('data', (d) => (salida += d));
hijo.stderr.on('data', (d) => (errores += d));
for (let i = 0; i < 50 && !salida.includes('Panel'); i++) await new Promise((r) => setTimeout(r, 100));

ok(/dañado/.test(errores), 'el servidor avisa en consola que el archivo estaba dañado');
const d = new Date(); do d.setDate(d.getDate() + 1); while (d.getDay() !== 3);
const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const r = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ nombre: 'Tras el daño', telefono: '3312345678', correo: 'a@b.co', tratamiento: 'masaje', fecha, hora: '12:00' }) });
ok(r.status === 201, 'la siguiente solicitud se acepta (201)');
const guardado = JSON.parse(await readFile(new URL('solicitudes.json', datos), 'utf8'));
ok(guardado.length === 1 && guardado[0].nombre === 'Tras el daño', 'y queda guardada en un archivo nuevo y válido');
const apartados = (await readdir(datos)).filter((f) => f.startsWith('solicitudes.danado-'));
ok(apartados.length === 1 && (await readFile(new URL(apartados[0], datos), 'utf8')).startsWith('{"roto"'), 'el archivo roto se conserva aparte, sin perder su contenido');

hijo.kill();
for (const f of apartados) await rm(new URL(f, datos));
await writeFile(new URL('solicitudes.json', datos), '[]');
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
