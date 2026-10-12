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
  "scripts/init.mjs --selftest",
  "scripts/summary.mjs --selftest",
  "scripts/share.mjs --selftest",
];

let failed = 0;
for (const step of STEPS) {
  const r = spawnSync(process.execPath, step.split(" "), { cwd: ROOT, encoding: "utf8" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  const verdict = out.split("\n").find((l) => l.startsWith("✓"));
  if (r.status === 0 && verdict) { console.log(`${verdict}   (${step})`); continue; }
  failed++;
  console.log(`✕ ${step}: exit ${r.status}${verdict ? "" : ", no ✓ verdict"}`);
  if (out) console.log(out.replace(/^/gm, "    "));
}
console.log(failed ? `✕ ${failed} of ${STEPS.length} step(s) failed (Node ${process.versions.node})` : `✓ ${STEPS.length} step(s) passed (Node ${process.versions.node})`);
process.exit(failed ? 1 : 0);
