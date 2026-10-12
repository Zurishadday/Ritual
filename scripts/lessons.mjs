#!/usr/bin/env node
// Reads, checks and indexes the lessons in lessons/<language>/<group>.md.
// A lesson is a `### <id>. <title>` block with five bold parts (in English: The idea, Example, Detector question,
// Warning sign, What to do) and a data line in backticks. In the original (English) the data line says where the
// lesson came from: `origin: field` (or `lab · model · YYYY-MM`, or `proposal` with `source: ...`), and optionally
// `groups: other-group` and `packages: web`. In a translation it says which version of the original it was made from
// and who made it: `from: <fingerprint>` · `by: ai` (or the reviewer's name). Core ids are numbers from 1 on, with
// no gaps; those of a package carry a prefix (WEB-1). They are never renumbered or deleted: the redundant one only
// says «Merged into N.».
// A missing, unstamped or outdated translation is a warning, not an error: nobody has to translate a new lesson into
// every language before it goes in.
// The index (README.md of each language) is generated from the files: do not edit it by hand.
// Usage: node scripts/lessons.mjs --check                checks all languages and that each index is up to date
//        node scripts/lessons.mjs --index                regenerates the indexes
//        node scripts/lessons.mjs --stamp <language>     writes `from:` · `by: ai` on the lessons of a translation
//                                                        that have no stamp yet (run it right after translating)
//        node scripts/lessons.mjs --selftest             calibrates the checker: cases that must fail and one that must pass
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const ORIGINAL = "en";
export const ORIGINS = ["field", "lab", "proposal"];
// Fixed order of the core groups in the index; packages come after, by name.
export const GROUPS = ["writing-and-docs", "numbers-and-data", "tests-and-checks", "scripts-and-files", "interface-and-design", "console-and-tools", "git-and-process"];
export const PARTS = {
  en: ["The idea", "Example", "Detector question", "Warning sign", "What to do"],
  es: ["La idea", "Ejemplo", "Pregunta detectora", "Señal de alarma", "Qué hacer"],
  pt: ["A ideia", "Exemplo", "Pergunta detectora", "Sinal de alerta", "O que fazer"],
  fr: ["L'idée", "Exemple", "Question détectrice", "Signal d'alarme", "Que faire"],
  "zh-CN": ["核心", "例子", "检测问题", "警示信号", "怎么做"],
  ja: ["要点", "例", "検出の問い", "危険信号", "どうするか"],
  ko: ["핵심", "예시", "감지 질문", "경고 신호", "해야 할 일"],
};
// Title of each language's index and the note under it.
const INDEX = {
  en: ["Index of lessons", ""],
  es: ["Índice de lecciones", "Traducidas del inglés. Las que dicen `by: ai` las tradujo una IA y esperan la revisión de alguien nativo."],
  pt: ["Índice de lições", "Traduzidas do inglês. As marcadas com `by: ai` foram traduzidas por uma IA e aguardam revisão de um falante nativo."],
  fr: ["Index des leçons", "Traduites de l'anglais. Celles marquées `by: ai` ont été traduites par une IA et attendent la relecture d'un locuteur natif."],
  "zh-CN": ["教训索引", "译自英文。标有 `by: ai` 的条目由 AI 翻译，等待母语者审校。"],
  ja: ["教訓の索引", "英語から翻訳。`by: ai` と書かれたものは AI による翻訳で、ネイティブのレビューを待っています。"],
  ko: ["교훈 목록", "영어에서 번역했습니다. `by: ai` 표시가 있는 항목은 AI가 번역했으며 원어민의 검토를 기다리고 있습니다."],
};
// A merged lesson says «Merged into N.» in every language (the Spanish form is accepted too).
const MERGED = /^(?:Merged into|Fusionada en la) (\S+?)\.?$/m;
const REFERENCE = /\b(?:see lesson|lesson|ver(?: también)? la|lecci[oó]n) (\d+)\b/gi;

