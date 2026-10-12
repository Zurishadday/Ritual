#!/usr/bin/env node
// Resumen para el ritual: junta en pocas líneas lo que los hooks anotaron desde el último ritual (comandos con
// error, correcciones, bloqueos del guardia), los candidatos abiertos y los grupos tocados en las últimas sesiones.
// Así el ritual lee datos ya ordenados en lugar de JSON crudo.
// Uso: node scripts/resumen.mjs [proyecto]        el resumen completo
//      node scripts/resumen.mjs --grupos          solo los grupos tocados (para /ritual cierre)
//      node scripts/resumen.mjs --marcar          anota la fecha de este ritual
//      node scripts/resumen.mjs --probar
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { anotarLinea } from "../hooks/comun.mjs";

/** Los registros legibles, y en `rotas` cuántas líneas no se pudieron leer: se dicen, no se saltan en silencio (WEB-1). */
const leerJsonl = (ruta) => {
  const todas = existsSync(ruta) ? readFileSync(ruta, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }) : [];
  return Object.assign(todas.filter(Boolean), { rotas: todas.filter((x) => !x).length });
};
const corto = (s, n = 110) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function resumen(proyecto, { ahora = new Date() } = {}) {
  const dir = path.join(proyecto, ".ritual");
  if (!existsSync(dir)) return "No .ritual/ folder: run /ritual to set Ritual up first.";
  const local = path.join(dir, "local");
  const marca = path.join(local, "ultimo-ritual.txt");
  const desde = existsSync(marca) ? readFileSync(marca, "utf8").trim() : null;
  const reciente = (x) => !desde || x.fecha > desde;
  const lineas = [`Ritual · summary since ${desde ? desde.slice(0, 16).replace("T", " ") : "the beginning"} (now ${ahora.toISOString().slice(0, 16).replace("T", " ")})`];

  const leida = leerJsonl(path.join(local, "bitacora.jsonl"));
  const bitacora = leida.filter(reciente);
  const comandos = bitacora.filter((x) => x.tipo === "comando"), correcciones = bitacora.filter((x) => x.tipo === "correccion");
  lineas.push("", `Log: ${comandos.length} failed command(s), ${correcciones.length} correction(s)${leida.rotas ? ` · ${leida.rotas} unreadable line(s) skipped` : ""}`);
  for (const x of comandos.slice(-15)) lineas.push(`  ${x.fecha.slice(5, 16).replace("T", " ")} cmd  ${corto(x.comando, 80)}  →  ${corto(x.error, 90)}`);
  for (const x of correcciones.slice(-15)) lineas.push(`  ${x.fecha.slice(5, 16).replace("T", " ")} fix  «${corto(x.frase, 90)}»${x.ultimo ? `  while ${x.ultimo.herramienta} ${corto(x.ultimo.objetivo, 60)}` : ""}`);
  if (bitacora.length > 30) lineas.push(`  … ${bitacora.length - 30} more in .ritual/local/bitacora.jsonl`);

  const bloqueos = leerJsonl(path.join(local, "guardia.jsonl")).filter(reciente);
  const porRegla = {};
  for (const b of bloqueos) porRegla[b.regla] = (porRegla[b.regla] ?? 0) + 1;
  lineas.push("", `Guard: ${bloqueos.length} block(s)${bloqueos.length ? " · " + Object.entries(porRegla).map(([r, n]) => `${r} ×${n}`).join(", ") : ""}${bloqueos.length ? " (details: hooks/guardia.mjs --bitacora)" : ""}`);

  const sesiones = existsSync(path.join(local, "sesiones")) ? readdirSync(path.join(local, "sesiones")).map((a) => { try { return JSON.parse(readFileSync(path.join(local, "sesiones", a), "utf8")); } catch { return null; } }).filter(Boolean) : [];
  const recientes = sesiones.filter((s) => !desde || (s.ultimo?.fecha ?? "") > desde);
  const porGrupo = {};
  for (const s of recientes) for (const g of s.enviados ?? []) porGrupo[g] = (porGrupo[g] ?? 0) + 1;
  lineas.push("", `Groups touched in ${recientes.length} session(s): ${Object.entries(porGrupo).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} (${n})`).join(", ") || "none recorded"}`);

  const candidatos = path.join(dir, "candidatos.md");
  const filas = existsSync(candidatos) ? readFileSync(candidatos, "utf8").split("\n").filter((l) => /^\|\s*\S/.test(l) && !/^\|\s*#\s*\||^\|\s*-+/.test(l)) : [];
  const abiertos = filas.filter((l) => /\|\s*abierto\s*\|/i.test(l));
  lineas.push("", `Candidates: ${abiertos.length} open of ${filas.length}`);
  for (const l of abiertos.slice(0, 10)) lineas.push(`  ${corto(l, 140)}`);
  return lineas.join("\n");
}

export function grupos(proyecto) {
  const dir = path.join(proyecto, ".ritual", "local", "sesiones");
  const todos = existsSync(dir) ? readdirSync(dir).map((a) => { try { return JSON.parse(readFileSync(path.join(dir, a), "utf8")); } catch { return null; } }).filter(Boolean) : [];
  const ultima = todos.sort((a, b) => (b.ultimo?.fecha ?? "").localeCompare(a.ultimo?.fecha ?? ""))[0];
  return ultima?.enviados ?? [];
}

export function probar() {
  const malos = [];
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ritual-resumen-"));
  try {
    if (!resumen(tmp).includes("No .ritual/")) malos.push("sin .ritual/ debía decirlo");
    const local = path.join(tmp, ".ritual", "local", "sesiones");
    mkdirSync(local, { recursive: true });
    writeFileSync(path.join(tmp, ".ritual", "local", "bitacora.jsonl"), [
      JSON.stringify({ fecha: "2026-10-01T10:00:00Z", tipo: "comando", comando: "npm test", error: "Exit code 1\nviejo" }),
      JSON.stringify({ fecha: "2026-10-12T10:00:00Z", tipo: "comando", comando: "npm run build", error: "Exit code 2\nType error" }),
      JSON.stringify({ fecha: "2026-10-12T10:05:00Z", tipo: "correccion", frase: "eso está mal", ultimo: { herramienta: "Edit", objetivo: "src/a.tsx" } }),
      "{\"fecha\":\"2026-10-12T10:06:00Z\",\"tipo\":\"coman", // escritura cortada, sin salto: lo que deja una caída
    ].join("\n"));
    // WEB-1: lo que un hook anota después de la línea cortada no debe pegarse a ella.
    anotarLinea(path.join(tmp, ".ritual", "local", "bitacora.jsonl"), { tipo: "comando", comando: "npm run lint", error: "Exit code 1\ndespués del corte" });
    writeFileSync(path.join(tmp, ".ritual", "local", "guardia.jsonl"), JSON.stringify({ fecha: "2026-10-12T10:01:00Z", regla: "python-c", comando: "python -c 1" }) + "\n");
    writeFileSync(path.join(local, "a.json"), JSON.stringify({ enviados: ["interfaz-y-diseno", "consola-y-herramientas"], ultimo: { fecha: "2026-10-12T10:05:00Z" } }));
    writeFileSync(path.join(tmp, ".ritual", "candidatos.md"), "# Candidatos\n\n| # | Qué | Lección | Estado | Fecha |\n|---|---|---|---|---|\n| 1 | probar x | 13 | abierto | 2026-10-02 |\n| 2 | probar y | 21 | hecho | 2026-10-03 |\n");
    writeFileSync(path.join(tmp, ".ritual", "local", "ultimo-ritual.txt"), "2026-10-05T00:00:00Z");
    const r = resumen(tmp);
    for (const esperado of ["2 failed command(s), 1 correction(s)", "después del corte", "1 unreadable line(s) skipped", "npm run build", "Type error", "«eso está mal»", "while Edit src/a.tsx", "1 block(s) · python-c ×1", "interfaz-y-diseno (1)", "1 open of 2", "probar x"])
      if (!r.includes(esperado)) malos.push(`el resumen no dice «${esperado}»`);
    if (r.includes("viejo")) malos.push("el resumen trae un error anterior al último ritual");
    if (r.includes("probar y")) malos.push("el resumen lista un candidato que ya está hecho");
    if (grupos(tmp).join() !== "interfaz-y-diseno,consola-y-herramientas") malos.push(`--grupos dio ${grupos(tmp).join()}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of malos) console.error(`✕ ${m}`);
  return malos.length;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--probar")) {
    const malos = probar();
    console.log(malos ? `${malos} caso(s) mal` : "✓ resumen: filtra por fecha, cuenta las líneas rotas sin perder la siguiente y lista solo lo abierto");
    process.exit(malos ? 1 : 0);
  }
  const proyecto = path.resolve(args.find((a) => !a.startsWith("--")) ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  if (args.includes("--marcar")) {
    mkdirSync(path.join(proyecto, ".ritual", "local"), { recursive: true });
    writeFileSync(path.join(proyecto, ".ritual", "local", "ultimo-ritual.txt"), new Date().toISOString());
    console.log("✓ ritual date recorded");
    process.exit(0);
  }
  if (args.includes("--grupos")) { console.log(grupos(proyecto).join(", ") || "none recorded"); process.exit(0); }
  console.log(resumen(proyecto));
}
