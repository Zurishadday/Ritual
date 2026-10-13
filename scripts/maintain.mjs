#!/usr/bin/env node
// Maintaining Ritual: the mechanical half of the `maintain` skill (.claude/skills/maintain/). Claude does the judgment
// (is it covered, is it generic, does it break with Claude, where it goes); this script reads the issue, checks the
// lesson, picks the next id, and writes it into the library exactly in the format the checker expects.
// Usage: node scripts/maintain.mjs issue <N>                         reads a `lesson` or `confirmation` issue with gh
//        node scripts/maintain.mjs add <file> <origin> [id]          adds a checked lesson to lessons/en/ (next id if none)
//        node scripts/maintain.mjs seen <id> <model> <YYYY-MM>       adds a confirmation to a lesson's `seen:`
//        node scripts/maintain.mjs --selftest
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isMain } from "../hooks/common.mjs";
import { ROOT, TAXONOMY, compareIds, parseLessons, readLessons } from "./lessons.mjs";
import { checkShare } from "./share.mjs";

const FORMS = { lesson: "share-a-lesson.yml", confirmation: "confirm-a-lesson.yml" };
const SHARE_ONLY = ["Where it goes", "Transfers to", "How to reproduce"];
const list = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The fields of an issue form: [{id, label}], read from its template. */
export function formFields(template) {
  const yml = readFileSync(path.join(ROOT, ".github", "ISSUE_TEMPLATE", template), "utf8").replace(/\r\n/g, "\n");
  return [...yml.matchAll(/^\s+id: (\S+)\s*\n\s+attributes:\s*\n\s+label: (.+)$/gm)].map((m) => ({ id: m[1], label: m[2].trim().replace(/^"|"$/g, "") }));
}

/** An issue body made by a form, back into its fields. It splits only on the form's own labels: the lesson itself has `### ` headings. */
export function parseForm(body, fields) {
  const text = String(body ?? "").replace(/\r\n/g, "\n");
  const marks = fields.map((f) => ({ ...f, at: text.search(new RegExp(`^### ${escape(f.label)}[ \\t]*$`, "m")) })).filter((f) => f.at >= 0).sort((a, b) => a.at - b.at);
  const out = {};
  marks.forEach((f, i) => {
    const value = text.slice(text.indexOf("\n", f.at), i + 1 < marks.length ? marks[i + 1].at : text.length).trim();
    out[f.id] = value === "_No response_" ? "" : value;
  });
  return out;
}

/** The fields of a `lesson` issue as a file `share.mjs check` reads: heading, data line, five parts, the three extra parts. */
export function shareText(f) {
  const where = (f.where ?? "").trim();
  const pkg = where.match(/^(?:new )?package ([a-z0-9-]+)/)?.[1];
  const data = [`origin: field · ${f.model} · ${f.month}`, `groups: ${f.group}`, pkg && `packages: ${pkg}`].filter(Boolean).map((d) => `\`${d}\``).join(" · ");
  const [head, ...rest] = (f.lesson ?? "").trim().split("\n");
  return [head, "", data, "", rest.join("\n").trim(), "", `**Where it goes.** ${where}`, "", `**Transfers to.**\n${(f.transfer ?? "").trim()}`, "", `**How to reproduce.** ${(f.reproduce ?? "").trim()}`, ""].join("\n");
}

/** The next free id: core numbers never repeat across files, and a package counts with its prefix (WEB-5; a package
 * whose slug is long names a short one with `prefix` in taxonomy.json: education → EDU-1). */
export function nextId(lessons, pkg) {
  if (!pkg) return String(Math.max(0, ...lessons.filter((l) => /^\d+$/.test(l.id)).map((l) => Number(l.id))) + 1);
  const prefix = TAXONOMY.packages[pkg]?.prefix ?? pkg.toUpperCase();
  return `${prefix}-${Math.max(0, ...lessons.filter((l) => l.id.startsWith(`${prefix}-`)).map((l) => Number(l.id.slice(prefix.length + 1)))) + 1}`;
}

