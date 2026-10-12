#!/usr/bin/env node
// Checks that nothing git is about to upload names the source project.
// The word list lives outside git (private/do-not-publish/forbidden.txt, one per line, # comments): if it lived
// here, we would publish exactly what we want to hide. Without a list there is no check: it fails loudly, it does not pass as clean.
// Matches case-insensitively and at the start of a word, so a word also finds its plurals. It first removes the
// allowed words (the author), so a nickname is not found inside the full name.
// Usage: node scripts/check-publish.mjs             checks what git would upload (tracked and new non-ignored files)
//        node scripts/check-publish.mjs --selftest  calibrates: one case that must fail and one that must pass
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LIST = path.join(ROOT, "private", "do-not-publish", "forbidden.txt");
const ALLOWED = ["Zurishadday"];
const MAX_SIZE = 2 * 1024 * 1024; // larger files are not text worth reading

export function readList(file = LIST) {
  if (!existsSync(file)) throw new Error(`The list ${file} does not exist. Without a list there is no check.`);
  const words = readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!words.length) throw new Error(`The list ${file} is empty.`);
  return words;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** @returns {{line: number, word: string, text: string}[]} */
export function find(text, words) {
  const clean = ALLOWED.reduce((t, p) => t.replace(new RegExp(escapeRegex(p), "gi"), ""), text);
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${words.map(escapeRegex).join("|")})`, "giu");
  const hits = [];
  clean.split("\n").forEach((l, i) => {
    for (const m of l.matchAll(pattern)) hits.push({ line: i + 1, word: m[1], text: l.trim().slice(0, 120) });
  });
  return hits;
}

export function selftest(words) {
  const bad = words.flatMap((p) => [`Hello ${p}.`, p.toUpperCase(), `${p.toLowerCase()}s in the plural`]).join("\n");
  const good = [
    "Copyright (c) 2026 Zurishadday",
    "Normal text with nothing to hide.",
    ...ALLOWED.map((p) => `The author is ${p.toLowerCase()} and ${p.toUpperCase()}.`),
  ].join("\n");
  const failures = [];
  const found = new Set(find(bad, words).map((h) => h.word.toLowerCase()));
  for (const p of words) if (!found.has(p.toLowerCase())) failures.push(`expected to find «${p}» and did not`);
  for (const h of find(good, words)) failures.push(`should not have found «${h.word}» in: ${h.text}`);
  for (const m of failures) console.error(`✕ ${m}`);
  return failures.length;
}

if (import.meta.main) {
  const words = readList();
  if (process.argv.includes("--selftest")) {
    const failures = selftest(words);
    console.log(failures ? `${failures} case(s) failed` : `✓ calibrated: finds all ${words.length} words and lets the author through`);
    process.exit(failures ? 1 : 0);
  }
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" })
    .split("\n").filter(Boolean);
  let total = 0;
  for (const file of files) {
    const filePath = path.join(ROOT, file);
    if (!existsSync(filePath) || statSync(filePath).size > MAX_SIZE) continue;
    for (const h of find(readFileSync(filePath, "utf8"), words)) {
      console.log(`${file}:${h.line}  «${h.word}»  ${h.text}`);
      total++;
    }
  }
  console.log(total ? `✕ ${total} mention(s) of what is never published. Do not push anything.` : `✓ ${files.length} file(s) clean`);
  process.exit(total ? 1 : 0);
}
