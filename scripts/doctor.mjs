#!/usr/bin/env node
// Ritual doctor: says whether Ritual works in this project and, when it does not, what to do. The first answer to
// "it doesn't work for me" is "run /ritual doctor and paste what it says".
// It checks Node, the plugin's library, the project's .ritual/ (config, guard rules, own lessons) and whether the hooks
// really run: the questions hook stamps the session on every command and edit, so from inside Claude Code (CLAUDECODE
// is set) a stamp from the last two minutes means the hooks are live, and no stamp means they are not.
// Usage: node scripts/doctor.mjs [project]
//        node scripts/doctor.mjs --selftest
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMain } from "../hooks/common.mjs";
import { BUILTIN, rulesOf, selftest as calibrate } from "../hooks/guard.mjs";
import { configDir, status } from "../hooks/update.mjs";
import { ORIGINAL, PACKAGES, PARTS, ROOT, check, checkProject, readLessons } from "./lessons.mjs";
import { init } from "./init.mjs";

export const MIN_NODE = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")).engines.node.replace(/^>=/, "");
const FRESH = 2 * 60 * 1000;

const older = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
};

/** Reads a JSON file: undefined if it is missing, an Error if it does not parse. */
function json(file) {
  if (!existsSync(file)) return undefined;
  try { return JSON.parse(readFileSync(file, "utf8")); } catch (e) { return e; }
}

/** @returns {{level: "ok" | "warn" | "error", text: string}[]} */
export function diagnose(project, { node = process.versions.node, now = Date.now(), inClaude = !!process.env.CLAUDECODE, platform = process.platform, claudeConfig = configDir() } = {}) {
  const out = [];
  const ok = (text) => out.push({ level: "ok", text }), warn = (text) => out.push({ level: "warn", text }), error = (text) => out.push({ level: "error", text });

  if (older(node, MIN_NODE)) error(`Node ${node} is older than ${MIN_NODE}: the hooks fail or do nothing. Install Node ${MIN_NODE} or newer (nodejs.org) and restart Claude Code.`);
  else ok(`Node ${node} (needs ${MIN_NODE} or newer)`);

  const library = check(ROOT).filter((f) => f.level === "error");
  if (library.length) error(`The plugin's library has ${library.length} error(s): reinstall Ritual (claude plugin install ritual@ritual). First: ${library[0].file}: ${library[0].message}`);
  else ok(`Plugin library: ${readLessons(ORIGINAL).lessons.length} lessons`);

  // Only for an installed copy: a checkout loaded by hand has no install record.
  const copy = status(claudeConfig, ROOT);
  if (copy.updated) {
    const days = Math.floor((now - copy.updated) / (24 * 60 * 60 * 1000)), when = copy.updated.toISOString().slice(0, 10);
    if (copy.autoUpdate) ok(`Updates: automatic (this copy is from ${when})`);
    else warn(`Updates: off. This copy is from ${when} (${days} day(s) ago), and new lessons only arrive when you update. Turn on auto-update once (/plugin → Marketplaces → ritual → Enable auto-update), or run claude plugin update ritual@ritual and start a new session.`);
  }

  const dir = path.join(project, ".ritual");
  if (!existsSync(dir)) { error(`${project} has no .ritual/ folder, so the hooks do nothing here. Type /ritual to set it up.`); return out; }

  const config = json(path.join(dir, "config.json"));
  let language = ORIGINAL;
  if (config === undefined) error(".ritual/config.json is missing: type /ritual to set it up again (nothing you have is overwritten).");
  else if (config instanceof Error) error(`.ritual/config.json does not parse, so the hooks use the defaults: ${config.message}`);
  else {
    language = config.language ?? ORIGINAL;
    const unknown = (config.packages ?? []).filter((p) => !PACKAGES.includes(p));
    if (unknown.length) error(`.ritual/config.json turns on package(s) that do not exist, whose lessons never show: ${unknown.join(", ")}. Packages: ${PACKAGES.join(", ")}.`);
    if (!PARTS[language]) warn(`.ritual/config.json says language «${language}», which Ritual has no lessons in; it uses English. Languages: ${Object.keys(PARTS).join(", ")}.`);
    if (!unknown.length) ok(`.ritual/config.json: language ${language}, packages ${(config.packages ?? []).join(", ") || "none"}`);
  }

  const guard = json(path.join(dir, "guard.json"));
  if (guard instanceof Error) error(`.ritual/guard.json does not parse, so the guard uses only its builtin rules: ${guard.message}`);
  else if (guard) {
    const unknown = (guard.builtin ?? []).filter((n) => !BUILTIN[n]);
    if (unknown.length) error(`.ritual/guard.json names builtin rule(s) that do not exist: ${unknown.join(", ")}. Builtin: ${Object.keys(BUILTIN).join(", ")}.`);
    const { failures, rules } = calibrate(guard);
    if (failures) error(`.ritual/guard.json: ${failures} case(s) fail (listed above). Fix them with node hooks/guard.mjs --selftest . from the plugin.`);
    else if (!unknown.length) ok(`.ritual/guard.json: ${rules} rule(s) calibrated, ${rulesOf(guard, platform).length} active on ${platform}`);
  }

  const lessons = checkProject(project, language).filter((f) => f.level === "error");
  if (lessons.length) error(`.ritual/lessons/ has ${lessons.length} error(s), and a broken lesson does not show. First: ${lessons[0].file}:${lessons[0].line} ${lessons[0].message}`);
  else ok(".ritual/lessons/: well formed");

  const sessions = path.join(dir, "local", "sessions");
  const last = existsSync(sessions)
    ? readdirSync(sessions).map((f) => json(path.join(sessions, f))?.last).filter((l) => l?.date).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
    : null;
  const age = last ? now - Date.parse(last.date) : Infinity;
  const ago = last ? ` (last run ${last.date.slice(0, 16).replace("T", " ")})` : " (never)";
  if (age < FRESH) ok(`Hooks run: ${Math.round(age / 1000)} s ago, on ${last.tool}`);
  else if (inClaude) error(`The hooks are not running in this session${ago}. Check that Ritual is installed and enabled (/plugin), that \`node\` works in the terminal Claude Code starts from, then restart Claude Code.`);
  else warn(`From a terminal it can't tell whether the hooks run${ago}. Ask Claude for /ritual doctor to find out.`);
  return out;
}

