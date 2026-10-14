#!/usr/bin/env node
// Questions per group: PreToolUse hook that, the first time in the session that Claude works on a group (edits a
// test, runs a command, makes a commit), hands it that group's detector questions. Once per group and per session:
// after that it costs nothing. The group is inferred from the action, not asked of the model:
// - Bash: `git commit|push|merge|rebase|tag` → git-and-process; everything else → console-and-tools.
// - Edit/Write: by path, using the patterns in .ritual/config.json (`groups`; the first match wins).
// Core lessons, lessons from the active package (`packages`) and the project's own lessons
// (.ritual/lessons/<group>.md) are included; demoted ones (`demoted`) are skipped. It also records what was touched last.
// Usage: node hooks/questions.mjs --selftest
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GROUPS, ORIGINAL, TAXONOMY, readLessons, readGroupFile } from "../scripts/lessons.mjs";
import { isMain, readInput, readJson, ritualDir, session } from "./common.mjs";

const PLUGIN = path.resolve(import.meta.dirname, "..");
export const DEFAULT_CONFIG = readJson(path.join(PLUGIN, "templates", "config.json"), { language: "en", packages: [], demoted: [], groups: {} });
const GIT = /(^|[\s;&|(])git\s+(commit|push|merge|rebase|tag|cherry-pick|revert)\b/;

/** @returns {{group: string | null, target: string}} */
export function groupOf(input, config = DEFAULT_CONFIG, projectBase) {
  const tool = input.tool_name;
  if (tool === "Bash" || tool === "PowerShell") {
    const command = String(input.tool_input?.command ?? "");
    return { group: GIT.test(command) ? "git-and-process" : "console-and-tools", target: command.slice(0, 200) };
  }
  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "");
  if (!filePath) return { group: null, target: "" };
  const base = projectBase ?? (process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  // If the path falls outside the project (or the base does not match), the full path is used: the patterns start with **/.
  const rel = path.relative(base, filePath).replace(/\\/g, "/");
  const relative = !rel || rel.startsWith("..") || path.isAbsolute(rel) ? filePath.replace(/\\/g, "/") : rel;
  // `**` in path.matchesGlob skips segments that start with a dot: .ritual/, .claude/, .github/ are matched without it.
  const visible = relative.replace(/(^|\/)\.(?=[^./])/g, "$1");
  const matches = (p) => path.matchesGlob(relative, p) || path.matchesGlob(visible, p);
  // What a file is beats where it lives, in three tiers: tests first (a file under tests/ is a test, whatever its
  // extension), then name and extension patterns (**/*.csv), then folder patterns (**/content/**). Within a tier, the
  // order of the groups decides.
  const tier = (group, p) => (group === "tests-and-checks" ? 0 : p.endsWith("/**") ? 2 : 1);
  for (const t of [0, 1, 2])
    for (const [group, patterns] of Object.entries(config.groups ?? {}))
      if (patterns.some((p) => tier(group, p) === t && matches(p))) return { group, target: relative };
  return { group: null, target: relative };
}

/** The lessons that apply to a group: from the plugin (core and active packages) and the project's own.
 * The plugin's lessons always go out in the original (English): they are for Claude, who replies in the user's
 * language anyway. Translations are for people reading them. */
export function lessonsFor(group, config, ritual) {
  const { groups, lessons } = readLessons(ORIGINAL, PLUGIN);
  const own = [];
  const projectDir = ritual && path.join(ritual, "lessons");
  if (projectDir && existsSync(projectDir))
    for (const file of readdirSync(projectDir).filter((f) => f.endsWith(".md"))) own.push(...readGroupFile(path.join(projectDir, file), file.slice(0, -3)).lessons);
  const packages = new Set(config.packages ?? []);
  const demoted = new Set((config.demoted ?? []).map(String));
  const applies = (l) => {
    if (l.merged || demoted.has(l.id)) return false;
    const lessonGroups = [l.group, ...(l.data.groups ?? "").split(",").map((s) => s.trim()).filter(Boolean)];
    if (!lessonGroups.includes(group)) return false;
    const fromPackage = (l.data.packages ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return !fromPackage.length || fromPackage.some((p) => packages.has(p));
  };
  return { title: groups[group] ?? group, lessons: [...lessons.filter(applies), ...own.filter(applies)] };
}

/** A group's question lines: one per active lesson, a project refinement in its original's place. */
function questionLines(group, config, ritual) {
  const { title, lessons } = lessonsFor(group, config, ritual);
  if (!lessons.length) return null;
  // The project's own lessons may be in any language: the detector question is always the third part.
  const question = (l) => (l.parts["Detector question"] ?? Object.values(l.parts)[2] ?? "").replace(/\s+/g, " ");
  // A project lesson that refines one in this list takes its place: one sharper question instead of two near-duplicates.
  const refiners = new Map();
  for (const l of lessons) if (l.data.refines) refiners.set(l.data.refines, [...(refiners.get(l.data.refines) ?? []), l]);
  const line = (l) => `- ${l.id}${l.data.refines ? ` (refines ${l.data.refines})` : ""} · ${question(l)}`;
  const shown = new Set();
  const lines = [];
  for (const l of lessons) {
    if (shown.has(l)) continue;
    for (const x of refiners.get(l.id) ?? [l]) { lines.push(line(x)); shown.add(x); }
  }
  return { title, lines };
}

export function context(group, config, ritual) {
  const q = questionLines(group, config, ritual);
  if (!q) return null;
  const { title, lines } = q;
  return [
    `Ritual · ${title}. Before you continue, run through these detector questions for what you are about to do. If one applies, act on it and say so in one line; if none applies, just continue. Details: lessons/${ORIGINAL}/${group}.md in the Ritual plugin, or .ritual/lessons/ in this project. Reply to the user in their language.`,
    ...lines,
  ].join("\n");
}

/** The lessons of the project's packages (web, education…), whatever their group: the mistakes this kind of project
 * makes. The plugin's and the project's own (a project lesson with `packages:`), without merged or demoted ones. */
export function packageLessons(config, ritual) {
  const packages = new Set(config.packages ?? []);
  if (!packages.size) return [];
  const demoted = new Set((config.demoted ?? []).map(String));
  const own = [];
  const projectDir = ritual && path.join(ritual, "lessons");
  if (projectDir && existsSync(projectDir))
    for (const file of readdirSync(projectDir).filter((f) => f.endsWith(".md"))) own.push(...readGroupFile(path.join(projectDir, file), file.slice(0, -3)).lessons);
  const inPackage = (l) => !l.merged && !demoted.has(l.id) && (l.data.packages ?? "").split(",").map((s) => s.trim()).some((p) => packages.has(p));
  return [...readLessons(ORIGINAL, PLUGIN).lessons.filter(inPackage), ...own.filter(inPackage)];
}

const lessonLine = (l) => `- ${l.id} · ${l.title} · ${(l.parts["Detector question"] ?? Object.values(l.parts)[2] ?? "").replace(/\s+/g, " ")}`;

/** For the session start: the package lessons before any plan, when the design can still take them in. The questions per
 * group arrive later, at the first file, when the shape of the work is already decided. */
export function packageBrief(config, ritual) {
  const lessons = packageLessons(config, ritual);
  if (!lessons.length) return null;
  return [
    `Ritual · what ${config.about ? `this project (${config.about})` : "this kind of project"} tends to get wrong, from its packages (${config.packages.join(", ")}). When the user asks you to build or change something, design for these from the start, before the first file, and plan how you will check each one by running it, not by reading the code. Reply to the user in their language.`,
    ...lessons.map(lessonLine),
  ].join("\n");
}

/** Every group's active questions in one file, for agents that run without hooks (a read-only reviewer): the plugin
 * lives under a path that changes with each update, .ritual/local/lessons.md does not. Written at every session start. */
export function digest(config, ritual) {
  const sections = GROUPS.map((g) => [g, questionLines(g, config, ritual)]).filter(([, q]) => q)
    .flatMap(([g, q]) => [`## ${q.title}`, "", `When you work on: ${TAXONOMY.groups.find((x) => x.slug === g)?.covers ?? g}`, "", ...q.lines, ""]);
  return ["# Ritual · active detector questions", "", "<!-- Written by the Ritual plugin at every session start: do not edit. -->", "",
    "For agents that run without Ritual's hooks. Before you review or change something, run through the questions of its group; if one applies, say so. The full lessons: lessons/en/ in the Ritual plugin, and .ritual/lessons/ in this project.", "", ...sections].join("\n");
}

export function writeDigest(ritual) {
  if (!ritual) return;
  const config = { ...DEFAULT_CONFIG, ...readJson(path.join(ritual, "config.json"), {}) };
  try { mkdirSync(path.join(ritual, "local"), { recursive: true }); writeFileSync(path.join(ritual, "local", "lessons.md"), digest(config, ritual)); } catch { /* no digest */ }
}

/** The .ritual/ of the project that holds a file: the nearest one above it, or null. */
export function nearestRitual(file) {
  for (let dir = path.dirname(path.resolve(file)); ; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, ".ritual"))) return path.join(dir, ".ritual");
    if (path.dirname(dir) === dir) return null;
  }
}

