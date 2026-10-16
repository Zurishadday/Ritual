#!/usr/bin/env node
// Runs a simulation with Claude Code headless: a builder model builds simulations/<task>/TASK.md in an empty folder,
// a reviewer model reviews it with REVIEW.md and checks each lesson of the task's package, twice by default. Then it
// compares the runs: a lesson that broke in every run is confirmed with that model, one that held in every run is a
// candidate to demote, the rest stays as it is. It never edits lessons: it prints the /maintain commands to apply.
// Isolation: with ANTHROPIC_API_KEY it uses --bare (no CLAUDE.md, plugins, hooks, memory or MCP). With a subscription
// login --bare can't authenticate, so it turns those off one by one; check it with --probe before trusting a run.
// With --with-ritual the builder works in a project set up with Ritual (the task's package) and the plugin loaded: the
// A/B half that measures what Ritual changes, in mistakes and in spend. Its runs and summary are named <month>-<model>-ritual-*.
// --no-close (with --with-ritual) turns Ritual's close off: the package lessons at the start only (<month>-<model>-ritual-start-*).
// --blind keeps the builder's last message from the reviewer (with Ritual it names the lessons), and the run records any
// mention of Ritual or a lesson id left in the build's files.
// Usage: node scripts/simulate.mjs <task> [--runs 2] [--builder claude-sonnet-5-5] [--reviewer claude-opus-5-5]
//                                  [--language en|es] [--budget 5] [--with-ritual [--no-close]] [--blind] [--tag v2] [--dry-run]
//        node scripts/simulate.mjs <task> --rereview <saved run> [same flags]   the same build, reviewed again
//        node scripts/simulate.mjs <task> --fix <saved run> [same flags]        fixes its findings (FIX.md), then reviews
//                                                                              the fixed build again (<run>/fixed/)
//        node scripts/simulate.mjs --probe          what a builder session sees of your setup (cheap, haiku)
//        node scripts/simulate.mjs --selftest
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMain, readJson } from "../hooks/common.mjs";
import { init } from "./init.mjs";
import { ORIGINAL, ROOT, TAXONOMY, readLessons } from "./lessons.mjs";

const HOUR = 60 * 60 * 1000;

/** An empty folder for a session, by its long path: on Windows os.tmpdir() can be an 8.3 short path (C:\Users\ABCDEF~1\…), and
 * Claude Code then treats files there as outside the project and denies every Write in dontAsk mode. */
export function workDir(prefix) {
  return realpathSync.native(mkdtempSync(path.join(os.tmpdir(), prefix)));
}

/** Local paths out of what a run saves, so a committed run names nobody's machine: the build folder becomes
 * `<build folder>` (in both slash styles), and any other home folder (C:\Users\<name>, /Users/<name>, /home/<name>,
 * short 8.3 forms included) becomes `~`. */
