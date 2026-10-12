#!/usr/bin/env node
// Console guard: PreToolUse hook for Bash that blocks the commands this project has already seen fail, and says what to use instead. A rule you have to remember gets forgotten in a long session; this one checks it by itself.
// It checks only the command: the body of a heredoc (a commit message) does not count, nor the code inside quotes of another command on the same line. Each block is logged to .ritual/local/guard.jsonl, so the ritual can see with data whether it was right. A false alarm is added as a case that must be allowed.
// Per-project config in .ritual/guard.json: { "builtin": [...names], "rules": [{ name, pattern, message, blocks: [...], allows: [...], platforms?: ["win32", "linux", "darwin"] }] }. A rule without cases is an error: --selftest rejects it.
// A rule with `platforms` only runs there. The builtin rules are for the Windows console (Git Bash), which changes code on the way; on Linux and macOS those commands are fine.
// Usage: node hooks/guard.mjs --selftest [project]  calibrates each rule alone, with its cases
//        node hooks/guard.mjs --log [project]       summarizes the blocks, for the ritual
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { appendLine, isMain, readInput, readJson, ritualDir } from "./common.mjs";

const CODE = /\.(ts|tsx|js|mjs|cjs|py|mdx|css|json)\b/;

// The body of a heredoc is content, not a command: it is removed before searching.
export function stripHeredocs(c) {
  return c.replace(/<<-?\s*(['"]?)([A-Za-z_]+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, "<<heredoc");
}

// Builtin rules: the ones that can't be written as a pattern, because they look at only one part of the command.
const WINDOWS = ["win32"];
export const BUILTIN = {
  "python-c": {
    platforms: WINDOWS,
    check: (c) => (/(^|[\s;&|(])(python3?|py)(\s+-[A-Za-z]+)*?\s+-[A-Za-z]*c\b/.test(c)
      ? "Don't use `python -c`: this console mangles code on the way. Write the script to a file with Write and run `python -I <file>`." : null),
    blocks: ['python -c "print(1)"', "python -I -c 'import sys'", "cd x && python3 -c 'print(2)'", "py -c 'print(3)'"],
    allows: ["python -I scripts/logo.py", "python --version", "grep -c 'python -c' CLAUDE.md", "git commit -F - <<'EOF'\nThe guard blocks python -c and sed -i on code.\nEOF"],
  },
  "python-no-file": {
    platforms: WINDOWS,
    check: (c) => (/(^|[\s;&|(])(python3?|py)(\s+-I)?\s+-(\s|$)/.test(c)
      ? "`python -` with no file leaves the console waiting. Write the script with Write and run `python -I <file>`." : null),
    blocks: ["python - <<'EOF'\nprint(1)\nEOF"],
    allows: ["python --version", "python -I x.py"],
  },
  "node-e-backslashes": {
    platforms: WINDOWS,
    // Only counts the code of `node -e` (the text between its quotes): a `grep "\s"` after it isn't its.
    check: (c) => {
      const m = c.match(/(^|[\s;&|(])node\s+(-e|--eval|-p|--print)\s+(["'])/);
      if (!m) return null;
      const from = m.index + m[0].length;
      const to = c.indexOf(m[3], from);
      return c.slice(from, to < 0 ? undefined : to).includes("\\")
        ? "`node -e` with backslashes breaks in this console. Write the script to a file with Write and run `node <file>`." : null;
    },
    blocks: ['node -e "console.log(\'a\\nb\')"'],
    allows: ["node scripts/recorrer.mjs", "node -e \"console.log(require('fs').existsSync('x'))\"", "node -e \"JSON.parse(require('fs').readFileSync('a.json','utf8'))\" && grep -E \"^\\s+[0-9]+\" salida.txt"],
  },
  "heredoc-backslashes": {
    platforms: WINDOWS,
    // Only counts the heredoc body, up to the line that closes it. Looks at the full command, not the trimmed one.
    check: (_c, full) => {
      const h = full.match(/<<-?\s*(['"]?)([A-Za-z_]+)\1/);
      if (!h) return null;
      const start = full.indexOf("\n", h.index);
      const end = start < 0 ? -1 : full.slice(start).search(new RegExp(`\\n\\s*${h[2]}\\s*(\\n|$)`));
      const body = start < 0 ? "" : full.slice(start, end < 0 ? undefined : start + end);
      return body.includes("\\") ? "A heredoc with backslashes gets changed on the way. Write the file with Write (or Edit) instead." : null;
    },
    blocks: ["cat > a.mjs <<'EOF'\nconst r = /\\d+/;\nEOF"],
    allows: ["git commit -q -F - <<'EOF'\nStep 6: tables\n\nCo-Authored-By: Claude\nEOF", "git commit -F - <<'EOF'\nStep 7\nEOF\ngrep -E \"^\\s+ok\" salida.txt"],
  },
  "sed-i-code": {
    platforms: WINDOWS,
    // Only counts the file of this `sed -i`, up to the next && ; or |.
    check: (c) => {
      const s = c.match(/(^|[\s;&|(])sed\s+((-[A-Za-z]*i[A-Za-z]*|--in-place)\S*)\s+([^;&|]*)/);
      return s && CODE.test(s[4]) ? "`sed -i` on code edits every line if the address ends up empty, and turns \\\\n into newlines. Use Edit or a script of exact replacements." : null;
    },
    blocks: ["sed -i 's/a/b/' src/components/Quiz.tsx", "sed -i.bak 's/x/y/' scripts/datos.py"],
    allows: ["sed -n 1,20p src/app/globals.css", "sed -i 's/viejo/nuevo/' docs/avance.md", "sed -i 's/a/b/' docs/avance.md && node scripts/x.mjs"],
  },
};

export const DEFAULT = { builtin: Object.keys(BUILTIN), rules: [] };

export function readConfig(dir) {
  return dir ? readJson(path.join(dir, "guard.json"), DEFAULT) : DEFAULT;
}

/** The active rules on this platform, with the same shape (platform null: all of them, to calibrate). */
export function rulesOf(config, platform = process.platform) {
  const builtin = (config.builtin ?? []).filter((n) => BUILTIN[n]).map((n) => ({ name: n, ...BUILTIN[n] }));
  const own = (config.rules ?? []).map((r) => ({ ...r, check: (c) => (new RegExp(r.pattern, "u").test(c) ? r.message : null) }));
  return [...builtin, ...own].filter((r) => !platform || !r.platforms || r.platforms.includes(platform));
}

/** @returns {{name: string, message: string} | null} */
export function check(command, config = DEFAULT, platform = process.platform) {
  const full = String(command ?? "");
  const c = stripHeredocs(full);
  for (const r of rulesOf(config, platform)) {
    const message = r.check(c, full);
    if (message) return { name: r.name, message };
  }
  return null;
}

/** Calibrates each rule alone (if another catches the error first, yours was never tested) and the cases that must pass against all of them. */
export function selftest(config = DEFAULT) {
  const failures = [];
  const rules = rulesOf(config, null);
  for (const r of rules) {
    if (!r.blocks?.length || !r.allows?.length) { failures.push(`${r.name}: a rule without a case that blocks and one that allows is an error`); continue; }
    for (const c of r.blocks) if (!r.check(stripHeredocs(c), c)) failures.push(`${r.name} should have blocked: ${c.replace(/\n/g, "⏎")}`);
    for (const c of r.allows) { const x = check(c, config, null); if (x) failures.push(`${x.name} should not have blocked: ${c.replace(/\n/g, "⏎")}`); }
  }
  // The builtin rules come from the Windows console (Git Bash), which mangles code on the way; on Linux and macOS those commands work.
  for (const [name, r] of Object.entries(BUILTIN)) {
    if (!check(r.blocks[0], DEFAULT, "win32")) failures.push(`${name} should block on Windows`);
    for (const p of ["linux", "darwin"]) { const x = check(r.blocks[0], DEFAULT, p); if (x) failures.push(`${x.name} should not block on ${p}`); }
  }
  const everywhere = { builtin: [], rules: [{ name: "x", pattern: "danger", message: "m", blocks: ["danger"], allows: ["ok"] }] };
  if (!check("danger", everywhere, "linux")) failures.push("a rule without platforms should block everywhere");
  if (check("danger", { builtin: [], rules: [{ ...everywhere.rules[0], platforms: ["darwin"] }] }, "linux")) failures.push("a rule for darwin should not block on linux");
  for (const m of failures) console.error(`✕ ${m}`);
  return { failures: failures.length, rules: rules.length };
}

if (isMain(import.meta.url)) {
  const project = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const dir = project ? path.join(path.resolve(project), ".ritual") : ritualDir(null);
  const config = readConfig(dir && existsSync(dir) ? dir : null);
  if (process.argv.includes("--selftest")) {
    const { failures, rules } = selftest(config);
    console.log(failures ? `${failures} bad case(s)` : `✓ ${rules} rule(s) calibrated`);
    process.exit(failures ? 1 : 0);
  }
  if (process.argv.includes("--log")) {
    const file = dir && path.join(dir, "local", "guard.jsonl");
    const lines = file && existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
    if (!lines.length) { console.log("No blocks logged."); process.exit(0); }
    const byRule = {};
    for (const l of lines) (byRule[l.rule] ??= []).push(l);
    console.log(`${lines.length} block(s), from ${lines[0].date.slice(0, 10)} to ${lines.at(-1).date.slice(0, 10)}:`);
    for (const [rule, items] of Object.entries(byRule)) {
      console.log(`\n${items.length} · ${rule}`);
      for (const l of items.slice(-5)) console.log(`   ${l.date.slice(0, 16)}  ${l.command.replace(/\n/g, "⏎").slice(0, 140)}`);
    }
    process.exit(0);
  }
  const input = await readInput();
  const ritual = ritualDir(input);
  if (!input || !ritual) process.exit(0);
  const hit = check(input.tool_input?.command, readConfig(ritual));
  if (hit) {
    appendLine(path.join(ritual, "local", "guard.jsonl"), { rule: hit.name, command: String(input.tool_input?.command ?? "").slice(0, 400) });
    console.error(`Ritual guard (${hit.name}): ${hit.message}`);
    process.exit(2);
  }
}
