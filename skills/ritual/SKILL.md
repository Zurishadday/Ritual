---
name: ritual
description: Turns the errors of a session into lessons, rules, guard hooks and tests, and keeps the project's lessons sharp. Use at the end of a session, after a painful bug, or before calling a feature done (`/ritual cierre`). On a project without `.ritual/`, it sets Ritual up first. Always reply in the user's language.
---

# /ritual

Every mistake becomes a lesson, every lesson a rule, and every rule, when it can, a check. A rule that only lives in text gets forgotten in a long session; a guard or a test does not.

Reply in the language the user writes in. Lessons are written in the project's language (`.ritual/config.json` → `idioma`; `es` is the original of the plugin, so the plugin's lessons live in `lecciones/es/`, and `lecciones/<idioma>/` when a translation exists).

Paths below use `${CLAUDE_PLUGIN_ROOT}`, the folder where Ritual is installed. All scripts are Node; run them with `node`.

## Which mode

- The project has no `.ritual/` folder → **Setup**, then stop.
- The user wrote `/ritual cierre` (or asks for a check before finishing) → **Close review**.
- Otherwise → **Ritual**.

## Setup (first run in a project)

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/iniciar.mjs" --detectar`. It prints the packages it detects from the project's dependencies (`web`, `apps`, `crm`, `ia`, `seguridad`) and the language it guesses.
2. Ask the user **one** question: confirm packages and language. Nothing else.
3. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/iniciar.mjs" --paquetes <list> --idioma <code>`. It creates `.ritual/` (config, guard rules, own lessons folder, candidates), adds `.ritual/local/` to `.gitignore` and a short Ritual section to `CLAUDE.md`. Running it twice changes nothing.
4. Tell the user in three lines what was created and that the hooks are now active: the guard blocks commands that already failed, the log records failed commands and corrections, and each group's detector questions appear once per session.

## Ritual

Start with `node "${CLAUDE_PLUGIN_ROOT}/scripts/resumen.mjs"`. It prints, compactly, everything since the last ritual: failed commands and user corrections from the log (with what was being touched), the guard's blocks, the open candidates, and the groups touched in recent sessions. Read it completely; do not rebuild it from memory.

Then follow the steps in order. Each step produces one or two lines for the user; the whole ritual is a report, not a conversation. Ask only when a cause cannot be confirmed.

0. **Open candidates.** For each open candidate in `.ritual/candidatos.md`: can it become a test or a guard rule today? If yes, do it (step 5). If not, leave it open or mark it `descartado` with the reason. Candidates are never deleted.
1. **List the errors.** From the log first, then the conversation, then the commits. For each one: what happened and its cause, confirmed by looking, not guessed. A correction in the log gives the phrase and what was being touched; finding the cause is your job.
2. **Which lesson covered it, and why it did not fire.** Look first in the group of what was being done: the plugin's `lecciones/<idioma>/<grupo>.md`, then the project's `.ritual/lecciones/<grupo>.md`. If a lesson covered it, that is a false negative: sharpen its detector question or its warning sign, or add the example. Plugin lessons are never edited in place: write the sharpening as a project lesson in `.ritual/lecciones/<grupo>.md` with `` `afina: N` `` in its data line, so the hook shows it next to the original.
3. **False positives.** Questions that made you stop or ask without need, and guard blocks that were wrong (`node "${CLAUDE_PLUGIN_ROOT}/hooks/guardia.mjs" --bitacora`). A wrong block becomes a `deja` case of that rule in `.ritual/guardia.json`. A question that never applies to this project goes to `bajadas` in `.ritual/config.json`, which is reversible. Nothing is deleted.
4. **New lessons**, only for an error no lesson covers. Five parts (see `${CLAUDE_PLUGIN_ROOT}/lecciones/PLANTILLA.md`), `` `origen: campo` ``, the next `P-N` id, in the file of the group of what was being done. Before writing it, instantiate it in two other kinds of project: if the text alone does not say what to do there, it is incomplete. No detector question, no lesson: it may be a note for the docs of the area it touches.
5. **Up the ladder.** For each lesson that fired today, new or sharpened, ask: can a check run alone?
   - A command pattern → a rule in `.ritual/guardia.json` with `bloquea` and `deja` cases. Run `node "${CLAUDE_PLUGIN_ROOT}/hooks/guardia.mjs" --probar` and see it block the real command before you trust it.
   - A property of the code or the output → a test named after the lesson, seen failing against the real error before the fix.
   - Neither → a one-line rule in the Ritual section of `CLAUDE.md`, only if the log shows it broke more than once. Otherwise it stays a lesson and goes to `.ritual/candidatos.md` as open, with the date.
6. **Write everything together**, in the same commit: lessons, candidates, config and guard rules, the `CLAUDE.md` line. Then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/lecciones.mjs" --verificar --proyecto .`; it must pass.
7. **Anonymous and shareable.** Examples name no clients, products or people. If a lesson would hold in any project, offer the user its exact text to contribute to Ritual (issue "Share a lesson" at https://github.com/Zurishadday/Ritual). Never publish anything yourself.

Close with `node "${CLAUDE_PLUGIN_ROOT}/scripts/resumen.mjs" --marcar` (it stamps the date of this ritual) and a report in this shape:

```
Ritual · <date>
Errors: N (from log: n, from conversation: n)
Lessons: sharpened N (ids) · new N (ids) · false positives fixed N
Checks: guard rules N · tests N · CLAUDE.md lines N
Candidates: open N · closed N · discarded N
Cost this session: groups sent <list>
```

## Close review (`/ritual cierre`)

Before calling a feature done. Read the groups touched from `node "${CLAUDE_PLUGIN_ROOT}/scripts/resumen.mjs" --grupos` and walk the detector questions of those groups (plugin and project lessons) against the change just made. For each question: **does not apply** (say why in half a line), **applies and is answered** (where the evidence is), or **applies and is not answered** (this blocks "done": say what is missing). Blocking ones first. For every answered question that can be a test, propose the test **named after the lesson**. Do not declare the feature done while a question is unanswered; if the user closes it anyway, add it to `.ritual/candidatos.md` with the date and when it will hurt.