export function scrub(text, dir) {
  let out = text;
  for (const f of [...new Set([dir, dir.replace(/\\/g, "/")])]) out = out.split(f).join("<build folder>");
  return out.replace(/(?:[A-Za-z]:)?([\\/])(?:Users|home)\1[^\\/\s"'`)<>]+/g, "~");
}

/** Scrubs every text file of a saved run. */
export function scrubRun(target, dir) {
  for (const entry of readdirSync(target, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(md|json|mjs|js|html|css|txt|svg)$/.test(entry.name)) continue;
    const file = path.join(entry.parentPath ?? entry.path, entry.name);
    const text = readFileSync(file, "utf8");
    const clean = scrub(text, dir);
    if (clean !== text) writeFileSync(file, clean);
  }
}

/** The claude executable: CLAUDE_BIN, then `claude` on the PATH, then the copy the Claude desktop app brings on Windows. */
export function claudeBin(env = process.env) {
  if (env.CLAUDE_BIN) return env.CLAUDE_BIN;
  const onPath = spawnSync(process.platform === "win32" ? "where" : "which", ["claude"], { encoding: "utf8", env });
  if (onPath.status === 0 && onPath.stdout.trim()) return onPath.stdout.trim().split(/\r?\n/)[0];
  const packages = env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Packages");
  if (!packages || !existsSync(packages)) return null;
  const found = [];
  for (const app of readdirSync(packages).filter((d) => d.startsWith("Claude_"))) {
    const base = path.join(packages, app, "LocalCache", "Roaming", "Claude", "claude-code");
    if (!existsSync(base)) continue;
    for (const version of readdirSync(base)) for (const hash of readdirSync(path.join(base, version))) {
      const exe = path.join(base, version, hash, "claude.exe");
      if (existsSync(exe)) found.push({ exe, version });
    }
  }
  const newer = (a, b) => b.version.localeCompare(a.version, undefined, { numeric: true });
  return found.sort(newer)[0]?.exe ?? null;
}

/** Arguments and environment for an isolated headless session. `plugin`: a plugin folder to load into it (Ritual, for the
 * A/B runs), the only thing besides the request that the session gets. */
export function session({ prompt, model, tools, budget, env = process.env, plugin, system }) {
  const bare = !!env.ANTHROPIC_API_KEY;
  const args = [...(bare ? ["--bare"] : []), "-p", prompt, "--model", model, "--permission-mode", "dontAsk", ...(tools.length ? ["--allowedTools", ...tools] : []),
    ...(plugin ? ["--plugin-dir", plugin] : []), ...(system ? ["--append-system-prompt", system] : []),
    "--output-format", "json", "--max-turns", "80", "--max-budget-usd", String(budget), "--no-session-persistence",
    "--strict-mcp-config", "--disable-slash-commands", "--setting-sources", "project,local"];
  const clean = Object.fromEntries(Object.entries(env).filter(([k]) => !/^(ANTHROPIC_MODEL|ANTHROPIC_SMALL_FAST_MODEL|CLAUDE_PROJECT_DIR|CLAUDECODE|CLAUDE_CODE_ENTRYPOINT|CLAUDE_CODE_SESSION_ID)$/.test(k)));
  return { args, env: { ...clean, CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1", CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" }, bare };
}

const BUILDER_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "Bash(node:*)", "Bash(curl:*)", "PowerShell(node:*)", "PowerShell(curl:*)", "PowerShell(Invoke-WebRequest:*)"];
const REVIEWER_TOOLS = ["Read", "Write", "Glob", "Grep", "Bash(node:*)", "Bash(curl:*)", "PowerShell(node:*)", "PowerShell(curl:*)", "PowerShell(Invoke-WebRequest:*)"];

/** What the shell of a simulation session allows, told to every session that runs commands: without it every builder in the
 * A/B tried `cd … && node server.mjs & sleep 2; curl …`, was denied, and stopped, so no build was ever started or checked. */
export const SHELL_RULES = "Your shell runs only commands that start with `node`, `curl` or `Invoke-WebRequest`, and each part of a `&&` or `;` chain is checked the same way: `cd`, `sleep`, `Start-Sleep`, `Start-Process`, `VAR=value` prefixes and `$env:` assignments are denied. Set a port or an env variable and wait from inside Node (a small .mjs script you write here, or node -e), and start a server with the shell tool's run-in-background option.";

/** A builder's (or fixer's) session: the request, the builder tools, and the shell rules. */
export const builderSession = (opts) => session({ ...opts, tools: BUILDER_TOOLS, system: SHELL_RULES });

/** The client's request: TASK.md after its `---` line, exactly as written. */
export function taskText(task, language = ORIGINAL) {
  const file = path.join(ROOT, "simulations", task, language === ORIGINAL ? "TASK.md" : `TASK.${language}.md`);
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const at = text.indexOf("\n---\n");
  if (at < 0) throw new Error(`${path.relative(ROOT, file)} has no --- line before the client's request`);
  return text.slice(at + 5).trim();
}

/** The package a task belongs to, from the `Package: \`web\`` line of its TASK.md. */
export function taskPackage(task) {
  const pkg = readFileSync(path.join(ROOT, "simulations", task, "TASK.md"), "utf8").match(/^Package: `([a-z0-9-]+)`/m)?.[1];
  if (!pkg || !TAXONOMY.packages[pkg]) throw new Error(`simulations/${task}/TASK.md must say \`Package: \`<slug>\`\` with a package from lessons/taxonomy.json`);
  return pkg;
}

export function reviewPrompt({ task, request, builderSummary, lessons, month, builder }) {
  const review = readFileSync(path.join(ROOT, "simulations", task, "REVIEW.md"), "utf8");
  return [
    "You are the reviewer of a Ritual simulation. The current folder holds what another model built for the request below. Follow the guide exactly.",
    "", "## The request the builder got", "", request,
    "", "## What the builder said when it finished", "", builderSummary || "(nothing)",
    "", "## Your guide", "", review,
    "", "## Lessons to check",
    "For each lesson below, decide whether this build made that mistake: `broke` (with evidence you ran), `held` (you tried it and it did not happen), or `not-checked` (you could not try it here: for example the mobile and keyboard checks need a browser you don't have; reading the code is not running it).",
    ...lessons.map((l) => `- ${l.id} · ${l.title}\n  Detector question: ${(l.parts["Detector question"] ?? "").replace(/\s+/g, " ")}`),
    "", "## What to write, in English",
    `1. FINDINGS.md as the guide says, with \`origin: lab · ${builder} · ${month}\` and \`packages: ${lessons[0]?.data.packages ?? ""}\` on candidate lessons.`,
    "2. verdicts.json, exactly this shape:",
    '{ "lessons": { "<id>": { "verdict": "broke" | "held" | "not-checked", "evidence": "<command and output, one line>" } }, "new": [ { "title": "<a mistake no listed lesson covers>", "class": "<form|server|security|accessibility|mobile|data|false claim>", "evidence": "<one line>" } ] }',
    SHELL_RULES,
    "Fix nothing in the build. If a port is already in use, a process left by the build may still be running: use another port and do not count it as a finding. Stop any server you start before you finish.",
  ].join("\n");
}

/** Compares the verdicts of every run. @returns {{confirmed: string[], held: string[], mixed: string[], unchecked: string[], fresh: object[]}} */
export function compare(runs, ids) {
  const out = { confirmed: [], held: [], mixed: [], unchecked: [], fresh: runs.flatMap((r, i) => (r.new ?? []).map((n) => ({ ...n, run: i + 1 }))) };
  for (const id of ids) {
    const vs = runs.map((r) => r.lessons?.[id]?.verdict ?? "not-checked");
    if (vs.every((v) => v === "not-checked")) out.unchecked.push(id);
    else if (vs.every((v) => v === "broke")) out.confirmed.push(id);
    else if (vs.every((v) => v === "held")) out.held.push(id);
    else out.mixed.push(id);
  }
  return out;
}

/** One line about a session's spend, from its --output-format json. */
export const spend = (json) => `${json?.num_turns ?? "?"} turns · $${json?.total_cost_usd ?? "?"} · ${json?.usage?.output_tokens ?? "?"} output tokens${json?.permission_denials?.length ? ` · ${json.permission_denials.length} denied tool call(s)` : ""}`;

/** What Ritual did in a build, from the .ritual/local it left: whether the package lessons went out at the start, the
 * groups whose questions went out, the guard blocks, and whether the close sent the builder back to check. */
export function ritualTrace(local) {
  const sessions = path.join(local, "sessions");
  const states = existsSync(sessions) ? readdirSync(sessions).map((f) => readJson(path.join(sessions, f), {})) : [];
  const sent = [...new Set(states.flatMap((s) => s.sent ?? []))];
  const guard = path.join(local, "guard.jsonl");
  const blocks = existsSync(guard) ? readFileSync(guard, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l).rule; } catch { return "?"; } }) : [];
  return { brief: states.some((s) => s.brief), sent, blocks, closed: states.some((s) => s.closed) };
}

