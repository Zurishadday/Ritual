#!/usr/bin/env node
// Runs every selftest and the library check. A step passes only with exit 0 and its ✓ line: a script that printed
// nothing (on an old Node it may never have run) gave no verdict, and no verdict is not a pass (lessons 1 and 44).
// Usage: node scripts/test.mjs   (npm test)
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STEPS = [
  "scripts/lessons.mjs --selftest",
  "scripts/lessons.mjs --check",
  "hooks/guard.mjs --selftest",
  "hooks/log.mjs --selftest",
  "hooks/questions.mjs --selftest",
  "hooks/start.mjs --selftest",
  "hooks/close.mjs --selftest",
  "hooks/pick.mjs --selftest",
  "scripts/web-check.mjs --selftest",
  "scripts/init.mjs --selftest",
  "scripts/summary.mjs --selftest",
  "scripts/share.mjs --selftest",
  "scripts/doctor.mjs --selftest",
  "scripts/maintain.mjs --selftest",
  "scripts/simulate.mjs --selftest",
  "scripts/site.mjs --selftest",
  "assets/social/card.mjs --selftest",
];

// A step that passes with warnings says so inside its ✓ line ("(6 translation warning(s))"). The last line carries
// their total, so reading the verdict is enough: twice a search for another mark hid them (126, then 6).
const warningsIn = (line) => [...line.matchAll(/\b(\d+) [a-z ]*warning\(s\)/g)].reduce((n, m) => n + Number(m[1]), 0);
if (warningsIn("✓ ok (6 translation warning(s))") !== 6 || warningsIn("✓ 84 lessons are well formed") !== 0) throw new Error("warningsIn no longer reads a step's warnings");

let failed = 0, warnings = 0;
for (const step of STEPS) {
  const r = spawnSync(process.execPath, step.split(" "), { cwd: ROOT, encoding: "utf8" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  const verdict = out.split("\n").find((l) => l.startsWith("✓"));
  if (r.status === 0 && verdict) { warnings += warningsIn(verdict); console.log(`${verdict}   (${step})`); continue; }
  failed++;
  console.log(`✕ ${step}: exit ${r.status}${verdict ? "" : ", no ✓ verdict"}`);
  if (out) console.log(out.replace(/^/gm, "    "));
}
const node = `(Node ${process.versions.node})`;
console.log(failed ? `✕ ${failed} of ${STEPS.length} step(s) failed ${node}` : warnings ? `✓ ${STEPS.length} step(s) passed, ⚠ with ${warnings} warning(s): read the step that gives them ${node}` : `✓ ${STEPS.length} step(s) passed ${node}`);
process.exit(failed ? 1 : 0);
