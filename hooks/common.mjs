// What the hooks share: read the input, find the project's .ritual/ folder, and write without breaking anything.
// A hook never breaks the tool: if writing a note fails, it stays quiet and lets things pass.
import { appendFileSync, closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Whether this module is the script node was started with. Not `import.meta.main`: Node 20 lacks it, and there every
 * hook and selftest did nothing and exited 0. */
export function isMain(url) {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url)); } catch { return false; }
}

/** The hook's input, or null: then the hook does nothing. Also null inside the background session that picks lessons
 * (hooks/pick.mjs sets RITUAL_PICKER), so Ritual never fires inside its own picker. */
export async function readInput() {
  if (process.env.RITUAL_PICKER) return null;
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try { return JSON.parse(raw); } catch { return null; }
}

/** The project's .ritual/ folder, or null if the project does not use Ritual (then the hooks do nothing). */
export function ritualDir(input) {
  const base = process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();
  const dir = path.join(base, ".ritual");
  return existsSync(dir) ? dir : null;
}

export function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return fallback; }
}

/** If the file does not end in a newline (a cut-off write), the new record starts with one so it does not stick to it (WEB-1). */
function endsWithoutNewline(file) {
  let fd;
  try {
    fd = openSync(file, "r");
    const { size } = fstatSync(fd);
    if (!size) return false;
    const last = Buffer.alloc(1);
    readSync(fd, last, 0, 1, size - 1);
    return last[0] !== 10;
  } catch { return false; } finally { if (fd !== undefined) closeSync(fd); }
}

export function appendLine(file, object) {
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, (endsWithoutNewline(file) ? "\n" : "") + JSON.stringify({ date: new Date().toISOString(), ...object }) + "\n");
  } catch { /* no log */ }
}

/** State of the current session (which groups already got their questions, what was touched last). */
export function session(dir, id) {
  const file = path.join(dir, "local", "sessions", `${String(id || "no-id").replace(/[^\w-]/g, "_")}.json`);
  const data = readJson(file, { sent: [] });
  return {
    data,
    save() { try { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(data)); } catch { /* no state */ } },
  };
}
