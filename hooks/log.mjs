#!/usr/bin/env node
// Error log: notes at the moment, without spending tokens, what the ritual reviews later.
// - PostToolUseFailure (Bash): a command that exited with an error, with its exit code and what it said.
// - UserPromptSubmit: a correction from the user («eso está mal», «hazlo de nuevo»). The hook sees the phrase, not the
//   cause: the ritual writes the cause when it reviews. The pattern is calibrated with phrases that should and should not trigger.
// - UserPromptSubmit: the report of any agent that ran in the background (its task notification). In a project with
//   review agents most errors are found by them, not by a failed command or the user, and the conversation that held the
//   report may be compacted before the ritual. Every agent is logged: the notification carries only the description it was
//   launched with, in any language, so no name list can tell a reviewer apart; the ritual reads each report and judges.
// Goes to .ritual/local/log.jsonl (outside git), one line per entry, with the last thing touched in the session.
// - UserPromptSubmit: a request also starts a background pick of the lessons that apply to it (hooks/pick.mjs).
// Usage: node hooks/log.mjs --selftest
import path from "node:path";
import { appendLine, isMain, readInput, readJson, ritualDir, session } from "./common.mjs";
import { startPick, workOfPrompt } from "./pick.mjs";
import { DEFAULT_CONFIG, activeLessons } from "./questions.mjs";

// Precision over coverage: a phrase that is not logged is lost; one logged in excess dirties the ritual.
const CORRECTION = [
  /(?<!no )\b(está|esta|queda|salió|salio|quedó|quedo) mal\b/i, /\beso no (es|era)\b/i, /\bno (es|era) eso\b/i, /\bhazlo (de nuevo|otra vez)\b/i,
  /\bte equivocaste\b/i, /\b(sigue|siguen) (igual|roto|rota|fallando)\b/i, /\bno funciona\b/i, /\bno era lo que (pedí|pedi)\b/i, /\botra vez (lo mismo|mal)\b/i,
  /\b(that's|thats|that is|this is|it's|its|it is) (still )?(wrong|broken|not right)\b/i, /\b(redo|do it again|try again)\b/i, /\bnot what i asked\b/i,
  /\bstill (broken|failing|wrong|the same)\b/i, /\bdoesn't work\b/i, /\byou (broke|missed)\b/i, /\bwrong (file|answer|again)\b/i,
];

// A correction comes first: only the opening of a prompt counts, so a long brief that quotes "doesn't work" inside is not one.
export function isCorrection(prompt) {
  // A background task's notification comes in as a prompt, but the user did not write it.
  if (/^\s*<task-notification>/.test(String(prompt ?? ""))) return false;
  const p = String(prompt ?? "").split(/\n\s*\n/)[0].slice(0, 240);
  return CORRECTION.some((r) => r.test(p));
}

/** A finished background agent: its description, task id and report. Otherwise null. */
export function agentReport(prompt) {
  const p = String(prompt ?? "");
  if (!/^\s*<task-notification>/.test(p) || !/<status>completed<\/status>/.test(p)) return null;
  // Only agents: a background command's notification also says "completed".
  const agent = p.match(/<summary>\s*Agent "([^"]+)"/)?.[1];
  if (!agent) return null;
  return { agent, task: p.match(/<task-id>([^<]*)<\/task-id>/)?.[1] ?? null, report: (p.match(/<result>([\s\S]*?)<\/result>/)?.[1] ?? "").trim().slice(0, 2000) };
}

const REPORTS = [
  ['<task-notification>\n<task-id>a1</task-id>\n<status>completed</status>\n<summary>Agent "code-reviewer login" finished</summary>\n<result>Must fix: the form loses the message on error.</result>\n</task-notification>', { agent: "code-reviewer login", task: "a1", report: "Must fix: the form loses the message on error." }],
  ['<task-notification>\n<task-id>a2</task-id>\n<status>completed</status>\n<summary>Agent "Explore auth files" finished</summary>\n<result>Found 3 files.</result>\n</task-notification>', { agent: "Explore auth files", task: "a2", report: "Found 3 files." }],
  // Any language: nothing in the name has to match.
  ['<task-notification>\n<task-id>a4</task-id>\n<status>completed</status>\n<summary>Agent "revisa el formulario" finished</summary>\n<result>Obligatorio: el botón tapa el campo.</result>\n</task-notification>', { agent: "revisa el formulario", task: "a4", report: "Obligatorio: el botón tapa el campo." }],
  ['<task-notification>\n<task-id>b1</task-id>\n<status>completed</status>\n<summary>Background command "Run review script" completed (exit code 0)</summary>\n</task-notification>', null],
  ['<task-notification>\n<task-id>a3</task-id>\n<status>failed</status>\n<summary>Agent "verifier 2" failed</summary>\n</task-notification>', null],
  ["the code reviewer said it's fine", null],
];

