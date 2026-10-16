// Archivos de datos dañados: una solicitud o línea mala no debe tumbar la siguiente ni perder las buenas.
// Usa carpetas temporales: no toca datos/ (las solicitudes reales).
import { readdir, readFile } from 'node:fs/promises';
import { arrancar, verificador, entrar, buena, enviar } from './ayuda-prueba.mjs';
const { ok, fin } = verificador();
const reg = (n, extra = {}) => ({ id: 'id-' + n, creada: `2026-01-0${n}T10:00:00.000Z`, estado: 'pendiente', nombre: 'Guardada ' + n, telefono: '3311112222', correo: 'a@b.co', tratamiento: 'rodilla', fecha: '2030-01-07', hora: '09:00', comentario: '', ...extra });
const jl = (...xs) => xs.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)) + '\n').join('');

const casos = [
  ['[null] (formato anterior)', { 'solicitudes.json': '[null]' }, 0, true],
  ['lista con una buena y basura', { 'solicitudes.json': JSON.stringify([reg(1), null, 5, { estado: 'x' }, 'hola']) }, 1, true],
  ['líneas: una buena, "null", {} y una mala', { 'solicitudes.jsonl': jl(reg(1), 'null', '{}', '{"roto": [ {"id":', reg(2)) }, 2, true],
  ['última línea cortada', { 'solicitudes.jsonl': jl(reg(1), reg(2)) + '{"id":"id-3","cre' }, 2, true],
  ['archivo vacío', { 'solicitudes.jsonl': '' }, 0, false],
  ['JSON truncado (formato anterior)', { 'solicitudes.json': '{"roto": [ {"id":' }, 0, true],
  ['sin salto de línea final pero válido', { 'solicitudes.jsonl': JSON.stringify(reg(1)) }, 1, false],
  ['formato anterior bueno', { 'solicitudes.json': JSON.stringify([reg(1), reg(2)]) }, 2, false],
];
for (const [nombre, archivos, buenas, avisa] of casos) {
  const srv = await arrancar({ archivos });
  const h = await entrar(srv.base);
  ok(avisa === /dañados/.test(srv.errores()), `${nombre}: ${avisa ? 'avisa en consola del daño' : 'sin falsa alarma'}`);
  const antes = (await (await fetch(srv.base + '/api/admin/citas', { headers: h })).json()).total;
  ok(antes === buenas, `${nombre}: conserva las ${buenas} buenas (hay ${antes})`);
  const r1 = await enviar(srv.base, buena({ nombre: 'Visitante 1', telefono: '33 2000 0001' }));
  const r2 = await enviar(srv.base, buena({ nombre: 'Visitante 2', telefono: '33 2000 0002' }));
  ok(r1.status === 201 && r2.status === 201, `${nombre}: las dos visitas siguientes se guardan (${r1.status}, ${r2.status})`);
  const j = await (await fetch(srv.base + '/api/admin/citas', { headers: h })).json();
  ok(j.total === buenas + 2 && j.citas[0].nombre === 'Visitante 2', `${nombre}: total ${j.total}, la más nueva primero`);
  if (avisa) ok((await readdir(srv.dir)).some((f) => f.startsWith('solicitudes.danado-')), `${nombre}: se conserva una copia del original`);
  const otra = await arrancar({ archivos: { 'solicitudes.jsonl': await readFile(srv.dir + '/solicitudes.jsonl', 'utf8') } });
  ok(!/dañados/.test(otra.errores()), `${nombre}: el archivo que queda es sano al reiniciar`);
  await otra.parar();
  await srv.parar();
}
fin();
