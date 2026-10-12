#!/usr/bin/env node
// Ritual setup in a project: creates .ritual/ (config, guard rules, own lessons folder, candidates), adds .ritual/local/ to .gitignore and a short section to CLAUDE.md. Running it twice changes nothing.
// Usage: node scripts/init.mjs --detect [project]                 says which packages it sees in the dependencies
//      node scripts/init.mjs --packages web,apps --language es [project]
//      node scripts/init.mjs --selftest
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { TAXONOMY } from "./lessons.mjs";

const PLUGIN = path.resolve(import.meta.dirname, "..");
// Which dependencies turn each package on: lessons/taxonomy.json, the one list of groups and packages.
const PACKAGES = Object.fromEntries(Object.entries(TAXONOMY.packages).map(([p, def]) => [p, def.detect]));
const MARK_START = "<!-- ritual:start -->", MARK_END = "<!-- ritual:end -->";
const SECTION = {
  es: `## Ritual\n\n${MARK_START}\nLas lecciones de este proyecto viven en \`.ritual/lessons/\`; las del núcleo, en el plugin Ritual. Sus hooks bloquean lo que ya falló, anotan errores y correcciones en \`.ritual/local/\` y muestran las preguntas de cada grupo una vez por sesión. Corre \`/ritual\` al cerrar una sesión o después de un error doloroso, y \`/ritual close\` antes de dar algo por terminado.\n\nReglas que este proyecto ya rompió más de una vez y no se pudieron automatizar:\n\n- (ninguna todavía)\n${MARK_END}\n`,
  en: `## Ritual\n\n${MARK_START}\nThis project's lessons live in \`.ritual/lessons/\`; the core ones, in the Ritual plugin. Its hooks block what already failed, log errors and corrections in \`.ritual/local/\`, and show each group's questions once per session. Run \`/ritual\` when closing a session or after a painful bug, and \`/ritual close\` before calling something done.\n\nRules this project broke more than once and could not automate:\n\n- (none yet)\n${MARK_END}\n`,
};

