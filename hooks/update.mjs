#!/usr/bin/env node
// Update reminder: SessionStart hook. New lessons are published often, but Claude Code leaves auto-update off for a
// marketplace that is not Anthropic's, and a plugin can't turn it on for its users. So when this copy of Ritual was
// last updated over a week ago and auto-update is off, it asks Claude to tell the user, once a week per project.
// It reads only local files: Claude Code's own record of installed plugins and marketplaces. No network.
// Usage: node hooks/update.mjs --selftest
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMain, readInput, readJson, ritualDir } from "./common.mjs";

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

/** The notice for Claude, or null. Quiet when auto-update is on, when this copy is not an installed one (a checkout
 * loaded by hand), when it was updated this week, or when this project already got the notice this week. */
export function notice({ config, plugin = PLUGIN, ritual, now = Date.now() }) {
  const { autoUpdate, updated } = status(config, plugin);
  if (autoUpdate || !updated || now - updated < WEEK) return null;
  const file = ritual && path.join(ritual, "local", "update-reminder.json");
  const last = file ? Date.parse(readJson(file, {}).date ?? "") : NaN;
  if (now - last < WEEK) return null;
  if (file) { try { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify({ date: new Date(now).toISOString() })); } catch { /* no state */ } }
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
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  if (process.argv.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ update reminder: weekly, only with auto-update off and an old copy, quiet otherwise");
    process.exit(bad ? 1 : 0);
  }
  const input = await readInput();
  const ritual = ritualDir(input);
  if (!ritual) process.exit(0);
  const text = notice({ config: configDir(), ritual });
  if (text) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }));
}
