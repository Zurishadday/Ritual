#!/usr/bin/env node
// Arranque de Ritual en un proyecto: crea .ritual/ (config, reglas del guardia, carpeta de lecciones propias,
// candidatos), agrega .ritual/local/ al .gitignore y una sección corta a CLAUDE.md. Correrlo dos veces no cambia nada.
// Uso: node scripts/iniciar.mjs --detectar [proyecto]                 dice qué paquetes ve en las dependencias
//      node scripts/iniciar.mjs --paquetes web,apps --idioma es [proyecto]
//      node scripts/iniciar.mjs --probar
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PLUGIN = path.resolve(import.meta.dirname, "..");
const PAQUETES = {
  web: ["react", "next", "vue", "nuxt", "svelte", "@sveltejs/kit", "astro", "@angular/core", "tailwindcss", "vite", "streamlit", "django", "flask"],
  apps: ["express", "fastify", "@nestjs/core", "hono", "prisma", "@prisma/client", "drizzle-orm", "next-auth", "@auth/core", "stripe", "@supabase/supabase-js", "firebase", "fastapi", "django", "sqlalchemy"],
  crm: ["@hubspot/api-client", "hubspot", "jsforce", "simple-salesforce", "twilio", "@sendgrid/mail", "mailchimp-marketing"],
  ia: ["openai", "@anthropic-ai/sdk", "anthropic", "langchain", "@langchain/core", "llamaindex", "llama-index", "ai", "@ai-sdk/openai", "transformers", "ollama"],
};
const MARCA_INICIO = "<!-- ritual:inicio -->", MARCA_FIN = "<!-- ritual:fin -->";
const SECCION = {
  es: `## Ritual\n\n${MARCA_INICIO}\nLas lecciones de este proyecto viven en \`.ritual/lecciones/\`; las del núcleo, en el plugin Ritual. Sus hooks bloquean lo que ya falló, anotan errores y correcciones en \`.ritual/local/\` y muestran las preguntas de cada grupo una vez por sesión. Corre \`/ritual\` al cerrar una sesión o después de un error doloroso, y \`/ritual cierre\` antes de dar algo por terminado.\n\nReglas que este proyecto ya rompió más de una vez y no se pudieron automatizar:\n\n- (ninguna todavía)\n${MARCA_FIN}\n`,
  en: `## Ritual\n\n${MARCA_INICIO}\nThis project's lessons live in \`.ritual/lecciones/\`; the core ones, in the Ritual plugin. Its hooks block what already failed, log errors and corrections in \`.ritual/local/\`, and show each group's questions once per session. Run \`/ritual\` when closing a session or after a painful bug, and \`/ritual cierre\` before calling something done.\n\nRules this project broke more than once and could not automate:\n\n- (none yet)\n${MARCA_FIN}\n`,
};

