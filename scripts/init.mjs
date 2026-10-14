#!/usr/bin/env node
// Ritual setup in a project: creates .ritual/ (config, guard rules, own lessons folder, candidates), adds .ritual/local/ to .gitignore and a short section to CLAUDE.md. Running it twice changes nothing.
// Usage: node scripts/init.mjs --detect [project]   what the project says about itself, its dependencies, and every package with what it covers
//      node scripts/init.mjs --packages web,apps --language es --about "<what the project is>" [project]
//      node scripts/init.mjs --selftest
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { TAXONOMY } from "./lessons.mjs";
import { isMain } from "../hooks/common.mjs";

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
  // What the project says about itself, for Claude to write the `about` line and match packages by what they cover:
  // dependencies don't reveal a course or a dashboard, its README and folders do.
  const readme = ["README.md", "readme.md", "README"].map((f) => path.join(project, f)).find((f) => existsSync(f));
  const intro = readme ? readFileSync(readme, "utf8").replace(/\r\n/g, "\n").replace(/<[^>]+>/g, "").split(/\n\s*\n/).map((s) => s.trim())
    .filter((s) => s && !/^(\[!\[|!\[|```|---|>)/.test(s) && (s.match(/\]\(/g) ?? []).length < 3).slice(0, 3).join(" / ").replace(/\s+/g, " ").slice(0, 400) : "";
  const folders = readdirSync(project, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules").map((e) => e.name).slice(0, 25);
  let about = "";
  try { about = JSON.parse(readFileSync(path.join(project, ".ritual", "config.json"), "utf8")).about ?? ""; } catch { /* not set up yet */ }
  return { packages, language, dependencies: deps.size, intro, folders, about };
}

export function init(project, { packages = [], language, about = "", private: names = [] } = {}) {
  const created = [];
  const dir = path.join(project, ".ritual");
  mkdirSync(path.join(dir, "lessons"), { recursive: true });
  mkdirSync(path.join(dir, "local"), { recursive: true });
  const config = path.join(dir, "config.json");
  const base = existsSync(config) ? JSON.parse(readFileSync(config, "utf8")) : JSON.parse(readFileSync(path.join(PLUGIN, "templates", "config.json"), "utf8"));
  // A later run that only adds packages or the about line keeps the language it had.
  const next = { ...base, ...(about.trim() ? { about: about.trim() } : {}), language: language ?? base.language ?? "en", packages: [...new Set([...(base.packages ?? []), ...packages])] };
  // Names that identify the project (a sample company, a dataset, a person): /ritual share refuses a lesson that has them.
  if (names.length) next.private = [...new Set([...(base.private ?? []), ...names.map((n) => n.trim()).filter(Boolean)])];
  const configText = JSON.stringify(next, null, 2) + "\n";
  if (configText !== (existsSync(config) ? readFileSync(config, "utf8") : "")) { writeFileSync(config, configText); created.push(".ritual/config.json"); }
  if (!existsSync(path.join(dir, "guard.json"))) { cpSync(path.join(PLUGIN, "templates", "guard.json"), path.join(dir, "guard.json")); created.push(".ritual/guard.json"); }
  if (!existsSync(path.join(dir, "candidates.md"))) { cpSync(path.join(PLUGIN, "templates", "candidates.md"), path.join(dir, "candidates.md")); created.push(".ritual/candidates.md"); }
  // The placeholder only keeps an empty folder in git: once the project has its own lessons, a rerun leaves it out.
  const lessons = path.join(dir, "lessons");
  if (!existsSync(path.join(lessons, ".gitkeep")) && !readdirSync(lessons).some((f) => f.endsWith(".md"))) { writeFileSync(path.join(lessons, ".gitkeep"), ""); created.push(".ritual/lessons/"); }
  const gitignore = path.join(project, ".gitignore");
  const ignored = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
  if (!/^\.ritual\/local\/?\s*$/m.test(ignored)) { appendFileSync(gitignore, `${ignored && !ignored.endsWith("\n") ? "\n" : ""}# Ritual: log and session state, local only\n.ritual/local/\n`); created.push(".gitignore"); }
  const claude = path.join(project, "CLAUDE.md");
  const text = existsSync(claude) ? readFileSync(claude, "utf8") : "";
  if (!text.includes(MARK_START)) { appendFileSync(claude, `${text && !text.endsWith("\n") ? "\n" : ""}${text ? "\n" : ""}${SECTION[next.language] ?? SECTION.en}`); created.push("CLAUDE.md"); }
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
    // What the project is: Claude writes one line from what the project says about itself, and it survives reruns.
    writeFileSync(path.join(tmp, "README.md"), "# Curso de Python\n\n[![badge](x)](y)\n\nUn curso para principiantes con ejercicios y quizzes.\n");
    mkdirSync(path.join(tmp, "lecciones")); mkdirSync(path.join(tmp, "node_modules"));
    const signals = detect(tmp);
    if (!signals.intro.includes("Un curso para principiantes") || signals.intro.includes("badge")) bad.push(`detect should give the README's intro without badges: ${signals.intro}`);
    if (!signals.folders.includes("lecciones") || signals.folders.includes("node_modules")) bad.push(`detect should list the project's folders: ${signals.folders}`);
    init(tmp, { packages: d.packages, language: d.language, about: "A programming course for beginners" });
    init(tmp, { packages: d.packages, language: d.language });
    if (JSON.parse(readFileSync(path.join(tmp, ".ritual", "config.json"), "utf8")).about !== "A programming course for beginners") bad.push("about must be saved, and a rerun without it must keep it");
    if (detect(tmp).about !== "A programming course for beginners") bad.push("detect should report the saved about");
    init(tmp, { packages: ["education"], about: "A programming course for beginners, in Spanish" });
    const later = JSON.parse(readFileSync(path.join(tmp, ".ritual", "config.json"), "utf8"));
    if (later.language !== "es" || !later.packages.includes("education")) bad.push(`a later run with only --about and --packages must keep the language: gave ${later.language}, ${later.packages}`);
    // Once the project has its own lessons, the placeholder is not needed: a rerun must not bring it back.
    rmSync(path.join(tmp, ".ritual", "lessons", ".gitkeep"));
    writeFileSync(path.join(tmp, ".ritual", "lessons", "console-and-tools.md"), "# Console\n");
    const withLessons = init(tmp, { packages: ["education"] });
    if (existsSync(path.join(tmp, ".ritual", "lessons", ".gitkeep")) || withLessons.includes(".ritual/lessons/")) bad.push("a rerun recreated .ritual/lessons/.gitkeep although the folder already has lessons");
    // Names that identify the project (a sample company, a dataset, a person): --private adds them, once each.
    init(tmp, { private: ["Rueda Libre", "ventas_2024"] });
    init(tmp, { private: ["ventas_2024", "Don Beto"] });
    init(tmp, {});
    const priv = JSON.parse(readFileSync(path.join(tmp, ".ritual", "config.json"), "utf8")).private;
    if (priv.join("|") !== "Rueda Libre|ventas_2024|Don Beto") bad.push(`--private should add names once and keep them on reruns: gave ${priv}`);
    const empty = mkdtempSync(path.join(os.tmpdir(), "ritual-empty-"));
    try { if (detect(empty).packages.length) bad.push("an empty project should not detect packages"); init(empty); if (!existsSync(path.join(empty, "CLAUDE.md"))) bad.push("in a project without CLAUDE.md it should have created it"); } finally { rmSync(empty, { recursive: true, force: true }); }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) failed` : "✓ init: detects, creates, and the second run changes nothing");
    process.exit(bad ? 1 : 0);
  }
  const project = path.resolve(args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.match(/^--(packages|language|about|private)$/)) ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const value = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes("--detect")) {
    const d = detect(project);
    console.log([
      "What the project says about itself (write the `about` line from this: the kind of project and who it is for, no client or product names):",
      `  README: ${d.intro || "(none)"}`,
      `  Folders: ${d.folders.join(", ") || "(none)"}`,
      `  Current about: ${d.about || "(none)"}`,
      "Names that would identify the project in a shared lesson (a client, a product, a sample company, a dataset, a person): propose them for --private.",
      `Dependencies read: ${d.dependencies}, which turn on: ${d.packages.join(", ") || "nothing"}`,
      "Packages. Turn on each one whose covers fits, by dependencies or by what the project is: it adds the lessons for that kind of project, so its typical mistakes get caught, and a package left off costs no tokens.",
      ...Object.entries(TAXONOMY.packages).map(([p, def]) => `  ${p}${d.packages.includes(p) ? " [detected]" : ""} · ${def.covers}`),
      `Guessed language: ${d.language}`,
    ].join("\n"));
    process.exit(0);
  }
  const created = init(project, { packages: (value("--packages") ?? "").split(",").map((s) => s.trim()).filter(Boolean), language: value("--language"), about: value("--about") ?? "", private: (value("--private") ?? "").split(",") });
  console.log(created.length ? `✓ created or updated: ${created.join(", ")}` : "✓ nothing to do: Ritual was already set up");
}
