// Lo que comparten los hooks: leer la entrada, ubicar la carpeta .ritual/ del proyecto y escribir sin romper nada.
// Un hook nunca tira la herramienta: si algo falla al anotar, se calla y deja pasar.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export function anotarLinea(ruta, objeto) {
  try {
    mkdirSync(path.dirname(ruta), { recursive: true });
    appendFileSync(ruta, JSON.stringify({ fecha: new Date().toISOString(), ...objeto }) + "\n");
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