/** One line about what Ritual did in a build. */
export const traceLine = (t) => `Ritual: ${t.brief ? "package lessons at the start, " : ""}questions for ${t.sent?.join(", ") || "no group"}, ${t.blocks?.length ?? 0} guard block(s)${t.blocks?.length ? ` (${t.blocks.join(", ")})` : ""}${t.closed ? ", sent back once to check before finishing" : ""}`;

/** What the script writes into a saved run, next to the build (`fixed/` holds the fixed build and its review). */
const RUN_FILES = ["BUILDER.md", "REVIEWER.md", "FINDINGS.md", "verdicts.json", "run.json", "FIX.md", "fixed"];

/** What a blind review gets instead of the builder's last message. */
export const BLIND = "(not shown: this review is blind. Find how to start the build in its own files.)";

/** Lines in a build that could tell a blind reviewer it was built with Ritual: the word Ritual, a package lesson id, or
 * "lesson N". @returns {string[]} `file: line` for each. */
export function mentions(dir, ids) {
  const prefixed = ids.filter((id) => /^[A-Z]+-\d+$/.test(id));
  const pattern = new RegExp(["\\bRitual\\b", "\\b(?:lesson|lección|leccion)\\s+\\d+", ...(prefixed.length ? [`\\b(?:${prefixed.join("|")})\\b`] : [])].join("|"), "i");
  const out = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(md|json|mjs|js|cjs|html|css|txt)$/.test(entry.name)) continue;
    const file = path.join(entry.parentPath ?? entry.path, entry.name);
    for (const line of readFileSync(file, "utf8").split("\n")) if (pattern.test(line)) out.push(`${path.relative(dir, file)}: ${line.trim().slice(0, 120)}`);
  }
  return out;
}

/** The client's request again, with what the review found broken: every lesson that broke and every new mistake. */
export function fixPrompt(request, verdicts, lessons) {
  const title = Object.fromEntries(lessons.map((l) => [l.id, l.title]));
  const broke = Object.entries(verdicts.lessons ?? {}).filter(([, x]) => x.verdict === "broke").map(([id, x]) => `- ${title[id] ?? id}: ${x.evidence ?? ""}`);
  const fresh = (verdicts.new ?? []).map((n) => `- ${n.title}: ${n.evidence ?? ""}`);
  return [
    "The current folder holds what you built for the client's request below. A reviewer tried it and found the problems listed after it. Fix every one of them, check each fix, and say in one line per problem what you changed.",
    "", "## The client's request", "", request, "", "## What the reviewer found", "", ...(broke.length || fresh.length ? [...broke, ...fresh] : ["(nothing)"]),
  ].join("\n");
}

/** The saved runs named <prefix><n>, in order, with their verdicts and spend: a summary is rebuilt from them, so a run
 * reviewed again counts once, with its last review. */
export function collect(runsDir, prefix) {
  const names = existsSync(runsDir) ? readdirSync(runsDir).filter((d) => d.startsWith(prefix) && /^\d+$/.test(d.slice(prefix.length))) : [];
  return names.map((d) => ({ n: Number(d.slice(prefix.length)), verdicts: readJson(path.join(runsDir, d, "verdicts.json"), {}), spend: readJson(path.join(runsDir, d, "run.json"), {}) })).sort((a, b) => a.n - b.n);
}

export function summary({ task, month, builder, reviewer, cli, isolation, runs, result, ritual = false, spends = [] }) {
  const line = (title, ids, note) => `- **${title}** (${ids.length})${ids.length ? `: ${ids.join(", ")}` : ""}${note && ids.length ? `. ${note}` : ""}`;
  return [
    `# ${task} · ${month} · ${builder}${ritual === "start" ? " · Ritual without its close" : ritual ? " · with Ritual" : ""}`, "",
    `Built by \`${builder}\`${ritual ? ` with Ritual loaded (its hooks${ritual === "start" ? ", with the close turned off" : ""}; CLAUDE.md stays off, as in every run)` : ""}, reviewed by \`${reviewer}\`, ${runs} run(s), Claude Code ${cli}, isolation: ${isolation}.`, "",
    ...(spends.length ? ["## Spend", "", ...spends.map((s, i) => `- Run ${s.run ?? i + 1} · builder ${s.built} · reviewer ${s.reviewed}${s.ritual ? ` · ${traceLine(s.ritual)}` : ""}`), ""] : []),
    "## Lessons of the package", "",
    line("The mistake happened in every run", result.confirmed, `Confirmed with this model: \`node scripts/maintain.mjs seen <id> ${builder} ${month}\` for each.`),
    line("The mistake happened in no run", result.held, "Candidates to demote for this model: check the evidence before anything else."),
    line("The mistake happened in some runs only", result.mixed, "They stay as they are."),
    line("Not checked", result.unchecked, "This review could not try them (a browser check, for example)."), "",
    "## New mistakes", "",
    ...(result.fresh.length ? result.fresh.map((n) => `- Run ${n.run} · ${n.class ?? "?"} · ${n.title}: ${n.evidence ?? ""}`) : ["None."]), "",
    "A new mistake becomes a lesson only if it broke in every run: compare the runs' FINDINGS.md by meaning.", "",
  ].join("\n");
}

