# Ritual

**English** · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**Claude makes a mistake once. Ritual makes sure it's the last time.**

Ritual is a Claude Code plugin for any project. It has one idea: **every mistake becomes a lesson, every lesson becomes a rule, and every rule, when it can, becomes a test or a guard.** Other tools write down what was learned; this one goes as far as checking it, because a rule that only lives in text gets forgotten in a long session, and one that checks itself does not.

It ships 49 field lessons, each born from a real mistake; packages per kind of project, whose lessons come from watching a model build something and break it; and one command, `/ritual`, that turns the mistakes of your session into your own lessons, and your lessons into rules that enforce themselves.

## Install

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

Then, in your project, type `/ritual`. The first time, it detects what you are building from your dependencies, asks you a single thing (which lesson packages to turn on, and in which language) and creates the `.ritual/` folder. From then on, three hooks work without you doing anything:

| Hook | What it does | What it costs |
|---|---|---|
| **Guard** | Blocks the commands your project has already seen fail and says what to use instead. Its rules live in `.ritual/guard.json`, each with a case it blocks and one it lets through. | Nothing, until it blocks. |
| **Log** | Records, as it happens, every command that fails and every correction of yours ("that's wrong", "do it again"), with what Claude was touching. | Nothing. |
| **Questions** | The first time in a session that Claude is about to edit a test, a component, a script, a document or a query, or to run a command or make a commit, it shows Claude the detector questions of that group. Once per group and per session. | One line per lesson in the group, three to thirteen depending on the group and the packages. |

None of this changes what Claude does: it only puts in front of it, at the right moment, what your project has already learned.

## The ritual

When you close a session, or after a mistake that hurt, type `/ritual`. It reads the log and does this, in order:

0. Reviews the **candidates** the previous ritual left open: what could have become a test and didn't.
1. **Lists the mistakes**, starting with the log, and confirms the cause of each one.
2. Looks for **which lesson covered it and why it didn't fire**, first in the mistake's group. If one covered it, it sharpens its detector question or its warning sign, or adds the example.
3. Looks for **false positives**: questions that made Claude stop for nothing and guard blocks that were wrong. A wrong block becomes a case the rule must let through.
4. Writes a **new lesson** only if none covers it, with its five parts.
5. **Climbs the ladder** wherever it can: a command pattern becomes a guard rule; a property of the code, a test named after the lesson, seen failing against the real mistake before it is trusted; what cannot be automated and has already broken twice, a line in `CLAUDE.md`. Everything else stays as a dated candidate.
6. Saves everything together, in the same commit, and runs the checker.
7. Keeps the examples anonymous and, if a lesson holds for any project, offers you the text to share it here. It never publishes anything on its own.

And `/ritual close`, before calling something done, walks the questions of the groups you touched against the change and tells you what is missing.

## The library

The lessons live in [`lessons/en/`](lessons/en/README.md), in seven groups by **what you were doing** when it happened:

| Group | What it covers |
|---|---|
| Writing and docs | Documentation, manuals, screen text, content, prompts. |
| Numbers and data | Dashboards, reports, models, any number that gets shown. |
| Tests and checks | Automated tests, validators, reviews, calibration. |
| Scripts and files | Programs that write, generate or transform files and data. |
| Interface and design | Screens, components, styles, pages. |
| Console and tools | Commands, servers, captures, and the tool that gets in the way. |
| Git and process | Commits, states, pending items, parallel work. |

On top of the groups sit the **packages** per kind of project: lessons that only apply if you build that. They live in their group's file with a prefix (`WEB-1`), and their questions only show up when the package is on. They are turned on at setup and can be changed in `.ritual/config.json`.

| Package | Lessons |
|---|---|
| `web` | 4: what gets lost after a cut-off write, bots on a public form, the fallback without JavaScript, and focus on submit. |
| `apps`, `crm`, `ai` | On the way, with the same method. |

Every lesson has five parts, always all five: **the idea**, a real and anonymous **example**, the **detector question** that separates the case that applies from the one that doesn't, the **warning sign** (the phrase you say to yourself right before making the mistake again) and **what to do**. And a number that never changes: a redundant lesson is marked as merged into another, never deleted. The full format is in [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md).

Each one says where it came from:

- `field`: a real mistake in a project, with that example.
- `lab`: it broke in a [simulation](simulations/README.md), and it says which model and when. It becomes `field` when someone confirms it in their own project.
- `proposal`: only for what doesn't visibly break (security), with a public source.

An example, lesson 13:

> **A checker that never saw the error verifies nothing.** A test that always passes may be broken. The only way to know is to watch it fail against the real error. *Detector question:* did I test my check against the error in the forms it would really appear? And against the correct case? *Warning sign:* "It already passes, so it's set up right."

Ritual applies that lesson to itself: every guard rule, every checker and every hook in this repository carries its cases, and was seen failing before it went in.

## Package lessons come from simulations

Lessons per kind of project are not made up. One model builds a realistic task without Ritual; another model, in another session, runs what was built and records what broke, with evidence. What breaks goes in as a lesson; what doesn't, doesn't. Every task runs twice: what breaks both times is a lesson; what breaks once stays a candidate. When a new model comes out, the tasks run again, and a lesson that no longer breaks is demoted, with data. The method and the tasks are in [`simulations/`](simulations/README.md).

The first one was a website for a bike repair shop with a contact form and an admin page. Sonnet built it twice, and both versions escaped HTML properly, kept requests inside the public folder and held up under 300 messages at once. Even so, both silently lost the message that arrived after a cut-off write, both accepted hundreds of messages from a bot with no way to clean them up, and one said its test passed when it failed one time in ten. Every finding is in [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md) with its evidence, next to the code as it was left.

Ritual is checked with its own lessons too. WEB-1 found the same bug in Ritual's own log, and it was fixed with a test that was seen failing first.

## Contributing

The easiest way: **confirm a lesson**. If a `lab` or `proposal` lesson really happened to you, open an issue with your anonymous example and it becomes `field`, with your name if you want.

You can also:

- **Share a lesson** of yours: five parts, an anonymous example, and the group it belongs to. `/ritual` writes the text for you.
- **Propose a simulation task** for a kind of project that's missing.
- **Review a translation**: the lessons are translated by a model, and each one says so (`by: ai`). If you are a native speaker, fix it and sign it with your GitHub user. The workflow is in [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md).
- **Add a guard rule**, or a case it should have let through.

Before opening a pull request: `npm test`. It runs the calibration of every checker and hook, and checks that every lesson has its five parts and that the indexes are up to date (`node scripts/lessons.mjs --index` regenerates them).

## Languages

English is the original. The lessons are in seven languages: [English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md). Each translation says which version of the original it came from: when the original changes, the checker warns that the translation is out of date.

## License

MIT © 2026 Zurishadday
