#!/usr/bin/env node
// Runs a simulation with Claude Code headless: a builder model builds simulations/<task>/TASK.md in an empty folder,
// a reviewer model reviews it with REVIEW.md and checks each lesson of the task's package, twice by default. Then it
// compares the runs: a lesson that broke in every run is confirmed with that model, one that held in every run is a
// candidate to demote, the rest stays as it is. It never edits lessons: it prints the /maintain commands to apply.
// Isolation: with ANTHROPIC_API_KEY it uses --bare (no CLAUDE.md, plugins, hooks, memory or MCP). With a subscription
// login --bare can't authenticate, so it turns those off one by one; check it with --probe before trusting a run.
// With --with-ritual the builder works in a project set up with Ritual (the task's package) and the plugin loaded: the
// A/B half that measures what Ritual changes, in mistakes and in spend. Its runs and summary are named <month>-<model>-ritual-*.
// Usage: node scripts/simulate.mjs <task> [--runs 2] [--builder claude-sonnet-5-5] [--reviewer claude-opus-5-5]
//                                  [--language en|es] [--budget 5] [--with-ritual] [--dry-run]
//        node scripts/simulate.mjs <task> --rereview <saved run> [same flags]   the same build, reviewed again
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
export function session({ prompt, model, tools, budget, env = process.env, plugin }) {
  const bare = !!env.ANTHROPIC_API_KEY;
  const args = [...(bare ? ["--bare"] : []), "-p", prompt, "--model", model, "--permission-mode", "dontAsk", ...(tools.length ? ["--allowedTools", ...tools] : []),
    ...(plugin ? ["--plugin-dir", plugin] : []),
    "--output-format", "json", "--max-turns", "80", "--max-budget-usd", String(budget), "--no-session-persistence",
    "--strict-mcp-config", "--disable-slash-commands", "--setting-sources", "project,local"];
  const clean = Object.fromEntries(Object.entries(env).filter(([k]) => !/^(ANTHROPIC_MODEL|ANTHROPIC_SMALL_FAST_MODEL|CLAUDE_PROJECT_DIR|CLAUDECODE|CLAUDE_CODE_ENTRYPOINT|CLAUDE_CODE_SESSION_ID)$/.test(k)));
  return { args, env: { ...clean, CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1", CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" }, bare };
}

const BUILDER_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "Bash(node:*)", "Bash(curl:*)", "PowerShell(node:*)", "PowerShell(curl:*)"];
const REVIEWER_TOOLS = ["Read", "Write", "Glob", "Grep", "Bash(node:*)", "Bash(curl:*)", "PowerShell(node:*)", "PowerShell(curl:*)", "PowerShell(Invoke-WebRequest:*)"];

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
    "Your shell runs only commands that start with `node`, `curl` or `Invoke-WebRequest`, and each part of a `&&` or `;` chain is checked the same way: `cd`, `sleep`, `Start-Sleep`, `Start-Process`, `VAR=value` prefixes and `$env:` assignments are denied. Set a port or an env variable and wait from inside Node (a small .mjs script you write here, or node -e), and start a server with the shell tool's run-in-background option.",
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
export const spend = (json) => `${json?.num_turns ?? "?"} turns · $${json?.total_cost_usd ?? "?"} · ${json?.usage?.output_tokens ?? "?"} output tokens`;

/** What Ritual did in a build, from the .ritual/local it left: the groups whose questions went out, and the guard blocks. */
export function ritualTrace(local) {
  const sessions = path.join(local, "sessions");
  const sent = existsSync(sessions) ? [...new Set(readdirSync(sessions).flatMap((f) => { try { return JSON.parse(readFileSync(path.join(sessions, f), "utf8")).sent ?? []; } catch { return []; } }))] : [];
  const guard = path.join(local, "guard.jsonl");
  const blocks = existsSync(guard) ? readFileSync(guard, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l).rule; } catch { return "?"; } }) : [];
  return { sent, blocks };
}

/** What the script writes into a saved run, next to the build. */
const RUN_FILES = ["BUILDER.md", "REVIEWER.md", "FINDINGS.md", "verdicts.json", "run.json"];

/** The saved runs named <prefix><n>, in order, with their verdicts and spend: a summary is rebuilt from them, so a run
 * reviewed again counts once, with its last review. */