/** A checked shared lesson as a library entry: its group is the first of `groups`, the rest stay secondary. */
export function libraryEntry(l, id, origin) {
  const [group, ...secondary] = list(l.data.groups);
  const data = [`origin: ${origin}`, secondary.length && `groups: ${secondary.join(", ")}`, l.data.packages && `packages: ${l.data.packages}`, l.data.seen && `seen: ${l.data.seen}`]
    .filter(Boolean).map((d) => `\`${d}\``).join(" · ");
  const parts = Object.entries(l.parts).filter(([p]) => !SHARE_ONLY.includes(p)).flatMap(([p, v]) => [`**${p}.** ${v}`, ""]);
  return { group, text: [`### ${id}. ${l.title}`, "", data, "", ...parts].join("\n") };
}

/** Puts an entry in a group file in id order: core by number, package lessons after them. */
export function insertEntry(fileText, id, entry) {
  const blocks = fileText.replace(/\r\n/g, "\n").split(/^(?=### )/m);
  const ids = blocks.map((b) => b.match(/^### (\S+)\. /)?.[1]);
  if (ids.includes(id)) throw new Error(`lesson ${id} already exists`);
  let at = ids.findIndex((x) => x && compareIds({ id: x }, { id }) > 0);
  if (at < 0) at = blocks.length;
  const before = blocks.slice(0, at), after = blocks.slice(at);
  if (!before.at(-1).endsWith("\n\n")) before[before.length - 1] = before.at(-1).replace(/\n*$/, "\n\n");
  return [...before, entry.trimEnd() + (after.length ? "\n\n" : "\n"), ...after].join("");
}

/** Adds `<model> <YYYY-MM>` to a lesson's `seen:` (once). The data line is not part of the fingerprint: translations stay current. */
export function addSeen(fileText, id, model, month) {
  const text = fileText.replace(/\r\n/g, "\n");
  const head = text.match(new RegExp(`^### ${escape(id)}\\. .+\\n\\n(.+)$`, "m"));
  if (!head) throw new Error(`lesson ${id} not found`);
  const line = head[1], entry = `${model} ${month}`;
  const seen = line.match(/`seen: ([^`]+)`/);
  if (seen && list(seen[1]).includes(entry)) return text;
  const next = seen ? line.replace(seen[0], `\`seen: ${seen[1]}, ${entry}\``) : `${line} · \`seen: ${entry}\``;
  return text.replace(head[0], head[0].slice(0, -line.length) + next);
}

const isClaude = (model) => /^~?(claude|opus|sonnet|haiku|fable)/i.test(model ?? "");

function readIssue(n) {
  const issue = JSON.parse(execFileSync("gh", ["issue", "view", String(n), "--repo", "Zurishadday/Ritual", "--json", "number,title,state,labels,body,author,url"], { encoding: "utf8" }));
  const labels = issue.labels.map((l) => l.name);
  const kind = labels.includes("confirmation") || /^Confirm lesson/i.test(issue.title) ? "confirmation" : "lesson";
  return { issue, kind, fields: parseForm(issue.body, formFields(FORMS[kind])) };
}

export function selftest() {
  const bad = [];
  const fields = formFields(FORMS.lesson);
  if (fields.map((f) => f.id).join() !== "model,month,kind,group,where,lesson,transfer,reproduce") bad.push(`share form fields: ${fields.map((f) => f.id).join()}`);
  const body = "### Model\r\n\r\nclaude-sonnet-5-5\r\n\r\n### Month it happened\r\n\r\n2026-11\r\n\r\n### Group (what you were doing)\r\n\r\nscripts-and-files\r\n\r\n### Where it goes\r\n\r\ncore\r\n\r\n### The lesson\r\n\r\n### A reader that skips bad lines loses the next one too\r\n\r\n**The idea.** A cut-off write glues the next record to it.\r\n\r\n**Example.** A log dropped the record after a crash.\r\n\r\n**Detector question.** If the last write was cut, what happens to the next one?\r\n\r\n**Warning sign.** \"Damaged lines get skipped.\"\r\n\r\n**What to do.** Start with a line break if the file does not end in one.\r\n\r\n### Two other kinds of project it applies to\r\n\r\nA data pipeline that appends rows to a CSV.\r\nA chat app that stores messages one per line.\r\n\r\n### How to reproduce it\r\n\r\nAsk for a script that appends JSON lines, cut the last one by hand.";
  const f = parseForm(body, fields);
  if (f.model !== "claude-sonnet-5-5" || f.where !== "core" || !f.lesson?.startsWith("### A reader") || !f.lesson.includes("**What to do.**") || !f.transfer?.includes("chat app")) bad.push(`parseForm: ${JSON.stringify(f).slice(0, 300)}`);
  const c = parseForm("### Lesson number\n\n27\n\n### Model\n\nclaude-opus-5-5\n\n### Month it happened\n\n2026-10\n\n### Kind of project\n\nweb, education\n\n### Your example\n\nIt happened.\n\n### Did Ritual's question show up before the mistake?\n\n_No response_", formFields(FORMS.confirmation));
  if (c.lesson !== "27" || c.example !== "It happened." || c.fired !== "" || c.kind !== "web, education") bad.push(`parseForm on a confirmation: ${JSON.stringify(c)}`);
  const share = checkShare(shareText(f));
  if (share.problems.length) bad.push(`a form lesson should pass the share check: ${share.problems.join(" | ")}`);
  const pkg = checkShare(shareText({ ...f, where: "package web" }));
  if (pkg.lesson?.data.packages !== "web" || pkg.problems.length) bad.push(`\`package web\` should become packages: web: ${pkg.problems.join(" | ")}`);
  const { lessons } = readLessons();
  const top = Math.max(...lessons.filter((l) => /^\d+$/.test(l.id)).map((l) => Number(l.id)));
  if (nextId(lessons) !== String(top + 1)) bad.push(`nextId core: ${nextId(lessons)}, expected ${top + 1}`);
  if (nextId([{ id: "WEB-2" }, { id: "WEB-10" }, { id: "3" }], "web") !== "WEB-11") bad.push("nextId must count WEB-10 as 10, not as text");
  if (nextId([], "games") !== "GAMES-1") bad.push("a new package starts at 1");
  if (nextId([{ id: "EDU-4" }], "education") !== "EDU-5") bad.push(`a package with a prefix in taxonomy.json counts with it: gave ${nextId([{ id: "EDU-4" }], "education")}`);
  const entry = libraryEntry({ ...share.lesson, data: { ...share.lesson.data, groups: "scripts-and-files, tests-and-checks" } }, "54", "field · claude-sonnet-5-5 · 2026-11");
  if (entry.group !== "scripts-and-files" || !entry.text.startsWith("### 54. A reader") || !entry.text.includes("`groups: tests-and-checks`") || /Where it goes|Transfers to|How to reproduce/.test(entry.text)) bad.push(`libraryEntry: ${entry.text.slice(0, 200)}`);
  const file = "# Scripts\n\nIntro.\n\n### 6. Six\n\n`origin: field · ~opus · 2026-08`\n\n**The idea.** x\n\n### 48. Forty-eight\n\n`origin: field · ~sonnet · 2026-09`\n\n**The idea.** y\n\n### WEB-1. Web\n\n`origin: lab · claude-sonnet-5-5 · 2026-10`\n\n**The idea.** z\n";
  const ins = insertEntry(file, "54", entry.text);
  const order = [...ins.matchAll(/^### (\S+)\. /gm)].map((m) => m[1]).join();
  if (order !== "6,48,54,WEB-1") bad.push(`insertEntry order: ${order}`);
  const parsed = parseLessons(ins, "scripts-and-files").lessons;
  if (parsed.length !== 4 || parsed[2].data.origin !== "field · claude-sonnet-5-5 · 2026-11" || parsed[3].parts["The idea"] !== "z") bad.push("insertEntry broke a neighbour or the new entry");
  if (insertEntry(file, "WEB-2", entry.text.replace("### 54.", "### WEB-2.")).trimEnd().split("### ").at(-1).slice(0, 6) !== "WEB-2.") bad.push("a package lesson goes at the end");
  try { insertEntry(file, "48", entry.text); bad.push("an existing id must be refused"); } catch { /* refused */ }
  const once = addSeen(file, "48", "claude-opus-5-5", "2026-10");
  if (!once.includes("`origin: field · ~sonnet · 2026-09` · `seen: claude-opus-5-5 2026-10`")) bad.push(`addSeen first: ${once.slice(60, 200)}`);
  const twice = addSeen(once, "48", "gpt-5", "2026-11");
  if (!twice.includes("`seen: claude-opus-5-5 2026-10, gpt-5 2026-11`")) bad.push("addSeen should append to an existing seen");
  if (addSeen(twice, "48", "gpt-5", "2026-11") !== twice) bad.push("addSeen must not repeat an entry");
  if (addSeen(file, "6", "x", "2026-10").includes("`seen: x 2026-10`\n\n**The idea.** y")) bad.push("addSeen touched the wrong lesson");
  if (!isClaude("~opus") || !isClaude("claude-sonnet-5-5") || isClaude("gpt-5")) bad.push("isClaude");
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "--selftest") {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ maintain: reads issue forms, picks the next id, adds lessons in order and confirmations once");
    process.exit(bad ? 1 : 0);
  }
  if (cmd === "issue" && /^\d+$/.test(args[0] ?? "")) {
    const { issue, kind, fields } = readIssue(args[0]);
    console.log(`#${issue.number} · ${kind} · ${issue.state} · by @${issue.author.login} · ${issue.url}\n${issue.title}\n`);
    for (const [k, v] of Object.entries(fields)) console.log(`${k}: ${v.includes("\n") ? `\n${v.replace(/^/gm, "    ")}` : v}`);
    console.log(`\nModel is ${isClaude(fields.model) ? "Claude: it can go in as field after review" : "not Claude: check it with Claude first (simulations/README.md#checking-a-contributed-lesson)"}.`);
    if (kind === "confirmation") {
      const l = readLessons().lessons.find((x) => x.id === fields.lesson);
      const done = l && list(l.data.seen).includes(`${fields.model} ${fields.month}`);
      console.log(l ? `Lesson ${l.id} · ${l.title}\n  ${l.data.origin}${l.data.seen ? ` · seen: ${l.data.seen}` : ""}\n${done ? "Already applied." : `Apply: node scripts/maintain.mjs seen ${l.id} ${fields.model} ${fields.month}`}` : `✕ lesson «${fields.lesson}» does not exist`);
      process.exit(l ? 0 : 1);
    }
    const file = path.join(ROOT, ".ritual", "local", "maintain", `${issue.number}.md`);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, shareText(fields));
    const { problems, lesson } = checkShare(readFileSync(file, "utf8"));
    for (const p of problems) console.log(`✕ ${p}`);
    const pkg = lesson?.data.packages;
    console.log(`\nWritten to ${path.relative(ROOT, file)}${problems.length ? " (fix it there)" : ", checked"}. Next id here: ${nextId(readLessons().lessons, pkg)}.`);
    process.exit(problems.length ? 1 : 0);
  }
  if (cmd === "add" && args[0] && args[1]) {
    const [file, origin, wanted] = args;
    const { problems, lesson } = checkShare(readFileSync(file, "utf8"));
    if (problems.length) { for (const p of problems) console.log(`✕ ${p}`); process.exit(1); }
    const pkg = list(lesson.data.packages)[0];
    if (pkg && !TAXONOMY.packages[pkg]) { console.log(`✕ package «${pkg}» is not in lessons/taxonomy.json yet: add it there first, with covers and detect`); process.exit(1); }
    const id = wanted ?? nextId(readLessons().lessons, pkg);
    const entry = libraryEntry(lesson, id, origin);
    const target = path.join(ROOT, "lessons", "en", `${entry.group}.md`);
    if (!existsSync(target)) { console.log(`✕ ${path.relative(ROOT, target)} does not exist: a new group goes in lessons/taxonomy.json and gets its file first`); process.exit(1); }
    writeFileSync(target, insertEntry(readFileSync(target, "utf8"), id, entry.text));
    console.log(`✓ lesson ${id} added to lessons/en/${entry.group}.md. Next: translate it (lessons/TRANSLATING.md), stamp, --index, npm test.`);
    process.exit(0);
  }
  if (cmd === "seen" && args.length === 3 && /^\d{4}-\d{2}$/.test(args[2])) {
    const [id, model, month] = args;
    const l = readLessons().lessons.find((x) => x.id === id);
    if (!l) { console.log(`✕ lesson ${id} does not exist`); process.exit(1); }
    const target = path.join(ROOT, l.file);
    const before = readFileSync(target, "utf8");
    const after = addSeen(before, id, model, month);
    if (after === before.replace(/\r\n/g, "\n")) { console.log(`✓ lesson ${id} already lists ${model} ${month}`); process.exit(0); }
    writeFileSync(target, after);
    console.log(`✓ lesson ${id}: seen ${model} ${month}`);
    process.exit(0);
  }
  console.error("✕ usage: node scripts/maintain.mjs issue <N> | add <file> <origin> [id] | seen <id> <model> <YYYY-MM> | --selftest");
  process.exit(1);
}
