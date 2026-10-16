// Mide la lista del panel y un envío con 500 y con 5000 solicitudes guardadas.
// ¡Reemplaza datos/solicitudes.json con datos falsos y lo deja vacío al terminar!
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const datos = new URL('./datos/', import.meta.url);
const clave = (await readFile(new URL('clave.txt', datos), 'utf8')).trim();
const d = new Date(); do d.setDate(d.getDate() + 1); while (d.getDay() !== 4);
const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

for (const n of [500, 5000]) {
  const lista = Array.from({ length: n }, (_, i) => ({ id: 'x' + i, creada: new Date(2026, 0, 1, 0, 0, i).toISOString(), estado: i % 3 ? 'confirmada' : 'cancelada', nombre: 'Falso ' + i, telefono: '3311112222', correo: 'f@x.co', tratamiento: 'rodilla', fecha, hora: '09:00', comentario: 'c'.repeat(200) }));
  await writeFile(new URL('solicitudes.json', datos), JSON.stringify(lista));
  const hijo = spawn(process.execPath, ['servidor.mjs'], { cwd: new URL('./', import.meta.url), env: { ...process.env, PORT: '8087' } });
  let salida = ''; hijo.stdout.on('data', (x) => (salida += x));
  for (let i = 0; i < 50 && !salida.includes('Panel'); i++) await new Promise((r) => setTimeout(r, 100));
  const base = 'http://localhost:8087';
  const login = await fetch(base + '/api/admin/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }) });
  const h = { Cookie: login.headers.get('set-cookie').split(';')[0] };
  let t = performance.now();
  const r = await fetch(base + '/api/admin/citas', { headers: h }); const j = await r.json();
  const lista_ms = Math.round(performance.now() - t);
  t = performance.now();
  const p = await fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ nombre: 'Nueva', telefono: '3312345678', correo: 'a@b.co', tratamiento: 'masaje', fecha, hora: '10:00' }) });
  const envio_ms = Math.round(performance.now() - t);
  t = performance.now();
  await Promise.all(Array.from({ length: 20 }, () => fetch(base + '/gracias.html')));
  const estaticas_ms = Math.round(performance.now() - t);
  console.log(`${n} guardadas: lista del panel ${lista_ms} ms (${j.citas.length} filas, ${(JSON.stringify(j).length / 1024) | 0} KB) · envío ${envio_ms} ms (${p.status}) · 20 páginas a la vez ${estaticas_ms} ms`);
  hijo.kill();
  await new Promise((r) => setTimeout(r, 300));
}
await writeFile(new URL('solicitudes.json', datos), '[]');
process.exit(0);
