#!/usr/bin/env node
// Sharing a lesson with Ritual: the mechanical half of `/ritual share`. Claude does the judgment (making the lesson
// generic, deciding where it goes); this script gives it what to compare against, checks the result, and builds the
// GitHub form link already filled in. It never publishes anything: the person opens the link and decides.
// Usage: node scripts/share.mjs context [group]          groups and packages with what they cover, and the library
//                                                         lessons of a group, to compare against before writing
//        node scripts/share.mjs check <file> [project]   checks a lesson ready to share and prints the form link
//        node scripts/share.mjs confirm <id> <model> <YYYY-MM> <example-file>   link to confirm an existing lesson
//        node scripts/share.mjs --selftest
// The file for `check` is one lesson in English, with its data line, and three extra parts:
//   **Where it goes.** core | package <slug> | new package <slug>: <covers> | new group <slug>: <covers> | refines <N>
//   **Transfers to.** two other kinds of project, one line each
//   **How to reproduce.** the task or prompt, short, with nothing from the project
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { GROUPS, PACKAGES, PARTS, TAXONOMY, originProblems, parseLessons, readLessons } from "./lessons.mjs";
import { isMain } from "../hooks/common.mjs";

const REPO = "https://github.com/Zurishadday/Ritual";
const MAX_URL = 7500; // browsers and GitHub start failing around 8 KB

