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

- A number: run `node scripts/maintain.mjs issue <N>`. It prints the form's fields and says whether the issue is a `lesson` or a `confirmation`. If `gh` says it is a pull request, use **Pull request**.
- "translations", or `npm test` warns that one is out of date → **Translations**.
- "release", "publish", "users don't get the change" → **Release**.
- "card", "lesson of the week", "post a lesson" → **Cards**.

## Confirmation (`confirmation` issue)

1. Read the example. It must be anonymous (no clients, products, people, paths) and the same mechanism as the lesson. If it is a different mistake, it is not a confirmation: say so and draft a reply suggesting `/ritual share`.
2. The model goes in `seen:` as written, Claude or not: `seen:` records which models make the mistake. A model with `~` is fine.
3. Run `node scripts/maintain.mjs seen <id> <model> <YYYY-MM>` (the issue output prints this line). The data line is not part of the fingerprint, so translations stay current.
4. `npm test`, then one commit: `Lesson <id> confirmed with <model> (<YYYY-MM>)` with `Closes #<N>` in the body. Push after `npm run check-publish`.

## Lesson (`lesson` issue)

`issue <N>` writes the lesson to `.ritual/local/maintain/<N>.md` in the share format and runs the share check. Then:

1. **Covered?** Run `node scripts/share.mjs context <group>` and compare by meaning. If a lesson covers it, it is a confirmation (above) or a sharpening of that lesson: edit the existing lesson's parts by hand, keeping its number, and treat it as a change to the original (Translations).
2. **Generic?** It must help someone building something else: the mechanism, not the domain. Fix wording in the file if needed. If it is really one project's lesson, draft a kind reply and stop.
3. **Model.** The `issue` output says whether the model is Claude.
   - Claude, with a concrete example: origin `field · <model> · <month>`.
   - Another model, or a doubtful example: follow [checking a contributed lesson](../../../simulations/README.md#checking-a-contributed-lesson). Turn the reproduce field into a small task and run it with the current Claude models (Sonnet builds, Opus reviews, in separate sessions). If it breaks: origin `lab · <claude model> · <month>`, and the contributor's model goes in `seen:` in the file's data line. If it does not break: it stays a candidate in the issue. Draft a reply saying so.
4. **Where.** Check the `Where it goes` part against the ladder in `lessons/TEMPLATE.md#where-a-lesson-goes`. A new package goes into `lessons/taxonomy.json` (with `covers` and `detect`) before the lesson. A new group waits for three lessons: leave the issue open with a reply.
5. **Add it.** Run `node scripts/maintain.mjs add .ritual/local/maintain/<N>.md "<origin>"`. It picks the next id (core number or package prefix), drops the share-only parts, and inserts it in order in `lessons/en/<group>.md`.
6. **Translate it.** See Translations. The lesson can go in English alone if needed: missing translations are warnings.
7. `node scripts/lessons.mjs --index`, `npm test`, then one commit: `Lesson <id>: <title>` with `Closes #<N>` in the body. Push after `npm run check-publish`. If the lesson counts appear in the READMEs (core count, packages), update all seven.

## Pull request

1. `gh pr view <N>` and `gh pr diff <N>`. The CI runs the tests; read its result with `gh pr checks <N>`, do not rerun it by hand.
2. Lessons in a PR get the same review as a `lesson` issue (covered, generic, model, where). Code gets: its cases seen failing (`CLAUDE.md`), Node only, English, nothing from `private/`.
3. Write the review as a draft and show it. Merging is the maintainer's call.

## Translations

`npm test` warns when a translation is missing or older than the English (its `from:` fingerprint no longer matches).

1. List the lessons to do from the warnings.
2. Have Haiku translate them (the Agent tool with `model: haiku`), one language per agent. Give it `lessons/TRANSLATING.md` and the English lessons, and ask for the translated lessons as text with no data line.
3. Put each translation in `lessons/<language>/<group>.md`, replacing the outdated one or inserting it in id order.
4. Check each one against the English: the same inline code spans, the same numbers, and every part present. Haiku has dropped list items and renamed packages before.
5. `node scripts/lessons.mjs --stamp <language>` for each language (`by: ai`), then `--index`, then `npm test`: no warnings left.

## Cards

A lesson as an image to share, 1080×1080 (LinkedIn, X, Instagram and WhatsApp all show it whole): title, detector question, warning sign, the models it was seen with, and the link.

1. Pick the lesson. Good picks are a lesson just confirmed with a new model, or one that fired in a real session this week.
2. Run `node assets/social/card.mjs <id> [language]`, or `all`. It needs Windows with Edge. It writes `.ritual/local/cards/<language>/<id>.png`, plus a `.txt` with the post text and the link. It fails if the text does not fit at a readable size.
3. Look at the PNG before handing it over. Posting is the maintainer's: never post it yourself.

## Release

`.claude-plugin/plugin.json` has no `version` on purpose. Claude Code then uses the commit as the version, so every commit on `main` reaches users when they update. If a `version` is set there, users stay on their copy until it changes. Do not add one unless every release will bump it.

Users get updates with `claude plugin update ritual@ritual`, or automatically if they turn on auto-update for the marketplace in `/plugin`. Anything that breaks on `main` reaches them, so `main` is only pushed with the CI green.
