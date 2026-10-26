---
name: maintain
description: Maintains the Ritual repository itself. Use for `/maintain <issue or PR number>`, for a `lesson` or `confirmation` issue, a contributed pull request, outdated translations, or shipping a release. Always reply in the user's language.
---

# /maintain

How a contribution becomes part of Ritual, the same way every time, whoever does it. Read `CLAUDE.md` first: its rules apply here (English, one commit per piece, `npm test` and `npm run check-publish` before every push).

Reply in the user's language. Everything written to the repository is in English.

The judgment is yours; the mechanics are in `node scripts/maintain.mjs`. Never edit a data line or insert a lesson by hand.

**Never on GitHub without asking:** commenting, labeling, closing, or merging. You may draft a comment to the contributor and show it; the maintainer posts it or says "va". A pushed commit with `Closes #N` closes the issue: say so before pushing.

## Which mode

- "triage", "what's open", or more than a few contributions waiting → **Triage**.
- A number: run `node scripts/maintain.mjs issue <N>`. It prints the form's fields and says whether the issue is a `lesson` or a `confirmation`. If `gh` says it is a pull request, use **Pull request**.
- "translations", or `npm test` warns that one is out of date → **Translations**.
- "release", "publish", "users don't get the change" → **Release**.
- "card", "lesson of the week", "post a lesson" → **Cards**.
- "simulation", "a new model came out", checking a contributed lesson with Claude → **Simulation**.

## Triage (many contributions at once)

The library grows with everyone's rituals, so contributions arrive faster than one by one. `node scripts/maintain.mjs triage` reads every open `lesson` and `confirmation` issue and sorts them:

1. **Unsafe first.** A lesson or example marked `✕ NEVER ADD AS IS` would put words in front of everyone's Claude that aim at its instructions, run a download, delete files, send somewhere, or hide characters. It is never added, not even reworded by you from it. Draft a short reply and leave it to the maintainer.
2. **Confirmations, by lesson.** Read each example (same mechanism, anonymous), run the printed `seen` commands for the good ones, and make one commit that closes them all (`Closes #a, closes #b`).
3. **Lessons, closest first.** Each comes with the three library lessons and issues whose words it shares most. A real sharpening scores about 0.3 against its lesson, so a low number is no proof of a new mistake: compare by meaning, as in **Lesson** step 1. Several issues with the same mistake become one lesson; the rest are its confirmations.
4. **What was measured.** A contribution may carry a `Measured` line (how it was caught, whether a lesson existed and showed up, how often it recurred, the measured cost to fix; `unknown` when not measured). Triage marks with ⚠ a lesson whose question didn't show up before its mistake: a false negative, the first thing to sharpen. Look first at where the work was: if it was in another group than the lesson's (a screen, while the lesson lives in git-and-process), its question was never shown, and `node scripts/maintain.mjs groups <id> <group>` makes it show there too. A measured cost tells which mistakes are worth a guard or a test first.
5. Then each lesson goes through **Lesson** below, ending with the `Ritual: merged into <id>.` line for every issue it took, including the duplicates.

## Confirmation (`confirmation` issue)

1. Read the example. It must be anonymous (no clients, products, people, paths) and the same mechanism as the lesson. If it is a different mistake, it is not a confirmation of that lesson: if its example is another library lesson's mechanism, it counts for that lesson (its `seen:`, and `Ritual: merged into <that id>.`); if no lesson has it, say so and draft a reply suggesting `/ritual share`.
2. The model goes in `seen:` as written, Claude or not: `seen:` records which models make the mistake. A model with `~` is fine.
3. Run `node scripts/maintain.mjs seen <id> <model> <YYYY-MM>` (the issue output prints this line). The data line is not part of the fingerprint, so translations stay current.
4. `node scripts/lessons.mjs --index` (a new `seen:` changes `lessons/BY-MODEL.md`), `npm test`, then one commit: `Lesson <id> confirmed with <model> (<YYYY-MM>)` with `Closes #<N>` in the body. Push after `npm run check-publish`.

## Lesson (`lesson` issue)

`issue <N>` writes the lesson to `.ritual/local/maintain/<N>.md` in the share format and runs the share check. Then:

