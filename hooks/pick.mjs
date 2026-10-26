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
import { appendLine, isMain, readJson } from "./common.mjs";

const MAX_PICKS = 300; // file picks per session, a safety net only: the three rules below keep picks to what is new.
// A request is always picked: it is what the first step waits for, and a long session reached the old cap of 40 by
// 17:30 on 2026-10-16, after which no request got its lessons.
const QUIET = 3; // rule 2: file picks in a row with nothing new, for one kind of file, before picking stops there
const CHECK_EVERY = 5; // one in this many files a rule skips is picked anyway, to catch a rule that skips lessons
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
// Rule 3's queue of a session's picks dir: in the system's temp folder, so a file's words never sit in the project.
const queueOf = (dir) => path.join(os.tmpdir(), "ritual-queue", hash(path.resolve(dir)));
/** Whether a file pick of this session is still in flight: a file job with no answer yet, younger than a stuck call. */
export const filePickRunning = (dir, except) => {
  try { return readdirSync(dir).some((f) => f.startsWith("file-") && f.endsWith(".job.json") && path.join(dir, f) !== except && !existsSync(path.join(dir, f.replace(".job.json", ".done.json"))) && Date.now() - statSync(path.join(dir, f)).mtimeMs < ASK_MS + 15000); } catch { return false; }
};

/** Rule 3, in the worker after its own pick: every file that waited in the queue goes in one pick together, until the
 * queue stays empty. Each file's job gets the answer, and the batch is logged. */
export async function drainQueue(job, prompt, ask = askHaiku, { settle = 2000 } = {}) {
  const dir = path.dirname(job), queue = queueOf(dir);
  const [head, rest] = String(prompt).split("\n\n## The work\n");
  const catalog = String(rest ?? "").split("\n\n## Lessons\n")[1];
  if (!catalog) return;
  for (let empty = 0; empty < 2;) {
    let entries = [];
    try { entries = readdirSync(queue).map((f) => { const e = readJson(path.join(queue, f), null); rmSync(path.join(queue, f), { force: true }); return e; }).filter(Boolean); } catch { /* no queue */ }
    if (!entries.length) { empty++; if (empty < 2) await new Promise((r) => setTimeout(r, settle)); continue; }
    empty = 0;
    const share = Math.max(1500, Math.floor(MAX_WORK / entries.length));
    const works = entries.map((e) => String(e.work).slice(0, share)).join("\n\n---\n\n");
    const r = await ask(`${head}\n\n## The work\nSeveral files, each its own work:\n\n${works}\n\n## Lessons\n${catalog}`);
    const text = typeof r === "string" ? r : r?.text;
    const answered = /\[[^\[\]]*\]/.test(text ?? "");
    for (const e of entries) {
      const j = readJson(e.job, null);
      if (!j) continue;
      try { writeFileSync(e.job.replace(/\.job\.json$/, ".done.json"), JSON.stringify({ key: j.key, label: j.label, ids: parseIds(text, j.ids), answered, error: answered ? undefined : r?.error ?? "Haiku answered without a list of ids", check: j.check, batch: entries.length })); } catch { /* lost pick */ }
    }
    appendLine(path.join(dir, "..", "..", "log.jsonl"), { type: "pick-batch", session: path.basename(dir), files: entries.length, waited: Math.max(...entries.map((e) => Date.now() - (e.at ?? Date.now()))) });
    logUse(job, "file", entries.length, answered, r);
  }
}

/** Queues a pick for this work, once per key and session, and starts it in its own process unless `run` is given
 * (the selftest runs it in place). @returns {string | null} the job file, or null when skipped. */
