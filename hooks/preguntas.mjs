#!/usr/bin/env node
// Preguntas por grupo: hook PreToolUse que, la primera vez en la sesión que Claude trabaja en un grupo (edita una
// prueba, corre un comando, hace un commit), le entrega las preguntas detectoras de ese grupo. Una vez por grupo y
// por sesión: después no cuesta nada. El grupo se deduce de la acción, no se le pregunta al modelo:
// - Bash: `git commit|push|merge|rebase|tag` → git-y-proceso; lo demás → consola-y-herramientas.
// - Edit/Write: por la ruta, con los patrones de .ritual/config.json (`grupos`, gana el primero que coincide).
// Entran las lecciones del núcleo, las del paquete activo (`paquetes`) y las propias del proyecto
// (.ritual/lecciones/<grupo>.md); se saltan las bajadas (`bajadas`). También guarda qué fue lo último que se tocó.
// Uso: node hooks/preguntas.mjs --probar
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { leer, leerArchivo } from "../scripts/lecciones.mjs";
import { carpetaRitual, leerEntrada, leerJson, sesion } from "./comun.mjs";

const PLUGIN = path.resolve(import.meta.dirname, "..");
export const CONFIG_POR_DEFECTO = leerJson(path.join(PLUGIN, "plantillas", "config.json"), { idioma: "es", paquetes: [], bajadas: [], grupos: {} });
const GIT = /(^|[\s;&|(])git\s+(commit|push|merge|rebase|tag|cherry-pick|revert)\b/;

/** @returns {{grupo: string | null, objetivo: string}} */
export function grupoDe(entrada, config = CONFIG_POR_DEFECTO) {
  const tool = entrada.tool_name;
  if (tool === "Bash" || tool === "PowerShell") {
    const comando = String(entrada.tool_input?.command ?? "");
    return { grupo: GIT.test(comando) ? "git-y-proceso" : "consola-y-herramientas", objetivo: comando.slice(0, 200) };
  }
  const ruta = String(entrada.tool_input?.file_path ?? entrada.tool_input?.notebook_path ?? "");
  if (!ruta) return { grupo: null, objetivo: "" };
  const base = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
  // Si la ruta queda fuera del proyecto (o la base no cuadra), se mira la ruta completa: los patrones empiezan con **/.
  const rel = path.relative(base, ruta).replace(/\\/g, "/");
  const relativa = !rel || rel.startsWith("..") || path.isAbsolute(rel) ? ruta.replace(/\\/g, "/") : rel;
  for (const [grupo, patrones] of Object.entries(config.grupos ?? {}))
    if (patrones.some((p) => path.matchesGlob(relativa, p))) return { grupo, objetivo: relativa };
  return { grupo: null, objetivo: relativa };
}

/** Las lecciones que aplican a un grupo: del plugin (núcleo y paquetes activos) y propias del proyecto. */
export function leccionesDe(grupo, config, ritual) {
  const idioma = config.idioma ?? "es";
  const { grupos, lecciones } = leer(existsSync(path.join(PLUGIN, "lecciones", idioma)) ? idioma : "es", PLUGIN);
  const propias = [];
  const dirPropias = ritual && path.join(ritual, "lecciones");
  if (dirPropias && existsSync(dirPropias))
    for (const a of readdirSync(dirPropias).filter((a) => a.endsWith(".md"))) propias.push(...leerArchivo(path.join(dirPropias, a), a.slice(0, -3)).lecciones);
  const paquetes = new Set(config.paquetes ?? []);
  const bajadas = new Set((config.bajadas ?? []).map(String));
  const aplica = (l) => {
    if (l.fusionada || bajadas.has(l.id)) return false;
    const suyos = [l.grupo, ...(l.datos.grupos ?? "").split(",").map((s) => s.trim()).filter(Boolean)];
    if (!suyos.includes(grupo)) return false;
    const dePaquete = (l.datos.paquetes ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return !dePaquete.length || dePaquete.some((p) => paquetes.has(p));
  };
  return { titulo: grupos[grupo] ?? grupo, lecciones: [...lecciones.filter(aplica), ...propias.filter(aplica)], idioma };
}

export function contexto(grupo, config, ritual) {
  const { titulo, lecciones, idioma } = leccionesDe(grupo, config, ritual);
  if (!lecciones.length) return null;
  const pregunta = (l) => (l.partes["Pregunta detectora"] ?? l.partes["Detector question"] ?? Object.values(l.partes)[2] ?? "").replace(/\s+/g, " ");
  return [
    `Ritual · ${titulo}. Before you continue, run through these detector questions for what you are about to do. If one applies, act on it and say so in one line; if none applies, just continue. Details: lecciones/${idioma}/${grupo}.md in the Ritual plugin, or .ritual/lecciones/ in this project. Reply to the user in their language.`,
    ...lecciones.map((l) => `- ${l.id} · ${pregunta(l)}`),
  ].join("\n");
}

export function probar() {
  const malos = [];
  const casos = [
    [{ tool_name: "Bash", tool_input: { command: "git commit -m x" } }, "git-y-proceso"],
    [{ tool_name: "Bash", tool_input: { command: "npm test" } }, "consola-y-herramientas"],
    [{ tool_name: "Edit", tool_input: { file_path: "C:/p/src/components/Boton.tsx" }, cwd: "C:/p" }, "interfaz-y-diseno"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/tests/boton.test.tsx" }, cwd: "C:/p" }, "practicas-y-pruebas"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/docs/guia.md" }, cwd: "C:/p" }, "escribir-y-documentar"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/scripts/cargar.mjs" }, cwd: "C:/p" }, "scripts-y-archivos"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/consultas/ventas.sql" }, cwd: "C:/p" }, "cifras-y-datos"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/src/lib/util.ts" }, cwd: "C:/p" }, null],
    // Fuera del proyecto, o con una base que no cuadra: se mira la ruta completa.
    [{ tool_name: "Write", tool_input: { file_path: "D:/otro/src/components/Boton.tsx" }, cwd: "C:/p" }, "interfaz-y-diseno"],
    [{ tool_name: "Write", tool_input: { file_path: "/tmp/x/tests/a.test.ts" }, cwd: "C:/p" }, "practicas-y-pruebas"],
  ];
  const guardado = process.env.CLAUDE_PROJECT_DIR;
  delete process.env.CLAUDE_PROJECT_DIR;
  for (const [entrada, esperado] of casos) {
    const { grupo } = grupoDe(entrada);
    if (grupo !== esperado) malos.push(`${entrada.tool_input.command ?? entrada.tool_input.file_path}: esperaba ${esperado}, dio ${grupo}`);
  }
  if (guardado) process.env.CLAUDE_PROJECT_DIR = guardado;
  const consola = contexto("consola-y-herramientas", CONFIG_POR_DEFECTO, null) ?? "";
  for (const id of ["27", "29", "44"]) if (!consola.includes(`- ${id} · `)) malos.push(`el contexto de consola no trae la ${id}`);
  if (consola.includes("- 13 · ")) malos.push("el contexto de consola trae la 13, que es de pruebas");
  const pruebas = contexto("practicas-y-pruebas", CONFIG_POR_DEFECTO, null) ?? "";
  if (!pruebas.includes("- 44 · ")) malos.push("el contexto de pruebas no trae la 44, que tiene a pruebas como grupo secundario");
  const sinWeb = contexto("interfaz-y-diseno", CONFIG_POR_DEFECTO, null) ?? "";
  const conWeb = contexto("interfaz-y-diseno", { ...CONFIG_POR_DEFECTO, paquetes: ["web"] }, null) ?? "";
  if (sinWeb.includes("- 46 · ")) malos.push("sin el paquete web, el contexto trae la 46, que es solo de web");
  if (!conWeb.includes("- 46 · ")) malos.push("con el paquete web, el contexto no trae la 46");
  if ((contexto("consola-y-herramientas", { ...CONFIG_POR_DEFECTO, bajadas: [27] }, null) ?? "").includes("- 27 · ")) malos.push("una lección bajada sigue saliendo");
  for (const m of malos) console.error(`✕ ${m}`);
  return malos.length;
}

if (import.meta.main) {
  if (process.argv.includes("--probar")) {
    const malos = probar();
    console.log(malos ? `${malos} caso(s) mal` : "✓ grupos por acción y contexto por grupo calibrados");
    process.exit(malos ? 1 : 0);
  }
  const entrada = await leerEntrada();
  const ritual = carpetaRitual(entrada);
  if (!entrada || !ritual) process.exit(0);
  const config = { ...CONFIG_POR_DEFECTO, ...leerJson(path.join(ritual, "config.json"), {}) };
  const { grupo, objetivo } = grupoDe(entrada, config);
  const s = sesion(ritual, entrada.session_id);
  s.datos.ultimo = { herramienta: entrada.tool_name, objetivo, fecha: new Date().toISOString() };
  if (grupo && !s.datos.enviados.includes(grupo)) {
    const texto = contexto(grupo, config, ritual);
    if (texto) {
      s.datos.enviados.push(grupo);
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: texto } }));
    }
  }
  s.guardar();
}