export function selftest() {
  const failures = [];
  const cases = [
    [{ tool_name: "Bash", tool_input: { command: "git commit -m x" } }, "git-and-process"],
    [{ tool_name: "Bash", tool_input: { command: "npm test" } }, "console-and-tools"],
    [{ tool_name: "Edit", tool_input: { file_path: "C:/p/src/components/Boton.tsx" }, cwd: "C:/p" }, "interface-and-design"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/tests/boton.test.tsx" }, cwd: "C:/p" }, "tests-and-checks"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/docs/guia.md" }, cwd: "C:/p" }, "writing-and-docs"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/scripts/cargar.mjs" }, cwd: "C:/p" }, "scripts-and-files"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/consultas/ventas.sql" }, cwd: "C:/p" }, "numbers-and-data"],
    // A data file is data wherever it lives: a CSV under content/ (a course, a CMS) must not fall into writing.
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/content/datasets/ventas.csv" }, cwd: "C:/p" }, "numbers-and-data"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/content/leccion-01.mdx" }, cwd: "C:/p" }, "writing-and-docs"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/src/lib/util.ts" }, cwd: "C:/p" }, null],
    // What the file is beats where it lives: an extension wins over a folder, whatever the order of the groups.
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/docs/analytics/guide.md" }, cwd: "C:/p" }, "writing-and-docs"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/notebooks/notes.md" }, cwd: "C:/p" }, "writing-and-docs"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/app/models/card.tsx" }, cwd: "C:/p" }, "interface-and-design"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/src/models/user.ts" }, cwd: "C:/p" }, "numbers-and-data"],
    // Except tests: a file under tests/ is a test, whatever its extension.
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/tests/helper.mjs" }, cwd: "C:/p" }, "tests-and-checks"],
    // Dot folders count too: `**` in path.matchesGlob skips segments that start with a dot.
    [{ tool_name: "Edit", tool_input: { file_path: "C:/p/.ritual/lessons/console-and-tools.md" }, cwd: "C:/p" }, "writing-and-docs"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/.claude/agents/reviewer.md" }, cwd: "C:/p" }, "writing-and-docs"],
    [{ tool_name: "Write", tool_input: { file_path: "C:/p/.github/workflows/test.yml" }, cwd: "C:/p" }, "scripts-and-files"],
    // Outside the project, or with a base that does not match: the full path is used.
    [{ tool_name: "Write", tool_input: { file_path: "D:/otro/src/components/Boton.tsx" }, cwd: "C:/p" }, "interface-and-design"],
    [{ tool_name: "Write", tool_input: { file_path: "/tmp/x/tests/a.test.ts" }, cwd: "C:/p" }, "tests-and-checks"],
  ];
  const saved = process.env.CLAUDE_PROJECT_DIR;
  delete process.env.CLAUDE_PROJECT_DIR;
  for (const [input, expected] of cases) {
    const { group } = groupOf(input);
    if (group !== expected) failures.push(`${input.tool_input.command ?? input.tool_input.file_path}: expected ${expected}, got ${group}`);
  }
  if (saved) process.env.CLAUDE_PROJECT_DIR = saved;
  const consoleText = context("console-and-tools", DEFAULT_CONFIG, null) ?? "";
  for (const id of ["27", "29", "44"]) if (!consoleText.includes(`- ${id} · `)) failures.push(`the console context lacks lesson ${id}`);
  if (consoleText.includes("- 13 · ")) failures.push("the console context has lesson 13, which is a tests lesson");
  const testsText = context("tests-and-checks", DEFAULT_CONFIG, null) ?? "";
  if (!testsText.includes("- 44 · ")) failures.push("the tests context lacks lesson 44, which has tests as a secondary group");
  const withoutWeb = context("interface-and-design", DEFAULT_CONFIG, null) ?? "";
  const withWeb = context("interface-and-design", { ...DEFAULT_CONFIG, packages: ["web"] }, null) ?? "";
  if (withoutWeb.includes("- 46 · ")) failures.push("without the web package, the context has lesson 46, which is web-only");
  if (!withWeb.includes("- 46 · ")) failures.push("with the web package, the context lacks lesson 46");
  if ((context("console-and-tools", { ...DEFAULT_CONFIG, demoted: [27] }, null) ?? "").includes("- 27 · ")) failures.push("a demoted lesson still shows up");
  // A project lesson that refines a library lesson takes its place, instead of a near-duplicate second question.
  const project = mkdtempSync(path.join(os.tmpdir(), "ritual-refines-"));
  try {
    const own = path.join(project, ".ritual", "lessons");
    mkdirSync(own, { recursive: true });
    const lesson = (id, refines, q) => `### ${id}. Own ${id}\n\n\`origin: field · claude-opus-5-5 · 2026-10\`${refines ? ` · \`refines: ${refines}\`` : ""}\n\n**The idea.** x\n\n**Example.** y\n\n**Detector question.** ${q}\n\n**Warning sign.** "z"\n\n**What to do.** w\n`;
    writeFileSync(path.join(own, "console-and-tools.md"), `# Console\n\n${lesson("P-1", "27", "Sharper question about the console?")}\n${lesson("P-2", "13", "A tests question kept here?")}\n${lesson("P-3", null, "A plain project question?")}`);
    const text = context("console-and-tools", DEFAULT_CONFIG, path.join(project, ".ritual")) ?? "";
    const ids = [...text.matchAll(/^- (\S+)/gm)].map((m) => m[1]);
    if (text.includes("- 27 · ")) failures.push("a refined lesson must not show its original question next to the sharper one");
    if (!text.includes("- P-1 (refines 27) · Sharper question about the console?")) failures.push(`the refinement should say what it refines: ${text.split("\n").find((l) => l.includes("P-1"))}`);
    if (ids.indexOf("P-1") !== ids.indexOf("29") - 1) failures.push(`the refinement should sit where 27 was, before 29: ${ids.join(", ")}`);
    if (!text.includes("- P-2 (refines 13) · ") || !text.includes("- P-3 · ")) failures.push("a refinement of a lesson outside this group, and a plain project lesson, are listed as they are");
    // For agents without hooks: every group's active questions, in one file at a stable path.
    const all = digest(DEFAULT_CONFIG, path.join(project, ".ritual"));
    for (const x of ["## Console and tools", "## Tests and checks", "- P-1 (refines 27) · Sharper question about the console?", "- 13 · "]) if (!all.includes(x)) failures.push(`the digest lacks «${x}»`);
    if (all.includes("- 27 · ") || all.includes("- 46 · ")) failures.push("the digest must skip a refined original and a package that is off");
    // The project of the file being edited, not the session's: the nearest .ritual/ above the file.
    for (const p of ["a", "b"]) mkdirSync(path.join(project, p, ".ritual"), { recursive: true });
    mkdirSync(path.join(project, "b", "src", "deep"), { recursive: true });
    if (nearestRitual(path.join(project, "b", "src", "deep", "x.ts")) !== path.join(project, "b", ".ritual")) failures.push(`a file in project b should use b's .ritual: gave ${nearestRitual(path.join(project, "b", "src", "deep", "x.ts"))}`);
    if (nearestRitual(path.join(os.tmpdir(), "no-ritual-here-xyz", "x.ts")) !== null) failures.push("a file under no .ritual/ should give null, so the session's is used");
    // End to end: a session opened in project a, a file edited in project b, gets b's own lessons, not a's.
    const lessonIn = (p, id, q) => { mkdirSync(path.join(project, p, ".ritual", "lessons"), { recursive: true }); writeFileSync(path.join(project, p, ".ritual", "lessons", "writing-and-docs.md"), `# Writing\n\n${lesson(id, null, q)}`); };
    lessonIn("a", "A-1", "A question from project a?");
    lessonIn("b", "B-1", "A question from project b?");
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: path.join(project, "a") },
      input: JSON.stringify({ session_id: "e2e", tool_name: "Write", tool_input: { file_path: path.join(project, "b", "docs", "guide.md") }, cwd: path.join(project, "a") }) });
    const out = run.stdout ?? "";
    if (!out.includes("B-1 · A question from project b?") || out.includes("A-1")) failures.push(`editing a file in project b from a session in a should bring b's lessons: ${out.slice(0, 160) || run.stderr.slice(0, 160)}`);
    // The close only follows a session that changed files: a Write marks it, a command does not.
    if (readJson(path.join(project, "b", ".ritual", "local", "sessions", "e2e.json"), {}).edited !== true) failures.push("a Write must mark the session as edited, for the close");
    spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: path.join(project, "a") }, input: JSON.stringify({ session_id: "cmd", tool_name: "Bash", tool_input: { command: "npm test" }, cwd: path.join(project, "a") }) });
    if (readJson(path.join(project, "a", ".ritual", "local", "sessions", "cmd.json"), {}).edited) failures.push("a command must not mark the session as edited");
    // The package lessons, before any plan: every lesson of the packages that are on, whatever its group.
    const brief = packageBrief({ ...DEFAULT_CONFIG, packages: ["web"], about: "A bike shop's site" }, null) ?? "";
    for (const x of ["A bike shop's site", "- WEB-3 · A fallback nobody tested is not a fallback · If this JavaScript", "- WEB-1 · ", "- 46 · "]) if (!brief.includes(x)) failures.push(`the package brief lacks «${x}»`);
    if (brief.includes("- 27 · ") || brief.includes("- EDU-1 · ")) failures.push("the package brief must hold only the lessons of the packages that are on");
    if (packageBrief(DEFAULT_CONFIG, null) !== null) failures.push("without packages there is no brief");
    if ((packageBrief({ ...DEFAULT_CONFIG, packages: ["web"], demoted: ["WEB-3"] }, null) ?? "").includes("- WEB-3 · ")) failures.push("a demoted lesson must not be in the brief");
    writeFileSync(path.join(own, "interface-and-design.md"), `# Interface\n\n${lesson("P-9", null, "A web question of this project?").replace("2026-10`", "2026-10` · `packages: web`")}`);
    if (!(packageBrief({ ...DEFAULT_CONFIG, packages: ["web"] }, path.join(project, ".ritual")) ?? "").includes("- P-9 · Own P-9 · A web question of this project?")) failures.push("a project lesson of a package that is on must be in the brief");
  } finally { rmSync(project, { recursive: true, force: true }); }
  for (const failure of failures) console.error(`✕ ${failure}`);
  return failures.length;
}

if (isMain(import.meta.url)) {
  if (process.argv.includes("--selftest")) {
    const failures = selftest();
    console.log(failures ? `${failures} case(s) wrong` : "✓ groups by action and context per group calibrated");
    process.exit(failures ? 1 : 0);
  }
  const input = await readInput();
  if (!input) process.exit(0);
  // An edited file belongs to the project of the nearest .ritual/ above it, which may not be the session's.
  const file = String(input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "");
  const own = file ? nearestRitual(file) : null;
  const ritual = own ?? ritualDir(input);
  if (!ritual) process.exit(0);
  const config = { ...DEFAULT_CONFIG, ...readJson(path.join(ritual, "config.json"), {}) };
  const { group, target } = groupOf(input, config, own ? path.dirname(own) : undefined);
  const state = session(ritual, input.session_id);
  state.data.last = { tool: input.tool_name, target, date: new Date().toISOString() };
  // For the close (hooks/close.mjs): this session changed files, so it gets checked before it ends.
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(input.tool_name)) state.data.edited = true;
  if (group && !state.data.sent.includes(group)) {
    const text = context(group, config, ritual);
    if (text) {
      state.data.sent.push(group);
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: text } }));
    }
  }
  state.save();
}