/** Names that identify the project: its package name, its folder, its git remote, and `private` in .ritual/config.json. */
export function projectNames(project) {
  const names = new Set();
  const add = (n) => { const s = String(n ?? "").trim(); if (s.length >= 4) names.add(s); };
  try { add(JSON.parse(readFileSync(path.join(project, "package.json"), "utf8")).name?.replace(/^@[^/]+\//, "")); } catch { /* no package.json */ }
  add(path.basename(path.resolve(project)));
  try {
    const remote = execFileSync("git", ["-C", project, "remote", "get-url", "origin"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const m = remote.match(/[/:]([^/:]+)\/([^/]+?)(\.git)?$/);
    if (m) { add(m[1]); add(m[2]); }
  } catch { /* not a git repository */ }
  try { for (const p of JSON.parse(readFileSync(path.join(project, ".ritual", "config.json"), "utf8")).private ?? []) add(p); } catch { /* no config */ }
  // A hyphenated or underscored name also shows up with spaces: "acme-invoices" as "Acme Invoices".
  for (const n of [...names]) if (/[-_]/.test(n)) names.add(n.replace(/[-_]+/g, " "));
  return [...names];
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function namesIn(text, names) {
  return names.filter((n) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(n)}(?![\\p{L}\\p{N}])`, "iu").test(text));
}

const WHERE = /^(core|package ([a-z0-9-]+)|new package ([a-z0-9-]+): .+|new group ([a-z0-9-]+): .+|refines (\d+|[A-Z]+-\d+))$/;

/** Checks a lesson ready to share. @returns {{problems: string[], lesson: object | null, where: string}} */
export function checkShare(text, names = []) {
  const problems = [];
  // A lesson to share has no number yet: its heading is `### <title>`.
  const lessons = parseLessons(text.replace(/^### (?!\S+\. )/m, "### NEW. "), "");
  if (lessons.lessons.length !== 1) return { problems: [`the file must hold exactly one lesson (### <title>), found ${lessons.lessons.length}`], lesson: null, where: "" };
  const l = lessons.lessons[0];
  for (const p of PARTS.en) if (!l.parts[p]) problems.push(`missing part «${p}» (shared lessons are in English: they become the original)`);
  problems.push(...originProblems(l.data));
  const where = (l.parts["Where it goes"] ?? "").trim();
  const m = where.match(WHERE);
  if (!m) problems.push("«Where it goes» must be: core | package <slug> | new package <slug>: <what it covers> | new group <slug>: <what it covers> | refines <N>");
  const groups = (l.data.groups ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const g of groups) if (!GROUPS.includes(g) && !(m?.[4] === g)) problems.push(`group «${g}» does not exist; propose it in «Where it goes» as \`new group ${g}: …\``);
  if (!groups.length && !m?.[4]) problems.push("the data line needs `groups: <group>`: the group of what was being done");
  const packages = (l.data.packages ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const p of packages) if (!PACKAGES.includes(p) && m?.[3] !== p) problems.push(`package «${p}» does not exist; propose it in «Where it goes» as \`new package ${p}: …\`, or use an existing one: ${PACKAGES.join(", ")}`);
  if (m?.[2] && !PACKAGES.includes(m[2])) problems.push(`package «${m[2]}» does not exist: use \`new package ${m[2]}: <what it covers>\``);
  if (m?.[3] && PACKAGES.includes(m[3])) problems.push(`package «${m[3]}» already exists: use \`package ${m[3]}\``);
  if (m?.[4] && GROUPS.includes(m[4])) problems.push(`group «${m[4]}» already exists`);
  const transfers = (l.parts["Transfers to"] ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (transfers.length < 2 && !m?.[5]) problems.push("«Transfers to» needs two other kinds of project, one line each: if it only fits this project, keep it as a local lesson");
  const found = namesIn(text, names);
  if (found.length) problems.push(`names from your project: ${found.join(", ")}. A shared lesson names nothing of the project`);
  return { problems, lesson: l, where };
}

const formLink = (template, fields) => `${REPO}/issues/new?${new URLSearchParams({ template, ...fields }).toString()}`;

export function shareUrl(l, where) {
  const [, model, month] = (l.data.origin ?? "").split("·").map((s) => s.trim());
  const body = [`### ${l.title}`, "", ...PARTS.en.flatMap((p) => [`**${p}.** ${l.parts[p]}`, ""])].join("\n").trim();
  return formLink("share-a-lesson.yml", {
    title: `Lesson: ${l.title}`, model: model ?? "", month: month ?? "", group: l.data.groups ?? "", where,
    lesson: body, transfer: l.parts["Transfers to"] ?? "", reproduce: l.parts["How to reproduce"] ?? "",
  });
}

export function confirmUrl(id, model, month, example) {
  return formLink("confirm-a-lesson.yml", { title: `Confirm lesson ${id}`, lesson: id, model, month, example });
}

function context(group) {
  const out = ["Groups (what you were doing):", ...TAXONOMY.groups.map((g) => `  ${g.slug} · ${g.covers}`), "", "Packages (what you build; only for lessons that apply to that kind alone):",
    ...Object.entries(TAXONOMY.packages).map(([p, d]) => `  ${p} · ${d.covers}`)];
  if (group) {
    const { lessons } = readLessons();
    out.push("", `Library lessons in ${group} (or listing it as secondary):`);
    for (const l of lessons.filter((x) => !x.merged && (x.group === group || (x.data.groups ?? "").split(",").map((s) => s.trim()).includes(group))))
      out.push(`  ${l.id} · ${l.title}${l.data.packages ? ` [${l.data.packages}]` : ""}\n      ${(l.parts["Detector question"] ?? "").replace(/\s+/g, " ")}`);
  }
  return out.join("\n");
}

const LESSON = (extra = "") => `### A reader that skips bad lines loses the next one too

\`origin: field · claude-opus-5-5 · 2026-10\` · \`groups: scripts-and-files\`${extra}

**The idea.** Appending records to a file is simple. A cut-off write glues the next record to it.

**Example.** A log dropped the record written after a crash.

**Detector question.** If the last write was cut, what happens to the next one?

**Warning sign.** "Damaged lines get skipped."

**What to do.** Start the record with a line break if the file does not end in one.

**Where it goes.** core

**Transfers to.**
A data pipeline that appends rows to a CSV.
A chat app that stores messages one per line.

**How to reproduce.** Ask for a script that appends JSON lines and reads them back, then cut the last line by hand.
`;

export function selftest() {
  const failures = [];
  const ok = (name, text, names = []) => { const r = checkShare(text, names); if (r.problems.length) failures.push(`«${name}» should pass and gave: ${r.problems.join(" | ")}`); return r; };
  const bad = (name, text, expected, names = []) => { const r = checkShare(text, names); if (!r.problems.some((p) => p.includes(expected))) failures.push(`«${name}» should fail with «${expected}» and gave: ${r.problems.join(" | ") || "nothing"}`); };
  const good = ok("a generic lesson", LESSON());
  ok("an existing package", LESSON(" · `packages: web`").replace("**Where it goes.** core", "**Where it goes.** package web"));
  ok("a new package, proposed", LESSON(" · `packages: games`").replace("**Where it goes.** core", "**Where it goes.** new package games: video games and game engines."));
  const numbered = checkShare(LESSON().replace("### A reader", "### P-3. A reader"));
  if (numbered.lesson?.id !== "P-3" || numbered.lesson?.title !== "A reader that skips bad lines loses the next one too") failures.push(`a heading that already has an id keeps it: gave id «${numbered.lesson?.id}», title «${numbered.lesson?.title}»`);
  if (good.lesson?.title !== "A reader that skips bad lines loses the next one too") failures.push(`a heading without an id keeps its whole title: gave «${good.lesson?.title}»`);
  ok("refining a lesson needs no transfers", LESSON().replace("**Where it goes.** core", "**Where it goes.** refines 24").replace(/\*\*Transfers to\.\*\*[\s\S]*?(?=\*\*How)/, ""));
  bad("a package that does not exist", LESSON(" · `packages: wbe`"), "package «wbe» does not exist");
  bad("proposing a package that exists", LESSON(" · `packages: web`").replace("**Where it goes.** core", "**Where it goes.** new package web: sites."), "«web» already exists");
  bad("a made-up place", LESSON().replace("**Where it goes.** core", "**Where it goes.** somewhere"), "«Where it goes» must be");
  bad("only one transfer", LESSON().replace("A chat app that stores messages one per line.\n", ""), "two other kinds of project");
  bad("a missing part", LESSON().replace(/\*\*Warning sign\.\*\* .*\n/, ""), "missing part «Warning sign»");
  bad("no model", LESSON().replace("`origin: field · claude-opus-5-5 · 2026-10`", "`origin: field`"), "needs model and date");
  bad("a project name", LESSON().replace("A log dropped", "The Acme Invoices log dropped"), "names from your project", ["acme-invoices", "acme invoices"]);
  // projectNames reads package.json, the folder, the git remote and `private`; a generic word inside a name is not one.
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ritual-share-"));
  const project = path.join(tmp, "taller-rueda-libre");
  try {
    mkdirSync(path.join(project, ".ritual"), { recursive: true });
    writeFileSync(path.join(project, "package.json"), JSON.stringify({ name: "@acme/invoice-tool" }));
    writeFileSync(path.join(project, ".ritual", "config.json"), JSON.stringify({ private: ["Globex Bank"] }));
    execFileSync("git", ["init", "-q", project]);
    execFileSync("git", ["-C", project, "remote", "add", "origin", "https://github.com/acme/billing-portal.git"]);
    const names = projectNames(project);
    for (const n of ["invoice-tool", "invoice tool", "taller-rueda-libre", "taller rueda libre", "billing-portal", "Globex Bank"]) if (!names.includes(n)) failures.push(`projectNames should find «${n}» and gave: ${names.join(", ")}`);
    if (namesIn("We fixed the invoice parser and the billing totals.", names).length) failures.push("a generic word (invoice, billing) must not count as a project name");
    if (!namesIn("In Taller Rueda Libre the form lost a message.", names).includes("taller rueda libre")) failures.push("the folder name with spaces should be found");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  // The link opens the right form with every field, survives a round trip, and fits in a URL.
  const url = shareUrl(good.lesson, good.where);
  const q = new URL(url).searchParams;
  if (q.get("template") !== "share-a-lesson.yml" || q.get("model") !== "claude-opus-5-5" || q.get("month") !== "2026-10" || q.get("where") !== "core" || q.get("group") !== "scripts-and-files") failures.push(`the share link has wrong fields: ${url.slice(0, 200)}`);
  if (!q.get("lesson").includes("**Detector question.** If the last write was cut") || !q.get("transfer").includes("chat app")) failures.push("the share link lost the lesson or the transfers");
  if (url.length > MAX_URL) failures.push(`the share link is ${url.length} characters, over ${MAX_URL}`);
  const c = new URL(confirmUrl("WEB-1", "claude-sonnet-5-5", "2026-11", "Same thing in a booking form.")).searchParams;
  if (c.get("template") !== "confirm-a-lesson.yml" || c.get("lesson") !== "WEB-1" || c.get("example") !== "Same thing in a booking form.") failures.push("the confirm link has wrong fields");
  for (const m of failures) console.error(`✕ ${m}`);
  return failures.length;
}

if (isMain(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "--selftest") {
    const failures = selftest();
    console.log(failures ? `${failures} case(s) failed` : "✓ share: checks a lesson ready to share, finds project names, builds the form links");
    process.exit(failures ? 1 : 0);
  }
  if (cmd === "context") { console.log(context(args[0])); process.exit(0); }
  if (cmd === "check") {
    if (!args[0] || !existsSync(args[0])) { console.error("✕ usage: node scripts/share.mjs check <file> [project]"); process.exit(1); }
    const project = path.resolve(args[1] ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
    const { problems, lesson, where } = checkShare(readFileSync(args[0], "utf8"), projectNames(project));
    for (const p of problems) console.log(`✕ ${p}`);
    if (problems.length) process.exit(1);
    const url = shareUrl(lesson, where);
    if (url.length > MAX_URL) { console.log(`✕ the lesson is too long for a link (${url.length} characters): shorten it, or open ${REPO}/issues/new?template=share-a-lesson.yml and paste it`); process.exit(1); }
    console.log(`✓ ready to share. Open this link, read it, and submit it yourself:\n${url}`);
    process.exit(0);
  }
  if (cmd === "confirm") {
    const [id, model, month, file] = args;
    if (!id || !model || !/^\d{4}-\d{2}$/.test(month ?? "") || !file || !existsSync(file)) { console.error("✕ usage: node scripts/share.mjs confirm <id> <model> <YYYY-MM> <example-file>"); process.exit(1); }
    console.log(`✓ Open this link, read it, and submit it yourself:\n${confirmUrl(id, model, month, readFileSync(file, "utf8").trim())}`);
    process.exit(0);
  }
  console.error("✕ usage: node scripts/share.mjs context [group] | check <file> [project] | confirm <id> <model> <YYYY-MM> <example-file> | --selftest");
  process.exit(1);
}