export function startPick(ritual, sessionId, { key, label, work }, lessons, { run, check } = {}) {
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
    writeFileSync(job, JSON.stringify({ key, label, ids: list.map((l) => l.id), check }));
  } catch { return null; }
  const prompt = pickPrompt(list, work);
  if (run) return run(job, prompt), job;
  // Rule 3: while a file pick runs, a new file waits in the queue, outside the project (nothing synced), until the
  // running worker takes it in its next pick.
  if (key.startsWith("file:") && filePickRunning(dir, job)) {
    try { mkdirSync(queueOf(dir), { recursive: true }); writeFileSync(path.join(queueOf(dir), `${path.basename(job)}`), JSON.stringify({ job, work, at: Date.now() })); return job; } catch { /* picks it alone */ }
  }
  try {
    const worker = spawn(process.execPath, [import.meta.filename, "--run", job], { detached: true, stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
    worker.on("error", () => { /* no pick */ });
    worker.stdin.on("error", () => { /* no pick */ });
    worker.stdin.end(prompt);
    worker.unref();
  } catch { /* no pick */ }
  return job;
}

/** What one Haiku call cost and took, from Claude Code's JSON: numbers only, never words. `cost` is at the price
 * `basis` names ("list" for a subscription: what the API would charge, not money spent); `ms` is the whole call and
 * `api_ms` the model's part, so the difference is Claude Code starting up. */
export function useOf(j, ms) {
  if (!j) return { ms };
  const u = j.usage ?? {};
  return { ms, api_ms: j.duration_api_ms, cost: j.total_cost_usd, basis: Object.values(j.modelUsage ?? {})[0]?.costBasis, tokens: { input: u.input_tokens, output: u.output_tokens, cache_read: u.cache_read_input_tokens, cache_write: u.cache_creation_input_tokens } };
}

/** The project log a job's picks are recorded in, or null for a job outside a session's picks folder. */
export const logOf = (job) => (path.basename(path.dirname(path.dirname(job))) === "picks" ? path.join(path.dirname(job), "..", "..", "log.jsonl") : null);

/** One line per Haiku call, so a batch of files counts its cost once. Only calls that ran (`use`), and no error text:
 * it can quote the request, and the reason is already in the pick's done file. */
const logUse = (job, key, files, answered, r) => {
  const log = logOf(job);
  if (log && r?.use) appendLine(log, { type: "pick", session: path.basename(path.dirname(job)), kind: String(key).split(":")[0], files, answered, ...r.use });
};

/** Asks Haiku through the Claude Code the user already has: no other account, key or download. Its session loads no
 * plugin, CLAUDE.md or memory, runs in an empty folder, and RITUAL_PICKER keeps Ritual's own hooks quiet in it. */
export async function askHaiku(prompt) {
  const { claudeBin, session } = await import("../scripts/simulate.mjs");
  const bin = claudeBin();
  if (!bin) return { text: "", error: "claude was not found" };
  const cwd = mkdtempSync(path.join(os.tmpdir(), "ritual-pick-"));
  const s = session({ prompt, model: "haiku", tools: [], budget: 0.2 });
  const start = Date.now();
  try {
    return await new Promise((resolve) => {
      const p = spawn(bin, s.args, { cwd, env: { ...s.env, RITUAL_PICKER: "1" }, windowsHide: true });
      let out = "", err = "";
      const timer = setTimeout(() => { p.kill(); resolve({ text: "", error: `Haiku took over ${ASK_MS / 1000} s`, use: useOf(null, Date.now() - start) }); }, ASK_MS);
      p.stdout.on("data", (d) => (out += d));
      p.stderr.on("data", (d) => (err += d));
      p.on("error", (e) => { clearTimeout(timer); resolve({ text: "", error: `claude did not start: ${e.code ?? e.message}`, use: useOf(null, Date.now() - start) }); });
      p.on("close", (code) => {
        clearTimeout(timer);
        let j = null; try { j = JSON.parse(out); } catch { /* not JSON */ }
        const use = useOf(j, Date.now() - start);
        if (j && !j.is_error) resolve({ text: String(j.result ?? ""), use });
        else resolve({ text: "", error: String(j?.result || err || `claude exited with ${code}`).replace(/\s+/g, " ").slice(0, 200), use });
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
  try { writeFileSync(job.replace(/\.job\.json$/, ".done.json"), JSON.stringify({ key: j.key, label: j.label, ids: parseIds(text, j.ids), answered, error, check: j.check })); } catch { /* lost pick */ }
  if (prompt) logUse(job, j.key, 1, answered, r);
}

// The three rules, so Haiku picks only when there is something new to pick (two cases: sixty different files of a new
// app each bring their own lessons; one word changed in five hundred files brings the same lessons five hundred times):
//   1. The same change is not picked twice: an edit already picked in this session, in another file, is skipped.
//   2. When picks stop bringing anything new, picking stops: after QUIET file picks in a row with no new lesson for one
//      kind of file (folder and extension), that kind is skipped until the user's next request.
//   3. One pick at a time: while a file pick runs, new files wait in a queue and go together in the next pick.
// A rule can be wrong. One in CHECK_EVERY files a rule skips is picked anyway; if that check brings new lessons, the
// rule failed: it is logged with the file and the lessons it would have hidden, the user is told, and rule 2 starts
// picking that kind again.
export const kindOf = (rel) => `${path.posix.dirname(rel)}/*${path.posix.extname(rel)}`;

/** Whether this file write is picked, under rules 1 and 2, and which rule skips it. Updates `state.rules`.
 * @returns {{pick: boolean, rule?: string}} `rule` with `pick` true is a check of that rule. */
export function fileRule(state, rel, change) {
  const r = (state.rules ??= { changes: {}, quiet: {}, skipped: 0 });
  const sig = hash(String(change));
  const rule = r.changes[sig] ? "same change" : (r.quiet[kindOf(rel)] ?? 0) >= QUIET ? "nothing new" : null;
  if (!rule) { r.changes[sig] = rel; return { pick: true }; }
  r.skipped += 1;
  return { pick: r.skipped % CHECK_EVERY === 0, rule };
}

/** After a request, rule 2 starts over: the request may make a quiet kind of file worth picking again. */
export const resetQuiet = (state) => { if (state.rules) state.rules.quiet = {}; };

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
  const rules = (state.rules ??= { changes: {}, quiet: {}, skipped: 0 });
  for (const f of pending) {
    state.delivered.push(f);
    const done = readJson(path.join(dir, f), null);
    const ids = (done?.ids ?? []).filter((id) => byId.has(id) && !state.shown.includes(id) && !fresh.includes(id));
    if (ids.length) { fresh.push(...ids); labels.push(done.label); }
    // Rule 2 counts, per kind of file, the picks in a row that brought nothing new; a pick that brings something resets it.
    if (String(done?.key).startsWith("file:") && done.answered !== false) rules.quiet[kindOf(done.label)] = ids.length ? 0 : (rules.quiet[kindOf(done.label)] ?? 0) + 1;
    // A check of a rule that brings new lessons is that rule's failure.
    if (done?.check && ids.length) (state.ruleFailures ??= []).push({ rule: done.check, file: done.label, ids });
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
 * after the tool ran. The 3 s median estimated on 2026-10-16 (pick times against old transcripts) did not hold: measured
 * over 90 requests of one working session (2026-10-17 to 10-23) the median wait is 11.8 s and 9% wait nothing, because
 * Claude's first step comes almost at once and a pick takes ~16 s, 10-14 of them Claude Code starting up. A chat with no
 * tool call never waits. @returns {Promise<null | {ms: number, done: object | null}>} null
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
  // The change itself, without the file's name, so rule 1 knows the same edit made in another file.
  const change = t.content ?? (Array.isArray(t.edits) ? t.edits.map((e) => `${e.old_string}→${e.new_string}`).join("\n") : `${t.old_string}→${t.new_string}`);
  return { key: `file:${rel}`, label: rel, work: `Writing the file ${rel}:\n\n${redact(text)}`, change };
}

/** Whether this work was already picked in this session (a later edit of a file picked on its first write). */
export const alreadyPicked = (ritual, sessionId, { key }) => existsSync(jobOf(ritual, sessionId, key));

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
      if (now - statSync(dir).mtimeMs > keep) { rmSync(dir, { recursive: true, force: true }); rmSync(queueOf(dir), { recursive: true, force: true }); removed++; continue; }
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
  // Any worker a broken case starts must find no model to call: a selftest never spends a real pick.
  process.env.CLAUDE_BIN = path.join(os.tmpdir(), "ritual-no-claude");
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
  const logged = () => { try { return readFileSync(path.join(ritual, "local", "log.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
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
    // What each Haiku call cost and took is logged once, from the JSON Claude Code returns (its shape on 2026-10-26),
    // with numbers only: no words of the work. A job outside a session's picks folder logs nothing.
    const real = { total_cost_usd: 0.00075, duration_api_ms: 1725, usage: { input_tokens: 2, output_tokens: 132, cache_read_input_tokens: 23896, cache_creation_input_tokens: 2207 }, modelUsage: { "claude-haiku-5-5": { costBasis: "list" } } };
    if (JSON.stringify(useOf(real, 22068)) !== JSON.stringify({ ms: 22068, api_ms: 1725, cost: 0.00075, basis: "list", tokens: { input: 2, output: 132, cache_read: 23896, cache_write: 2207 } }) || JSON.stringify(useOf(null, 900)) !== JSON.stringify({ ms: 900 })) bad.push(`useOf reads cost, time and tokens: ${JSON.stringify(useOf(real, 22068))}`);
    if (logOf(failed) !== null) bad.push("a job outside a session's picks folder logs nothing");
    const used = path.join(dirOf(ritual, "u1"), "request-x.job.json");
    mkdirSync(path.dirname(used), { recursive: true });
    writeFileSync(used, JSON.stringify({ key: "request:x", label: "your request", ids: ["41"] }));
    await runJob(used, "the user's secret plan", async () => ({ text: '["41"]', use: useOf(real, 22068) }));
    const one = logged().filter((x) => x.type === "pick" && x.session === "u1");
    if (one.length !== 1 || one[0].kind !== "request" || one[0].files !== 1 || one[0].answered !== true || one[0].cost !== 0.00075 || one[0].tokens?.cache_read !== 23896 || JSON.stringify(one).includes("secret plan")) bad.push(`a pick logs its cost, time and tokens once, with no words: ${JSON.stringify(one)}`);
    // A failed call logs no words either (its error can quote the request), and a call that never ran is not a call.
    for (const [name, answer] of [["request-y", { text: "", error: "Haiku said: the user's secret plan", use: { ms: 900 } }], ["request-z", { text: "", error: "claude was not found" }]]) {
      const f = used.replace("request-x", name);
      writeFileSync(f, JSON.stringify({ key: `request:${name}`, label: "your request", ids: ["41"] }));
      await runJob(f, "p", async () => answer);
    }
    const two = logged().filter((x) => x.type === "pick" && x.session === "u1");
    if (two.length !== 2 || two[1].answered !== false || JSON.stringify(two).includes("secret plan")) bad.push(`a failed call is logged without its words, and no call without one: ${JSON.stringify(two)}`);
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
    // Rule 1: the same change in another file is not picked again.
    const s = {};
    if (!fileRule(s, "src/a.js", "colour→color").pick || fileRule(s, "src/b.js", "colour→color").rule !== "same change") bad.push("rule 1: the same change in another file is skipped");
    if (fileRule(s, "src/c.js", "something else").rule) bad.push("rule 1: a different change is picked");
    // Rule 2: a kind of file whose picks bring nothing new is skipped, until the next request.
    s.rules.quiet[kindOf("content/l1.mdx")] = 3;
    if (fileRule(s, "content/l9.mdx", "new text").rule !== "nothing new" || fileRule(s, "content/sub/x.mdx", "other").rule) bad.push(`rule 2: a quiet kind is skipped, another folder is not (${kindOf("content/l1.mdx")})`);
    resetQuiet(s);
    if (fileRule(s, "content/l10.mdx", "newer text").rule) bad.push("rule 2: a request starts the count over");
    // One in CHECK_EVERY skips is picked anyway, as a check of the rule that skipped it.
    const c = { rules: { changes: {}, quiet: {}, skipped: 0 } };
    fileRule(c, "x/a.md", "same");
    const plans = Array.from({ length: CHECK_EVERY }, (_, k) => fileRule(c, `x/b${k}.md`, "same"));
    if (plans.filter((p) => p.pick).length !== 1 || !plans.at(-1).pick || plans.at(-1).rule !== "same change") bad.push(`one in ${CHECK_EVERY} skipped files is checked: ${JSON.stringify(plans)}`);
    // Delivery counts the quiet picks per kind, and a check that brings new lessons is its rule's failure.
    const q = path.join(dirOf(ritual, "q"));
    mkdirSync(q, { recursive: true });
    const doneFile = (name, o) => writeFileSync(path.join(q, `${name}.done.json`), JSON.stringify({ answered: true, ...o }));
    const st = { shown: ["41"] };
    doneFile("file-1", { key: "file:content/a.mdx", label: "content/a.mdx", ids: ["41"] });
    doneFile("file-2", { key: "file:content/b.mdx", label: "content/b.mdx", ids: [] });
    deliver(ritual, "q", st, lessons);
    if (st.rules.quiet["content/*.mdx"] !== 2) bad.push(`picks with nothing new count toward rule 2: ${JSON.stringify(st.rules.quiet)}`);
    doneFile("file-3", { key: "file:content/c.mdx", label: "content/c.mdx", ids: ["WEB-4"], check: "nothing new" });
    deliver(ritual, "q", st, lessons);
    if (st.rules.quiet["content/*.mdx"] !== 0 || st.ruleFailures?.[0]?.rule !== "nothing new" || st.ruleFailures[0].ids.join() !== "WEB-4" || st.ruleFailures[0].file !== "content/c.mdx") bad.push(`a check that brings new lessons is its rule's failure, and picking resumes: ${JSON.stringify(st)}`);
    // Rule 3: while a file pick runs, the next file waits in the queue; the worker then picks the queued files together.
    const r3 = dirOf(ritual, "r3");
    mkdirSync(r3, { recursive: true });
    writeFileSync(path.join(r3, "file-running.job.json"), JSON.stringify({ key: "file:a.js", label: "a.js", ids: ["41", "WEB-4"] }));
    if (!filePickRunning(r3)) bad.push("rule 3: a file job with no answer yet is a pick in flight");
    const queued = startPick(ritual, "r3", { key: "file:b.js", label: "b.js", work: "Writing the file b.js:\n\n<button disabled>" }, lessons);
    const queued2 = startPick(ritual, "r3", { key: "file:c.js", label: "c.js", work: "Writing the file c.js:\n\nfetch(url)" }, lessons);
    if ((existsSync(queueOf(r3)) ? readdirSync(queueOf(r3)).length : 0) !== 2) bad.push("rule 3: files written while a pick runs wait in the queue");
    let asked = "";
    await drainQueue(path.join(r3, "file-running.job.json"), pickPrompt(lessons, "Writing the file a.js"), async (p) => { asked = p; return { text: '["WEB-4"]', use: { ms: 5000, cost: 0.002 } }; }, { settle: 10 });
    const b = readJson(queued.replace(".job.json", ".done.json"), {}), c2 = readJson(queued2.replace(".job.json", ".done.json"), {});
    if (!asked.includes("<button disabled>") || !asked.includes("fetch(url)") || !asked.includes("## Lessons\n41 · ") || !asked.includes("\nWEB-4 · ")) bad.push(`rule 3: one pick reads every queued file and the catalog:\n${asked.slice(0, 300)}`);
    if (b.ids?.join() !== "WEB-4" || c2.ids?.join() !== "WEB-4" || b.batch !== 2 || readdirSync(queueOf(r3)).length) bad.push(`rule 3: every queued file gets the answer and the queue is emptied: ${JSON.stringify(b)}`);
    const batchUse = logged().filter((x) => x.type === "pick" && x.session === "r3");
    if (batchUse.length !== 1 || batchUse[0].files !== 2 || batchUse[0].cost !== 0.002) bad.push(`a batch is one call: its cost is logged once, with how many files it read: ${JSON.stringify(batchUse)}`);
    writeFileSync(path.join(r3, "file-running.done.json"), "{}");
    if (filePickRunning(r3)) bad.push("rule 3: with every job answered, no pick is in flight");
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
    if (path.basename(args[i + 1]).startsWith("file-")) await drainQueue(args[i + 1], prompt);
  }
}
