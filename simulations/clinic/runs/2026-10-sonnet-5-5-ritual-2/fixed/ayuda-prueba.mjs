// Ayuda común de las pruebas. Cada prueba arranca SU PROPIO servidor con una carpeta de datos temporal
// (DATOS_DIR), así que nunca toca datos/solicitudes.jsonl ni la contraseña reales.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const CLAVE = 'clave-de-prueba';

export function fechaDe(dow, extraDias = 0) {
  const d = new Date(); do d.setDate(d.getDate() + 1); while (d.getDay() !== dow);
  d.setDate(d.getDate() + extraDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// archivos: { 'solicitudes.jsonl': '...' } que se escriben en la carpeta temporal antes de arrancar.
export async function arrancar({ archivos = {}, env = {} } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'fisio-prueba-'));
  for (const [n, c] of Object.entries(archivos)) await writeFile(path.join(dir, n), c);
  const hijo = spawn(process.execPath, ['servidor.mjs'], {
    cwd: new URL('./', import.meta.url),
    env: { ...process.env, PORT: '0', DATOS_DIR: dir, CLAVE_ADMIN: CLAVE, ...env },
  });
  let salida = '', errores = '';
  hijo.stdout.on('data', (d) => (salida += d));
  hijo.stderr.on('data', (d) => (errores += d));
  for (let i = 0; i < 100 && !/localhost:\d+/.test(salida); i++) await new Promise((r) => setTimeout(r, 100));
  const puerto = /localhost:(\d+)/.exec(salida)?.[1];
  if (!puerto) { hijo.kill(); throw new Error('el servidor no arrancó: ' + errores); }
  return {
    base: `http://localhost:${puerto}`, dir, errores: () => errores,
    async parar() { hijo.kill(); await new Promise((r) => setTimeout(r, 200)); await rm(dir, { recursive: true, force: true }); },
  };
}

export function verificador() {
  let fallos = 0;
  return {
    ok(c, t) { console.log((c ? 'OK    ' : 'FALLA ') + t); if (!c) fallos++; },
    fin() { console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien'); process.exit(fallos ? 1 : 0); },
  };
}

export async function entrar(base) {
  const r = await fetch(base + '/api/admin/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: CLAVE }) });
  return { 'Content-Type': 'application/json', Cookie: r.headers.get('set-cookie').split(';')[0] };
}

export const buena = (extra = {}) => ({ nombre: 'Prueba Uno', telefono: '33 1111 2222', correo: 'prueba@ejemplo.com', tratamiento: 'espalda', fecha: fechaDe(2), hora: '10:30', comentario: '<b>hola</b>', ...extra });
export const enviar = (base, cuerpo, extra = {}) => fetch(base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...extra }, body: JSON.stringify(cuerpo) });
