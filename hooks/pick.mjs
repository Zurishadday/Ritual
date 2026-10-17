#!/usr/bin/env node
// Picks, in the background, the lessons that apply to what Claude is doing now, from every group: the request the user
// just sent, or a file Claude is about to write for the first time in the session. A small model (Haiku) reads the
// work and the one-line catalog of active lessons and answers with their ids; the next tool call shows the ones this
// session hasn't seen yet. A pick takes 10 to 25 seconds, so it runs in its own process; only the first step after a
// request waits for it (awaitRequest), because context given in PreToolUse reaches Claude after the tool has run.
// Measured on the 12 clinic builds: Haiku picking per request and per file found all 61 lessons that broke in them,
// showing about 12 of 63 per file; a small embedding model as a filter found 84% only when it showed 30.
// The group questions stay as they are: without `claude`, offline, or when a pick fails, nothing is lost.
// `"picker": false` in .ritual/config.json turns it off. Usage: node hooks/pick.mjs --selftest
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMain, readJson } from "./common.mjs";

const MAX_PICKS = 40; // file picks per session: a long session that touches many files can't keep spending without end.
// A request is always picked: it is what the first step waits for, and a long session reached 40 by 17:30 on
// 2026-10-16, after which no request got its lessons.
const MAX_WORK = 9000; // characters of the work a pick reads: the start of a file says what it does
const WAIT_MS = 25000; // the longest a first step waits for its request's pick; a pick took 10 to 25 s on 2026-10-16
const STALE_MS = 5 * 60000; // a request pick still pending after this belongs to an old turn
const ASK_MS = 90000; // a Haiku call still running after this is stuck: it is stopped, not left holding memory

const question = (l) => (l.parts["Detector question"] ?? Object.values(l.parts)[2] ?? "").replace(/\s+/g, " ");
export const lessonLine = (l) => `- ${l.id} · ${l.title} · ${question(l)}`;

export function pickPrompt(lessons, work) {
  return [
    "A coding agent is about to do the work below. Each lesson describes a mistake agents make, in general terms. Choose every lesson whose mistake could happen in this work, even if the lesson uses different words or a different kind of project; when in doubt, include it: missing a lesson that applies is worse than including one that doesn't.",
    "Answer with only a JSON array of lesson ids, for example [\"41\",\"WEB-2\"].", "", "## The work", String(work).slice(0, MAX_WORK), "", "## Lessons",
    ...lessons.map((l) => `${l.id} · ${l.title} · ${question(l)}`),
  ].join("\n");
}

/** The ids in the model's answer that name an active lesson. Anything else it wrote is ignored: its answer only ever
 * selects lessons, it never becomes text in front of Claude. */
export function parseIds(answer, valid) {
  const known = new Set(valid);
  for (const m of String(answer ?? "").matchAll(/\[[^\[\]]*\]/g)) {
    try { return [...new Set(JSON.parse(m[0]).map(String))].filter((id) => known.has(id)); } catch { /* not this one */ }
  }
  return [];
}

const dirOf = (ritual, sessionId) => path.join(ritual, "local", "picks", String(sessionId || "no-id").replace(/[^\w-]/g, "_"));
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
// A job's name says its kind (file- or request-), so only file picks count against the cap.
const jobOf = (ritual, sessionId, key) => path.join(dirOf(ritual, sessionId), `${key.split(":")[0]}-${hash(key)}.job.json`);

/** Queues a pick for this work, once per key and session, and starts it in its own process unless `run` is given
 * (the selftest runs it in place). @returns {string | null} the job file, or null when skipped. */
