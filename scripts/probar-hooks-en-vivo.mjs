#!/usr/bin/env node
// Prueba en vivo de los hooks: arma un proyecto temporal con .ritual/, carga el plugin desde esta carpeta y corre
// `claude -p` con una tarea que toca un componente y un comando prohibido. Después revisa con datos, no con la
// respuesta del modelo: el estado de la sesión dice si las preguntas de interfaz se mandaron, la bitácora del guardia
// dice si bloqueó `python -c`, y la transcripción dice si el contexto de verdad llegó al modelo.
// Gasta tokens (Haiku): no va en `npm test`. Uso: node scripts/probar-hooks-en-vivo.mjs
// Busca `claude` en CLAUDE_BIN, en el PATH o en la app de escritorio de Windows.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");

function encontrarClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  for (const n of ["claude", "claude.exe", "claude.cmd"]) {
    const r = spawnSync(process.platform === "win32" ? "where" : "which", [n], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0];
  }
  const paquetes = path.join(process.env.LOCALAPPDATA ?? "", "Packages");
  if (!existsSync(paquetes)) return null;
  const candidatos = [];
  for (const p of readdirSync(paquetes).filter((p) => p.startsWith("Claude_"))) {
    const base = path.join(paquetes, p, "LocalCache", "Roaming", "Claude", "claude-code");
    if (!existsSync(base)) continue;
    for (const v of readdirSync(base)) for (const h of readdirSync(path.join(base, v))) {
      const exe = path.join(base, v, h, "claude.exe");
      if (existsSync(exe)) candidatos.push({ exe, fecha: statSync(exe).mtimeMs });
    }
  }
  return candidatos.sort((a, b) => b.fecha - a.fecha)[0]?.exe ?? null;
}

const claude = encontrarClaude();
if (!claude) { console.error("No encuentro `claude`. Pon la ruta en CLAUDE_BIN."); process.exit(1); }
console.log(`claude: ${claude}`);

const proyecto = mkdtempSync(path.join(os.tmpdir(), "ritual-vivo-"));
mkdirSync(path.join(proyecto, ".ritual", "local"), { recursive: true });
cpSync(path.join(RAIZ, "plantillas", "config.json"), path.join(proyecto, ".ritual", "config.json"));
cpSync(path.join(RAIZ, "plantillas", "guardia.json"), path.join(proyecto, ".ritual", "guardia.json"));
mkdirSync(path.join(proyecto, "src", "components"), { recursive: true });
writeFileSync(path.join(proyecto, "CLAUDE.md"), "Test project. Do exactly what the prompt says, nothing else.\n");

const tarea = 'Do these two steps in order and then stop. Step 1: use the Write tool to create src/components/Hola.tsx with a React component that renders the text "Hola". Step 2: use the Bash tool to run exactly this command: python -c "print(1)". If a tool is blocked, do not retry it; just report what happened in one line.';
const r = spawnSync(claude, ["-p", tarea, "--plugin-dir", RAIZ, "--model", "haiku", "--max-turns", "8", "--allowedTools", "Write,Bash", "--output-format", "json"], { cwd: proyecto, encoding: "utf8", timeout: 300_000, env: { ...process.env, CLAUDE_PROJECT_DIR: proyecto } });
if (r.error) { console.error(`No pude correr claude: ${r.error.message}`); process.exit(1); }
let salida = {};
try { salida = JSON.parse(r.stdout); } catch { /* sin json */ }
console.log(`\nRespuesta del modelo: ${String(salida.result ?? r.stdout).trim().slice(0, 400)}\n`);
if (r.stderr?.trim()) console.log(`stderr: ${r.stderr.trim().slice(0, 600)}\n`);

const fallas = [];
const local = path.join(proyecto, ".ritual", "local");
const sesiones = existsSync(path.join(local, "sesiones")) ? readdirSync(path.join(local, "sesiones")) : [];
const estado = sesiones.length ? JSON.parse(readFileSync(path.join(local, "sesiones", sesiones[0]), "utf8")) : null;
if (!estado) fallas.push("el hook de preguntas no corrió: no hay estado de sesión en .ritual/local/sesiones/");
else if (!estado.enviados.includes("interfaz-y-diseno")) fallas.push(`el hook de preguntas corrió pero no mandó interfaz-y-diseno (mandó: ${estado.enviados.join(", ") || "nada"})`);
const guardia = path.join(local, "guardia.jsonl");
if (!existsSync(guardia) || !readFileSync(guardia, "utf8").includes('"regla":"python-c"')) fallas.push("el guardia no bloqueó `python -c` (no hay bloqueo en guardia.jsonl)");

const id = salida.session_id;
let transcripcion = null;
if (id) {
  const proyectos = path.join(os.homedir(), ".claude", "projects");
  const buscar = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { const x = buscar(p); if (x) return x; } else if (e.name === `${id}.jsonl`) return p; } return null; };
  transcripcion = existsSync(proyectos) ? buscar(proyectos) : null;
}
if (!transcripcion) fallas.push(`no encontré la transcripción de la sesión ${id ?? "(sin id)"} para comprobar que el contexto llegó`);
else if (!readFileSync(transcripcion, "utf8").includes("Ritual · ")) fallas.push("el hook mandó el contexto pero no aparece en la transcripción: no llegó al modelo");

rmSync(proyecto, { recursive: true, force: true });
for (const f of fallas) console.log(`✕ ${f}`);
console.log(fallas.length ? `${fallas.length} falla(s)` : "✓ en vivo: las preguntas llegaron al modelo, el guardia bloqueó y todo quedó anotado");
process.exit(fallas.length ? 1 : 0);