function dependencias(proyecto) {
  const nombres = new Set();
  const pkg = path.join(proyecto, "package.json");
  if (existsSync(pkg)) {
    try { const p = JSON.parse(readFileSync(pkg, "utf8")); for (const k of ["dependencies", "devDependencies"]) for (const d of Object.keys(p[k] ?? {})) nombres.add(d.toLowerCase()); } catch { /* package.json roto: sin dependencias */ }
  }
  for (const a of ["requirements.txt", "pyproject.toml", "Pipfile"]) {
    const r = path.join(proyecto, a);
    if (existsSync(r)) for (const m of readFileSync(r, "utf8").matchAll(/^\s*"?([A-Za-z][\w.-]*)/gm)) nombres.add(m[1].toLowerCase());
  }
  return nombres;
}

export function detectar(proyecto) {
  const deps = dependencias(proyecto);
  const paquetes = Object.entries(PAQUETES).filter(([, ds]) => ds.some((d) => deps.has(d))).map(([p]) => p);
  const claude = path.join(proyecto, "CLAUDE.md");
  const texto = existsSync(claude) ? readFileSync(claude, "utf8") : "";
  const idioma = /\b(que|para|con|archivo|proyecto|siempre)\b/i.test(texto) && !/\b(the|with|always|project)\b/i.test(texto.slice(0, 400)) ? "es" : texto ? "en" : "es";
  return { paquetes, idioma, dependencias: deps.size };
}

export function iniciar(proyecto, { paquetes = [], idioma = "es" } = {}) {
  const hechos = [];
  const dir = path.join(proyecto, ".ritual");
  mkdirSync(path.join(dir, "lecciones"), { recursive: true });
  mkdirSync(path.join(dir, "local"), { recursive: true });
  const config = path.join(dir, "config.json");
  const base = existsSync(config) ? JSON.parse(readFileSync(config, "utf8")) : JSON.parse(readFileSync(path.join(PLUGIN, "plantillas", "config.json"), "utf8"));
  const nuevo = { ...base, idioma, paquetes: [...new Set([...(base.paquetes ?? []), ...paquetes])] };
  const textoConfig = JSON.stringify(nuevo, null, 2) + "\n";
  if (textoConfig !== (existsSync(config) ? readFileSync(config, "utf8") : "")) { writeFileSync(config, textoConfig); hechos.push(".ritual/config.json"); }
  if (!existsSync(path.join(dir, "guardia.json"))) { cpSync(path.join(PLUGIN, "plantillas", "guardia.json"), path.join(dir, "guardia.json")); hechos.push(".ritual/guardia.json"); }
  if (!existsSync(path.join(dir, "candidatos.md"))) { cpSync(path.join(PLUGIN, "plantillas", "candidatos.md"), path.join(dir, "candidatos.md")); hechos.push(".ritual/candidatos.md"); }
  if (!existsSync(path.join(dir, "lecciones", ".gitkeep"))) { writeFileSync(path.join(dir, "lecciones", ".gitkeep"), ""); hechos.push(".ritual/lecciones/"); }
  const gitignore = path.join(proyecto, ".gitignore");
  const ignorado = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
  if (!/^\.ritual\/local\/?\s*$/m.test(ignorado)) { appendFileSync(gitignore, `${ignorado && !ignorado.endsWith("\n") ? "\n" : ""}# Ritual: bitácora y estado de sesión, solo local\n.ritual/local/\n`); hechos.push(".gitignore"); }
  const claude = path.join(proyecto, "CLAUDE.md");
  const texto = existsSync(claude) ? readFileSync(claude, "utf8") : "";
  if (!texto.includes(MARCA_INICIO)) { appendFileSync(claude, `${texto && !texto.endsWith("\n") ? "\n" : ""}${texto ? "\n" : ""}${SECCION[idioma] ?? SECCION.en}`); hechos.push("CLAUDE.md"); }
  return hechos;
}

export function probar() {
  const malos = [];
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ritual-iniciar-"));
  try {
    writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: { next: "15", stripe: "17" } }));
    writeFileSync(path.join(tmp, "CLAUDE.md"), "# Mi proyecto\n\nResponde siempre en español.\n");
    const d = detectar(tmp);
    if (d.paquetes.join() !== "web,apps") malos.push(`detectar: esperaba web,apps y dio ${d.paquetes.join() || "nada"}`);
    if (d.idioma !== "es") malos.push(`detectar: esperaba idioma es y dio ${d.idioma}`);
    const primera = iniciar(tmp, { paquetes: d.paquetes, idioma: d.idioma });
    for (const h of [".ritual/config.json", ".ritual/guardia.json", ".ritual/candidatos.md", ".gitignore", "CLAUDE.md"]) if (!primera.includes(h)) malos.push(`la primera corrida no creó ${h}`);
    const config = JSON.parse(readFileSync(path.join(tmp, ".ritual", "config.json"), "utf8"));
    if (config.paquetes.join() !== "web,apps" || config.idioma !== "es") malos.push("config.json no trae los paquetes y el idioma");
    const antes = { gitignore: readFileSync(path.join(tmp, ".gitignore"), "utf8"), claude: readFileSync(path.join(tmp, "CLAUDE.md"), "utf8") };
    if (!antes.claude.startsWith("# Mi proyecto")) malos.push("CLAUDE.md perdió lo que ya tenía");
    const segunda = iniciar(tmp, { paquetes: d.paquetes, idioma: d.idioma });
    if (segunda.length) malos.push(`la segunda corrida cambió: ${segunda.join(", ")}`);
    if (readFileSync(path.join(tmp, ".gitignore"), "utf8") !== antes.gitignore || readFileSync(path.join(tmp, "CLAUDE.md"), "utf8") !== antes.claude) malos.push("la segunda corrida tocó .gitignore o CLAUDE.md");
    const vacio = mkdtempSync(path.join(os.tmpdir(), "ritual-vacio-"));
    try { if (detectar(vacio).paquetes.length) malos.push("un proyecto vacío no debería detectar paquetes"); iniciar(vacio); if (!existsSync(path.join(vacio, "CLAUDE.md"))) malos.push("en un proyecto sin CLAUDE.md debía crearlo"); } finally { rmSync(vacio, { recursive: true, force: true }); }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of malos) console.error(`✕ ${m}`);
  return malos.length;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--probar")) {
    const malos = probar();
    console.log(malos ? `${malos} caso(s) mal` : "✓ arranque: detecta, crea y la segunda corrida no cambia nada");
    process.exit(malos ? 1 : 0);
  }
  const proyecto = path.resolve(args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.match(/^--(paquetes|idioma)$/)) ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const valor = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes("--detectar")) {
    const d = detectar(proyecto);
    console.log(`Dependencies read: ${d.dependencias}\nDetected packages: ${d.paquetes.join(", ") || "none (core lessons only)"}\nGuessed language: ${d.idioma}\nAvailable packages: ${Object.keys(PAQUETES).join(", ")}, seguridad`);
    process.exit(0);
  }
  const hechos = iniciar(proyecto, { paquetes: (valor("--paquetes") ?? "").split(",").map((s) => s.trim()).filter(Boolean), idioma: valor("--idioma") ?? "es" });
  console.log(hechos.length ? `✓ created or updated: ${hechos.join(", ")}` : "✓ nothing to do: Ritual was already set up");
}
