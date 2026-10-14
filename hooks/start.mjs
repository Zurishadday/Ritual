#!/usr/bin/env node
// SessionStart hook. It gives the lessons of the project's packages before any plan (hooks/questions.mjs packageBrief).
// After a compaction or /clear it lets each group's questions come back (the context lost them).
// It rewrites .ritual/local/lessons.md, every group's active questions, for agents that run without hooks.
// And two notices for Claude, each at most once a week per project:
// - Update: new lessons are published often, but Claude Code leaves auto-update off for a marketplace that is not
//   Anthropic's, and a plugin can't turn it on. When this copy is over a week old and auto-update is off, say so.
// - About: the project's .ritual/config.json has no `about` (what the project is), as in projects set up before it
//   existed. Claude infers it from the README and folders, proposes the packages that fit, and asks once to confirm:
//   the right packages catch that kind of project's mistakes, and the ones left off cost no tokens.
// It reads only local files: the project's .ritual/ and Claude Code's own record of installed plugins. No network.
// Usage: node hooks/start.mjs --selftest
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, readInput, readJson, ritualDir, session } from "./common.mjs";
import { DEFAULT_CONFIG, packageBrief, writeDigest } from "./questions.mjs";

const PLUGIN = path.resolve(import.meta.dirname, "..");
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const REPO = /^zurishadday\/ritual$/i;

export const configDir = (env = process.env) => env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");

/** How this copy of Ritual stands. @returns {{autoUpdate: boolean, updated: Date | null}} */
export function status(config, plugin = PLUGIN) {
  const settings = readJson(path.join(config, "settings.json"), {});
  const known = readJson(path.join(config, "plugins", "known_marketplaces.json"), {});
  const ours = (m) => REPO.test(m?.source?.repo ?? "");
  const autoUpdate = [...Object.values(settings.extraKnownMarketplaces ?? {}), ...Object.values(known)].some((m) => ours(m) && m.autoUpdate === true);
  const installed = readJson(path.join(config, "plugins", "installed_plugins.json"), {}).plugins ?? {};
  const same = (p) => { try { return path.resolve(p).toLowerCase() === path.resolve(plugin).toLowerCase(); } catch { return false; } };
  const entry = Object.values(installed).flat().find((e) => e?.installPath && same(e.installPath));
  const updated = entry?.lastUpdated ? new Date(entry.lastUpdated) : null;
  return { autoUpdate, updated: updated && !Number.isNaN(+updated) ? updated : null };
}

/** After a compaction or /clear the session keeps its id, but what the questions hook sent is gone from the context:
 * forget the groups sent, so each group's questions come back the next time it is touched. */
export function resetQuestions(ritual, input) {
  if (!ritual || !["compact", "clear"].includes(input?.source)) return;
  const state = session(ritual, input.session_id);
  if (!state.data.sent?.length) return;
  state.data.sent = [];
  state.save();
}

/** True at most once a week per project and notice: it stamps .ritual/local/<name>.json when it says yes. */
function onceAWeek(ritual, name, now) {
  const file = ritual && path.join(ritual, "local", `${name}.json`);
  if (file && now - Date.parse(readJson(file, {}).date ?? "") < WEEK) return false;
  if (file) { try { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify({ date: new Date(now).toISOString() })); } catch { /* no state */ } }
  return true;
}

/** When the project has no `about`, ask Claude to infer it, propose the packages that fit, and confirm once. */
export function aboutNotice({ ritual, now = Date.now(), plugin = PLUGIN }) {
  if (!ritual) return null;
  const config = readJson(path.join(ritual, "config.json"), {});
  if (String(config.about ?? "").trim() || !onceAWeek(ritual, "about-asked", now)) return null;
  const packages = Object.entries(readJson(path.join(plugin, "lessons", "taxonomy.json"), {}).packages ?? {});
  const init = `node "${path.join(plugin, "scripts", "init.mjs")}"`;
  return [
    `This project's .ritual/config.json has no \`about\` (what the project is), so Ritual can't tell which lesson packages fit it. Without interrupting the user's task: read the project's README, CLAUDE.md and top-level folders (or run ${init} --detect), write one generic line about what it is (the kind of project and who it is for, no client or product names), and pick the packages whose covers fit. Then, in one line in the user's language, propose both and say why: each package adds the lessons for that kind of project, so its typical mistakes get caught, and the ones left off cost no tokens. On a yes, run ${init} --about "<line>" --packages <list>.`,
    `Packages on now: ${(config.packages ?? []).join(", ") || "none"}. Available:`,
    ...packages.map(([p, d]) => `- ${p} · ${d.covers}`),
  ].join("\n");
}

/** The notice for Claude, or null. Quiet when auto-update is on, when this copy is not an installed one (a checkout
 * loaded by hand), when it was updated this week, or when this project already got the notice this week. */
export function notice({ config, plugin = PLUGIN, ritual, now = Date.now() }) {
  const { autoUpdate, updated } = status(config, plugin);
  if (autoUpdate || !updated || now - updated < WEEK) return null;
  if (!onceAWeek(ritual, "update-reminder", now)) return null;
  const days = Math.floor((now - updated) / DAY);
  return `Ritual on this machine was last updated ${days} days ago (${updated.toISOString().slice(0, 10)}), and its auto-update is off, so new lessons are not reaching this project. In your first reply, tell the user in one line, in their language: they can turn on auto-update once (in /plugin → Marketplaces → ritual → Enable auto-update, or by asking you to add "autoUpdate": true to the ritual entry of extraKnownMarketplaces in their Claude Code settings.json), or update now with \`claude plugin update ritual@ritual\` and then start a new session. Say it once.`;
}

