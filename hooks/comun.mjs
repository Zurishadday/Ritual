// Lo que comparten los hooks: leer la entrada, ubicar la carpeta .ritual/ del proyecto y escribir sin romper nada.
// Un hook nunca tira la herramienta: si algo falla al anotar, se calla y deja pasar.
import { appendFileSync, closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import path from "node:path";

export async function leerEntrada() {
  let crudo = "";
  for await (const parte of process.stdin) crudo += parte;
  try { return JSON.parse(crudo); } catch { return null; }
}

/** La carpeta .ritual/ del proyecto, o null si el proyecto no usa Ritual (entonces los hooks no hacen nada). */
export function carpetaRitual(entrada) {
  const base = process.env.CLAUDE_PROJECT_DIR || entrada?.cwd || process.cwd();
  const dir = path.join(base, ".ritual");
  return existsSync(dir) ? dir : null;
}

export function leerJson(ruta, porDefecto) {
  try { return JSON.parse(readFileSync(ruta, "utf8")); } catch { return porDefecto; }
}

/** Si el archivo no termina en salto (una escritura cortada), el registro nuevo empieza con uno para no pegarse a ella (WEB-1). */
function terminaAbierto(ruta) {
  let fd;
  try {
    fd = openSync(ruta, "r");
    const { size } = fstatSync(fd);
    if (!size) return false;
    const ultimo = Buffer.alloc(1);
    readSync(fd, ultimo, 0, 1, size - 1);
    return ultimo[0] !== 10;
  } catch { return false; } finally { if (fd !== undefined) closeSync(fd); }
}

export function anotarLinea(ruta, objeto) {
  try {
    mkdirSync(path.dirname(ruta), { recursive: true });
    appendFileSync(ruta, (terminaAbierto(ruta) ? "\n" : "") + JSON.stringify({ fecha: new Date().toISOString(), ...objeto }) + "\n");
  } catch { /* sin bitácora */ }
}

/** Estado de la sesión actual (qué grupos ya recibieron sus preguntas, qué fue lo último que se tocó). */
export function sesion(dir, id) {
  const ruta = path.join(dir, "local", "sesiones", `${String(id || "sin-id").replace(/[^\w-]/g, "_")}.json`);
  const datos = leerJson(ruta, { enviados: [] });
  return {
    datos,
    guardar() { try { mkdirSync(path.dirname(ruta), { recursive: true }); writeFileSync(ruta, JSON.stringify(datos)); } catch { /* sin estado */ } },
  };
}
