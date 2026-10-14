#!/usr/bin/env node
// Stop hook: Ritual's close, on its own. The first time Claude is about to finish after changing files in a session, it
// is sent back once to check the work the way its user will meet it: run it, go through the lessons of the project's
// packages, fix what fails, and say what it ran for each. Once per session, so a long session pays for it once; a
// session that only talked never gets it. `"close": false` in .ritual/config.json turns it off.
// In the A/B simulation the questions alone, shown while writing, changed nothing: the builder read them and went on.
// Usage: node hooks/close.mjs --selftest
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMain, readInput, readJson, ritualDir, session } from "./common.mjs";
import { DEFAULT_CONFIG, packageLessons } from "./questions.mjs";

const PLUGIN = path.resolve(import.meta.dirname, "..");

/** Automatic checks a package brings, run against the running project. */
const CHECKS = {
  web: (plugin) => `Web: start the site and run node "${path.join(plugin, "scripts", "web-check.mjs")}" http://localhost:<port>. It submits the form with JavaScript off and with the keyboard, floods it, sends rejected attempts before a good one, and saves phone and desktop screenshots: fix every ✕ and look at the screenshots.`,
};

export function closeReason(config, ritual, plugin = PLUGIN) {
  const lessons = packageLessons(config, ritual);
  const checks = (config.packages ?? []).map((p) => CHECKS[p]?.(plugin)).filter(Boolean);
  return [
    "Ritual close, once per session: before you finish, check this work the way its user will meet it. Reading the code is not checking it: run it.",
    ...checks,
    ...(lessons.length ? ["For each of these, run a check, fix what fails:", ...lessons.map((l) => `- ${l.id} · ${l.title}`)] : ["Go back over the detector questions shown in this session and check each one that applied, by running it."]),
    "Then end your reply with one line per check: what you ran and what you saw. If something can't be checked here, say so instead of calling it done. Reply to the user in their language.",
  ].join("\n");
}

/** The decision for a Stop event, or null to let Claude finish. Marks the session closed when it asks. */
export function decide(input, ritual, plugin = PLUGIN) {
  if (!ritual || input?.stop_hook_active) return null;
  const config = { ...DEFAULT_CONFIG, ...readJson(path.join(ritual, "config.json"), {}) };
  if (config.close === false) return null;
  const state = session(ritual, input?.session_id);
  if (!state.data.edited || state.data.closed) return null;
  state.data.closed = true;
  state.save();
  return { decision: "block", reason: closeReason(config, ritual, plugin) };
}

export function selftest() {
  const bad = [];
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ritual-close-"));
  const ritual = path.join(tmp, ".ritual");
  const state = (id, data) => { mkdirSync(path.join(ritual, "local", "sessions"), { recursive: true }); writeFileSync(path.join(ritual, "local", "sessions", `${id}.json`), JSON.stringify(data)); };
  const config = (o) => writeFileSync(path.join(ritual, "config.json"), JSON.stringify(o));
  try {
    mkdirSync(ritual, { recursive: true });
    config({ packages: ["web"] });
    if (decide({ session_id: "talk" }, ritual)) bad.push("a session that changed no file must finish untouched");
    state("talk", { sent: [] });
    if (decide({ session_id: "talk" }, ritual)) bad.push("a session state without edits must finish untouched");
    state("s1", { sent: [], edited: true });
    const first = decide({ session_id: "s1" }, ritual);
    if (first?.decision !== "block" || !first.reason.includes("- WEB-3 · ") || !first.reason.includes("web-check.mjs") || !first.reason.includes("run it")) bad.push(`after edits, the first stop must ask for the close with the web lessons and check: ${JSON.stringify(first)?.slice(0, 200)}`);
    if (!JSON.parse(readFileSync(path.join(ritual, "local", "sessions", "s1.json"), "utf8")).closed) bad.push("asking for the close must mark the session closed");
    if (decide({ session_id: "s1" }, ritual)) bad.push("the close is once per session: the second stop must finish");
    state("s2", { sent: [], edited: true });
    if (decide({ session_id: "s2", stop_hook_active: true }, ritual)) bad.push("a stop that already comes from this hook must finish (no loop)");
    if (decide({ session_id: "s3" }, null)) bad.push("a project without .ritual/ must finish untouched");
    config({ packages: [], close: false });
    state("s4", { sent: [], edited: true });
    if (decide({ session_id: "s4" }, ritual)) bad.push("\"close\": false must turn it off");
    config({ packages: [] });
    const plain = decide({ session_id: "s4" }, ritual);
    if (!plain?.reason.includes("detector questions shown in this session") || plain.reason.includes("web-check")) bad.push(`without packages the close asks for the session's questions and no web check: ${plain?.reason.slice(0, 160)}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  if (process.argv.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ close: once per session after edits, never in a loop, never after only talking, off when asked");
    process.exit(bad ? 1 : 0);
  }
  const input = await readInput();
  const out = decide(input, ritualDir(input));
  if (out) console.log(JSON.stringify(out));
}