/** Reads a group file and returns its lessons. */
export function readGroupFile(file, group) {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const title = text.match(/^# (.+)$/m)?.[1] ?? null;
  const lessons = [];
  const blocks = text.split(/^(?=### )/m);
  let line = 1;
  for (const block of blocks) {
    const head = block.match(/^### (\S+)\. (.+)$/m);
    if (head) {
      const body = block.slice(head[0].length);
      const data = {};
      for (const m of body.matchAll(/`(\w+): ([^`]+)`/g)) data[m[1]] = m[2].trim();
      const parts = {};
      let current = null;
      for (const l of body.split("\n")) {
        const p = l.match(/^\*\*(.+?)[.。]\*\*\s*(.*)$/); // CJK languages close the part name with 「。」
        if (p) { current = p[1]; parts[current] = p[2]; }
        else if (current && !/^`\w+: /.test(l)) parts[current] += "\n" + l;
      }
      for (const k in parts) parts[k] = parts[k].trim();
      lessons.push({ id: head[1], title: head[2].trim(), group, data, parts, merged: body.match(MERGED)?.[1] ?? null, text: body, line });
    }
    line += block.split("\n").length - 1;
  }
  return { title, lessons };
}

/** All lessons of a language, with the name of each group. @returns {{groups: Record<string,string>, lessons: object[]}} */
export function readLessons(language = ORIGINAL, root = ROOT) {
  const dir = path.join(root, "lessons", language);
  const groups = {};
  const lessons = [];
  for (const file of readdirSync(dir).filter((a) => a.endsWith(".md") && a !== "README.md").sort()) {
    const group = file.slice(0, -3);
    const { title, lessons: ls } = readGroupFile(path.join(dir, file), group);
    groups[group] = title;
    lessons.push(...ls.map((l) => ({ ...l, file: path.join("lessons", language, file) })));
  }
  return { groups, lessons };
}

/** Short fingerprint of what a translation has to say: the title and the parts, not the data line. */
export function fingerprint(lesson) {
  const text = [lesson.title, ...Object.values(lesson.parts)].join("\n").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(text).digest("hex").slice(0, 8);
}

const MONTH = /^\d{4}-\d{2}$/;
/** Every lesson says which model it was born with and when: `origin: field · claude-opus-5-5 · 2026-10`. A model
 * recalled but not recorded is written `~opus`; what nobody knows is `unknown`, never invented. A lab lesson always has
 * the exact model and month (the run recorded them). A proposal comes from a public source, not from a model.
 * `seen: <model> <YYYY-MM>, …` lists the models it was later confirmed with. */
export function originProblems(data) {
  const [origin, model, date] = (data.origin ?? "").split("·").map((s) => s.trim());
  if (!ORIGINS.includes(origin)) return [`unknown origin «${data.origin ?? ""}», must be one of: ${ORIGINS.join(", ")}`];
  const problems = [];
  if (origin === "proposal") { if (!data.source) problems.push("a proposal needs `source: ...`"); }
  else if (origin === "lab") { if (!model || model === "unknown" || model.startsWith("~") || !MONTH.test(date ?? "")) problems.push("a lab lesson records the exact model and month it broke with: `origin: lab · claude-sonnet-5-5 · 2026-10`"); }
  else if (!model || !(MONTH.test(date ?? "") || date === "unknown")) problems.push(`the origin needs model and date: \`origin: ${origin} · claude-opus-5-5 · 2026-10\` (\`~opus\` if recalled, \`unknown\` if nobody knows)`);
  for (const s of (data.seen ?? "").split(",").map((x) => x.trim()).filter(Boolean))
    if (!/^\S+ \d{4}-\d{2}$/.test(s)) problems.push(`«${s}» in \`seen:\` must be «<model> <YYYY-MM>»`);
  return problems;
}

function readConfigLanguage(project) {
  try { return JSON.parse(readFileSync(path.join(project, ".ritual", "config.json"), "utf8")).language ?? ORIGINAL; } catch { return ORIGINAL; }
}

const languagesIn = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

const groupOrder = (g) => (GROUPS.includes(g) ? String(GROUPS.indexOf(g)).padStart(2, "0") : "9" + g);
// Core lessons by number, then package lessons by prefix and number (WEB-2 before WEB-10).
const compareIds = (a, b) => {
  const key = (id) => (/^\d+$/.test(id) ? ["", Number(id)] : [id.replace(/-\d+$/, ""), Number(id.match(/\d+$/)?.[0] ?? 0)]);
  const [pa, na] = key(a.id), [pb, nb] = key(b.id);
  return pa === pb ? na - nb : pa < pb ? -1 : 1;
};

// The anchor GitHub gives a heading: lowercase, punctuation out, spaces to hyphens. Accents and CJK stay.
export const anchor = (heading) => heading.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");

export function generateIndex(language, root = ROOT) {
  const { groups, lessons } = readLessons(language, root);
  const [title, note] = INDEX[language] ?? INDEX[ORIGINAL];
  const lines = [`# ${title}`, "", "<!-- Generated by scripts/lessons.mjs --index: do not edit by hand. -->", ""];
  if (note) lines.push(note, "");
  for (const g of Object.keys(groups).sort((a, b) => groupOrder(a).localeCompare(groupOrder(b)))) {
    lines.push(`## ${groups[g] ?? g}`, "");
    for (const l of lessons.filter((l) => l.group === g).sort(compareIds))
      lines.push(`- **${l.id}.** [${l.title}](${g}.md#${anchor(`${l.id}. ${l.title}`)})${l.merged ? ` (→ ${l.merged})` : ""}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** @returns {{file: string, line: number, message: string, level: "error" | "warning"}[]} */
export function check(root = ROOT) {
  const findings = [];
  const error = (file, line, message) => findings.push({ file, line, message, level: "error" });
  const warn = (file, line, message) => findings.push({ file, line, message, level: "warning" });
  const dir = path.join(root, "lessons");
  const languages = languagesIn(dir);
  if (!languages.includes(ORIGINAL)) return [{ file: "lessons", line: 0, message: `missing the original lessons/${ORIGINAL}/`, level: "error" }];
  const original = readLessons(ORIGINAL, root);
  const byId = new Map(original.lessons.map((l) => [l.id, l]));

  for (const language of languages) {
    const parts = PARTS[language];
    if (!parts) { error(`lessons/${language}`, 0, `no known names for the five parts in «${language}»: add them to PARTS`); continue; }
    const { groups, lessons } = language === ORIGINAL ? original : readLessons(language, root);
    const bad = (l, message) => error(l.file, l.line, `${l.id}: ${message}`);
    for (const [g, title] of Object.entries(groups)) if (!title) error(`lessons/${language}/${g}.md`, 1, "the file has no title (# ...)");

    const seen = new Map();
    for (const l of lessons) {
      if (!/^(\d+|[A-Z]+-\d+)$/.test(l.id)) bad(l, "the id must be a number (core) or PREFIX-number (package)");
      if (seen.has(l.id)) bad(l, `duplicate id, already in ${seen.get(l.id)}`);
      seen.set(l.id, l.file);
      if (language !== ORIGINAL && !byId.has(l.id)) { bad(l, `does not exist in the original (${ORIGINAL})`); continue; }
      if (l.merged) {
        if (!byId.has(l.merged)) bad(l, `merged into ${l.merged}, which does not exist`);
        if (Object.keys(l.parts).length) bad(l, "a merged lesson has no parts, only «Merged into N.»");
        continue;
      }
      for (const p of parts) if (!l.parts[p]) bad(l, `missing part «${p}»`);
      if (language === ORIGINAL) {
        for (const m of originProblems(l.data)) bad(l, m);
        for (const g of (l.data.groups ?? "").split(",").map((s) => s.trim()).filter(Boolean)) if (!(g in groups)) bad(l, `group «${g}» does not exist`);
        for (const m of `${l.title}\n${l.text}`.matchAll(REFERENCE)) if (!byId.has(m[1])) bad(l, `cites a lesson that does not exist (${m[1]})`);
      } else {
        const now = fingerprint(byId.get(l.id));
        if (!l.data.from) warn(l.file, l.line, `${l.id}: translation has no \`from:\` stamp: run \`node scripts/lessons.mjs --stamp ${language}\``);
        else if (l.data.from !== now) warn(l.file, l.line, `${l.id}: translation is out of date (made from ${l.data.from}, the original is now ${now}): translate it again without its data line and stamp it`);
      }
    }
    if (language === ORIGINAL) {
      const numbers = lessons.map((l) => Number(l.id)).filter(Number.isInteger).sort((a, b) => a - b);
      for (let n = 1; n <= (numbers.at(-1) ?? 0); n++) if (!numbers.includes(n)) error(`lessons/${language}`, 0, `gap in numbers: lesson ${n} is missing`);
    } else {
      for (const id of byId.keys()) if (!seen.has(id)) warn(`lessons/${language}`, 0, `missing translation of ${id}`);
    }
    const indexFile = path.join(dir, language, "README.md");
    const current = existsSync(indexFile) ? readFileSync(indexFile, "utf8").replace(/\r\n/g, "\n") : "";
    if (current.trim() !== generateIndex(language, root).trim()) error(`lessons/${language}/README.md`, 0, "index out of date: run `node scripts/lessons.mjs --index`");
  }
  return findings;
}