export function report(project, findings) {
  const errors = findings.filter((f) => f.level === "error").length;
  const mark = { ok: "✓", warn: "!", error: "✕" };
  return [`Ritual doctor · ${project}`, ...findings.map((f) => `${mark[f.level]} ${f.text}`),
    errors ? `${errors} problem(s): fix the ✕ lines, then run it again.` : "Ritual works here."].join("\n");
}

export function selftest() {
  const bad = [];
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ritual-doctor-"));
  const now = Date.parse("2026-10-12T12:00:00Z");
  const stamp = (date) => { mkdirSync(path.join(tmp, ".ritual", "local", "sessions"), { recursive: true }); writeFileSync(path.join(tmp, ".ritual", "local", "sessions", "s.json"), JSON.stringify({ sent: [], last: { tool: "Bash", target: "x", date } })); };
  const errors = (opts = {}) => diagnose(tmp, { node: "22.18.0", now, inClaude: true, platform: "linux", claudeConfig: path.join(tmp, "no-config"), ...opts }).filter((f) => f.level === "error").map((f) => f.text);
  const expect = (name, opts, needle) => { const e = errors(opts); if (!e.some((t) => t.includes(needle))) bad.push(`${name}: expected an error with «${needle}», got ${e.length ? e.join(" | ") : "none"}`); };
  const file = (f, text) => writeFileSync(path.join(tmp, ".ritual", f), text);
  try {
    expect("no .ritual/", {}, "has no .ritual/ folder");
    init(tmp, { packages: ["web"], language: "en" });
    stamp("2026-10-12T11:59:30Z");
    const good = errors();
    if (good.length) bad.push(`a good setup should have no errors, got ${good.join(" | ")}`);
    expect("old Node", { node: "20.11.1" }, "is older than");
    // An installed copy with auto-update off is a warning (never an error); with it on, it says so.
    const claudeConfig = path.join(tmp, "claude-config");
    mkdirSync(path.join(claudeConfig, "plugins"), { recursive: true });
    writeFileSync(path.join(claudeConfig, "plugins", "installed_plugins.json"), JSON.stringify({ plugins: { "ritual@ritual": [{ installPath: ROOT, lastUpdated: "2026-09-01T00:00:00Z" }] } }));
    const updates = (autoUpdate) => {
      writeFileSync(path.join(claudeConfig, "settings.json"), JSON.stringify({ extraKnownMarketplaces: { ritual: { source: { source: "github", repo: "Zurishadday/Ritual" }, autoUpdate } } }));
      return diagnose(tmp, { node: "22.18.0", now, inClaude: false, platform: "linux", claudeConfig }).find((f) => f.text.startsWith("Updates:"));
    };
    if (updates(false)?.level !== "warn" || !updates(false).text.includes("41 day(s) ago")) bad.push(`auto-update off should warn with the copy's age: ${JSON.stringify(updates(false))}`);
    if (updates(true)?.level !== "ok") bad.push(`auto-update on should say so: ${JSON.stringify(updates(true))}`);
    expect("hooks not running inside Claude", { now: now + 10 * 60 * 1000 }, "hooks are not running");
    if (errors({ now: now + 10 * 60 * 1000, inClaude: false }).length) bad.push("from a terminal, an old stamp should only warn");
    rmSync(path.join(tmp, ".ritual", "local", "sessions"), { recursive: true });
    expect("hooks never ran", {}, "hooks are not running");
    stamp("2026-10-12T11:59:30Z");
    const config = readFileSync(path.join(tmp, ".ritual", "config.json"), "utf8");
    file("config.json", config.replace('"web"', '"wbe"'));
    expect("unknown package", {}, "wbe");
    file("config.json", config.slice(0, -5));
    expect("broken config", {}, "config.json does not parse");
    file("config.json", config);
    const guard = readFileSync(path.join(tmp, ".ritual", "guard.json"), "utf8");
    file("guard.json", guard.replace("{", "{,"));
    expect("broken guard", {}, "guard.json does not parse");
    file("guard.json", JSON.stringify({ builtin: ["python-c", "pyhton-c"], rules: [] }));
    expect("unknown builtin", {}, "pyhton-c");
    file("guard.json", JSON.stringify({ builtin: [], rules: [{ name: "x", pattern: "danger", message: "m", blocks: ["safe"], allows: ["ok"] }] }));
    const quiet = console.error; console.error = () => {};
    try { expect("rule whose case does not block", {}, "case(s) fail"); } finally { console.error = quiet; }
    file("guard.json", guard);
    file("lessons/console-and-tools.md", "### P-1. Half a lesson\n\n`origin: field · claude-opus-5-5 · 2026-10`\n\n**The idea.** Something.\n");
    expect("broken own lesson", {}, ".ritual/lessons/ has");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  if (process.argv.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ doctor: passes a good setup and catches old Node, hooks not running, and broken config, guard rules and lessons");
    process.exit(bad ? 1 : 0);
  }
  const project = path.resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const findings = diagnose(project);
  console.log(report(project, findings));
  process.exit(findings.some((f) => f.level === "error") ? 1 : 0);
}
