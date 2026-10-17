#!/usr/bin/env node
// Summary for the ritual: gathers in a few lines what the hooks noted since the last ritual (commands with errors, corrections, guard blocks), the open candidates, and the groups touched in the latest sessions.
// So the ritual reads sorted data instead of raw JSON.
// Each session has its own mark: when two sessions (two people, two branches, two worktrees) log into the same project,
// a ritual reviews and marks only its own session, and says how many entries other sessions still have to review.
// Usage: node scripts/summary.mjs [project]        the summary of this session (CLAUDE_CODE_SESSION_ID)
//      node scripts/summary.mjs --all             the summary of every session
//      node scripts/summary.mjs --groups          only the groups touched (for /ritual close)
//      node scripts/summary.mjs --mark            records the date of this ritual, for this session (with --all, for all)
//      node scripts/summary.mjs --report <file>   draws the closing report from the ritual's decisions (run it before --mark)
//      node scripts/summary.mjs --selftest
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendLine, isMain } from "../hooks/common.mjs";
import { localStatus, ownLessons, statusLine } from "./share.mjs";

/** The readable records, and in `unreadable` how many lines could not be read: they are reported, not skipped silently (WEB-1). */
const readJsonl = (file) => {
  const all = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }) : [];
  return Object.assign(all.filter(Boolean), { unreadable: all.filter((x) => !x).length });
};
const short = (s, n = 110) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const when = (d) => String(d ?? "").slice(5, 16).replace("T", " ");

/** The marks: the shared one of earlier versions (last-ritual.txt, it still counts for every session) and one per session. */
function readMarks(local) {
  const shared = existsSync(path.join(local, "last-ritual.txt")) ? readFileSync(path.join(local, "last-ritual.txt"), "utf8").trim() : null;
  let bySession = {};
  try { bySession = JSON.parse(readFileSync(path.join(local, "marks.json"), "utf8")); } catch { bySession = {}; }
  // The later of the two: a session's own mark never moves it back before the shared one.
  const since = (session) => [shared, session ? bySession[session] : null].filter(Boolean).sort().at(-1) ?? null;
  return { since };
}

/** Records the date of a ritual: for one session, or (no session known, or `all`) for every session. */
export function mark(project, { session = process.env.CLAUDE_CODE_SESSION_ID || null, all = false, now = new Date() } = {}) {
  const local = path.join(project, ".ritual", "local");
  mkdirSync(local, { recursive: true });
  if (all || !session) { writeFileSync(path.join(local, "last-ritual.txt"), now.toISOString()); return "every session"; }
  let bySession = {};
  try { bySession = JSON.parse(readFileSync(path.join(local, "marks.json"), "utf8")); } catch { bySession = {}; }
  bySession[session] = now.toISOString();
  writeFileSync(path.join(local, "marks.json"), JSON.stringify(bySession, null, 2) + "\n");
  return `session ${session.slice(0, 8)}`;
}

/** The first step after each request (hooks/pick.mjs): did its lessons come before Claude acted? Each miss with why. */
export function firstSteps(entries) {
  const n = (o) => entries.filter((x) => x.outcome === o).length;
  const missed = entries.filter((x) => x.outcome === "missed");
  const waits = entries.filter((x) => x.outcome !== "missed" && typeof x.ms === "number").map((x) => x.ms).sort((a, b) => a - b);
  const lines = [`First step after a request: ${entries.length} · lessons before it ${entries.length - missed.length} (stopped with new ones ${n("stopped")}, nothing new ${n("nothing new")}) · missed ${missed.length}${waits.length ? ` · wait median ${(waits[waits.length >> 1] / 1000).toFixed(1)} s, longest ${(waits.at(-1) / 1000).toFixed(1)} s` : ""}`];
  for (const x of missed.slice(-10)) lines.push(`  ${when(x.date)} missed  ${short(x.reason, 140)}`);
  if (missed.length > 10) lines.push(`  … ${missed.length - 10} more misses in .ritual/local/log.jsonl (type "first-step")`);
  return lines;
}