/** Writes `from: <fingerprint>` · `by: <by>` under the heading of every lesson of a translation that has no stamp. */
export function stamp(language, root = ROOT, by = "ai") {
  if (language === ORIGINAL) throw new Error(`${ORIGINAL} is the original: only translations are stamped`);
  const byId = new Map(readLessons(ORIGINAL, root).lessons.map((l) => [l.id, l]));
  const dir = path.join(root, "lessons", language);
  let count = 0;
  for (const file of readdirSync(dir).filter((a) => a.endsWith(".md") && a !== "README.md")) {
    const full = path.join(dir, file);
    const { lessons } = readGroupFile(full, file.slice(0, -3));
    let text = readFileSync(full, "utf8").replace(/\r\n/g, "\n");
    for (const l of lessons) {
      if (l.data.from || l.merged || !byId.has(l.id)) continue;
      const heading = `### ${l.id}. ${l.title}\n`;
      text = text.replace(heading, `${heading}\n\`from: ${fingerprint(byId.get(l.id))}\` · \`by: ${by}\`\n`);
      count++;
    }
    writeFileSync(full, text);
  }
  return count;
}

/** The lessons of a project (.ritual/lessons/<group>.md): same format, prefixed ids, no index. */
export function checkProject(project, language = ORIGINAL) {
  const findings = [];
  const dir = path.join(project, ".ritual", "lessons");
  if (!existsSync(dir)) return [{ file: ".ritual/lessons", line: 0, message: "does not exist: run /ritual to start", level: "error" }];
  const parts = PARTS[language] ?? PARTS[ORIGINAL];
  const seen = new Set();
  for (const file of readdirSync(dir).filter((a) => a.endsWith(".md")).sort()) {
    const group = file.slice(0, -3);
    const rel = `.ritual/lessons/${file}`;
    if (!GROUPS.includes(group)) { findings.push({ file: rel, line: 1, message: `the file must be named after a group: ${GROUPS.join(", ")}`, level: "error" }); continue; }
    for (const l of readGroupFile(path.join(dir, file), group).lessons) {
      const bad = (m) => findings.push({ file: rel, line: l.line, message: `${l.id}: ${m}`, level: "error" });
      if (!/^[A-Z]+-\d+$/.test(l.id)) bad("a project lesson needs a prefix and number (P-1)");
      if (seen.has(l.id)) bad("duplicate id");
      seen.add(l.id);
      if (l.merged) continue;
      for (const p of parts) if (!l.parts[p]) bad(`missing part «${p}»`);
      for (const m of originProblems(l.data)) bad(m);
      for (const g of (l.data.groups ?? "").split(",").map((s) => s.trim()).filter(Boolean)) if (!GROUPS.includes(g)) bad(`group «${g}» does not exist`);
    }
  }
  return findings;
}

