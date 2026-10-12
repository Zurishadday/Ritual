#!/usr/bin/env node
// Live hook test: builds a temp project with .ritual/, loads the plugin from this folder and runs
// `claude -p` with a task that touches a component and a forbidden command. Then it checks the data, not the model's
// answer: the session state says whether the interface questions were sent, the guard log says whether it blocked
// `python -c`, and the transcript says whether the context really reached the model.
// Spends tokens (Haiku): not part of `npm test`. Usage: node scripts/live-hook-test.mjs
// Looks for `claude` in CLAUDE_BIN, on the PATH, or in the Windows desktop app.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function findClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  for (const n of ["claude", "claude.exe", "claude.cmd"]) {
    const r = spawnSync(process.platform === "win32" ? "where" : "which", [n], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0];
  }
  const packages = path.join(process.env.LOCALAPPDATA ?? "", "Packages");
  if (!existsSync(packages)) return null;
  const candidates = [];
  for (const p of readdirSync(packages).filter((p) => p.startsWith("Claude_"))) {
    const base = path.join(packages, p, "LocalCache", "Roaming", "Claude", "claude-code");
    if (!existsSync(base)) continue;
    for (const v of readdirSync(base)) for (const h of readdirSync(path.join(base, v))) {
      const exe = path.join(base, v, h, "claude.exe");
      if (existsSync(exe)) candidates.push({ exe, date: statSync(exe).mtimeMs });
    }
  }
  return candidates.sort((a, b) => b.date - a.date)[0]?.exe ?? null;
}

const claude = findClaude();
if (!claude) { console.error("Can't find `claude`. Set the path in CLAUDE_BIN."); process.exit(1); }
console.log(`claude: ${claude}`);

const project = mkdtempSync(path.join(os.tmpdir(), "ritual-live-"));
mkdirSync(path.join(project, ".ritual", "local"), { recursive: true });
cpSync(path.join(ROOT, "templates", "config.json"), path.join(project, ".ritual", "config.json"));
cpSync(path.join(ROOT, "templates", "guard.json"), path.join(project, ".ritual", "guard.json"));
mkdirSync(path.join(project, "src", "components"), { recursive: true });
writeFileSync(path.join(project, "CLAUDE.md"), "Test project. Do exactly what the prompt says, nothing else.\n");

const task = 'Do these two steps in order and then stop. Step 1: use the Write tool to create src/components/Hola.tsx with a React component that renders the text "Hola". Step 2: use the Bash tool to run exactly this command: python -c "print(1)". If a tool is blocked, do not retry it; just report what happened in one line.';
const r = spawnSync(claude, ["-p", task, "--plugin-dir", ROOT, "--model", "haiku", "--max-turns", "8", "--allowedTools", "Write,Bash", "--output-format", "json"], { cwd: project, encoding: "utf8", timeout: 300_000, env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
if (r.error) { console.error(`Could not run claude: ${r.error.message}`); process.exit(1); }
let output = {};
try { output = JSON.parse(r.stdout); } catch { /* no json */ }
console.log(`\nModel response: ${String(output.result ?? r.stdout).trim().slice(0, 400)}\n`);
if (r.stderr?.trim()) console.log(`stderr: ${r.stderr.trim().slice(0, 600)}\n`);

const failures = [];
const local = path.join(project, ".ritual", "local");
const sessions = existsSync(path.join(local, "sessions")) ? readdirSync(path.join(local, "sessions")) : [];
const state = sessions.length ? JSON.parse(readFileSync(path.join(local, "sessions", sessions[0]), "utf8")) : null;
if (!state) failures.push("the questions hook did not run: there is no session state in .ritual/local/sessions/");
else if (!state.sent.includes("interface-and-design")) failures.push(`the questions hook ran but did not send interface-and-design (sent: ${state.sent.join(", ") || "nothing"})`);
const guard = path.join(local, "guard.jsonl");
if (!existsSync(guard) || !readFileSync(guard, "utf8").includes('"rule":"python-c"')) failures.push("the guard did not block `python -c` (no block in guard.jsonl)");

const id = output.session_id;
let transcript = null;
if (id) {
  const projects = path.join(os.homedir(), ".claude", "projects");
  const search = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { const x = search(p); if (x) return x; } else if (e.name === `${id}.jsonl`) return p; } return null; };
  transcript = existsSync(projects) ? search(projects) : null;
}
if (!transcript) failures.push(`could not find the transcript of session ${id ?? "(no id)"} to check that the context arrived`);
else if (!readFileSync(transcript, "utf8").includes("Ritual · ")) failures.push("the hook sent the context but it does not appear in the transcript: it did not reach the model");

rmSync(project, { recursive: true, force: true });
for (const f of failures) console.log(`✕ ${f}`);
console.log(failures.length ? `${failures.length} failure(s)` : "✓ live: the questions reached the model, the guard blocked and everything was logged");
process.exit(failures.length ? 1 : 0);
