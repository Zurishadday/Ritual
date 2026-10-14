#!/usr/bin/env node
// Questions per group: PreToolUse hook that, the first time in the session that Claude works on a group (edits a
// test, runs a command, makes a commit), hands it that group's detector questions. Once per group and per session:
// after that it costs nothing. The group is inferred from the action, not asked of the model:
// - Bash: `git commit|push|merge|rebase|tag` → git-and-process; everything else → console-and-tools.
// - Edit/Write: by path, using the patterns in .ritual/config.json (`groups`; the first match wins).
// Core lessons, lessons from the active package (`packages`) and the project's own lessons
// (.ritual/lessons/<group>.md) are included; demoted ones (`demoted`) are skipped. It also records what was touched last.
// Usage: node hooks/questions.mjs --selftest
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ORIGINAL, readLessons, readGroupFile } from "../scripts/lessons.mjs";
import { isMain, readInput, readJson, ritualDir, session } from "./common.mjs";

const PLUGIN = path.resolve(import.meta.dirname, "..");
export const DEFAULT_CONFIG = readJson(path.join(PLUGIN, "templates", "config.json"), { language: "en", packages: [], demoted: [], groups: {} });
const GIT = /(^|[\s;&|(])git\s+(commit|push|merge|rebase|tag|cherry-pick|revert)\b/;

/** @returns {{group: string | null, target: string}} */
export function groupOf(input, config = DEFAULT_CONFIG) {
  const tool = input.tool_name;
  if (tool === "Bash" || tool === "PowerShell") {
    const command = String(input.tool_input?.command ?? "");
    return { group: GIT.test(command) ? "git-and-process" : "console-and-tools", target: command.slice(0, 200) };
  }
  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "");
  if (!filePath) return { group: null, target: "" };
  const base = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  // If the path falls outside the project (or the base does not match), the full path is used: the patterns start with **/.
  const rel = path.relative(base, filePath).replace(/\\/g, "/");
  const relative = !rel || rel.startsWith("..") || path.isAbsolute(rel) ? filePath.replace(/\\/g, "/") : rel;
  // `**` in path.matchesGlob skips segments that start with a dot: .ritual/, .claude/, .github/ are matched without it.
  const visible = relative.replace(/(^|\/)\.(?=[^./])/g, "$1");
  for (const [group, patterns] of Object.entries(config.groups ?? {}))
    if (patterns.some((p) => path.matchesGlob(relative, p) || path.matchesGlob(visible, p))) return { group, target: relative };
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

export function context(group, config, ritual) {
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
  return [
    `Ritual · ${title}. Before you continue, run through these detector questions for what you are about to do. If one applies, act on it and say so in one line; if none applies, just continue. Details: lessons/${ORIGINAL}/${group}.md in the Ritual plugin, or .ritual/lessons/ in this project. Reply to the user in their language.`,
    ...lines,
  ].join("\n");
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
  const ritual = ritualDir(input);
  if (!input || !ritual) process.exit(0);
  const config = { ...DEFAULT_CONFIG, ...readJson(path.join(ritual, "config.json"), {}) };
  const { group, target } = groupOf(input, config);
  const state = session(ritual, input.session_id);
  state.data.last = { tool: input.tool_name, target, date: new Date().toISOString() };
  if (group && !state.data.sent.includes(group)) {
    const text = context(group, config, ritual);
    if (text) {
      state.data.sent.push(group);
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: text } }));
    }
  }
  state.save();
}