/** The picker's three rules (hooks/pick.mjs): how many file picks they saved, and each time a check found one wrong. */
export function pickerRules(entries) {
  const skips = entries.filter((x) => x.type === "pick-rule"), failed = entries.filter((x) => x.type === "pick-rule-failed"), batches = entries.filter((x) => x.type === "pick-batch");
  const by = (rule) => skips.filter((x) => x.rule === rule).length;
  const lines = [`Picker rules: skipped ${skips.filter((x) => !x.checked).length} file pick(s) (same change ${by("same change")}, nothing new ${by("nothing new")}) · checked anyway ${skips.filter((x) => x.checked).length} · failed ${failed.length}${batches.length ? ` · ${batches.length} batch(es), up to ${Math.max(...batches.map((x) => x.files))} files` : ""}`];
  for (const x of failed.slice(-10)) lines.push(`  ${when(x.date)} failed  «${x.rule}» skipped ${short(x.file, 70)}, which had lessons ${x.ids?.join(", ")}`);
  if (failed.length > 10) lines.push(`  … ${failed.length - 10} more in .ritual/local/log.jsonl (type "pick-rule-failed")`);
  return lines;
}

export function summary(project, { now = new Date(), session = process.env.CLAUDE_CODE_SESSION_ID || null, all = false } = {}) {
  const dir = path.join(project, ".ritual");
  if (!existsSync(dir)) return "No .ritual/ folder: run /ritual to set Ritual up first.";
  const local = path.join(dir, "local");
  const { since } = readMarks(local);
  // An entry is this ritual's if it is this session's, or if it has no session (written before sessions were logged).
  const mine = (s) => all || !session || !s || s === session;
  const isRecent = (x) => { const m = since(x.session); return !m || x.date > m; };
  const ownSince = since(all ? null : session);
  const lines = [`Ritual · summary${all || !session ? "" : ` of session ${session.slice(0, 8)}`} since ${ownSince ? ownSince.slice(0, 16).replace("T", " ") : "the beginning"} (now ${now.toISOString().slice(0, 16).replace("T", " ")})`];

  const read = readJsonl(path.join(local, "log.jsonl"));
  const pending = read.filter(isRecent);
  const log = pending.filter((x) => mine(x.session));
  const firsts = log.filter((x) => x.type === "first-step");
  const commands = log.filter((x) => x.type === "command"), corrections = log.filter((x) => x.type === "correction");
  // The same agent can notify twice: one report per task.
  const agents = log.filter((x) => x.type === "agent").filter((x, i, all) => !x.task || all.findIndex((y) => y.task === x.task) === i);
  lines.push("", `Log: ${commands.length} failed command(s), ${corrections.length} correction(s), ${agents.length} agent report(s)${read.unreadable ? ` · ${read.unreadable} unreadable line(s) skipped` : ""}`);
  for (const x of commands.slice(-15)) lines.push(`  ${when(x.date)} cmd  ${short(x.command, 80)}  →  ${short(x.error, 90)}`);
  for (const x of corrections.slice(-15)) lines.push(`  ${when(x.date)} fix  «${short(x.phrase, 90)}»${x.last ? `  while ${x.last.tool} ${short(x.last.target, 60)}` : ""}`);
  for (const x of agents.slice(-15)) lines.push(`  ${when(x.date)} agt  ${short(x.agent, 40)}: ${short(x.report, 160)}`);
  if (agents.length) lines.push("  (a reviewer's must-fix findings are errors; full reports: type \"agent\" in .ritual/local/log.jsonl)");
  if (log.length > 45) lines.push(`  … ${log.length - 45} more in .ritual/local/log.jsonl`);
  // What other sessions logged and nobody reviewed yet: it is theirs to review, so it is counted, not listed, and not marked.
  const others = {};
  for (const x of pending.filter((x) => !mine(x.session))) (others[x.session] ??= []).push(x);
  const ids = Object.keys(others);
  if (ids.length) lines.push(`  Other sessions: ${ids.reduce((n, s) => n + others[s].length, 0)} entr${ids.reduce((n, s) => n + others[s].length, 0) === 1 ? "y" : "ies"} from ${ids.length} session(s) not reviewed yet (${ids.map((s) => `${s.slice(0, 8)}, last ${when(others[s].at(-1).date)}`).join("; ")}). They are left for their own ritual; --all includes them.`);

  if (firsts.length) lines.push("", ...firstSteps(firsts));
  const ruled = log.filter((x) => /^pick-(rule|rule-failed|batch)$/.test(x.type));
  if (ruled.length) lines.push(...(firsts.length ? [] : [""]), ...pickerRules(ruled));

  const blocks = readJsonl(path.join(local, "guard.jsonl")).filter(isRecent).filter((x) => mine(x.session));
  const byRule = {};
  for (const b of blocks) byRule[b.rule] = (byRule[b.rule] ?? 0) + 1;
  lines.push("", `Guard: ${blocks.length} block(s)${blocks.length ? " · " + Object.entries(byRule).map(([r, n]) => `${r} ×${n}`).join(", ") : ""}${blocks.length ? " (details: hooks/guard.mjs --log)" : ""}`);

  const sessions = existsSync(path.join(local, "sessions")) ? readdirSync(path.join(local, "sessions")).map((a) => { try { return { id: a.replace(/\.json$/, ""), ...JSON.parse(readFileSync(path.join(local, "sessions", a), "utf8")) }; } catch { return null; } }).filter(Boolean) : [];
  const recent = sessions.filter((s) => mine(s.id) && (!since(s.id) || (s.last?.date ?? "") > since(s.id)));
  const byGroup = {};
  for (const s of recent) for (const g of s.sent ?? []) byGroup[g] = (byGroup[g] ?? 0) + 1;
  lines.push("", `Groups touched in ${recent.length} session(s): ${Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} (${n})`).join(", ") || "none recorded"}`);
  // Files edited with no group got no questions: either a pattern is missing in .ritual/config.json, or this is a kind
  // of work no group or package covers yet (step "New segment?" of the ritual decides which, with its reason).
  // Counted by top folder and file type (src/*.ts ×14), since the default patterns leave most plain source code out: a
  // list of paths would fill every ritual, and the kind of file is what tells a missing pattern from a new kind of work.
  const outside = [...new Set(recent.flatMap((s) => s.ungrouped ?? []))];
  const kinds = {};
  for (const f of outside) {
    const [top, ...rest] = f.split("/");
    const kind = /^[a-z]:$|^$/i.test(top) ? "(outside the project)" : `${rest.length ? `${top}/` : ""}*${path.posix.extname(f) || "(no extension)"}`;
    kinds[kind] = (kinds[kind] ?? 0) + 1;
  }
  if (outside.length) lines.push(`Files outside every group: ${outside.length} (${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ×${n}`).join(", ")}). They got no questions.`);

  const candidates = path.join(dir, "candidates.md");
  const rows = existsSync(candidates) ? readFileSync(candidates, "utf8").split("\n").filter((l) => /^\|\s*\S/.test(l) && !/^\|\s*#\s*\||^\|\s*-+/.test(l)) : [];
  const openRows = rows.filter((l) => /\|\s*open\s*\|/i.test(l));
  lines.push("", `Candidates: ${openRows.length} open of ${rows.length}`);
  for (const l of openRows.slice(0, 10)) lines.push(`  ${short(l, 140)}`);
  if (openRows.length > 10) lines.push(`  … ${openRows.length - 10} more in .ritual/candidates.md`);
  // The project's own lessons on their way to the library: none should stay here by being forgotten.
  const own = ownLessons(project);
  if (own.length) lines.push("", `${statusLine(localStatus(own))} (shared ones checked with share.mjs status)`);
  return lines.join("\n");
}

// The closing report of a ritual, drawn from what Claude decided about each error (a small JSON file) plus what the
// hooks already counted (this session's guard blocks since its last ritual, candidates). Claude classifies; the script counts and
// draws, so the report reads in seconds and Claude doesn't spend tokens narrating it.
// File: { "date": "2026-10-16", "errors": [{ "what": "…", "caught": "reviewer", "lesson": "12", "action": "sharpened",
//         "check": "done" }], "cost": "$9.53 in reviews" }
// caught: test, reviewer, validator, guard, user (it slipped to the person) or other · action: sharpened, new or none
// · check: done, open or none.
const CAUGHT = ["test", "reviewer", "validator", "guard", "other"];
const bar = (n, max) => "█".repeat(max ? Math.max(n ? 1 : 0, Math.round((n / max) * 20)) : 0);
const lessonIds = (list) => [...new Set(list.map((e) => e.lesson).filter(Boolean))].join(" ");

export function report(project, data, { session = process.env.CLAUDE_CODE_SESSION_ID || null, all = false } = {}) {
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  const caught = errors.filter((e) => e.caught !== "user");
  const by = {};
  for (const e of caught) { const k = CAUGHT.includes(e.caught) ? e.caught : "other"; by[k] = (by[k] ?? 0) + 1; }
  const sharpened = errors.filter((e) => e.action === "sharpened"), created = errors.filter((e) => e.action === "new");
  const uncovered = errors.filter((e) => e.action !== "sharpened" && e.action !== "new");
  const done = errors.filter((e) => e.check === "done"), open = errors.filter((e) => e.check === "open");

  // The same marks and the same session filter as the summary: another session's blocks are its own ritual's.
  const local = path.join(project, ".ritual", "local");
  const { since } = readMarks(local);
  const mine = (s) => all || !session || !s || s === session;
  const blocks = readJsonl(path.join(local, "guard.jsonl")).filter((x) => { const m = since(x.session); return (!m || x.date > m) && mine(x.session); });
  const byRule = {};
  for (const b of blocks) byRule[b.rule] = (byRule[b.rule] ?? 0) + 1;
  const candidates = path.join(project, ".ritual", "candidates.md");
  const statuses = existsSync(candidates) ? readFileSync(candidates, "utf8").split("\n").filter((l) => /^\|\s*\d/.test(l)).map((l) => (l.split("|")[4] ?? "").trim().split(/[\s:]/)[0].toLowerCase()) : [];

  const max = Math.max(errors.length, 1);
  const row = (label, n, note = "") => `${label.padEnd(22)}${String(n).padStart(3)}  ${bar(n, max).padEnd(21)}${note}`.trimEnd();
  const rule = "─".repeat(64);
  return [
    `Ritual · ${data?.date ?? new Date().toISOString().slice(0, 10)}`,
    rule,
    row("Errors", errors.length),
    row("  caught by a check", caught.length, Object.entries(by).map(([k, n]) => `${k} ${n}`).join(" · ")),
    row("  slipped to the user", errors.length - caught.length, errors.length - caught.length ? "the person had to correct it" : ""),
    "Lessons",
    row("  existed, didn't fire", sharpened.length, sharpened.length ? `${lessonIds(sharpened)} → sharpened` : ""),
    row("  new", created.length, lessonIds(created)),
    row("  no lesson", uncovered.length),
    "Becomes a check",
    row("  done", done.length),
    row("  open (candidate)", open.length),
    `${"Guard".padEnd(22)}${String(blocks.length).padStart(3)}  block(s)  ${Object.entries(byRule).map(([r, n]) => `${r} ${n}`).join(" · ")}`.trimEnd(),
    `${"Candidates".padEnd(22)}${String(statuses.filter((s) => s === "open").length).padStart(3)}  open · ${statuses.filter((s) => s === "done").length} done · ${statuses.filter((s) => s === "discarded").length} discarded`,
    ...(data?.cost ? [`${"Cost".padEnd(22)}     ${data.cost}`] : []),
    rule,
  ].join("\n");
}

/** The groups touched by this session (or, if it is unknown, by the latest one). */
export function groups(project, { session = process.env.CLAUDE_CODE_SESSION_ID || null } = {}) {
  const dir = path.join(project, ".ritual", "local", "sessions");
  const own = session && path.join(dir, `${session}.json`);
  if (own && existsSync(own)) { try { return JSON.parse(readFileSync(own, "utf8")).sent ?? []; } catch { /* falls back to the latest */ } }
  const all = existsSync(dir) ? readdirSync(dir).map((a) => { try { return JSON.parse(readFileSync(path.join(dir, a), "utf8")); } catch { return null; } }).filter(Boolean) : [];
  const latest = all.sort((a, b) => (b.last?.date ?? "").localeCompare(a.last?.date ?? ""))[0];
  return latest?.sent ?? [];
}

export function selftest() {
  const bad = [];
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ritual-summary-"));
  try {
    if (!summary(tmp).includes("No .ritual/")) bad.push("without .ritual/ it should say so");
    const local = path.join(tmp, ".ritual", "local", "sessions");
    mkdirSync(local, { recursive: true });
    writeFileSync(path.join(tmp, ".ritual", "local", "log.jsonl"), [
      JSON.stringify({ date: "2026-10-01T10:00:00Z", type: "command", command: "npm test", error: "Exit code 1\nold" }),
      JSON.stringify({ date: "2026-10-12T10:00:00Z", type: "command", command: "npm run build", error: "Exit code 2\nType error" }),
      JSON.stringify({ date: "2026-10-12T10:05:00Z", type: "correction", phrase: "eso está mal", last: { tool: "Edit", target: "src/a.tsx" } }),
      JSON.stringify({ date: "2026-10-12T10:07:00Z", type: "agent", agent: "code-reviewer login", task: "a1", report: "Must fix: the form loses the message" }),
      JSON.stringify({ date: "2026-10-12T10:08:00Z", type: "agent", agent: "code-reviewer login", task: "a1", report: "Must fix: the form loses the message" }),
      "{\"date\":\"2026-10-12T10:06:00Z\",\"type\":\"comma", // cut-off write, no newline: what a crash leaves behind
    ].join("\n"));
    // WEB-1: what a hook writes after the cut-off line must not stick to it.
    appendLine(path.join(tmp, ".ritual", "local", "log.jsonl"), { type: "command", command: "npm run lint", error: "Exit code 1\nafter the cut" });
    writeFileSync(path.join(tmp, ".ritual", "local", "guard.jsonl"), JSON.stringify({ date: "2026-10-12T10:01:00Z", rule: "python-c", command: "python -c 1" }) + "\n");
    writeFileSync(path.join(local, "a.json"), JSON.stringify({ sent: ["interface-and-design", "console-and-tools"], ungrouped: ["videos/scene.py", "videos/voice.py", "package.json"], last: { date: "2026-10-12T10:05:00Z" } }));
    writeFileSync(path.join(tmp, ".ritual", "candidates.md"), "# Candidates\n\n| # | What it would check | Lesson | Status | Date |\n|---|---|---|---|---|\n| 1 | check x | 13 | open | 2026-10-02 |\n| 2 | check y | 21 | done | 2026-10-03 |\n");
    writeFileSync(path.join(tmp, ".ritual", "local", "last-ritual.txt"), "2026-10-05T00:00:00Z");
    const r = summary(tmp, { session: null });
    for (const expected of ["2 failed command(s), 1 correction(s), 1 agent report(s)", "agt  code-reviewer login: Must fix", "after the cut", "1 unreadable line(s) skipped", "npm run build", "Type error", "«eso está mal»", "while Edit src/a.tsx", "1 block(s) · python-c ×1", "interface-and-design (1)", "Files outside every group: 3 (videos/*.py ×2, *.json ×1)", "1 open of 2", "check x"])
      if (!r.includes(expected)) bad.push(`the summary does not say «${expected}»`);
    if (r.includes("old")) bad.push("the summary includes an error from before the last ritual");
    if (r.includes("check y")) bad.push("the summary lists a candidate that is already done");
    if (groups(tmp, { session: null }).join() !== "interface-and-design,console-and-tools") bad.push(`--groups gave ${groups(tmp, { session: null }).join()}`);
    // More open candidates than the summary lists: it says how many it left out, so none is lost by being eleventh.
    const many = Array.from({ length: 12 }, (_, i) => `| ${i + 1} | check ${i + 1} | 13 | open | 2026-10-02 |`).join("\n");
    writeFileSync(path.join(tmp, ".ritual", "candidates.md"), `# Candidates\n\n| # | What it would check | Lesson | Status | Date |\n|---|---|---|---|---|\n${many}\n`);
    const long = summary(tmp, { session: null });
    if (!long.includes("12 open of 12") || !long.includes("2 more in .ritual/candidates.md")) bad.push("with 12 open candidates the summary must say it lists 10 and that 2 more are in candidates.md");
    // The closing report: counts what Claude decided, adds the guard and the candidates, and never loses an error.
    const rep = report(tmp, { date: "2026-10-16", cost: "$9.53 in reviews", errors: [
      { caught: "reviewer", lesson: "12", action: "sharpened", check: "done" },
      { caught: "reviewer", lesson: "EDU-2", action: "sharpened", check: "open" },
      { caught: "user", lesson: "", action: "none", check: "none" },
      { caught: "a typo" },
    ] }, { session: null });
    const line = (label) => rep.split("\n").find((l) => l.startsWith(label)) ?? "";
    if (!/\s4\s+█{20}/.test(line("Errors"))) bad.push(`the report should count 4 errors with a full bar: ${line("Errors")}`);
    if (!/\s3\s.*reviewer 2 · other 1/.test(line("  caught by a check"))) bad.push(`an unknown «caught» must count as other, not vanish: ${line("  caught by a check")}`);
    if (!/\s1\s/.test(line("  slipped to the user"))) bad.push("the error the person corrected must be counted as slipped");
    if (!line("  existed, didn't fire").includes("12 EDU-2 → sharpened")) bad.push("the sharpened lessons must be named");
    if (!/\s2\s/.test(line("  no lesson"))) bad.push("an error with no action counts as having no lesson");
    if (!/\s1\s/.test(line("  done")) || !/\s1\s/.test(line("  open (candidate)"))) bad.push("checks done and open must be counted apart");
    if (!line("Guard").includes("python-c 1")) bad.push("the report must add the guard blocks since the last ritual");
    if (!line("Candidates").includes("12  open")) bad.push(`the report must count the open candidates: ${line("Candidates")}`);
    if (!line("Cost").includes("$9.53")) bad.push("the cost line is missing");
    if (!report(tmp, {}, { session: null }).includes("Errors")) bad.push("a report with no errors must still draw");
    // Own lessons not shared yet are named, so none stays local by being forgotten.
    if (long.includes("Lessons here")) bad.push("a project without own lessons gets no line about them");
    mkdirSync(path.join(tmp, ".ritual", "lessons"), { recursive: true });
    writeFileSync(path.join(tmp, ".ritual", "lessons", "console-and-tools.md"), "# C\n\n### P-1. One\n\n`origin: field · claude-opus-5-5 · 2026-10`\n\n**The idea.** x\n\n### P-2. Two\n\n`origin: field · claude-opus-5-5 · 2026-10` · `shared: 2026-10-16`\n\n**The idea.** y\n");
    if (!summary(tmp, { session: null }).includes("Lessons here: 1 not shared yet (P-1) · 1 sent")) bad.push(`the summary must name the own lessons not shared yet: ${summary(tmp, { session: null }).split("\n").at(-1)}`);

    // Two sessions log into the same project (two people, two worktrees): each ritual reviews and marks only its own.
    appendLine(path.join(tmp, ".ritual", "local", "log.jsonl"), { type: "command", session: "aaaa1111-a", command: "npm run build", error: "Exit code 1\nmine to review" });
    appendLine(path.join(tmp, ".ritual", "local", "log.jsonl"), { type: "command", session: "bbbb2222-b", command: "python render.py", error: "Exit code 1\ntheirs to review" });
    appendLine(path.join(tmp, ".ritual", "local", "guard.jsonl"), { session: "bbbb2222-b", rule: "sed-i-code", command: "sed -i x a.ts" });
    writeFileSync(path.join(local, "aaaa1111-a.json"), JSON.stringify({ sent: ["tests-and-checks"], last: { date: new Date().toISOString() } }));
    writeFileSync(path.join(local, "bbbb2222-b.json"), JSON.stringify({ sent: ["console-and-tools"], last: { date: new Date().toISOString() } }));
    const a = summary(tmp, { session: "aaaa1111-a" });
    if (!a.includes("mine to review")) bad.push("a session's summary must list its own errors");
    if (a.includes("theirs to review")) bad.push("a session's summary must not list another session's errors as its own");
    if (!/Other sessions: \d+ entr(y|ies) from 1 session\(s\) not reviewed yet \(bbbb2222/.test(a)) bad.push("a session's summary must say that another session has entries left to review");
    if (a.includes("sed-i-code")) bad.push("a session's summary must not count another session's guard blocks");
    if (groups(tmp, { session: "aaaa1111-a" }).join() !== "tests-and-checks") bad.push("--groups must give the groups of this session, not of the latest one");
    if (mark(tmp, { session: "aaaa1111-a" }) !== "session aaaa1111") bad.push("--mark with a session must mark only that session");
    const b = summary(tmp, { session: "bbbb2222-b" });
    if (!b.includes("theirs to review")) bad.push("after one session's ritual, the other session must still see its own errors (the shared mark used to swallow them)");
    if (!b.includes("sed-i-code")) bad.push("after one session's ritual, the other session must still see its guard blocks");
    if (summary(tmp, { session: "aaaa1111-a" }).includes("mine to review")) bad.push("after its ritual, a session must not see its reviewed errors again");
    if (!summary(tmp, { session: "aaaa1111-a", all: true }).includes("theirs to review")) bad.push("--all must include every session's entries");
    // The report counts guard blocks the way the summary does: this session's, since its own mark.
    const guardOf = (session) => report(tmp, {}, { session }).split("\n").find((l) => l.startsWith("Guard")) ?? "";
    if (guardOf("aaaa1111-a").includes("sed-i-code") || !guardOf("bbbb2222-b").includes("sed-i-code 1")) bad.push(`the report must count only this session's guard blocks: ${guardOf("aaaa1111-a")} | ${guardOf("bbbb2222-b")}`);
    mark(tmp, { all: true });
    if (summary(tmp, { session: "bbbb2222-b" }).includes("theirs to review")) bad.push("--mark --all must mark every session");
    // The first steps since the last ritual: how many had their lessons first, and each miss with why.
    // Dated a second after the mark: on a fast machine an entry written in the mark's own millisecond is not after it.
    const later = new Date(Date.now() + 1000).toISOString();
    const step = (outcome, extra) => appendLine(path.join(tmp, ".ritual", "local", "log.jsonl"), { type: "first-step", session: "aaaa1111-a", outcome, ...extra, date: later });
    step("stopped", { ms: 3000 }); step("nothing new", { ms: 0 }); step("missed", { ms: 25000, reason: "the pick was not done after 25 s" });
    const fs1 = summary(tmp, { session: "aaaa1111-a" }).split("\n");
    const head = fs1.find((l) => l.startsWith("First step")) ?? "";
    if (!head.includes(": 3 · lessons before it 2 (stopped with new ones 1, nothing new 1) · missed 1") || !head.includes("wait median 3.0 s") || !fs1.some((l) => l.includes("missed  the pick was not done after 25 s"))) bad.push(`the summary counts first steps and lists each miss with why:\n${fs1.filter((l) => /first step|missed/i.test(l)).join("\n")}`);
    // The picker's rules: skips by rule, checks, and each failed check with the lessons it would have hidden.
    const rule = (type, extra) => appendLine(path.join(tmp, ".ritual", "local", "log.jsonl"), { type, session: "aaaa1111-a", ...extra, date: later });
    rule("pick-rule", { rule: "same change", file: "a.md", checked: false }); rule("pick-rule", { rule: "nothing new", file: "b.md", checked: false }); rule("pick-rule", { rule: "nothing new", file: "c.md", checked: true });
    rule("pick-rule-failed", { rule: "nothing new", file: "c.md", ids: ["41", "46"] }); rule("pick-batch", { files: 4 });
    const rl = summary(tmp, { session: "aaaa1111-a" }).split("\n");
    const rh = rl.find((l) => l.startsWith("Picker rules")) ?? "";
    if (!rh.includes("skipped 2 file pick(s) (same change 1, nothing new 2) · checked anyway 1 · failed 1 · 1 batch(es), up to 4 files") || !rl.some((l) => l.includes("failed  «nothing new» skipped c.md, which had lessons 41, 46"))) bad.push(`the summary counts the picker rules and lists each failure:\n${rl.filter((l) => /picker|failed/i.test(l)).join("\n")}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) failed` : "✓ summary: filters by date and by session, counts unreadable lines without losing the next one, lists only open items, and draws the closing report");
    process.exit(bad ? 1 : 0);
  }
  const project = path.resolve(args.find((a) => !a.startsWith("--")) ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const all = args.includes("--all");
  if (args.includes("--mark")) {
    console.log(`✓ ritual date recorded for ${mark(project, { all })}`);
    process.exit(0);
  }
  if (args.includes("--groups")) { console.log(groups(project).join(", ") || "none recorded"); process.exit(0); }
  // Every first step ever logged in this project, every session: the long-run check that the lessons come first.
  if (args.includes("--first-steps")) {
    const all = readJsonl(path.join(project, ".ritual", "local", "log.jsonl"));
    const entries = all.filter((x) => x.type === "first-step"), ruled = all.filter((x) => /^pick-(rule|rule-failed|batch)$/.test(x.type));
    const since = [entries[0]?.date, ruled[0]?.date].filter(Boolean).sort()[0];
    console.log(since ? [`Since ${since.slice(0, 10)}:`, ...(entries.length ? firstSteps(entries) : ["First step after a request: none logged yet"]), ...(ruled.length ? pickerRules(ruled) : ["Picker rules: nothing logged yet"])].join("\n") : "No first steps or picker rules logged yet.");
    process.exit(0);
  }
  if (args.includes("--report")) {
    const file = args[args.indexOf("--report") + 1];
    let data;
    try { data = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`✕ cannot read the report file ${file ?? "(none given)"}: ${e.message}`); process.exit(1); }
    console.log(report(path.resolve(args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--report") ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd()), data, { all }));
    process.exit(0);
  }
  console.log(summary(project, { all }));
}