const CASES = [
  ["eso está mal, el total no cuadra", true], ["No, hazlo de nuevo", true], ["sigue igual", true], ["te equivocaste de archivo", true],
  ["that's wrong, the test still fails", true], ["redo the last step", true], ["still broken", true], ["that is wrong, the form still loses the message", true], ["it is broken again", true],
  ["no está mal, sigue así", false], ["¿qué es un test?", false], ["crea el componente de login", false], ["the design is not bad", false],
  ["explain how hooks work", false], ["está bien, continúa", false],
  // A long brief pasted as a prompt is not a correction, even if it quotes one deep inside; a correction comes first.
  [`Necesito una página para el taller.\n\nRequisitos:\n- un formulario de contacto\n- una página de administración\n\nAntecedentes: la versión anterior no funciona en celular y hubo que hacerlo de nuevo varias veces.\n${"Detalle. ".repeat(40)}`, false],
  [`eso está mal: el total no cuadra.\n\n${"Aquí va el detalle de lo que vi. ".repeat(20)}`, true],
  // A background agent's notification arrives as a prompt, but the user did not write it: what the agent reports is not a correction.
  ["<task-notification>\n<task-id>a1</task-id>\n<status>completed</status>\n<summary>Agent \"Review\" finished</summary>\n<result>The form is still broken on mobile: the button overlaps the field.</result>\n</task-notification>", false],
];

export function selftest() {
  const bad = CASES.filter(([phrase, expected]) => isCorrection(phrase) !== expected);
  for (const [phrase, expected] of bad) console.error(`✕ ${expected ? "should log" : "should not log"}: ${phrase}`);
  const wrong = REPORTS.filter(([prompt, expected]) => JSON.stringify(agentReport(prompt)) !== JSON.stringify(expected));
  for (const [prompt] of wrong) console.error(`✕ agent report misread: ${prompt.slice(0, 120)}`);
  return bad.length + wrong.length;
}

if (isMain(import.meta.url)) {
  if (process.argv.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) failed` : `✓ ${CASES.length} calibrated phrases, ${REPORTS.length} agent notifications`);
    process.exit(bad ? 1 : 0);
  }
  const input = await readInput();
  const ritual = ritualDir(input);
  if (!input || !ritual) process.exit(0);
  const { data } = session(ritual, input.session_id);
  const logFile = path.join(ritual, "local", "log.jsonl");
  if (input.hook_event_name === "PostToolUseFailure") {
    // ponytail: logs every exit≠0, including a grep with no results; the ritual filters it with judgment. If it gets noisy, filter here by code and command.
    const error = String(input.error ?? "");
    appendLine(logFile, { type: "command", session: input.session_id, command: String(input.tool_input?.command ?? "").slice(0, 400), error: error.slice(0, 400) });
  } else if (input.hook_event_name === "UserPromptSubmit" && isCorrection(input.prompt)) {
    appendLine(logFile, { type: "correction", session: input.session_id, phrase: String(input.prompt).slice(0, 300), last: data.last ?? null });
  } else if (input.hook_event_name === "UserPromptSubmit") {
    const r = agentReport(input.prompt);
    if (r) appendLine(logFile, { type: "agent", session: input.session_id, ...r });
  }
  // A request starts a pick in the background: the lessons for it reach Claude at its next tool call (hooks/pick.mjs).
  if (input.hook_event_name === "UserPromptSubmit") {
    const config = { ...DEFAULT_CONFIG, ...readJson(path.join(ritual, "config.json"), {}) };
    const work = config.picker !== false && workOfPrompt(input.prompt);
    if (work) startPick(ritual, input.session_id, work, () => activeLessons(config, ritual).lessons);
  }
}