// Calibration: a case that must pass and, from it, cases that must fail (or warn) with a specific message.
const LESSON = (id, title, data = "`origin: field · claude-opus-5-5 · 2026-10`", language = "en") => {
  const [a, b, c, d, e] = PARTS[language];
  const end = ["zh-CN", "ja"].includes(language) ? "。" : ".";
  return `### ${id}. ${title}\n\n${data}\n\n**${a}${end}** Something.\n\n**${b}${end}** This happened.\n\n**${c}${end}** And if not?\n\n**${d}${end}** "Sure".\n\n**${e}${end}** Measure.\n`;
};
const EN = {
  "numbers-and-data.md": `# Numbers and data\n\n${LESSON(1, "One", "`origin: field · ~opus · unknown`")}\n${LESSON(2, "Two (see lesson 1)", "`origin: field · claude-opus-5-5 · 2026-10` · `groups: git-and-process` · `packages: web` · `seen: gpt-5 2026-11, claude-sonnet-5-5 2026-12`")}`,
  "git-and-process.md": `# Git and process\n\n### 3. Three\n\nMerged into 1.\n\n${LESSON("WEB-1", "One of web", "`origin: proposal` · `source: https://example.org`")}\n${LESSON(4, "Four", "`origin: lab · claude-sonnet-5-5 · 2026-10`")}`,
};
// Translations are built stamped with the fingerprints of EN, so the good case has no findings at all.
function translations(en) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "lessons-fp-"));
  try {
    mkdirSync(path.join(tmp, "lessons", ORIGINAL), { recursive: true });
    for (const [n, t] of Object.entries(en)) writeFileSync(path.join(tmp, "lessons", ORIGINAL, n), t);
    const fp = Object.fromEntries(readLessons(ORIGINAL, tmp).lessons.map((l) => [l.id, fingerprint(l)]));
    const s = (id) => `\`from: ${fp[id]}\` · \`by: ai\``;
    return {
      "../es/numbers-and-data.md": `# Cifras y datos\n\n${LESSON(1, "Uno con acentuación", s(1), "es")}\n${LESSON(2, "Dos (ver la 1)", s(2), "es")}`,
      "../es/git-and-process.md": `# Git y proceso\n\n### 3. Tres\n\nMerged into 1.\n\n${LESSON("WEB-1", "Uno de web", s("WEB-1"), "es")}\n${LESSON(4, "Cuatro", s(4), "es")}`,
      "../ja/numbers-and-data.md": `# 数字とデータ\n\n${LESSON(1, "一", s(1), "ja")}\n${LESSON(2, "二", s(2), "ja")}`,
      "../ja/git-and-process.md": `# Git とプロセス\n\n### 3. 三\n\nMerged into 1.\n\n${LESSON("WEB-1", "ウェブの一", s("WEB-1"), "ja")}\n${LESSON(4, "四", s(4), "ja")}`,
    };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
const BASE = { ...EN, ...translations(EN) };
const ES = "../es/numbers-and-data.md";
const CASES = [
  ["without the warning sign", (f) => ({ ...f, "numbers-and-data.md": f["numbers-and-data.md"].replace('**Warning sign.** "Sure".\n', "") }), "missing part «Warning sign»", "error"],
  ["duplicate id", (f) => ({ ...f, "git-and-process.md": f["git-and-process.md"] + "\n" + LESSON(1, "Another one") }), "duplicate id", "error"],
  ["gap in numbers", (f) => ({ ...f, "git-and-process.md": f["git-and-process.md"].replace("### 4. ", "### 6. ") }), "gap in numbers: lesson 4", "error"],
  ["cites a lesson that does not exist", (f) => ({ ...f, "numbers-and-data.md": f["numbers-and-data.md"].replace("(see lesson 1)", "(see lesson 9)") }), "cites a lesson that does not exist (9)", "error"],
  ["invented origin", (f) => ({ ...f, "numbers-and-data.md": f["numbers-and-data.md"].replace("`origin: field · ~opus · unknown`", "`origin: rumor · ~opus · unknown`") }), "unknown origin «rumor", "error"],
  ["lab without date", (f) => ({ ...f, "git-and-process.md": f["git-and-process.md"].replace(" · claude-sonnet-5-5 · 2026-10", "") }), "exact model", "error"],
  ["proposal without source", (f) => ({ ...f, "git-and-process.md": f["git-and-process.md"].replace(" · `source: https://example.org`", "") }), "needs `source", "error"],
  ["field without model", (f) => ({ ...f, "numbers-and-data.md": f["numbers-and-data.md"].replace("`origin: field · ~opus · unknown`", "`origin: field`") }), "needs model and date", "error"],
  ["field with a date that is not a month", (f) => ({ ...f, "numbers-and-data.md": f["numbers-and-data.md"].replace("· ~opus · unknown", "· ~opus · last year") }), "needs model and date", "error"],
  ["lab with a recalled model", (f) => ({ ...f, "git-and-process.md": f["git-and-process.md"].replace(" · claude-sonnet-5-5 · 2026-10", " · ~sonnet · 2026-10") }), "exact model", "error"],
  ["malformed seen", (f) => ({ ...f, "numbers-and-data.md": f["numbers-and-data.md"].replace("seen: gpt-5 2026-11", "seen: gpt-5") }), "in `seen:`", "error"],
  ["group that does not exist", (f) => ({ ...f, "numbers-and-data.md": f["numbers-and-data.md"].replace("groups: git-and-process", "groups: cooking") }), "group «cooking» does not exist", "error"],
  ["merged into a lesson that does not exist", (f) => ({ ...f, "git-and-process.md": f["git-and-process.md"].replace("Merged into 1.", "Merged into 8.") }), "merged into 8", "error"],
  ["index out of date", (f) => ({ ...f, "README.md": "# Index of lessons\n" }), "index out of date", "error"],
  ["translation missing a part", (f) => ({ ...f, [ES]: f[ES].replace(/\*\*Señal de alarma\.\*\* .*\n/, "") }), "missing part «Señal de alarma»", "error"],
  ["CJK translation missing a part", (f) => ({ ...f, "../ja/numbers-and-data.md": f["../ja/numbers-and-data.md"].replace(/\*\*危険信号。\*\* .*\n/, "") }), "missing part «危険信号»", "error"],
  ["translation of a lesson that is not in the original", (f) => ({ ...f, [ES]: f[ES] + "\n" + LESSON(7, "Siete", "`from: 00000000` · `by: ai`", "es") }), "7: does not exist in the original", "error"],
  ["missing translation", (f) => ({ ...f, [ES]: f[ES].split("### 2.")[0] }), "missing translation of 2", "warning"],
  ["translation without stamp", (f) => ({ ...f, [ES]: f[ES].replace(/`from: \w+` · `by: ai`\n\n/, "") }), "1: translation has no `from:` stamp", "warning"],
  ["outdated translation", (f) => ({ ...f, "numbers-and-data.md": f["numbers-and-data.md"].replace("**The idea.** Something.", "**The idea.** Something else.") }), "1: translation is out of date", "warning"],
];

function assemble(files) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "lessons-"));
  const dir = path.join(tmp, "lessons", ORIGINAL);
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(dir, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  for (const language of languagesIn(path.join(tmp, "lessons")))
    if (!(language === ORIGINAL && "README.md" in files)) writeFileSync(path.join(tmp, "lessons", language, "README.md"), generateIndex(language, tmp));
  return tmp;
}

