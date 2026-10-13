#!/usr/bin/env node
// Summary for the ritual: gathers in a few lines what the hooks noted since the last ritual (commands with errors, corrections, guard blocks), the open candidates, and the groups touched in the latest sessions.
// So the ritual reads sorted data instead of raw JSON.
// Usage: node scripts/summary.mjs [project]        the full summary
//      node scripts/summary.mjs --groups          only the groups touched (for /ritual close)
//      node scripts/summary.mjs --mark            records the date of this ritual
//      node scripts/summary.mjs --selftest
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendLine, isMain } from "../hooks/common.mjs";

/** The readable records, and in `unreadable` how many lines could not be read: they are reported, not skipped silently (WEB-1). */
const readJsonl = (file) => {
  const all = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }) : [];
  return Object.assign(all.filter(Boolean), { unreadable: all.filter((x) => !x).length });
};
const short = (s, n = 110) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function summary(project, { now = new Date() } = {}) {
  const dir = path.join(project, ".ritual");
  if (!existsSync(dir)) return "No .ritual/ folder: run /ritual to set Ritual up first.";
  const local = path.join(dir, "local");
  const mark = path.join(local, "last-ritual.txt");
  const since = existsSync(mark) ? readFileSync(mark, "utf8").trim() : null;
  const isRecent = (x) => !since || x.date > since;
  const lines = [`Ritual · summary since ${since ? since.slice(0, 16).replace("T", " ") : "the beginning"} (now ${now.toISOString().slice(0, 16).replace("T", " ")})`];

  const read = readJsonl(path.join(local, "log.jsonl"));
  const log = read.filter(isRecent);
  const commands = log.filter((x) => x.type === "command"), corrections = log.filter((x) => x.type === "correction");
  lines.push("", `Log: ${commands.length} failed command(s), ${corrections.length} correction(s)${read.unreadable ? ` · ${read.unreadable} unreadable line(s) skipped` : ""}`);
  for (const x of commands.slice(-15)) lines.push(`  ${x.date.slice(5, 16).replace("T", " ")} cmd  ${short(x.command, 80)}  →  ${short(x.error, 90)}`);
  for (const x of corrections.slice(-15)) lines.push(`  ${x.date.slice(5, 16).replace("T", " ")} fix  «${short(x.phrase, 90)}»${x.last ? `  while ${x.last.tool} ${short(x.last.target, 60)}` : ""}`);
  if (log.length > 30) lines.push(`  … ${log.length - 30} more in .ritual/local/log.jsonl`);

  const blocks = readJsonl(path.join(local, "guard.jsonl")).filter(isRecent);
  const byRule = {};
  for (const b of blocks) byRule[b.rule] = (byRule[b.rule] ?? 0) + 1;
  lines.push("", `Guard: ${blocks.length} block(s)${blocks.length ? " · " + Object.entries(byRule).map(([r, n]) => `${r} ×${n}`).join(", ") : ""}${blocks.length ? " (details: hooks/guard.mjs --log)" : ""}`);

  const sessions = existsSync(path.join(local, "sessions")) ? readdirSync(path.join(local, "sessions")).map((a) => { try { return JSON.parse(readFileSync(path.join(local, "sessions", a), "utf8")); } catch { return null; } }).filter(Boolean) : [];
  const recent = sessions.filter((s) => !since || (s.last?.date ?? "") > since);
  const byGroup = {};
  for (const s of recent) for (const g of s.sent ?? []) byGroup[g] = (byGroup[g] ?? 0) + 1;
  lines.push("", `Groups touched in ${recent.length} session(s): ${Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} (${n})`).join(", ") || "none recorded"}`);

  const candidates = path.join(dir, "candidates.md");
  const rows = existsSync(candidates) ? readFileSync(candidates, "utf8").split("\n").filter((l) => /^\|\s*\S/.test(l) && !/^\|\s*#\s*\||^\|\s*-+/.test(l)) : [];
  const openRows = rows.filter((l) => /\|\s*open\s*\|/i.test(l));
  lines.push("", `Candidates: ${openRows.length} open of ${rows.length}`);
  for (const l of openRows.slice(0, 10)) lines.push(`  ${short(l, 140)}`);
  if (openRows.length > 10) lines.push(`  … ${openRows.length - 10} more in .ritual/candidates.md`);
  return lines.join("\n");
}

export function groups(project) {
  const dir = path.join(project, ".ritual", "local", "sessions");
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
      "{\"date\":\"2026-10-12T10:06:00Z\",\"type\":\"comma", // cut-off write, no newline: what a crash leaves behind
    ].join("\n"));
    // WEB-1: what a hook writes after the cut-off line must not stick to it.
    appendLine(path.join(tmp, ".ritual", "local", "log.jsonl"), { type: "command", command: "npm run lint", error: "Exit code 1\nafter the cut" });
    writeFileSync(path.join(tmp, ".ritual", "local", "guard.jsonl"), JSON.stringify({ date: "2026-10-12T10:01:00Z", rule: "python-c", command: "python -c 1" }) + "\n");
    writeFileSync(path.join(local, "a.json"), JSON.stringify({ sent: ["interface-and-design", "console-and-tools"], last: { date: "2026-10-12T10:05:00Z" } }));
    writeFileSync(path.join(tmp, ".ritual", "candidates.md"), "# Candidates\n\n| # | What it would check | Lesson | Status | Date |\n|---|---|---|---|---|\n| 1 | check x | 13 | open | 2026-10-02 |\n| 2 | check y | 21 | done | 2026-10-03 |\n");
    writeFileSync(path.join(tmp, ".ritual", "local", "last-ritual.txt"), "2026-10-05T00:00:00Z");
    const r = summary(tmp);
    for (const expected of ["2 failed command(s), 1 correction(s)", "after the cut", "1 unreadable line(s) skipped", "npm run build", "Type error", "«eso está mal»", "while Edit src/a.tsx", "1 block(s) · python-c ×1", "interface-and-design (1)", "1 open of 2", "check x"])
      if (!r.includes(expected)) bad.push(`the summary does not say «${expected}»`);
    if (r.includes("old")) bad.push("the summary includes an error from before the last ritual");
    if (r.includes("check y")) bad.push("the summary lists a candidate that is already done");
    if (groups(tmp).join() !== "interface-and-design,console-and-tools") bad.push(`--groups gave ${groups(tmp).join()}`);
    // More open candidates than the summary lists: it says how many it left out, so none is lost by being eleventh.
    const many = Array.from({ length: 12 }, (_, i) => `| ${i + 1} | check ${i + 1} | 13 | open | 2026-10-02 |`).join("\n");
    writeFileSync(path.join(tmp, ".ritual", "candidates.md"), `# Candidates\n\n| # | What it would check | Lesson | Status | Date |\n|---|---|---|---|---|\n${many}\n`);
    const long = summary(tmp);
    if (!long.includes("12 open of 12") || !long.includes("2 more in .ritual/candidates.md")) bad.push("with 12 open candidates the summary must say it lists 10 and that 2 more are in candidates.md");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) failed` : "✓ summary: filters by date, counts unreadable lines without losing the next one, and lists only open items");
    process.exit(bad ? 1 : 0);
  }
  const project = path.resolve(args.find((a) => !a.startsWith("--")) ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  if (args.includes("--mark")) {
    mkdirSync(path.join(project, ".ritual", "local"), { recursive: true });
    writeFileSync(path.join(project, ".ritual", "local", "last-ritual.txt"), new Date().toISOString());
    console.log("✓ ritual date recorded");
    process.exit(0);
  }
  if (args.includes("--groups")) { console.log(groups(project).join(", ") || "none recorded"); process.exit(0); }
  console.log(summary(project));
}