1. **Covered?** Run `node scripts/share.mjs context <group>` and compare by meaning. If a lesson covers it, it is a confirmation (above) or a sharpening of that lesson: edit the existing lesson's parts by hand, keeping its number, and treat it as a change to the original (Translations). Add, don't replace: `lessons.mjs --check` fails if an example the lesson had in `main` is gone, and a warning on a long detector question means checking that the original question still stands out. When several lessons cover it by meaning, sharpen the one whose detector question would have fired on the example and whose idea needs no rewording to take it; the others get a «see lesson N». When a lesson's body already holds the contribution's idea but its detector question would not have fired on the example, it is a sharpening of that question, not a new lesson. A contribution whose What to do is a different action from the covering lesson's, not a case of it, is a new lesson that cites the covering one (as 14 to 18 cite 13).
2. **Generic?** It must help someone building something else: the mechanism, not the domain. Fix wording in the file if needed. Write the two other kinds of project yourself, not only read the contributor's: two in the kind of project the example came from count as none. If it is really one project's lesson, draft a kind reply and stop.
3. **Model.** The `issue` output says whether the model is Claude.
   - Claude, with a concrete example: origin `field · <model> · <month>`.
   - Another model, or a doubtful example: follow [checking a contributed lesson](../../../simulations/README.md#checking-a-contributed-lesson). Turn the reproduce field into a small task and run it with the current Claude models (Sonnet builds, Opus reviews, in separate sessions). If it breaks: origin `lab · <claude model> · <month>`, and the contributor's model goes in `seen:` in the file's data line. If it does not break: it stays a candidate in the issue. Draft a reply saying so.
4. **Where.** Check the `Where it goes` part against the ladder in `lessons/TEMPLATE.md#where-a-lesson-goes`. The `kind` field (the packages on in the contributor's project) is a hint: a lesson from a `core only` project with web examples may still belong to `web`, and several contributions from one kind of project with no package for it suggest a new package. A new package goes into `lessons/taxonomy.json` (with `covers` and `detect`) before the lesson. A new group waits for three lessons: leave the issue open with a reply. A sharpening goes through the same test: if its example holds outside the package of the lesson it sharpens, it sharpens a core lesson or becomes one, never the package lesson, which projects without that package never see.
5. **Add it.** Run `node scripts/maintain.mjs add .ritual/local/maintain/<N>.md "<origin>"`. It picks the next id (core number or package prefix), drops the share-only parts, and inserts it in order in `lessons/en/<group>.md`.
6. **Translate it.** See Translations. The lesson can go in English alone if needed: missing translations are warnings.
7. `node scripts/lessons.mjs --index`, `npm test`, then one commit: `Lesson <id>: <title>` with `Closes #<N>` in the body. Push after `npm run check-publish`. If the lesson counts appear in the READMEs (core count, packages), update all seven.
8. **Tell the contributor's Ritual.** Draft a closing comment whose last line is exactly `Ritual: merged into <id>.`: the id it was added as, or the existing lesson it confirmed or sharpened in step 1. The contributor's next `/ritual` reads that line (`share.mjs status`) and marks their local lesson merged, so it is not shown twice. It counts only when the maintainer posts it: show the draft and post it on "va". A lesson that was not taken gets no such line.

## Disagreement (a judge)

When two reviews of the same contribution or pull request point to different places (another lesson, core or package, new or a sharpening), or a reviewer leaves it open between two, a judge decides before the maintainer is asked. Only for these cases: it costs more than a review.

1. One agent with `model: fable` for all the open cases, read only: no edits, nothing on GitHub, no `private/`. A follow-up question on a case goes to a new judge, not the same one resumed: the resumed judge has its own earlier verdict in front of it, and is anchored by it (#65, 2026-10-25).
2. **Blind.** Each case gives the options as A and B in random order, with the same length of reasoning each, never who proposed which.
3. **Evidence, not only conclusions.** It reads the contribution in full, the full text of every lesson named, `lessons/TEMPLATE.md` and `lessons/taxonomy.json`.
4. **By the written rules.** Its verdict cites the rule or step it used. If the rules do not settle it, it says so and proposes the rule that would: that gap goes into this skill.
5. It may pick a third option. It gives its confidence and the one fact that would change its mind; with low confidence the case goes to the maintainer with both sides in two lines.
6. Its verdict is advice: the maintainer decides. Add a row to [judge.md](judge.md) for each case, and fill in the maintainer's call when it is made, so after about ten cases the judge's worth can be measured instead of assumed.

## Pull request

Every pull request gets this review before it is merged, whoever opened it: a newcomer, the maintainer, or a Claude session. The one who wrote it does not review it alone (lesson 28): an agent that did not write it reads the diff too.

1. `gh pr view <N>` and `gh pr diff <N>`. The CI runs the tests; read its result with `gh pr checks <N>`, do not rerun it by hand.
2. Lessons in a PR get the same review as a `lesson` issue (covered, generic, model, where). Code gets: its cases seen failing (`CLAUDE.md`: on the PR branch, in a separate worktree, put the old code back and run them), Node only, English, nothing from `private/`.
3. Write the review as a draft and show it, ending with a verdict: merge, merge after a fix (which one), or don't. Merging is the maintainer's call.

## Translations

`npm test` warns when a translation is missing or older than the English (its `from:` fingerprint no longer matches).

1. List the lessons to do from the warnings.
2. Have Haiku translate them (the Agent tool with `model: haiku`), one language per agent. Give it `lessons/TRANSLATING.md` and the English lessons, and ask for the translated lessons as text with no data line.
3. Put each translation in `lessons/<language>/<group>.md`, replacing the outdated one or inserting it in id order.
4. Check each one against the English: the same inline code spans, the same numbers, and every part present. Haiku has dropped list items and renamed packages before.
5. `node scripts/lessons.mjs --stamp <language>` for each language (`by: ai`), then `--index`, then `npm test`: no warnings left.

## Simulation

Rerun a task when a new model comes out, or check a contributed lesson with Claude (turn its reproduce field into a `simulations/<task>/TASK.md` first, with `Package:` and a `---` line before the client's request, plus a REVIEW.md).

1. `node scripts/simulate.mjs --probe`. The builder must see none of the user's CLAUDE.md, memory, plugins or MCP servers. With `ANTHROPIC_API_KEY` set, the script uses `--bare` and is fully isolated. With a subscription login it only switches things off flag by flag, so read what the probe says. Then it gives a builder session a small site to start and reach, and fails if the site was never reached: without that, a build's close can't run its web check, and an A/B measures nothing of it. If the CLI is not logged in, the user runs `claude auth login`: credentials are theirs to enter.
2. `node scripts/simulate.mjs <task> --dry-run` shows the plan. Then run it without `--dry-run`. It uses the user's plan or API budget: ask first, saying how many sessions (runs × 2) and the `--budget` per session. Defaults: 2 runs, `claude-sonnet-5-5` builds, `claude-opus-5-5` reviews.
3. It writes `simulations/<task>/runs/<month>-<model>-<n>/` (code, BUILDER.md, FINDINGS.md, verdicts.json) and `<month>-<model>-summary.md`.
4. Read every FINDINGS.md: the verdicts are the reviewer's judgment, and you check them against their evidence.
   - **Broke in every run:** add `seen:` with `maintain.mjs seen`.
   - **Held in every run:** a candidate to demote. Write it in the summary; demoting is a decision for the maintainer.
   - **New mistakes:** one that broke in every run becomes a lab lesson (TEMPLATE, then **Lesson** step 5 with a file you write). One that broke in a single run stays a candidate.
5. Commit the runs and the summary, then apply the lesson changes in their own commits.

## Cards

A lesson as an image to share, 1080×1080 (LinkedIn, X, Instagram and WhatsApp all show it whole): title, detector question, warning sign, the models it was seen with, and the link.

1. Pick the lesson. Good picks are a lesson just confirmed with a new model, or one that fired in a real session this week.
2. Run `node assets/social/card.mjs <id> [language]`, or `all`. It needs Windows with Edge. It writes `.ritual/local/cards/<language>/<id>.png`, plus a `.txt` with the post text and the link. It fails if the text does not fit at a readable size.
3. Look at the PNG before handing it over. Posting is the maintainer's: never post it yourself.

## Release

`.claude-plugin/plugin.json` has no `version` on purpose. Claude Code then uses the commit as the version, so every commit on `main` reaches users when they update. If a `version` is set there, users stay on their copy until it changes. Do not add one unless every release will bump it.

Users get updates with `claude plugin update ritual@ritual`, or automatically if they turn on auto-update for the marketplace in `/plugin`. Anything that breaks on `main` reaches them, so `main` is only pushed with the CI green.