export function collect(runsDir, prefix) {
  const names = existsSync(runsDir) ? readdirSync(runsDir).filter((d) => d.startsWith(prefix) && /^\d+$/.test(d.slice(prefix.length))) : [];
  return names.map((d) => ({ n: Number(d.slice(prefix.length)), verdicts: readJson(path.join(runsDir, d, "verdicts.json"), {}), spend: readJson(path.join(runsDir, d, "run.json"), {}) })).sort((a, b) => a.n - b.n);
}

export function summary({ task, month, builder, reviewer, cli, isolation, runs, result, ritual = false, spends = [] }) {
  const line = (title, ids, note) => `- **${title}** (${ids.length})${ids.length ? `: ${ids.join(", ")}` : ""}${note && ids.length ? `. ${note}` : ""}`;
  return [
    `# ${task} · ${month} · ${builder}${ritual ? " · with Ritual" : ""}`, "",
    `Built by \`${builder}\`${ritual ? " with Ritual loaded (its hooks; CLAUDE.md stays off, as in every run)" : ""}, reviewed by \`${reviewer}\`, ${runs} run(s), Claude Code ${cli}, isolation: ${isolation}.`, "",
    ...(spends.length ? ["## Spend", "", ...spends.map((s, i) => `- Run ${s.run ?? i + 1} · builder ${s.built} · reviewer ${s.reviewed}${s.ritual ? ` · Ritual: questions for ${s.ritual.sent.join(", ") || "no group"}, ${s.ritual.blocks.length} guard block(s)${s.ritual.blocks.length ? ` (${s.ritual.blocks.join(", ")})` : ""}` : ""}`), ""] : []),
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
const VALUED = ["--runs", "--builder", "--reviewer", "--language", "--budget", "--rereview"];
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
  // A summary is rebuilt from the saved runs: a run reviewed again counts once, the summary and other modes don't count.
  const runsDir = mkdtempSync(path.join(os.tmpdir(), "ritual-sim-runs-"));
  try {
    for (const [d, v] of [["m-s-ritual-10", "held"], ["m-s-ritual-2", "broke"], ["m-s-ritual-1", "broke"], ["m-s-1", "held"]]) { mkdirSync(path.join(runsDir, d)); writeFileSync(path.join(runsDir, d, "verdicts.json"), JSON.stringify({ lessons: { A: { verdict: v } } })); }
    writeFileSync(path.join(runsDir, "m-s-ritual-1", "run.json"), JSON.stringify({ built: "3 turns" }));
    writeFileSync(path.join(runsDir, "m-s-ritual-summary.md"), "");
    const got = collect(runsDir, "m-s-ritual-");
    if (got.map((s) => s.n).join() !== "1,2,10" || got[0].spend.built !== "3 turns" || got[2].verdicts.lessons.A.verdict !== "held" || collect(runsDir, "m-s-").map((s) => s.n).join() !== "1") bad.push(`collect: ${JSON.stringify(got.map((s) => s.n))}`);
  } finally { rmSync(runsDir, { recursive: true, force: true }); }
  for (const [args, want] of [[["web", "--rereview", "2026-10-s-1"], "web"], [["--rereview", "2026-10-s-1", "web"], "web"], [["--with-ritual", "web"], "web"], [["--runs", "3", "web"], "web"], [["--dry-run", "web", "--language", "es"], "web"], [["--language", "es"], undefined]]) {
    if (taskArg(args) !== want) bad.push(`taskArg(${args.join(" ")}) should be ${want}, gave ${taskArg(args)}`);
  }
  if (spend({ num_turns: 3, total_cost_usd: 0.5, usage: { output_tokens: 100 } }) !== "3 turns · $0.5 · 100 output tokens" || spend(null) !== "? turns · $? · ? output tokens") bad.push(`spend: ${spend({ num_turns: 3, total_cost_usd: 0.5, usage: { output_tokens: 100 } })}`);
  const local = mkdtempSync(path.join(os.tmpdir(), "ritual-sim-trace-"));
  try {
    if (JSON.stringify(ritualTrace(local)) !== '{"sent":[],"blocks":[]}') bad.push("ritualTrace: an untouched project should show nothing sent and nothing blocked");
    mkdirSync(path.join(local, "sessions"));
    writeFileSync(path.join(local, "sessions", "a.json"), JSON.stringify({ sent: ["web-pages", "console-and-tools"] }));
    writeFileSync(path.join(local, "sessions", "b.json"), JSON.stringify({ sent: ["web-pages"] }));
    writeFileSync(path.join(local, "guard.jsonl"), '{"rule":"verdict-through-tail","command":"x"}\n{"rule":"sed-on-code"}\n');
    const t = ritualTrace(local);
    if (JSON.stringify(t) !== '{"sent":["web-pages","console-and-tools"],"blocks":["verdict-through-tail","sed-on-code"]}') bad.push(`ritualTrace: ${JSON.stringify(t)}`);
    const withText = summary({ task: "web", month: "2026-11", builder: "b", reviewer: "r", cli: "1", isolation: "x", runs: 1, result: r, ritual: true, spends: [{ built: "3 turns", reviewed: "9 turns", ritual: t }] });
    if (!withText.includes("· with Ritual") || !withText.includes("Run 1 · builder 3 turns · reviewer 9 turns · Ritual: questions for web-pages, console-and-tools, 2 guard block(s)")) bad.push(`the Ritual summary lacks its spend or trace:\n${withText}`);
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
    process.exit(r.json?.result ? 0 : 1);
  }
  const task = taskArg(args);
  if (!task || !existsSync(path.join(ROOT, "simulations", task, "TASK.md"))) { console.error("✕ usage: node scripts/simulate.mjs <task> [--runs 2] [--builder claude-sonnet-5-5] [--reviewer claude-opus-5-5] [--language en|es] [--budget 5] [--with-ritual] [--dry-run] [--rereview <saved run>] | --probe | --selftest"); process.exit(1); }
  const runs = Number(flag(args, "--runs", "2")), builder = flag(args, "--builder", "claude-sonnet-5-5"), reviewer = flag(args, "--reviewer", "claude-opus-5-5");
  const language = flag(args, "--language", ORIGINAL), budget = Number(flag(args, "--budget", "5")), withRitual = args.includes("--with-ritual");
  const month = new Date().toISOString().slice(0, 7);
  const pkg = taskPackage(task);
  const lessons = readLessons().lessons.filter((l) => !l.merged && (l.data.packages ?? "").split(",").map((s) => s.trim()).includes(pkg));
  const request = taskText(task, language);
  const short = builder.replace(/^claude-/, "");
  const isolation = session({ prompt: "", model: builder, tools: [], budget }).bare ? "--bare (API key)" : "subscription, flags (checked with --probe?)";
  console.log(`Simulation ${task} (package ${pkg}, ${lessons.length} lesson(s) to check) · builder ${builder}${withRitual ? " with Ritual" : ""} · reviewer ${reviewer} · ${runs} run(s) · up to $${budget} per session · ${isolation} · Claude Code ${cli}`);
  if (args.includes("--dry-run")) {
    console.log(`\nBuilder prompt (the request, as written):\n${request}\n\nReview prompt: ${reviewPrompt({ task, request, builderSummary: "(the builder's last message)", lessons, month, builder }).length} characters, ${lessons.length} lesson(s).`);
    process.exit(0);
  }
  const runsDir = path.join(ROOT, "simulations", task, "runs");
  /** The review of a build in `dir`; saves what it left in `target`. @returns {boolean} whether it left verdicts. */
  const review = (dir, target, builderSummary, n) => {
    const reviewed = run(bin, session({ prompt: reviewPrompt({ task, request, builderSummary, lessons, month, builder }), model: reviewer, tools: REVIEWER_TOOLS, budget }), dir);
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
    const prefix = `${month}-${short}-${withRitual ? "ritual-" : ""}`;
    const saved = collect(runsDir, prefix);
    const text = summary({ task, month, builder, reviewer, cli, isolation, runs: saved.length, result: compare(saved.map((s) => s.verdicts), lessons.map((l) => l.id)), ritual: withRitual, spends: saved.filter((s) => s.spend.built).map((s) => ({ run: s.n, ...s.spend })) });
    const file = path.join(runsDir, `${prefix}summary.md`);
    writeFileSync(file, text);
    console.log(`\n${text}\nWritten to ${path.relative(ROOT, file)}. Nothing in lessons/ changed: apply what holds with /maintain.`);
  };
  const again = flag(args, "--rereview", null);
  if (again) {
    // The same build, reviewed again (after a review that could run nothing): its BUILDER.md and code stay as they are.
    const target = path.join(runsDir, again);
    const n = Number(again.match(/(\d+)$/)?.[1]);
    if (!existsSync(path.join(target, "BUILDER.md")) || !again.startsWith(`${month}-${short}-${withRitual ? "ritual-" : ""}`) || !/^\d+$/.test(again.slice(`${month}-${short}-${withRitual ? "ritual-" : ""}`.length))) { console.error(`✕ ${again} is not a saved run of this month, builder and mode (pass the same --builder, --language and --with-ritual as when it was built)`); process.exit(1); }
    const dir = workDir(`ritual-sim-${task}-`);
    cpSync(target, dir, { recursive: true, filter: (src) => path.dirname(src) !== target || !RUN_FILES.includes(path.basename(src)) });
    const builderSummary = readFileSync(path.join(target, "BUILDER.md"), "utf8").split("\n").slice(4).join("\n").trim();
    for (const f of ["FINDINGS.md", "verdicts.json"]) rmSync(path.join(target, f), { force: true });
    console.log(`\nRun ${n}: reviewing the saved build again …`);
    if (!review(dir, target, builderSummary, n)) process.exit(1);
    writeSummary();
    process.exit(0);
  }
  for (let n = 1; n <= runs; n++) {
    const target = path.join(ROOT, "simulations", task, "runs", `${month}-${short}-${withRitual ? "ritual-" : ""}${n}`);
    if (existsSync(target)) { console.error(`✕ ${path.relative(ROOT, target)} already exists: a run is never overwritten`); process.exit(1); }
    const dir = workDir(`ritual-sim-${task}-`);
    // With Ritual: the project is set up as a user would, with the task's package, before the builder starts.
    const setup = withRitual ? init(dir, { packages: [pkg], language, about: TAXONOMY.packages[pkg].covers }) : [];
    const setupText = Object.fromEntries(["CLAUDE.md", ".gitignore"].filter((f) => setup.includes(f)).map((f) => [f, readFileSync(path.join(dir, f), "utf8")]));
    console.log(`\nRun ${n}: building in ${dir}${withRitual ? " with Ritual" : ""} …`);
    const built = run(bin, session({ prompt: request, model: builder, tools: BUILDER_TOOLS, budget, plugin: withRitual ? ROOT : undefined }), dir);
    if (!built.json) { console.error(`✕ the builder did not run (exit ${built.status}):\n${built.stderr}${built.stdout}`); process.exit(1); }
    // Ritual's own files leave before the review: the reviewer judges the build, not the setup.
    let trace = null;
    if (withRitual) {
      trace = ritualTrace(path.join(dir, ".ritual", "local"));
      rmSync(path.join(dir, ".ritual"), { recursive: true, force: true });
      for (const [f, text] of Object.entries(setupText)) if (readFileSync(path.join(dir, f), "utf8") === text) rmSync(path.join(dir, f));
      // A hook that never fired measures nothing: don't pay for a review of a run without Ritual labeled as one with it.
      if (!trace.sent.length && !trace.blocks.length) { console.error(`✕ Ritual's hooks left no trace in the build: no questions went out and nothing was blocked. Check --plugin-dir with this Claude Code (${cli}).`); process.exit(1); }
    }
    // An empty folder is not a build: reviewing it would cost a session and measure nothing.
    if (!readdirSync(dir).length) { console.error(`✕ the builder left no files. Its last message:\n${built.json.result ?? ""}`); process.exit(1); }
    mkdirSync(target, { recursive: true });
    cpSync(dir, target, { recursive: true });
    writeFileSync(path.join(target, "BUILDER.md"), `# What the builder said\n\n\`${builder}\` · ${built.json.subtype ?? ""} · ${spend(built.json)}${trace ? ` · Ritual: questions for ${trace.sent.join(", ") || "no group"}, ${trace.blocks.length} guard block(s)` : ""}\n\n${built.json.result ?? "(no final message)"}\n`);
    writeFileSync(path.join(target, "run.json"), JSON.stringify({ built: spend(built.json), ritual: trace }, null, 2) + "\n");
    console.log(`  built: ${built.json.subtype ?? "?"}, ${spend(built.json)}${trace ? `, Ritual sent ${trace.sent.length} group(s) and blocked ${trace.blocks.length}` : ""}. Reviewing …`);
    if (!review(dir, target, built.json.result, n)) process.exit(1);
  }
  writeSummary();
}
