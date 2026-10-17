# Ritual

A public Claude Code plugin: every mistake becomes a lesson, every lesson a rule, and every rule, when it can, a test or a guard. Reply in the language the user writes in.

## Rules of this repository

- The repository is public: every push is visible at once. `private/` is local reference material, ignored by git, and nothing from it goes up as is.
- Before every push run `node scripts/check-publish.mjs`. The list of words that are never published lives in `private/do-not-publish/forbidden.txt`, outside git. If it finds one, nothing goes up: rewrite first. The `scripts/githooks/pre-push` hook runs it on its own (`git config core.hooksPath scripts/githooks`).
- Work on `main`, one commit per finished piece, commit messages in English, and push after each commit.
- Everything in the repository is in English: code, identifiers, comments, file names, config keys, flags and docs. Translations live next to the original (`README.es.md`, `lessons/es/`).
- Every piece that can be checked on its own gets its check, seen failing against the real error before it counts. A hook or a checker without its cases does not go in.
- All hooks and scripts in Node, never bash: the project is developed on Windows.
- Core lessons are numbered from 1 and are never renumbered or deleted: a redundant one is marked "Merged into N." Packages use a prefix (`WEB-1`).
- Every lesson states its origin and the model and month it was born with: `field · claude-opus-5-5 · 2026-10` (a real mistake with its example), `lab · claude-sonnet-5-5 · 2026-10` (broke in a simulation) or `proposal` (only for security issues that do not visibly break, with a public source). `~model` marks an entry from memory; `unknown` is allowed, invention is not. `seen:` lists the models it was later confirmed with.
- Issues, pull requests, translations and releases are handled with `/maintain <number>` (`.claude/skills/maintain/`). Nothing is posted, closed or merged on GitHub without asking.
- `.claude-plugin/plugin.json` has no `version`: each commit on `main` is a release, so `main` is pushed only with the tests green.
- In simulations Sonnet builds; Opus reviews, runs and writes the lesson, in a separate session.
- Skills are written in English and tell Claude to reply in the user's language. README and lessons in seven languages; English is the original. Translations carry a `from:` stamp of the version they came from (`node scripts/lessons.mjs --stamp <language>`); Haiku translates, a native speaker reviews.

## Ritual

<!-- ritual:start -->
This project's lessons live in `.ritual/lessons/`; the core ones, in the Ritual plugin. Its hooks block what already failed, log errors and corrections in `.ritual/local/`, and show each group's questions once per session; agents that run without hooks find them all in `.ritual/local/lessons.md`. Run `/ritual` when closing a session or after a painful bug, and `/ritual close` before calling something done.

Rules this project broke more than once and could not automate:

- What a running tool is doing now (which Ritual copy a session runs, what is installed, what runs in the background) is looked at before it is said: on 2026-10-16 the user was told three times that the session ran the old copy while its hooks already ran from the updated one (plugins update mid-session; the guard's message names its path), and a background wait left running was found by the user, not by a check.
- A number said in a reply that wasn't measured today (a cost, a size, a count) is given as an estimate with where it came from, or measured first: twice a figure from memory ($20–25 for an A/B that cost $40–70; "25 MB" for a model whose library took 379 MB) was off by half or more, and hooks don't fire on replies.
<!-- ritual:end -->