function dependencies(project) {
  const names = new Set();
  const pkg = path.join(project, "package.json");
  if (existsSync(pkg)) {
    try { const p = JSON.parse(readFileSync(pkg, "utf8")); for (const k of ["dependencies", "devDependencies"]) for (const d of Object.keys(p[k] ?? {})) names.add(d.toLowerCase()); } catch { /* broken package.json: no dependencies */ }
  }
  for (const a of ["requirements.txt", "pyproject.toml", "Pipfile"]) {
    const r = path.join(project, a);
    if (existsSync(r)) for (const m of readFileSync(r, "utf8").matchAll(/^\s*"?([A-Za-z][\w.-]*)/gm)) names.add(m[1].toLowerCase());
  }
  return names;
}

export function detect(project) {
  const deps = dependencies(project);
  const packages = Object.entries(PACKAGES).filter(([, ds]) => ds.some((d) => deps.has(d))).map(([p]) => p);
  const claude = path.join(project, "CLAUDE.md");
  const text = existsSync(claude) ? readFileSync(claude, "utf8") : "";
  const language = /\b(que|para|con|archivo|proyecto|siempre)\b/i.test(text) && !/\b(the|with|always|project)\b/i.test(text.slice(0, 400)) ? "es" : "en";
  return { packages, language, dependencies: deps.size };
}

export function init(project, { packages = [], language = "en" } = {}) {
  const created = [];
  const dir = path.join(project, ".ritual");
  mkdirSync(path.join(dir, "lessons"), { recursive: true });
  mkdirSync(path.join(dir, "local"), { recursive: true });
  const config = path.join(dir, "config.json");
  const base = existsSync(config) ? JSON.parse(readFileSync(config, "utf8")) : JSON.parse(readFileSync(path.join(PLUGIN, "templates", "config.json"), "utf8"));
  const next = { ...base, language, packages: [...new Set([...(base.packages ?? []), ...packages])] };
  const configText = JSON.stringify(next, null, 2) + "\n";
  if (configText !== (existsSync(config) ? readFileSync(config, "utf8") : "")) { writeFileSync(config, configText); created.push(".ritual/config.json"); }
  if (!existsSync(path.join(dir, "guard.json"))) { cpSync(path.join(PLUGIN, "templates", "guard.json"), path.join(dir, "guard.json")); created.push(".ritual/guard.json"); }
  if (!existsSync(path.join(dir, "candidates.md"))) { cpSync(path.join(PLUGIN, "templates", "candidates.md"), path.join(dir, "candidates.md")); created.push(".ritual/candidates.md"); }
  if (!existsSync(path.join(dir, "lessons", ".gitkeep"))) { writeFileSync(path.join(dir, "lessons", ".gitkeep"), ""); created.push(".ritual/lessons/"); }
  const gitignore = path.join(project, ".gitignore");
  const ignored = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
  if (!/^\.ritual\/local\/?\s*$/m.test(ignored)) { appendFileSync(gitignore, `${ignored && !ignored.endsWith("\n") ? "\n" : ""}# Ritual: log and session state, local only\n.ritual/local/\n`); created.push(".gitignore"); }
  const claude = path.join(project, "CLAUDE.md");
  const text = existsSync(claude) ? readFileSync(claude, "utf8") : "";
  if (!text.includes(MARK_START)) { appendFileSync(claude, `${text && !text.endsWith("\n") ? "\n" : ""}${text ? "\n" : ""}${SECTION[language] ?? SECTION.en}`); created.push("CLAUDE.md"); }
  return created;
}

export function selftest() {
  const bad = [];
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ritual-init-"));
  try {
    writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: { next: "15", stripe: "17" } }));
    writeFileSync(path.join(tmp, "CLAUDE.md"), "# Mi proyecto\n\nResponde siempre en español.\n");
    const d = detect(tmp);
    if (d.packages.join() !== "web,apps") bad.push(`detect: expected web,apps and got ${d.packages.join() || "nothing"}`);
    if (d.language !== "es") bad.push(`detect: expected language es and got ${d.language}`);
    const first = init(tmp, { packages: d.packages, language: d.language });
    for (const f of [".ritual/config.json", ".ritual/guard.json", ".ritual/candidates.md", ".gitignore", "CLAUDE.md"]) if (!first.includes(f)) bad.push(`the first run did not create ${f}`);
    const config = JSON.parse(readFileSync(path.join(tmp, ".ritual", "config.json"), "utf8"));
    if (config.packages.join() !== "web,apps" || config.language !== "es") bad.push("config.json does not have the packages and language");
    const before = { gitignore: readFileSync(path.join(tmp, ".gitignore"), "utf8"), claude: readFileSync(path.join(tmp, "CLAUDE.md"), "utf8") };
    if (!before.claude.startsWith("# Mi proyecto")) bad.push("CLAUDE.md lost what it already had");
    const second = init(tmp, { packages: d.packages, language: d.language });
    if (second.length) bad.push(`the second run changed: ${second.join(", ")}`);
    if (readFileSync(path.join(tmp, ".gitignore"), "utf8") !== before.gitignore || readFileSync(path.join(tmp, "CLAUDE.md"), "utf8") !== before.claude) bad.push("the second run touched .gitignore or CLAUDE.md");
    const empty = mkdtempSync(path.join(os.tmpdir(), "ritual-empty-"));
    try { if (detect(empty).packages.length) bad.push("an empty project should not detect packages"); init(empty); if (!existsSync(path.join(empty, "CLAUDE.md"))) bad.push("in a project without CLAUDE.md it should have created it"); } finally { rmSync(empty, { recursive: true, force: true }); }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) failed` : "✓ init: detects, creates, and the second run changes nothing");
    process.exit(bad ? 1 : 0);
  }
  const project = path.resolve(args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.match(/^--(packages|language)$/)) ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const value = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes("--detect")) {
    const d = detect(project);
    console.log(`Dependencies read: ${d.dependencies}\nDetected packages: ${d.packages.join(", ") || "none (core lessons only)"}\nGuessed language: ${d.language}\nAvailable packages: ${Object.keys(PACKAGES).join(", ")}`);
    process.exit(0);
  }
  const created = init(project, { packages: (value("--packages") ?? "").split(",").map((s) => s.trim()).filter(Boolean), language: value("--language") ?? "en" });
  console.log(created.length ? `✓ created or updated: ${created.join(", ")}` : "✓ nothing to do: Ritual was already set up");
}
