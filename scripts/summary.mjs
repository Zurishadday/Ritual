#!/usr/bin/env node
// Summary for the ritual: gathers in a few lines what the hooks noted since the last ritual (commands with errors, corrections, guard blocks), the open candidates, and the groups touched in the latest sessions.
// So the ritual reads sorted data instead of raw JSON.
// Each session has its own mark: when two sessions (two people, two branches, two worktrees) log into the same project,
// a ritual reviews and marks only its own session, and says how many entries other sessions still have to review.
// Usage: node scripts/summary.mjs [project]        the summary of this session (CLAUDE_CODE_SESSION_ID)
//      node scripts/summary.mjs --all             the summary of every session
//      node scripts/summary.mjs --groups          only the groups touched (for /ritual close)
//      node scripts/summary.mjs --mark            records the date of this ritual, for this session (with --all, for all)
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

  const blocks = readJsonl(path.join(local, "guard.jsonl")).filter(isRecent).filter((x) => mine(x.session));
  const byRule = {};
  for (const b of blocks) byRule[b.rule] = (byRule[b.rule] ?? 0) + 1;
  lines.push("", `Guard: ${blocks.length} block(s)${blocks.length ? " · " + Object.entries(byRule).map(([r, n]) => `${r} ×${n}`).join(", ") : ""}${blocks.length ? " (details: hooks/guard.mjs --log)" : ""}`);

  const sessions = existsSync(path.join(local, "sessions")) ? readdirSync(path.join(local, "sessions")).map((a) => { try { return { id: a.replace(/\.json$/, ""), ...JSON.parse(readFileSync(path.join(local, "sessions", a), "utf8")) }; } catch { return null; } }).filter(Boolean) : [];
  const recent = sessions.filter((s) => mine(s.id) && (!since(s.id) || (s.last?.date ?? "") > since(s.id)));
  const byGroup = {};
  for (const s of recent) for (const g of s.sent ?? []) byGroup[g] = (byGroup[g] ?? 0) + 1;
  lines.push("", `Groups touched in ${recent.length} session(s): ${Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} (${n})`).join(", ") || "none recorded"}`);

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
    writeFileSync(path.join(local, "a.json"), JSON.stringify({ sent: ["interface-and-design", "console-and-tools"], last: { date: "2026-10-12T10:05:00Z" } }));
    writeFileSync(path.join(tmp, ".ritual", "candidates.md"), "# Candidates\n\n| # | What it would check | Lesson | Status | Date |\n|---|---|---|---|---|\n| 1 | check x | 13 | open | 2026-10-02 |\n| 2 | check y | 21 | done | 2026-10-03 |\n");
    writeFileSync(path.join(tmp, ".ritual", "local", "last-ritual.txt"), "2026-10-05T00:00:00Z");
    const r = summary(tmp, { session: null });
    for (const expected of ["2 failed command(s), 1 correction(s), 1 agent report(s)", "agt  code-reviewer login: Must fix", "after the cut", "1 unreadable line(s) skipped", "npm run build", "Type error", "«eso está mal»", "while Edit src/a.tsx", "1 block(s) · python-c ×1", "interface-and-design (1)", "1 open of 2", "check x"])
      if (!r.includes(expected)) bad.push(`the summary does not say «${expected}»`);
    if (r.includes("old")) bad.push("the summary includes an error from before the last ritual");
    if (r.includes("check y")) bad.push("the summary lists a candidate that is already done");
    if (groups(tmp, { session: null }).join() !== "interface-and-design,console-and-tools") bad.push(`--groups gave ${groups(tmp, { session: null }).join()}`);
    // More open candidates than the summary lists: it says how many it left out, so none is lost by being eleventh.
    const many = Array.from({ length: 12 }, (_, i) => `| ${i + 1} | check ${i + 1} | 13 | open | 2026-10-02 |`).join("\n");
    writeFileSync(path.join(tmp, ".ritual", "candidates.md"), `# Candidates\n\n| # | What it would check | Lesson | Status | Date |\n|---|---|---|---|---|\n${many}\n`);
    const long = summary(tmp, { session: null });
    if (!long.includes("12 open of 12") || !long.includes("2 more in .ritual/candidates.md")) bad.push("with 12 open candidates the summary must say it lists 10 and that 2 more are in candidates.md");
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
    mark(tmp, { all: true });
    if (summary(tmp, { session: "bbbb2222-b" }).includes("theirs to review")) bad.push("--mark --all must mark every session");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) failed` : "✓ summary: filters by date and by session, counts unreadable lines without losing the next one, and lists only open items");
    process.exit(bad ? 1 : 0);
  }
  const project = path.resolve(args.find((a) => !a.startsWith("--")) ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const all = args.includes("--all");
  if (args.includes("--mark")) {
    console.log(`✓ ritual date recorded for ${mark(project, { all })}`);
    process.exit(0);
  }
  if (args.includes("--groups")) { console.log(groups(project).join(", ") || "none recorded"); process.exit(0); }
  console.log(summary(project, { all }));
}
