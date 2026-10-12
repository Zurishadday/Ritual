#!/usr/bin/env node
// Error log: notes at the moment, without spending tokens, what the ritual reviews later.
// - PostToolUseFailure (Bash): a command that exited with an error, with its exit code and what it said.
// - UserPromptSubmit: a correction from the user («eso está mal», «hazlo de nuevo»). The hook sees the phrase, not the
//   cause: the ritual writes the cause when it reviews. The pattern is calibrated with phrases that should and should not trigger.
// Goes to .ritual/local/log.jsonl (outside git), one line per entry, with the last thing touched in the session.
// Usage: node hooks/log.mjs --selftest
import path from "node:path";
import { appendLine, ritualDir, readInput, session } from "./common.mjs";

// Precision over coverage: a phrase that is not logged is lost; one logged in excess dirties the ritual.
const CORRECTION = [
  /(?<!no )\b(está|esta|queda|salió|salio|quedó|quedo) mal\b/i, /\beso no (es|era)\b/i, /\bno (es|era) eso\b/i, /\bhazlo (de nuevo|otra vez)\b/i,
  /\bte equivocaste\b/i, /\b(sigue|siguen) (igual|roto|rota|fallando)\b/i, /\bno funciona\b/i, /\bno era lo que (pedí|pedi)\b/i, /\botra vez (lo mismo|mal)\b/i,
  /\b(that's|thats|this is|it's|its) (wrong|broken|not right)\b/i, /\b(redo|do it again|try again)\b/i, /\bnot what i asked\b/i,
  /\bstill (broken|failing|wrong|the same)\b/i, /\bdoesn't work\b/i, /\byou (broke|missed)\b/i, /\bwrong (file|answer|again)\b/i,
];

export function isCorrection(prompt) {
  const p = String(prompt ?? "");
  return CORRECTION.some((r) => r.test(p));
}

const CASES = [
  ["eso está mal, el total no cuadra", true], ["No, hazlo de nuevo", true], ["sigue igual", true], ["te equivocaste de archivo", true],
  ["that's wrong, the test still fails", true], ["redo the last step", true], ["still broken", true],
  ["no está mal, sigue así", false], ["¿qué es un test?", false], ["crea el componente de login", false], ["the design is not bad", false],
  ["explain how hooks work", false], ["está bien, continúa", false],
];

export function selftest() {
  const bad = CASES.filter(([phrase, expected]) => isCorrection(phrase) !== expected);
  for (const [phrase, expected] of bad) console.error(`✕ ${expected ? "should log" : "should not log"}: ${phrase}`);
  return bad.length;
}

if (import.meta.main) {
  if (process.argv.includes("--selftest")) {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) failed` : `✓ ${CASES.length} calibrated phrases`);
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
  }
}