export function selftest() {
  const bad = [];
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ritual-update-"));
  const now = Date.parse("2026-11-20T12:00:00Z");
  const plugin = path.join(tmp, "cache", "ritual", "ritual", "abc123");
  const write = (f, o) => { mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); writeFileSync(path.join(tmp, f), JSON.stringify(o)); };
  const install = (lastUpdated) => write("plugins/installed_plugins.json", { version: 2, plugins: { "ritual@ritual": [{ scope: "user", installPath: plugin, lastUpdated }] } });
  const market = (extra = {}) => write("settings.json", { extraKnownMarketplaces: { ritual: { source: { source: "github", repo: "Zurishadday/Ritual" }, ...extra } } });
  const ritual = path.join(tmp, "project", ".ritual");
  const ask = (opts = {}) => notice({ config: tmp, plugin, ritual, now, ...opts });
  try {
    mkdirSync(ritual, { recursive: true });
    market(); install("2026-11-01T00:00:00Z");
    const first = ask();
    if (!first?.includes("19 days ago") || !first.includes("claude plugin update ritual@ritual")) bad.push(`old copy, auto-update off: should remind, gave ${first}`);
    if (ask()) bad.push("a second session the same week must not remind again");
    if (!ask({ now: now + 8 * DAY })) bad.push("a week later it should remind again");
    rmSync(path.join(ritual, "local"), { recursive: true, force: true });
    install("2026-11-18T00:00:00Z");
    if (ask()) bad.push("a copy updated two days ago must not remind");
    install("2026-11-01T00:00:00Z");
    market({ autoUpdate: true });
    if (ask()) bad.push("auto-update on (settings.json) must never remind");
    market();
    write("plugins/known_marketplaces.json", { ritual: { source: { source: "github", repo: "Zurishadday/Ritual" }, autoUpdate: true } });
    if (ask()) bad.push("auto-update on (turned on in /plugin) must never remind");
    rmSync(path.join(tmp, "plugins", "known_marketplaces.json"));
    if (notice({ config: tmp, plugin: path.join(tmp, "a-checkout"), ritual, now })) bad.push("a copy that is not an installed one (a checkout) must not remind");
    if (notice({ config: path.join(tmp, "nothing-here"), plugin, ritual, now })) bad.push("without Claude Code's records it must stay quiet");
    if (!notice({ config: tmp, plugin, ritual, now })) bad.push("the case that reminds stopped reminding");
    // About: a project without it gets asked once a week; one with it, never.
    const config = (o) => writeFileSync(path.join(ritual, "config.json"), JSON.stringify(o));
    config({ language: "en", packages: ["web"] });
    const ask1 = aboutNotice({ ritual, now });
    if (!ask1?.includes("no `about`") || !ask1.includes("education ·") || !ask1.includes("init.mjs") || !ask1.includes("Packages on now: web")) bad.push(`a project without about should be asked, with the packages and the command: ${ask1}`);
    if (aboutNotice({ ritual, now })) bad.push("about: a second session the same week must not ask again");
    if (!aboutNotice({ ritual, now: now + 8 * DAY })) bad.push("about: a week later it should ask again");
    config({ about: "A programming course for beginners", packages: [] });
    if (aboutNotice({ ritual, now: now + 30 * DAY })) bad.push("a project with about must never be asked");
    // After a compaction (or /clear) the session keeps its id but has lost the questions: they must come back.
    const state = path.join(ritual, "local", "sessions", "s1.json");
    mkdirSync(path.dirname(state), { recursive: true });
    writeFileSync(state, JSON.stringify({ sent: ["console-and-tools", "writing-and-docs"] }));
    resetQuestions(ritual, { session_id: "s1", source: "startup" });
    if (JSON.parse(readFileSync(state, "utf8")).sent.length !== 2) bad.push("a normal start must keep the groups already sent");
    resetQuestions(ritual, { session_id: "s1", source: "compact" });
    if (JSON.parse(readFileSync(state, "utf8")).sent.length) bad.push("after a compaction the groups must be sent again");
    // The digest for agents without hooks is rewritten at every start, at a path that doesn't change with updates.
    writeDigest(ritual);
    const digestFile = path.join(ritual, "local", "lessons.md");
    if (!existsSync(digestFile) || !readFileSync(digestFile, "utf8").includes("## Console and tools")) bad.push("the session start should write .ritual/local/lessons.md");
    // End to end: a project with a package gets its lessons at the start, and the session records it (for the simulation's trace).
    config({ about: "A bike shop's site", packages: ["web"] });
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: path.dirname(ritual), CLAUDE_CONFIG_DIR: tmp }, input: JSON.stringify({ session_id: "s2", source: "startup" }) });
    const said = JSON.parse(run.stdout || "{}").hookSpecificOutput?.additionalContext ?? "";
    if (!said.includes("- WEB-2 · ") || !said.includes("A bike shop's site")) bad.push(`the session start should give the package lessons: ${said.slice(0, 160) || run.stderr.slice(0, 160)}`);
    if (!readJson(path.join(ritual, "local", "sessions", "s2.json"), {}).brief) bad.push("the session start should record that it gave the brief");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  if (process.argv.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ session start: questions back after a compaction, update reminder and missing about weekly at most");
    process.exit(bad ? 1 : 0);
  }
  const input = await readInput();
  const ritual = ritualDir(input);
  if (!ritual) process.exit(0);
  resetQuestions(ritual, input);
  writeDigest(ritual);
  const brief = packageBrief({ ...DEFAULT_CONFIG, ...readJson(path.join(ritual, "config.json"), {}) }, ritual);
  if (brief) { const state = session(ritual, input?.session_id); state.data.brief = true; state.save(); }
  const text = [brief, notice({ config: configDir(), ritual }), aboutNotice({ ritual })].filter(Boolean).join("\n\n");
  if (text) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }));
}