export function selftest() {
  const failures = [];
  const run = (files, also) => { const tmp = assemble(files); try { return also ? also(tmp) : check(tmp); } finally { rmSync(tmp, { recursive: true, force: true }); } };
  const base = run(BASE);
  if (base.length) failures.push(`the case that must pass has ${base.length} finding(s):\n` + base.map((h) => `    ${h.level} ${h.file}:${h.line} ${h.message}`).join("\n"));
  for (const [name, breakIt, expected, level] of CASES) {
    const h = run(breakIt(BASE));
    if (!h.some((x) => x.message.includes(expected) && x.level === level)) failures.push(`«${name}» should give the ${level} «${expected}» and gave: ${h.map((x) => `${x.level} ${x.message}`).join(" | ") || "nothing"}`);
    if (level === "warning" && h.some((x) => x.level === "error")) failures.push(`«${name}» should only warn and gave an error: ${h.filter((x) => x.level === "error").map((x) => x.message).join(" | ")}`);
  }
  // --stamp writes the right fingerprint on an unstamped translation, and leaves the stamped ones alone.
  const stamped = run({ ...BASE, [ES]: BASE[ES].replace(/`from: \w+` · `by: ai`\n\n/g, "") }, (tmp) => {
    const n = stamp("es", tmp);
    writeFileSync(path.join(tmp, "lessons", "es", "README.md"), generateIndex("es", tmp));
    return { n, findings: check(tmp) };
  });
  if (stamped.n !== 2 || stamped.findings.length) failures.push(`--stamp should stamp 2 lessons and leave no findings; stamped ${stamped.n} and gave: ${stamped.findings.map((x) => x.message).join(" | ") || "nothing"}`);
  // The index links to the anchor GitHub makes: accents and CJK stay, punctuation goes.
  const index = run(BASE, (tmp) => generateIndex("es", tmp) + generateIndex("ja", tmp));
  for (const link of ["(numbers-and-data.md#1-uno-con-acentuación)", "(numbers-and-data.md#2-dos-ver-la-1)", "(git-and-process.md#web-1-uno-de-web)", "(numbers-and-data.md#1-一)"])
    if (!index.includes(link)) failures.push(`the index does not link ${link}`);
  // Core lessons first, by number; package lessons after, by prefix and number (the file has 3, WEB-1, 4).
  const order = run(BASE, (tmp) => generateIndex(ORIGINAL, tmp)).match(/^- \*\*(\S+)\.\*\*/gm)?.map((m) => m.slice(4, -3)).join(",");
  if (order !== "1,2,3,4,WEB-1") failures.push(`the index order should be 1,2,3,4,WEB-1 and is ${order}`);
  // Project lessons: the good case passes; a file with an invented group name and an id without prefix fail.
  const project = mkdtempSync(path.join(os.tmpdir(), "lessons-project-"));
  try {
    mkdirSync(path.join(project, ".ritual", "lessons"), { recursive: true });
    writeFileSync(path.join(project, ".ritual", "lessons", "console-and-tools.md"), `# Console\n\n${LESSON("P-1", "Own", "`origin: field · claude-fable-5-1 · 2026-10` · `refines: 27`")}`);
    const good = checkProject(project);
    if (good.length) failures.push(`the good project lessons gave: ${good.map((x) => x.message).join(" | ")}`);
    writeFileSync(path.join(project, ".ritual", "lessons", "console-and-tools.md"), `# Consola\n\n${LESSON("P-1", "Propia", "`origin: field · ~opus · unknown`", "es")}`);
    if (checkProject(project, "es").length) failures.push("a project lesson in the project's language (es) should pass");
    writeFileSync(path.join(project, ".ritual", "lessons", "console-and-tools.md"), `# Consola\n\n${LESSON("P-1", "Propia", "`origin: field`", "es")}`);
    if (!checkProject(project, "es").some((x) => x.message.includes("needs model and date"))) failures.push("a project lesson without model and date should fail");
    writeFileSync(path.join(project, ".ritual", "lessons", "cooking.md"), `# Cooking\n\n${LESSON("2", "No prefix")}`);
    const bad = checkProject(project, "es").map((x) => x.message).join(" | ");
    if (!bad.includes("must be named after a group")) failures.push(`a file with an invented group name should fail and gave: ${bad || "nothing"}`);
    writeFileSync(path.join(project, ".ritual", "lessons", "git-and-process.md"), `# Git\n\n${LESSON("2", "No prefix")}`);
    if (!checkProject(project).some((x) => x.message.includes("prefix"))) failures.push("an id without prefix in a project lesson should fail");
  } finally { rmSync(project, { recursive: true, force: true }); }
  for (const m of failures) console.error(`✕ ${m}`);
  return failures.length;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const failures = selftest();
    console.log(failures ? `${failures} case(s) failed` : `✓ calibrated: passes the good case and catches all ${CASES.length} bad cases, the stamp and the index links`);
    process.exit(failures ? 1 : 0);
  }
  if (args.includes("--index")) {
    for (const language of languagesIn(path.join(ROOT, "lessons"))) {
      writeFileSync(path.join(ROOT, "lessons", language, "README.md"), generateIndex(language));
      console.log(`✓ lessons/${language}/README.md`);
    }
    process.exit(0);
  }
  const s = args.indexOf("--stamp");
  if (s >= 0) {
    const language = args[s + 1];
    if (!language || !existsSync(path.join(ROOT, "lessons", language))) { console.error(`✕ no lessons/${language ?? "<language>"}/ folder`); process.exit(1); }
    const b = args.indexOf("--by");
    console.log(`✓ stamped ${stamp(language, ROOT, b >= 0 ? args[b + 1] : "ai")} lesson(s) in lessons/${language}/`);
    process.exit(0);
  }
  const i = args.indexOf("--project");
  if (i >= 0) {
    const project = path.resolve(args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
    const h = checkProject(project, readConfigLanguage(project));
    for (const x of h) console.log(`${x.file}:${x.line}  ${x.message}`);
    console.log(h.length ? `✕ ${h.length} problem(s) in the project's lessons` : "✓ project lessons are well formed");
    process.exit(h.length ? 1 : 0);
  }
  const h = check();
  const errors = h.filter((x) => x.level === "error"), warnings = h.filter((x) => x.level === "warning");
  for (const x of errors) console.log(`✕ ${x.file}:${x.line}  ${x.message}`);
  // Many warnings of the same kind are summed up per language, so a new lesson does not print one line per language.
  const perLanguage = {};
  for (const x of warnings) (perLanguage[x.file.split(/[\\/]/)[1]] ??= []).push(x);
  for (const [language, ws] of Object.entries(perLanguage)) {
    console.log(`! lessons/${language}: ${ws.length} translation warning(s)`);
    for (const x of ws.slice(0, 5)) console.log(`    ${x.message}`);
    if (ws.length > 5) console.log(`    … ${ws.length - 5} more`);
  }
  const total = readLessons().lessons.length;
  console.log(errors.length ? `✕ ${errors.length} problem(s) in the lessons` : `✓ ${total} lessons are well formed, indexes up to date${warnings.length ? ` (${warnings.length} translation warning(s))` : ""}`);
  process.exit(errors.length ? 1 : 0);
}