function run(bin, s, cwd, timeout = HOUR) {
  const r = spawnSync(bin, s.args, { cwd, env: s.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* not JSON: an error before the session started */ }
  return { status: r.status, json, stderr: (r.stderr ?? "").slice(-2000), stdout: json ? "" : (r.stdout ?? "").slice(-2000) };
}

const flag = (args, name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const VALUED = ["--runs", "--builder", "--reviewer", "--language", "--budget", "--rereview", "--tag", "--fix"];
/** The task: the first word that is neither a flag nor a flag's value (`--with-ritual web` names the task). */
export const taskArg = (args) => args.find((a, i) => !a.startsWith("--") && !VALUED.includes(args[i - 1]));

export function selftest() {
  const bad = [];
  const request = taskText("web");
  if (!request.startsWith("I need a web page for my bicycle repair shop") || request.includes("Handed to the builder")) bad.push(`taskText must be the client's request only: ${request.slice(0, 80)}`);
  if (!taskText("web", "es").startsWith("Necesito")) bad.push("taskText es should be the Spanish request");
  if (taskPackage("web") !== "web") bad.push("taskPackage web");
  const sub = session({ prompt: "x", model: "claude-sonnet-5-5", tools: BUILDER_TOOLS, budget: 5, env: { PATH: "p", ANTHROPIC_MODEL: "opus", CLAUDECODE: "1" } });
  for (const f of ["--strict-mcp-config", "--disable-slash-commands", "--no-session-persistence", "dontAsk"]) if (!sub.args.includes(f)) bad.push(`a session must pass ${f}`);
  if (sub.args.includes("--bare") || sub.bare) bad.push("without an API key, --bare can't authenticate and must not be used");
  if (sub.env.ANTHROPIC_MODEL || sub.env.CLAUDECODE || sub.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS !== "1" || sub.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY !== "1" || sub.env.PATH !== "p") bad.push(`the session env must drop the parent's model and session and turn off CLAUDE.md and memory: ${JSON.stringify(sub.env)}`);
  if (sub.args[sub.args.indexOf("--model") + 1] !== "claude-sonnet-5-5") bad.push("--model must be the one asked for");
  if (!session({ prompt: "x", model: "m", tools: [], budget: 1, env: { ANTHROPIC_API_KEY: "k" } }).args.includes("--bare")) bad.push("with an API key the session must be --bare");
  // The session folders must be long paths: in an 8.3 short path every Write was denied and the builder wrote nothing.
  const src = readFileSync(new URL(import.meta.url), "utf8");
  if (/const dir = mkdtempSync\(/.test(src)) bad.push("session folders must come from workDir() (long path), not mkdtempSync");
  // Twice a commit was blocked by a build saved in the repository with local paths, waiting for its review to be scrubbed.
  if (!/"run\.json"\), JSON\.stringify\(\{ built:[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*scrubRun\(target, dir\);/.test(src)) bad.push("a saved build must be scrubbed as soon as it is saved, before the review starts");
  const wd = workDir("ritual-sim-wd-");
  try { if (wd !== realpathSync.native(wd) || /~\d/.test(wd)) bad.push(`workDir must return the long path: ${wd}`); } finally { rmSync(wd, { recursive: true, force: true }); }
  // A saved run names no machine: the build folder and any home folder go, in every form.
  const dirty = "Built in C:\\Users\\Alex\\AppData\\Local\\Temp\\ritual-sim-web-x and C:/Users/Alex/AppData/Local/Temp/ritual-sim-web-x/a.js; also C:\\Users\\ALEXAN~1\\x, /home/alex/p and /Users/alex/p.";
  const scrubbed = scrub(dirty, "C:\\Users\\Alex\\AppData\\Local\\Temp\\ritual-sim-web-x");
  if (scrubbed !== "Built in <build folder> and <build folder>/a.js; also ~\\x, ~/p and ~/p.") bad.push(`scrub: ${scrubbed}`);
  // An empty --allowedTools swallows the next flag as a tool name: the probe got text instead of JSON.
  if (session({ prompt: "x", model: "m", tools: [], budget: 1, env: {} }).args.includes("--allowedTools")) bad.push("with no tools, --allowedTools must not be passed (it eats --output-format)");
  const lessons = readLessons().lessons.filter((l) => (l.data.packages ?? "").includes("web"));
  const prompt = reviewPrompt({ task: "web", request, builderSummary: "Done.", lessons, month: "2026-11", builder: "claude-sonnet-5-5" });
  for (const x of ["## Your guide", "Two quick clicks", "- WEB-1 · ", "verdicts.json", "origin: lab · claude-sonnet-5-5 · 2026-11", "packages: web", "Done."]) if (!prompt.includes(x)) bad.push(`the review prompt lacks «${x}»`);
  if (prompt.length > 30000) bad.push(`the review prompt is ${prompt.length} characters: too long for a Windows command line`);
  const runs = [
    { lessons: { A: { verdict: "broke" }, B: { verdict: "held" }, C: { verdict: "broke" }, D: { verdict: "not-checked" } }, new: [{ title: "t1", class: "form", evidence: "e" }] },
    { lessons: { A: { verdict: "broke" }, B: { verdict: "held" }, C: { verdict: "held" }, D: { verdict: "not-checked" }, E: { verdict: "broke" } } },
  ];
  const r = compare(runs, ["A", "B", "C", "D", "E"]);
  const got = JSON.stringify([r.confirmed, r.held, r.mixed, r.unchecked, r.fresh.map((f) => `${f.run}:${f.title}`)]);
  if (got !== JSON.stringify([["A"], ["B"], ["C", "E"], ["D"], ["1:t1"]])) bad.push(`compare: ${got}`);
  const text = summary({ task: "web", month: "2026-11", builder: "claude-sonnet-5-5", reviewer: "claude-opus-5-5", cli: "2.1.295", isolation: "bare", runs: 2, result: r });
  if (!text.includes("node scripts/maintain.mjs seen <id> claude-sonnet-5-5 2026-11") || !text.includes("**The mistake happened in no run** (1): B")) bad.push("the summary lacks the maintain command or the held lessons");
  // A/B: the Ritual half loads the plugin into the builder, and only there.
  const withPlugin = session({ prompt: "x", model: "m", tools: BUILDER_TOOLS, budget: 1, env: {}, plugin: "/p/ritual" }).args;
  if (withPlugin[withPlugin.indexOf("--plugin-dir") + 1] !== "/p/ritual") bad.push("with plugin, the session must pass --plugin-dir <plugin>");
  if (sub.args.includes("--plugin-dir")) bad.push("without plugin, the session must load none");
  // Two of three reviews ran nothing: every command was denied for not starting with an allowed program.
  if (!prompt.includes("start with `node`, `curl` or `Invoke-WebRequest`")) bad.push("the review prompt must say which commands its shell allows");
  // Every builder and fixer of the A/B had its shell denied and started nothing, so the close's web check never ran.
  const built = builderSession({ prompt: "x", model: "m", budget: 1, env: {} }).args;
  if (built[built.indexOf("--append-system-prompt") + 1] !== SHELL_RULES || !built.includes("Bash(node:*)")) bad.push("a builder session must get the builder tools and the shell rules");
  if (/run\(bin, session\(\{[^\n]*BUILDER_TOOLS/.test(src)) bad.push("builders and fixers must start through builderSession(), so none misses the shell rules");
  if (!spend({ num_turns: 1, permission_denials: [{}, {}] }).endsWith("· 2 denied tool call(s)")) bad.push("spend must count the denied tool calls");
  // Blind review: with Ritual the builder's last message named the lessons by id, so the reviewer knew the arm.
  const blindPrompt = reviewPrompt({ task: "web", request, builderSummary: BLIND, lessons, month: "2026-11", builder: "b" });
  if (!blindPrompt.includes(BLIND)) bad.push("a blind review prompt must say the builder's message is not shown");
  const leak = mkdtempSync(path.join(os.tmpdir(), "ritual-sim-leak-"));
  try {
    writeFileSync(path.join(leak, "server.mjs"), "// WEB-4: keep focus on the form\nconst x = 1;\n// UTF-8 and WEB-40 are not lessons\n");
    writeFileSync(path.join(leak, "README.md"), "Built following Ritual.\nSee lesson 41.\nNothing here.\n");
    const said = mentions(leak, ["32", "WEB-4", "WEB-5"]).sort();
    if (JSON.stringify(said) !== JSON.stringify(["README.md: Built following Ritual.", "README.md: See lesson 41.", "server.mjs: // WEB-4: keep focus on the form"])) bad.push(`mentions: ${JSON.stringify(said)}`);
    if (mentions(leak, ["32"]).some((m) => m.includes("Nothing here") || m.includes("const x"))) bad.push("mentions without prefixed ids must not match every line");
  } finally { rmSync(leak, { recursive: true, force: true }); }
  if (!summary({ task: "web", month: "m", builder: "b", reviewer: "r", cli: "1", isolation: "x", runs: 1, result: r, ritual: "start" }).includes("· Ritual without its close")) bad.push("the start-only arm's summary must say the close was off");
  if (!RUN_FILES.includes("fixed")) bad.push("a run's fixed/ folder must stay out of a build copied for review or fix");
  // A summary is rebuilt from the saved runs: a run reviewed again counts once, the summary and other modes don't count.
  const runsDir = mkdtempSync(path.join(os.tmpdir(), "ritual-sim-runs-"));
  try {
    for (const [d, v] of [["m-s-ritual-10", "held"], ["m-s-ritual-2", "broke"], ["m-s-ritual-1", "broke"], ["m-s-1", "held"]]) { mkdirSync(path.join(runsDir, d)); writeFileSync(path.join(runsDir, d, "verdicts.json"), JSON.stringify({ lessons: { A: { verdict: v } } })); }
    writeFileSync(path.join(runsDir, "m-s-ritual-1", "run.json"), JSON.stringify({ built: "3 turns" }));
    writeFileSync(path.join(runsDir, "m-s-ritual-summary.md"), "");
    const got = collect(runsDir, "m-s-ritual-");
    if (got.map((s) => s.n).join() !== "1,2,10" || got[0].spend.built !== "3 turns" || got[2].verdicts.lessons.A.verdict !== "held" || collect(runsDir, "m-s-").map((s) => s.n).join() !== "1") bad.push(`collect: ${JSON.stringify(got.map((s) => s.n))}`);
  } finally { rmSync(runsDir, { recursive: true, force: true }); }
  // The rework: every lesson that broke and every new mistake, with the reviewer's evidence; nothing that held.
  const fix = fixPrompt("Build me a page.", { lessons: { "WEB-3": { verdict: "broke", evidence: "no-JS submit shows nothing" }, "WEB-1": { verdict: "held", evidence: "ok" } }, new: [{ title: "Focus ring too faint", evidence: "2.0:1" }] }, lessons);
  if (!fix.includes("Build me a page.") || !fix.includes("- A fallback nobody tested is not a fallback: no-JS submit shows nothing") || !fix.includes("- Focus ring too faint: 2.0:1") || fix.includes("ok")) bad.push(`fixPrompt: ${fix}`);
  for (const [args, want] of [[["web", "--fix", "2026-10-s-1"], "web"], [["--tag", "v2", "web"], "web"], [["web", "--rereview", "2026-10-s-1"], "web"], [["--rereview", "2026-10-s-1", "web"], "web"], [["--with-ritual", "web"], "web"], [["--runs", "3", "web"], "web"], [["--dry-run", "web", "--language", "es"], "web"], [["--language", "es"], undefined]]) {
    if (taskArg(args) !== want) bad.push(`taskArg(${args.join(" ")}) should be ${want}, gave ${taskArg(args)}`);
  }
  if (spend({ num_turns: 3, total_cost_usd: 0.5, usage: { output_tokens: 100 } }) !== "3 turns · $0.5 · 100 output tokens" || spend(null) !== "? turns · $? · ? output tokens") bad.push(`spend: ${spend({ num_turns: 3, total_cost_usd: 0.5, usage: { output_tokens: 100 } })}`);
  const local = mkdtempSync(path.join(os.tmpdir(), "ritual-sim-trace-"));
  try {
    if (JSON.stringify(ritualTrace(local)) !== '{"brief":false,"sent":[],"blocks":[],"closed":false}') bad.push(`ritualTrace: an untouched project should show nothing given, sent, blocked or closed: ${JSON.stringify(ritualTrace(local))}`);
    mkdirSync(path.join(local, "sessions"));
    writeFileSync(path.join(local, "sessions", "a.json"), JSON.stringify({ sent: ["web-pages", "console-and-tools"] }));
    writeFileSync(path.join(local, "sessions", "b.json"), JSON.stringify({ sent: ["web-pages"], brief: true, closed: true }));
    writeFileSync(path.join(local, "guard.jsonl"), '{"rule":"verdict-through-tail","command":"x"}\n{"rule":"sed-on-code"}\n');
    const t = ritualTrace(local);
    if (JSON.stringify(t) !== '{"brief":true,"sent":["web-pages","console-and-tools"],"blocks":["verdict-through-tail","sed-on-code"],"closed":true}') bad.push(`ritualTrace: ${JSON.stringify(t)}`);
    const withText = summary({ task: "web", month: "2026-11", builder: "b", reviewer: "r", cli: "1", isolation: "x", runs: 1, result: r, ritual: true, spends: [{ built: "3 turns", reviewed: "9 turns", ritual: t }] });
    if (!withText.includes("· with Ritual") || !withText.includes("Run 1 · builder 3 turns · reviewer 9 turns · Ritual: package lessons at the start, questions for web-pages, console-and-tools, 2 guard block(s) (verdict-through-tail, sed-on-code), sent back once to check before finishing")) bad.push(`the Ritual summary lacks its spend or trace:\n${withText}`);
  } finally { rmSync(local, { recursive: true, force: true }); }
  const fake = mkdtempSync(path.join(os.tmpdir(), "ritual-sim-bin-"));
  try {
    if (claudeBin({ CLAUDE_BIN: "/x/claude" }) !== "/x/claude") bad.push("CLAUDE_BIN must win");
    const exe = (v) => path.join(fake, "Packages", "Claude_abc", "LocalCache", "Roaming", "Claude", "claude-code", v, "h", "claude.exe");
    for (const v of ["2.1.9", "2.1.295"]) { mkdirSync(path.dirname(exe(v)), { recursive: true }); writeFileSync(exe(v), ""); }
    const found = claudeBin({ LOCALAPPDATA: fake, PATH: "" });
    if (found !== exe("2.1.295")) bad.push(`claudeBin should find the newest desktop copy: ${found}`);
  } finally { rmSync(fake, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ simulate: isolated sessions, the client's request only, review prompt, runs compared");
    process.exit(bad ? 1 : 0);
  }
  const bin = claudeBin();
  if (!bin) { console.error("✕ claude not found: install the command line (https://code.claude.com/docs/en/setup) or set CLAUDE_BIN"); process.exit(1); }
  const cli = spawnSync(bin, ["--version"], { encoding: "utf8" }).stdout.trim().split(" ")[0];
  if (args.includes("--probe")) {
    const dir = workDir("ritual-probe-");
    const s = session({ prompt: "List, word for word where you can: every instruction you were given besides this message (CLAUDE.md, memory, plugins, hooks, output styles), every skill and slash command you can use, and every MCP server. If there is none of a kind, say NONE for it.", model: "haiku", tools: [], budget: 0.5 });
    const r = run(bin, s, dir, 5 * 60 * 1000);
    rmSync(dir, { recursive: true, force: true });
    console.log(`Claude Code ${cli} · isolation: ${s.bare ? "--bare (API key)" : "subscription, flags"}\n`);
    console.log(r.json?.result ?? `✕ exit ${r.status}\n${r.stderr}${r.stdout}`);
    console.log("\nA builder must see none of your CLAUDE.md, memory, plugins or MCP servers. If it names any, do not trust a run yet.");
    // The shell: a builder session gets a small site and must start it and reach it. The site leaves a file when it is
    // reached, so the check is the file and the denied calls, not what the model says it did.
    const site = workDir("ritual-probe-shell-");
    const port = 40000 + Math.floor(Math.random() * 20000);
    writeFileSync(path.join(site, "server.mjs"), `import http from "node:http";\nimport { writeFileSync } from "node:fs";\nhttp.createServer((req, res) => { writeFileSync("reached.txt", "yes"); res.end("hello"); }).listen(${port});\n`);
    const shell = run(bin, builderSession({ prompt: `server.mjs in this folder is a small site. Check its syntax, start it, confirm it answers on http://localhost:${port}, then stop it. Say in one line what you ran.`, model: flag(args, "--builder", "haiku"), budget: 0.5 }), site, 5 * 60 * 1000);
    const reached = existsSync(path.join(site, "reached.txt"));
    const denied = (shell.json?.permission_denials ?? []).map((d) => d.tool_input?.command ?? d.tool_name);
    try { rmSync(site, { recursive: true, force: true }); } catch { /* a server it left may still hold it */ }
    console.log(`\nShell: ${reached ? "✓ the builder started a site and reached it" : "✕ the builder did not reach the site it was asked to start"}${denied.length ? `; denied: ${denied.join(" | ")}` : ""}`);
    if (!reached) console.log(`Its last message: ${shell.json?.result ?? `exit ${shell.status} ${shell.stderr}`}\nWithout this, the close's web check never runs in a build: do not trust an A/B yet.`);
    process.exit(r.json?.result && reached ? 0 : 1);
  }
  const task = taskArg(args);
  if (!task || !existsSync(path.join(ROOT, "simulations", task, "TASK.md"))) { console.error("✕ usage: node scripts/simulate.mjs <task> [--runs 2] [--builder claude-sonnet-5-5] [--reviewer claude-opus-5-5] [--language en|es] [--budget 5] [--with-ritual] [--tag v2] [--dry-run] [--rereview <saved run>] | --probe | --selftest"); process.exit(1); }
  const runs = Number(flag(args, "--runs", "2")), builder = flag(args, "--builder", "claude-sonnet-5-5"), reviewer = flag(args, "--reviewer", "claude-opus-5-5");
  const language = flag(args, "--language", ORIGINAL), budget = Number(flag(args, "--budget", "5")), withRitual = args.includes("--with-ritual"), tag = flag(args, "--tag", "");
  const noClose = args.includes("--no-close"), blind = args.includes("--blind");
  if (noClose && !withRitual) { console.error("✕ --no-close only makes sense with --with-ritual"); process.exit(1); }
  const month = new Date().toISOString().slice(0, 7);
  const pkg = taskPackage(task);
  const lessons = readLessons().lessons.filter((l) => !l.merged && (l.data.packages ?? "").split(",").map((s) => s.trim()).includes(pkg));
  const request = taskText(task, language);
  const short = builder.replace(/^claude-/, "");
  if (tag && !/^[a-z0-9]+$/.test(tag)) { console.error("✕ --tag is one word of lowercase letters and digits, like v2"); process.exit(1); }
  // Runs and summary are named <month>-<model>-[ritual-][tag-]<n>: a tag starts a new set without touching the old one.
  const prefix = `${month}-${short}-${withRitual ? (noClose ? "ritual-start-" : "ritual-") : ""}${tag ? `${tag}-` : ""}`;
  const isolation = session({ prompt: "", model: builder, tools: [], budget }).bare ? "--bare (API key)" : "subscription, flags (checked with --probe?)";
  console.log(`Simulation ${task} (package ${pkg}, ${lessons.length} lesson(s) to check) · builder ${builder}${withRitual ? " with Ritual" : ""} · reviewer ${reviewer} · ${runs} run(s) · up to $${budget} per session · ${isolation} · Claude Code ${cli}`);
  if (args.includes("--dry-run")) {
    console.log(`\nBuilder prompt (the request, as written):\n${request}\n\nReview prompt: ${reviewPrompt({ task, request, builderSummary: "(the builder's last message)", lessons, month, builder }).length} characters, ${lessons.length} lesson(s).`);
    process.exit(0);
  }
  const runsDir = path.join(ROOT, "simulations", task, "runs");
  /** The review of a build in `dir`; saves what it left in `target`. @returns {boolean} whether it left verdicts. */
  const review = (dir, target, builderSummary, n) => {
    const reviewed = run(bin, session({ prompt: reviewPrompt({ task, request, builderSummary: blind ? BLIND : builderSummary, lessons, month, builder }), model: reviewer, tools: REVIEWER_TOOLS, budget }), dir);
    for (const f of ["FINDINGS.md", "verdicts.json"]) if (existsSync(path.join(dir, f))) cpSync(path.join(dir, f), path.join(target, f));
    writeFileSync(path.join(target, "REVIEWER.md"), `# What the reviewer said\n\n\`${reviewer}\` · ${reviewed.json?.subtype ?? `exit ${reviewed.status}`} · ${spend(reviewed.json)}\n\n${reviewed.json?.result ?? reviewed.stderr ?? "(no final message)"}\n`);
    const record = readJson(path.join(target, "run.json"), {});
    writeFileSync(path.join(target, "run.json"), JSON.stringify({ ...record, reviewed: spend(reviewed.json) }, null, 2) + "\n");
    scrubRun(target, dir);
    let v = null;
    try { v = JSON.parse(readFileSync(path.join(dir, "verdicts.json"), "utf8")); } catch { /* the reviewer did not leave verdicts */ }
    if (!v) { console.error(`✕ run ${n}: the reviewer left no readable verdicts.json (exit ${reviewed.status}). The build is kept in ${path.relative(ROOT, target)}.\n${reviewed.stderr}`); return false; }
    const all = Object.values(v.lessons ?? {});
    console.log(`  reviewed: ${all.filter((x) => x.verdict === "broke").length} lesson(s) broke, ${(v.new ?? []).length} new mistake(s). Saved in ${path.relative(ROOT, target)}`);
    // A review that tried nothing says nothing about the build: review the same build again, never build a new one in its place.
    if (all.length && all.every((x) => x.verdict === "not-checked")) console.error(`  ✕ this review checked no lesson. Read REVIEWER.md, then: node scripts/simulate.mjs ${task} --rereview ${path.basename(target)} ${args.filter((a) => a !== task).join(" ")}`);
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* a server may still hold it */ }
    return true;
  };
  const writeSummary = () => {

    const saved = collect(runsDir, prefix);
    const text = summary({ task, month, builder, reviewer, cli, isolation: `${isolation}${blind ? ", blind review" : ""}`, runs: saved.length, result: compare(saved.map((s) => s.verdicts), lessons.map((l) => l.id)), ritual: withRitual && (noClose ? "start" : true), spends: saved.filter((s) => s.spend.built).map((s) => ({ run: s.n, ...s.spend })) });
    const file = path.join(runsDir, `${prefix}summary.md`);
    writeFileSync(file, text);
    console.log(`\n${text}\nWritten to ${path.relative(ROOT, file)}. Nothing in lessons/ changed: apply what holds with /maintain.`);
  };
  const again = flag(args, "--rereview", null);
  if (again) {
    // The same build, reviewed again (after a review that could run nothing): its BUILDER.md and code stay as they are.
    const target = path.join(runsDir, again);
    const n = Number(again.match(/(\d+)$/)?.[1]);
    if (!existsSync(path.join(target, "BUILDER.md")) || !again.startsWith(prefix) || !/^\d+$/.test(again.slice(prefix.length))) { console.error(`✕ ${again} is not a saved run of this month, builder and mode (pass the same --builder, --language, --with-ritual and --tag as when it was built)`); process.exit(1); }
    const dir = workDir(`ritual-sim-${task}-`);
    cpSync(target, dir, { recursive: true, filter: (src) => path.dirname(src) !== target || !RUN_FILES.includes(path.basename(src)) });
    const builderSummary = readFileSync(path.join(target, "BUILDER.md"), "utf8").split("\n").slice(4).join("\n").trim();
    for (const f of ["FINDINGS.md", "verdicts.json"]) rmSync(path.join(target, f), { force: true });
    console.log(`\nRun ${n}: reviewing the saved build again …`);
    if (!review(dir, target, builderSummary, n)) process.exit(1);
    writeSummary();
    process.exit(0);
  }
  const toFix = flag(args, "--fix", null);
  if (toFix) {
    // The rework a build leaves: the same builder model, without Ritual whatever the build had, gets the reviewer's
    // findings and fixes them. Its spend goes next to the build's, so build + fix compares in full. The fixed code is
    // thrown away: the saved build stays the one that was reviewed.
    const target = path.join(runsDir, toFix);
    const v = readJson(path.join(target, "verdicts.json"), null);
    if (!v || !existsSync(path.join(target, "BUILDER.md"))) { console.error(`✕ ${toFix} is not a reviewed run (it needs BUILDER.md and verdicts.json)`); process.exit(1); }
    const dir = workDir(`ritual-sim-${task}-`);
    cpSync(target, dir, { recursive: true, filter: (src) => path.dirname(src) !== target || !RUN_FILES.includes(path.basename(src)) });
    console.log(`\nFixing what the review of ${toFix} found …`);
    const fixed = run(bin, builderSession({ prompt: fixPrompt(request, v, lessons), model: builder, budget }), dir);
    writeFileSync(path.join(target, "FIX.md"), `# Fixing what the review found\n\n\`${builder}\` · ${fixed.json?.subtype ?? `exit ${fixed.status}`} · ${spend(fixed.json)}\n\n${fixed.json?.result ?? fixed.stderr ?? "(no final message)"}\n`);
    writeFileSync(path.join(target, "run.json"), JSON.stringify({ ...readJson(path.join(target, "run.json"), {}), fixed: spend(fixed.json) }, null, 2) + "\n");
    scrubRun(target, dir);
    console.log(`  fixed: ${fixed.json?.subtype ?? "?"}, ${spend(fixed.json)}. Saved in ${path.relative(ROOT, path.join(target, "FIX.md"))}`);
    if (!fixed.json) process.exit(1);
    // A fix nobody checked is a claim: the fixed build is saved in <run>/fixed/ and reviewed again, the same way.
    const after = path.join(target, "fixed");
    rmSync(after, { recursive: true, force: true });
    cpSync(dir, after, { recursive: true });
    console.log("  reviewing the fixed build …");
    process.exit(review(dir, after, fixed.json.result, Number(toFix.match(/(\d+)$/)?.[1])) ? 0 : 1);
  }
  // Numbering goes on from the last saved run of this arm, so the arms of an A/B can be interleaved one run at a time.
  const first = Math.max(0, ...collect(runsDir, prefix).map((s) => s.n)) + 1;
  for (let n = first; n < first + runs; n++) {
    const target = path.join(ROOT, "simulations", task, "runs", `${prefix}${n}`);
    if (existsSync(target)) { console.error(`✕ ${path.relative(ROOT, target)} already exists: a run is never overwritten`); process.exit(1); }
    const dir = workDir(`ritual-sim-${task}-`);
    // With Ritual: the project is set up as a user would, with the task's package, before the builder starts.
    const setup = withRitual ? init(dir, { packages: [pkg], language, about: TAXONOMY.packages[pkg].covers }) : [];
    if (noClose) { const config = path.join(dir, ".ritual", "config.json"); writeFileSync(config, JSON.stringify({ ...readJson(config, {}), close: false }, null, 2) + "\n"); }
    const setupText = Object.fromEntries(["CLAUDE.md", ".gitignore"].filter((f) => setup.includes(f)).map((f) => [f, readFileSync(path.join(dir, f), "utf8")]));
    console.log(`\nRun ${n}: building in ${dir}${withRitual ? " with Ritual" : ""} …`);
    const built = run(bin, builderSession({ prompt: request, model: builder, budget, plugin: withRitual ? ROOT : undefined }), dir);
    if (!built.json) { console.error(`✕ the builder did not run (exit ${built.status}):\n${built.stderr}${built.stdout}`); process.exit(1); }
    // Ritual's own files leave before the review: the reviewer judges the build, not the setup.
    let trace = null;
    if (withRitual) {
      trace = ritualTrace(path.join(dir, ".ritual", "local"));
      rmSync(path.join(dir, ".ritual"), { recursive: true, force: true });
      for (const [f, text] of Object.entries(setupText)) if (readFileSync(path.join(dir, f), "utf8") === text) rmSync(path.join(dir, f));
      // A hook that never fired measures nothing: don't pay for a review of a run without Ritual labeled as one with it.
      if (!trace.brief && !trace.sent.length && !trace.blocks.length && !trace.closed) { console.error(`✕ Ritual's hooks left no trace in the build: no lessons or questions went out, nothing was blocked, no close. Check --plugin-dir with this Claude Code (${cli}).`); process.exit(1); }
      if (noClose && trace.closed) { console.error("✕ the close ran with \"close\": false: this run is not the start-only arm"); process.exit(1); }
    }
    // An empty folder is not a build: reviewing it would cost a session and measure nothing.
    if (!readdirSync(dir).length) { console.error(`✕ the builder left no files. Its last message:\n${built.json.result ?? ""}`); process.exit(1); }
    mkdirSync(target, { recursive: true });
    cpSync(dir, target, { recursive: true });
    writeFileSync(path.join(target, "BUILDER.md"), `# What the builder said\n\n\`${builder}\` · ${built.json.subtype ?? ""} · ${spend(built.json)}${trace ? ` · ${traceLine(trace)}` : ""}\n\n${built.json.result ?? "(no final message)"}\n`);
    const said = mentions(dir, lessons.map((l) => l.id));
    if (blind && said.length) console.error(`  ! the build mentions Ritual or a lesson ${said.length} time(s): the blind reviewer may tell the arm (run.json lists them)`);
    writeFileSync(path.join(target, "run.json"), JSON.stringify({ built: spend(built.json), ritual: trace, mentions: said }, null, 2) + "\n");
    // Scrubbed now, not only after the review: for the ten minutes a review takes, a commit would find the local paths.
    scrubRun(target, dir);
    console.log(`  built: ${built.json.subtype ?? "?"}, ${spend(built.json)}${trace ? `, ${traceLine(trace)}` : ""}. Reviewing …`);
    if (!review(dir, target, built.json.result, n)) process.exit(1);
  }
  writeSummary();
}
