#!/usr/bin/env node
// Picks, in the background, the lessons that apply to what Claude is doing now, from every group: the request the user
// just sent, or a file Claude is about to write for the first time in the session. A small model (Haiku) reads the
// work and the one-line catalog of active lessons and answers with their ids; the next tool call shows the ones this
// session hasn't seen yet. Claude never waits: a pick takes 15 to 30 seconds, so it runs in its own process.
// Measured on the 12 clinic builds: Haiku picking per request and per file found all 61 lessons that broke in them,
// showing about 12 of 63 per file; a small embedding model as a filter found 84% only when it showed 30.
// The group questions stay as they are: without `claude`, offline, or when a pick fails, nothing is lost.
// `"picker": false` in .ritual/config.json turns it off. Usage: node hooks/pick.mjs --selftest
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMain, readJson } from "./common.mjs";

const MAX_PICKS = 40; // per session: a long session that touches many files can't keep spending without end
const MAX_WORK = 9000; // characters of the work a pick reads: the start of a file says what it does

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

/** Queues a pick for this work, once per key and session, and starts it in its own process unless `run` is given
 * (the selftest runs it in place). @returns {string | null} the job file, or null when skipped. */
export function startPick(ritual, sessionId, { key, label, work }, lessons, { run } = {}) {
  const dir = dirOf(ritual, sessionId);
  const job = path.join(dir, `${hash(key)}.job.json`);
  if (existsSync(job)) return null;
  try {
    mkdirSync(dir, { recursive: true });
    if (readdirSync(dir).filter((f) => f.endsWith(".job.json")).length >= MAX_PICKS) return null;
    const list = typeof lessons === "function" ? lessons() : lessons; // read only when a pick is really queued
    writeFileSync(job, JSON.stringify({ key, label, prompt: pickPrompt(list, work), ids: list.map((l) => l.id) }));
  } catch { return null; }
  if (run) return run(job), job;
  try { spawn(process.execPath, [import.meta.filename, "--run", job], { detached: true, stdio: "ignore", windowsHide: true }).unref(); } catch { /* no pick */ }
  return job;
}

/** Asks Haiku through the Claude Code the user already has: no other account, key or download. Its session loads no
 * plugin, CLAUDE.md or memory, runs in an empty folder, and RITUAL_PICKER keeps Ritual's own hooks quiet in it. */
export async function askHaiku(prompt) {
  const { claudeBin, session } = await import("../scripts/simulate.mjs");
  const bin = claudeBin();
  if (!bin) return "";
  const cwd = mkdtempSync(path.join(os.tmpdir(), "ritual-pick-"));
  const s = session({ prompt, model: "haiku", tools: [], budget: 0.2 });
  try {
    return await new Promise((resolve) => {
      const p = spawn(bin, s.args, { cwd, env: { ...s.env, RITUAL_PICKER: "1" }, windowsHide: true });
      let out = "";
      p.stdout.on("data", (d) => (out += d));
      p.on("error", () => resolve(""));
      p.on("close", () => { try { resolve(String(JSON.parse(out).result ?? "")); } catch { resolve(""); } });
    });
  } finally { try { rmSync(cwd, { recursive: true, force: true }); } catch { /* left behind */ } }
}

/** Runs one queued pick and writes what it found next to it. */
export async function runJob(job, ask = askHaiku) {
  const j = readJson(job, null);
  if (!j) return;
  const ids = parseIds(await ask(j.prompt), j.ids);
  try { writeFileSync(job.replace(/\.job\.json$/, ".done.json"), JSON.stringify({ key: j.key, label: j.label, ids })); } catch { /* lost pick */ }
}

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

/** The work a tool call is about to do, when it is a pick: writing a file for the first time. */
export function workOf(input, rel) {
  const t = input?.tool_input ?? {};
  const text = t.content ?? t.new_string ?? (Array.isArray(t.edits) ? t.edits.map((e) => e.new_string).join("\n") : "");
  if (!/^(Write|Edit|MultiEdit)$/.test(input?.tool_name ?? "") || !rel) return null;
  return { key: `file:${rel}`, label: rel, work: `Writing the file ${rel}:\n\n${text}` };
}

/** The work a user's prompt asks for, when it is a pick: a request, not a background agent's report or a one-word reply. */
export function workOfPrompt(prompt) {
  const p = String(prompt ?? "").trim();
  if (p.length < 12 || p.startsWith("<task-notification>")) return null;
  return { key: `request:${hash(p)}`, label: "your request", work: `The user's request:\n${p}` };
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
    const run = (job) => answers.push(runJob(job, async (p) => (p.includes("<button") ? '["WEB-4","41"]' : '["41","P-1"]')));
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
    // A session can't queue picks without end.
    for (let i = 0; i < MAX_PICKS + 5; i++) startPick(ritual, "s2", { key: `k${i}`, label: "x", work: "y" }, lessons, { run: () => {} });
    if (readdirSync(dirOf(ritual, "s2")).filter((f) => f.endsWith(".job.json")).length !== MAX_PICKS) bad.push(`a session queues at most ${MAX_PICKS} picks`);
  } finally { rmSync(ritual, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = await selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ pick: ids only from active lessons, once per work, delivered once, nothing shown twice, capped");
    process.exit(bad ? 1 : 0);
  }
  const i = args.indexOf("--run");
  if (i >= 0 && args[i + 1]) await runJob(args[i + 1]);
}
