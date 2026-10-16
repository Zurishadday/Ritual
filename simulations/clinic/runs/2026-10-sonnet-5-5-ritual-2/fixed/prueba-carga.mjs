// Mide con 500, 5000 y 50000 solicitudes guardadas: página del panel, un envío, un cambio de estado.
// Usa una carpeta temporal con datos falsos: no toca datos/.
import { arrancar, entrar, fechaDe } from './ayuda-prueba.mjs';
const fecha = fechaDe(4);

for (const n of [500, 5000, 50000]) {
  const filas = Array.from({ length: n }, (_, i) => JSON.stringify({ id: 'x' + i, creada: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(), estado: i % 3 ? 'confirmada' : 'cancelada', nombre: 'Falso ' + i, telefono: '33' + String(10000000 + i), correo: 'f@x.co', tratamiento: 'rodilla', fecha, hora: '09:00', comentario: 'c'.repeat(200) }) + '\n');
  const srv = await arrancar({ archivos: { 'solicitudes.jsonl': filas.join('') } });
  const h = await entrar(srv.base);
  const medir = async (f) => { const t = performance.now(); const r = await f(); return [Math.round(performance.now() - t), r]; };
  const [lista_ms, r] = await medir(() => fetch(srv.base + '/api/admin/citas', { headers: h }));
  const j = await r.json();
  const [envio_ms, p] = await medir(() => fetch(srv.base + '/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ nombre: 'Nueva', telefono: '3312345678', correo: 'a@b.co', tratamiento: 'masaje', fecha, hora: '10:00' }) }));
  const [estado_ms] = await medir(() => fetch(srv.base + '/api/admin/citas/x1', { method: 'PATCH', headers: h, body: JSON.stringify({ estado: 'pendiente' }) }));
  const [busca_ms] = await medir(() => fetch(srv.base + '/api/admin/citas?q=falso%2049999&estado=confirmada', { headers: h }));
  console.log(`${n} guardadas: página del panel ${lista_ms} ms (${j.citas.length} filas, ${(JSON.stringify(j).length / 1024) | 0} KB) · envío ${envio_ms} ms (${p.status}) · cambio de estado ${estado_ms} ms · búsqueda ${busca_ms} ms`);
  await srv.parar();
}
process.exit(0);