export function startPick(ritual, sessionId, { key, label, work }, lessons, { run } = {}) {
  const dir = dirOf(ritual, sessionId);
  const job = jobOf(ritual, sessionId, key);
  if (existsSync(job)) return null;
  let list;
  try {
    mkdirSync(dir, { recursive: true });
    if (key.startsWith("file:") && readdirSync(dir).filter((f) => f.startsWith("file-") && f.endsWith(".job.json")).length >= MAX_PICKS) return null;
    list = typeof lessons === "function" ? lessons() : lessons; // read only when a pick is really queued
    // The job keeps no words of the work: the request and the file go to the worker through its stdin, never to disk,
    // where a synced folder (OneDrive) would upload them.
    writeFileSync(job, JSON.stringify({ key, label, ids: list.map((l) => l.id) }));
  } catch { return null; }
  const prompt = pickPrompt(list, work);
  if (run) return run(job, prompt), job;
  try {
    const worker = spawn(process.execPath, [import.meta.filename, "--run", job], { detached: true, stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
    worker.on("error", () => { /* no pick */ });
    worker.stdin.on("error", () => { /* no pick */ });
    worker.stdin.end(prompt);
    worker.unref();
  } catch { /* no pick */ }
  return job;
}

/** Asks Haiku through the Claude Code the user already has: no other account, key or download. Its session loads no
 * plugin, CLAUDE.md or memory, runs in an empty folder, and RITUAL_PICKER keeps Ritual's own hooks quiet in it. */
export async function askHaiku(prompt) {
  const { claudeBin, session } = await import("../scripts/simulate.mjs");
  const bin = claudeBin();
  if (!bin) return { text: "", error: "claude was not found" };
  const cwd = mkdtempSync(path.join(os.tmpdir(), "ritual-pick-"));
  const s = session({ prompt, model: "haiku", tools: [], budget: 0.2 });
  try {
    return await new Promise((resolve) => {
      const p = spawn(bin, s.args, { cwd, env: { ...s.env, RITUAL_PICKER: "1" }, windowsHide: true });
      let out = "", err = "";
      const timer = setTimeout(() => { p.kill(); resolve({ text: "", error: `Haiku took over ${ASK_MS / 1000} s` }); }, ASK_MS);
      p.stdout.on("data", (d) => (out += d));
      p.stderr.on("data", (d) => (err += d));
      p.on("error", (e) => { clearTimeout(timer); resolve({ text: "", error: `claude did not start: ${e.code ?? e.message}` }); });
      p.on("close", (code) => {
        clearTimeout(timer);
        let j = null; try { j = JSON.parse(out); } catch { /* not JSON */ }
        if (j && !j.is_error) resolve({ text: String(j.result ?? "") });
        else resolve({ text: "", error: String(j?.result || err || `claude exited with ${code}`).replace(/\s+/g, " ").slice(0, 200) });
      });
    });
  } finally { try { rmSync(cwd, { recursive: true, force: true }); } catch { /* left behind */ } }
}

/** Runs one queued pick and writes what it found next to it, and why it found nothing when the model failed. */
export async function runJob(job, prompt, ask = askHaiku) {
  const j = readJson(job, null);
  if (!j) return;
  const r = prompt ? await ask(prompt) : { text: "", error: "the worker got no work" };
  const text = typeof r === "string" ? r : r.text;
  const answered = /\[[^\[\]]*\]/.test(text ?? "");
  const error = answered ? undefined : r?.error ?? "Haiku answered without a list of ids";
  try { writeFileSync(job.replace(/\.job\.json$/, ".done.json"), JSON.stringify({ key: j.key, label: j.label, ids: parseIds(text, j.ids), answered, error })); } catch { /* lost pick */ }
}

/** Why a request got no pick, for the first-step log, or null when it needs none: the same request was picked before,
 * and its lessons were shown then. A request is never capped, so anything else is a failure to queue it. */
export const skipReason = (ritual, sessionId, { key }) => (existsSync(jobOf(ritual, sessionId, key)) ? null : "the pick could not be queued");

/** The lessons finished picks found that this session hasn't been shown yet, as context for Claude; marks them shown
 * and the picks delivered in `state` (the session state the caller saves). @returns {string | null} */
export function deliver(ritual, sessionId, state, lessons) {
  const dir = dirOf(ritual, sessionId);
  if (!existsSync(dir)) return null;
  state.delivered ??= [];
  state.shown ??= [];
  const pending = readdirSync(dir).filter((f) => f.endsWith(".done.json") && !state.delivered.includes(f)).sort();
  if (!pending.length) return null;
  const byId = new Map((typeof lessons === "function" ? lessons() : lessons).map((l) => [l.id, l]));
  const fresh = [], labels = [];
  for (const f of pending) {
    state.delivered.push(f);
    const done = readJson(path.join(dir, f), null);
    const ids = (done?.ids ?? []).filter((id) => byId.has(id) && !state.shown.includes(id) && !fresh.includes(id));
    if (ids.length) { fresh.push(...ids); labels.push(done.label); }
  }
  if (!fresh.length) return null;
  state.shown.push(...fresh);
  return [
    `Ritual · lessons picked for what you are doing now (${labels.join("; ")}). Before you go on, check the work against each; if one applies, act on it and say so in one line. Reply to the user in their language.`,
    ...fresh.map((id) => lessonLine(byId.get(id))),
  ].join("\n");
}

/** The first tool call after a request waits for that request's pick (`state.awaiting`, set when the request queued it),
 * so its lessons can stop the step instead of arriving with its result: context given in PreToolUse reaches Claude only
 * after the tool ran. Measured on 2026-10-16 over 1,171 requests that used a tool: the median wait is 3 s and 44% wait
 * nothing; a chat with no tool call never waits. @returns {Promise<null | {ms: number, done: object | null}>} null
 * when this call is not that first step; else how long it waited and the finished pick, or null if it never came. */
export async function awaitRequest(state, { wait = WAIT_MS, poll = 200 } = {}) {
  const pending = state.awaiting;
  if (!pending) return null;
  delete state.awaiting;
  if (!(Date.now() - pending.at < STALE_MS)) return null;
  const done = String(pending.job).replace(/\.job\.json$/, ".done.json");
  const start = Date.now();
  while (!existsSync(done) && Date.now() - start < wait) await new Promise((r) => setTimeout(r, poll));
  return { ms: Date.now() - start, done: existsSync(done) ? readJson(done, {}) : null };
}

/** What happened at a first step, for the log: the rule holds when the lessons were there before the step. */
export function firstStepEntry(first, stopped) {
  if (!first.done) return { outcome: "missed", ms: first.ms, reason: `the pick was not done after ${Math.round(first.ms / 1000)} s` };
  if (first.done.answered === false) return { outcome: "missed", ms: first.ms, reason: first.done.error ?? "Haiku gave no answer" };
  return { outcome: stopped ? "stopped" : "nothing new", ms: first.ms };
}

/** Why a first step is stopped: the lessons it should have before it runs, and to do it again. */
export const stopReason = (text) => `Ritual · not yet: before this step, read the lessons picked for the request. Then do the step again, changed if one applies, and say so in one line.\n\n${text}`;

// Files a pick never reads, so their content never leaves the machine for one: secrets and keys, Ritual's own notes,
// and anything outside the project (`rel` is then an absolute path).
const PRIVATE = [
  /(^|\/)\.env(\.[^/]*)?$/i, /\.(pem|key|p12|pfx|jks|keystore|kdbx|tfvars|tfstate)$/i, /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /(^|\/)\.(npmrc|pypirc|netrc|pgpass|git-credentials|htpasswd)$/i, /(^|\/)[^/]*(secret|credential)s?(\.[^/.]+)?$/i,
  /(^|\/)secrets?\//i, /(^|\/)\.(ritual|ssh|aws|gnupg)\//i,
];
export const privateFile = (rel) => !rel || rel.startsWith("..") || path.isAbsolute(rel) || /^[A-Za-z]:/.test(rel) || PRIVATE.some((r) => r.test(rel));

// What looks like a secret inside a request or a file is covered before it goes to the model. A pick needs what the
// work does, never the value of a key.
const SECRETS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, "[private key]"],
  [/\b(sk|pk|rk)[-_](live|test|ant|proj)[-_][A-Za-z0-9_-]{12,}/g, "[key]"], [/\bsk-[A-Za-z0-9_-]{20,}/g, "[key]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[key]"], [/\bgh[pousr]_[A-Za-z0-9]{30,}/g, "[token]"], [/\bgithub_pat_[A-Za-z0-9_]{30,}/g, "[token]"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, "[token]"], [/\bAIza[0-9A-Za-z_-]{35}/g, "[key]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[token]"],
  [/\b(\w+:\/\/[^\s:/@]+:)[^\s@/]+@/g, "$1[password]@"],
  [/((?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret)["']?\s*[:=]\s*)(["'`])[^"'`\n]{4,}\2/gi, "$1$2[redacted]$2"],
  [/^(\s*[A-Z][A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|API_KEY|ACCESS_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*=\s*)\S.*$/gm, "$1[redacted]"],
];
export const redact = (text) => SECRETS.reduce((t, [re, to]) => t.replace(re, to), String(text ?? ""));

/** The work a tool call is about to do, when it is a pick: writing a file for the first time. */
export function workOf(input, rel) {
  const t = input?.tool_input ?? {};
  const text = t.content ?? t.new_string ?? (Array.isArray(t.edits) ? t.edits.map((e) => e.new_string).join("\n") : "");
  if (!/^(Write|Edit|MultiEdit)$/.test(input?.tool_name ?? "") || privateFile(rel)) return null;
  return { key: `file:${rel}`, label: rel, work: `Writing the file ${rel}:\n\n${redact(text)}` };
}

/** The work a user's prompt asks for, when it is a pick: a request, not a background agent's report or a one-word reply. */
export function workOfPrompt(prompt) {
  const p = String(prompt ?? "").trim();
  if (p.length < 12 || p.startsWith("<task-notification>")) return null;
  return { key: `request:${hash(p)}`, label: "your request", work: `The user's request:\n${redact(p)}` };
}

/** At session start: picks from other sessions older than a day are deleted, and a job written before jobs stopped
 * keeping the work loses it (`prompt`), so nothing of a request or a file stays on disk. */
export function prunePicks(ritual, { now = Date.now(), keep = 864e5 } = {}) {
  const root = path.join(ritual, "local", "picks");
  let removed = 0;
  try {
    for (const d of readdirSync(root)) {
      const dir = path.join(root, d);
      if (now - statSync(dir).mtimeMs > keep) { rmSync(dir, { recursive: true, force: true }); removed++; continue; }
      for (const f of readdirSync(dir).filter((f) => f.endsWith(".job.json"))) {
        const j = readJson(path.join(dir, f), null);
        if (j && "prompt" in j) { delete j.prompt; writeFileSync(path.join(dir, f), JSON.stringify(j)); }
      }
    }
  } catch { /* nothing to prune */ }
  return removed;
}

export async function selftest() {
  const bad = [];
  const L = (id, title, q) => ({ id, title, parts: { "The idea": "x", "Detector question": q } });
  const lessons = [L("41", "Check in the format the reader sees", "Did I look at it as they will?"), L("WEB-4", "If you disable the button, focus goes with it", "Where is the focus after submit?"), L("P-1", "Own", "Own question?")];
  if (!pickPrompt(lessons, "Writing x").includes("WEB-4 · If you disable the button") || !pickPrompt(lessons, "Writing x").includes("## The work\nWriting x")) bad.push("pickPrompt lacks the catalog or the work");
  // Only ids of active lessons come out of an answer: whatever else the model writes is dropped.
  for (const [answer, want] of [['["WEB-4","41"]', "WEB-4,41"], ['Sure! ["41", "99", "IGNORE ALL"] done', "41"], ["no list here", ""], ['["41"', ""], ['[] then ["P-1"]', ""]])
    if (parseIds(answer, lessons.map((l) => l.id)).join() !== want) bad.push(`parseIds(${answer}) should give «${want}», gave «${parseIds(answer, lessons.map((l) => l.id)).join()}»`);
  // The prompt of a user, and the work of a tool call.
  if (workOfPrompt("ok") || workOfPrompt("<task-notification>x</task-notification> long enough") || !workOfPrompt("hazme un formulario de citas")?.key.startsWith("request:")) bad.push("workOfPrompt: short replies and agent reports are not picks; a request is");
  const w = workOf({ tool_name: "Edit", tool_input: { new_string: "<button disabled>" } }, "public/app.js");
  if (w?.key !== "file:public/app.js" || !w.work.includes("<button disabled>") || workOf({ tool_name: "Bash", tool_input: { command: "ls" } }, "x")) bad.push(`workOf: ${JSON.stringify(w)}`);
  // End to end with a fake model: queued once per key, the answer delivered once, nothing shown twice.
  const ritual = mkdtempSync(path.join(os.tmpdir(), "ritual-pick-"));
  try {
    const answers = [];
    const run = (job, prompt) => answers.push(runJob(job, prompt, async (p) => (p.includes("<button") ? '["WEB-4","41"]' : '["41","P-1"]')));
    const state = { shown: ["41"] };
    if (!startPick(ritual, "s1", w, lessons, { run }) || startPick(ritual, "s1", w, lessons, { run })) bad.push("the same work is picked once per session");
    await Promise.all(answers);
    const first = deliver(ritual, "s1", state, lessons) ?? "";
    if (!first.includes("- WEB-4 · If you disable the button") || first.includes("- 41 · ") || !first.includes("(public/app.js)")) bad.push(`the first delivery shows WEB-4 and not 41, already shown:\n${first}`);
    if (deliver(ritual, "s1", state, lessons) !== null) bad.push("a pick is delivered once");
    startPick(ritual, "s1", workOfPrompt("hazme un formulario de citas"), lessons, { run });
    await Promise.all(answers);
    const second = deliver(ritual, "s1", state, lessons) ?? "";
    if (!second.includes("- P-1 · Own") || second.includes("- 41 · ") || second.includes("WEB-4")) bad.push(`the second delivery shows only what is new:\n${second}`);
    // The first step after a request waits for its pick, once; an old turn's pick or no request means no wait.
    const job = path.join(ritual, "wait.job.json");
    if (await awaitRequest({}) !== null) bad.push("with no request pending, a step is not a first step");
    const state2 = { awaiting: { job, at: Date.now() } };
    setTimeout(() => writeFileSync(job.replace(".job.json", ".done.json"), JSON.stringify({ ids: ["41"], answered: true })), 300);
    let t = Date.now();
    const waited = await awaitRequest(state2, { wait: 5000, poll: 20 });
    if (!waited?.done || Date.now() - t < 250 || Date.now() - t > 3000) bad.push(`the first step waits until the pick is done: ${Date.now() - t} ms`);
    if (state2.awaiting || await awaitRequest(state2) !== null) bad.push("only the first step after a request waits");
    t = Date.now();
    const never = await awaitRequest({ awaiting: { job: path.join(ritual, "never.job.json"), at: Date.now() } }, { wait: 200, poll: 20 });
    if (!never || never.done !== null || Date.now() - t > 2000) bad.push("a pick that never finishes stops the wait at its limit");
    if (await awaitRequest({ awaiting: { job, at: Date.now() - 10 * 60000 } }) !== null) bad.push("a pick from an old turn is not waited for");
    // Every first step is logged; a missed one says why.
    const outcomes = [firstStepEntry(waited, true), firstStepEntry(waited, false), firstStepEntry(never, false), firstStepEntry({ ms: 9000, done: { answered: false, error: "Not logged in" } }, false)];
    const want = ["stopped", "nothing new", "missed: the pick was not done after", "missed: Not logged in"];
    outcomes.forEach((o, i) => { if (!`${o.outcome}${o.reason ? `: ${o.reason}` : ""}`.startsWith(want[i])) bad.push(`firstStepEntry ${i}: ${JSON.stringify(o)}, want «${want[i]}»`); });
    // A failed model call is recorded as unanswered, with why; an answer with an empty list is an answer.
    const failed = path.join(ritual, "failed.job.json");
    writeFileSync(failed, JSON.stringify({ key: "k", label: "x", prompt: "p", ids: ["41"] }));
    await runJob(failed, "p", async () => ({ text: "", error: "Not logged in" }));
    const f = readJson(failed.replace(".job.json", ".done.json"), {});
    if (f.answered !== false || f.error !== "Not logged in") bad.push(`a failed call is recorded with its reason: ${JSON.stringify(f)}`);
    await runJob(failed, "p", async () => "[]");
    if (readJson(failed.replace(".job.json", ".done.json"), {}).answered !== true) bad.push("an empty list is an answer, not a failure");
    // Privacy: no words of the work on disk, no secret files read, secrets covered, old picks pruned.
    const saved = readFileSync(path.join(dirOf(ritual, "s1"), readdirSync(dirOf(ritual, "s1")).find((f) => f.endsWith(".job.json"))), "utf8");
    if (saved.includes("prompt") || saved.includes("<button") || saved.includes("formulario")) bad.push(`a job keeps no words of the work: ${saved.slice(0, 160)}`);
    for (const f of [".env", "config/.env.local", "certs/server.pem", "deploy/id_ed25519", "app/client_secret.json", "credentials.json", "secrets/db.yml", ".ritual/local/x.txt", "C:/Users/x/AppData/Local/Temp/a.js", "/home/x/a.js", "../other/a.js", ""])
      if (!privateFile(f)) bad.push(`a pick must not read ${f || "a file with no path"}`);
    for (const f of ["src/app.js", "docs/environment.md", "src/hotkeys.js", "lib/tokenizer.js", "src/PasswordReset.tsx", "src/secretManager.ts"])
      if (privateFile(f)) bad.push(`a pick should read ${f}`);
    const leaky = ["-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----", 'const apiKey = "sk-ant-api03-abcdefghijklmnopqrstuv"', "DATABASE_PASSWORD=hunter2", "postgres://app:s3cr3t@db:5432/x", "Authorization: Bearer eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4f", 'password: "correct horse"', "aws AKIAIOSFODNN7EXAMPLE", "ghp_abcdefghijklmnopqrstuvwxyz0123456789"].join("\n");
    const covered = redact(leaky);
    for (const s of ["MIIEow", "sk-ant-api03-abcdef", "hunter2", "s3cr3t", "SflKxwRJ", "correct horse", "AKIAIOSFODNN7EXAMPLE", "ghp_abcdef"]) if (covered.includes(s)) bad.push(`redact leaves «${s}»`);
    for (const s of ["const token = getToken();", "password: z.string().min(8)", "if (user.password !== input) return;"]) if (redact(s) !== s) bad.push(`redact changes code that holds no secret: ${s} → ${redact(s)}`);
    if (workOfPrompt("mi clave es sk-proj-abcdefghijklmnopqrstuvwx, úsala")?.work.includes("abcdefghij")) bad.push("a secret pasted in a request is covered before the pick");
    if (workOf({ tool_name: "Write", tool_input: { content: "A=1" } }, ".env")) bad.push("writing .env is never picked");
    const picksRoot = path.join(ritual, "local", "picks");
    mkdirSync(path.join(picksRoot, "old"), { recursive: true });
    mkdirSync(path.join(picksRoot, "recent"), { recursive: true });
    writeFileSync(path.join(picksRoot, "recent", "a.job.json"), JSON.stringify({ key: "k", prompt: "the user's request: secret plan", ids: [] }));
    const later = Date.now() + 2 * 864e5;
    utimesSync(path.join(picksRoot, "recent"), new Date(later), new Date(later));
    prunePicks(ritual, { now: later + 1000 });
    if (existsSync(path.join(picksRoot, "old")) || !existsSync(path.join(picksRoot, "recent"))) bad.push("pruning removes picks older than a day and keeps recent ones");
    if (readFileSync(path.join(picksRoot, "recent", "a.job.json"), "utf8").includes("secret plan")) bad.push("pruning removes the work an old-format job kept");
    // A session can't queue picks without end.
    for (let i = 0; i < MAX_PICKS + 5; i++) startPick(ritual, "s2", { key: `file:k${i}`, label: "x", work: "y" }, lessons, { run: () => {} });
    if (readdirSync(dirOf(ritual, "s2")).filter((f) => f.endsWith(".job.json")).length !== MAX_PICKS) bad.push(`a session queues at most ${MAX_PICKS} file picks`);
    // A request is always picked, even after the file cap: it is what the first step waits for.
    if (!startPick(ritual, "s2", workOfPrompt("arregla el formulario de citas"), lessons, { run: () => {} })) bad.push("a request is picked even after the session's file picks reached the cap");
    if (skipReason(ritual, "s2", workOfPrompt("arregla el formulario de citas")) !== null) bad.push("a request picked before needs no new pick, and is no miss");
  } finally { rmSync(ritual, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = await selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ pick: ids only from active lessons, once per work, delivered once, nothing shown twice, capped; the first step waits once");
    process.exit(bad ? 1 : 0);
  }
  const i = args.indexOf("--run");
  if (i >= 0 && args[i + 1]) {
    let prompt = "";
    for await (const chunk of process.stdin) prompt += chunk;
    await runJob(args[i + 1], prompt);
  }
}
