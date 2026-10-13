<div align="center">

<img src="assets/banner.png" width="100%" alt="Ritual. Claude makes a mistake once. Ritual makes sure it's the last time. Mistake, lesson, rule, check.">

A Claude Code plugin that turns every mistake into a lesson, every lesson into a rule, and every rule, when it can, into a test or a guard.

[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-E8743B)](#install)
[![Tests](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml/badge.svg)](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml)
[![Library](https://img.shields.io/badge/library-browse_the_lessons-3FB950)](https://zurishadday.github.io/Ritual/)
[![License: MIT](https://img.shields.io/github/license/Zurishadday/Ritual)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Zurishadday/Ritual)](https://github.com/Zurishadday/Ritual/commits/main)

**English** · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

</div>

Other tools write down what was learned; Ritual goes as far as checking it, because a rule that only lives in text gets forgotten in a long session, and one that checks itself does not.

It ships **52 field lessons**, each born from a real mistake; **packages per kind of project**, whose lessons come from watching a model build something and break it; and **one command**, `/ritual`, that turns the mistakes of your session into your own lessons, and your lessons into rules that enforce themselves.

<a name="install"></a>

## Install

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

Then, in your project, type `/ritual`. The first time, it works out what you are building from your dependencies and your README, and asks you a single thing: what the project is, which lesson packages to turn on and why, and in which language. Then it creates the `.ritual/` folder. That's all the setup there is.

It needs Node 20.17 or newer (`node --version`). If something doesn't work, type `/ritual doctor`: it checks Node, your setup and whether the hooks are really running, and says what to fix.

**Turn on auto-update once.** New lessons arrive often, and Claude Code leaves auto-update off for marketplaces that aren't Anthropic's. Type `/plugin`, open Marketplaces, choose `ritual` and Enable auto-update. In the desktop app, ask Claude to "turn on auto-update for the ritual marketplace": it adds `"autoUpdate": true` to the `ritual` entry of your Claude Code `settings.json`. Until you do, Ritual reminds you once a week. To update by hand: `claude plugin update ritual@ritual`, then start a new session.

**`claude` not found?** That happens when you only have the Claude desktop app, which brings its own copy. Install the command line ([how](https://code.claude.com/docs/en/setup)): it shares plugins with the app. Then restart the app.

## See it in action

Real output from Ritual's own tests, in a web project.

**The guard blocks a command your project has already seen fail,** and says what to do instead:

```console
$ git push --force origin main
Ritual guard (force-push-to-main): A forced push to main rewrites shared history. Push to a branch and open a pull request.
```

**The first time Claude edits a component,** it gets that group's detector questions, once per session (trimmed):

```text
Ritual · Interface and design. Before you continue, run through these detector questions for what you
are about to do. If one applies, act on it and say so in one line; if none applies, just continue.
- 32 · Right after using the control, without moving from where it is, does the user see what changed?
- 45 · If the user does the most likely wrong thing (a typo, an empty answer, two clicks), what do they
       see, and can they keep going?
- WEB-2 · If a thousand fake messages arrive tomorrow, how does the owner find the one real one, and how
          do they delete the rest?
- WEB-4 · After submitting, whether it succeeded or failed, where does focus end up and where does the
          next Tab go?
```

**`/ritual` starts from what actually happened,** not from memory (excerpt):

```text
Log: 1 failed command(s), 1 correction(s)
  10-12 20:05 cmd  npm run build  →  Exit code 1 Type error: Property 'email' does not exist on type 'FormData'
  10-12 20:05 fix  «that is wrong, the form still loses the message»  while Edit src/components/ContactForm.tsx

Guard: 2 block(s) · force-push-to-main ×1, python-c ×1 (details: hooks/guard.mjs --log)

Groups touched in 1 session(s): interface-and-design (1)
```

## How it works

Three hooks work without you doing anything:

| Hook | What it does | What it costs |
|---|---|---|
| 🛡️ **Guard** | Blocks the commands your project has already seen fail and says what to use instead. Its rules live in `.ritual/guard.json`, each with a case it blocks and one it lets through. | Nothing, until it blocks. |
| 📝 **Log** | Records, as it happens, every command that fails and every correction of yours ("that's wrong", "do it again"), with what Claude was touching. | Nothing. |
| ❓ **Questions** | The first time in a session that Claude is about to edit a test, a component, a script, a document or a query, or to run a command or make a commit, it shows Claude the detector questions of that group. Once per group and per session. | One line per lesson in the group, three to thirteen depending on the group and the packages. |

None of this changes what Claude does: it only puts in front of it, at the right moment, what your project has already learned.

When you close a session, or after a mistake that hurt, type `/ritual`. It reads the log, finds which lesson should have caught each mistake and why it didn't, and climbs the ladder: a lesson becomes a guard rule or a test whenever it can.

<details>
<summary><b>The eight steps of <code>/ritual</code></b></summary>

0. Reviews the **candidates** the previous ritual left open: what could have become a test and didn't.
1. **Lists the mistakes**, starting with the log, and confirms the cause of each one.
2. Looks for **which lesson covered it and why it didn't fire**, first in the mistake's group. If one covered it, it sharpens its detector question or its warning sign, or adds the example.
3. Looks for **false positives**: questions that made Claude stop for nothing and guard blocks that were wrong. A wrong block becomes a case the rule must let through.
4. Writes a **new lesson** only if none covers it, with its five parts.
5. **Climbs the ladder** wherever it can: a command pattern becomes a guard rule; a property of the code, a test named after the lesson, seen failing against the real mistake before it is trusted; what cannot be automated and has already broken twice, a line in `CLAUDE.md`. Everything else stays as a dated candidate.
6. Saves everything together, in the same commit, and runs the checker.
7. Keeps the examples anonymous and, if a lesson holds for any project, offers you the text to share it here. It never publishes anything on its own.

</details>

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
| `web` | 5: what gets lost when the saved data gets damaged, bots on a public form, the fallback without JavaScript, focus on submit, and a login with no limit on attempts. |
| `education` | 5: an exercise that passes without the skill, the answer visible before the question, two defensible answers, guessing by position or length, and a hint that gives the answer away. |
| `apps`, `crm`, `ai` | On the way, with the same method. |
| Yours | A kind of project that's missing (mobile, data, games…) starts with its first lesson: see [where a lesson goes](lessons/TEMPLATE.md#where-a-lesson-goes). |

Every lesson has five parts, always all five: **the idea**, a real and anonymous **example**, the **detector question** that separates the case that applies from the one that doesn't, the **warning sign** (the phrase you say to yourself right before making the mistake again) and **what to do**. And a number that never changes: a redundant lesson is marked as merged into another, never deleted. The full format is in [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md).

> **A checker that never saw the error verifies nothing.** A test that always passes may be broken. The only way to know is to watch it fail against the real error. *Detector question:* did I test my check against the error in the forms it would really appear? And against the correct case? *Warning sign:* "It already passes, so it's set up right."
>
> — lesson 13

Ritual applies that lesson to itself: every guard rule, every checker and every hook in this repository carries its cases, and was seen failing before it went in.

Each lesson says where it came from, and with which model and in which month it happened (`field · ~opus · 2026-08`; the `~` means from memory, not from a record):

- `field`: a real mistake in a project, with that example.
- `lab`: it broke in a [simulation](simulations/README.md), and it says which model and when. It becomes `field` when someone confirms it in their own project.
- `proposal`: only for what doesn't visibly break (security), with a public source.

> [!NOTE]
> Ritual runs on Claude, and a mistake one model makes another may not. That's why every lesson records its model: a lesson that only happened with another model is checked with Claude before anyone gets its question, and when a newer Claude no longer makes a mistake, the data shows it. See [which models made which mistakes](lessons/BY-MODEL.md).

## Package lessons come from simulations

Lessons per kind of project are not made up. One model builds a realistic task without Ritual; another model, in another session, runs what was built and records what broke, with evidence. Every task runs twice: what breaks both times is a lesson; what breaks once stays a candidate. When a new model comes out, the tasks run again, and a lesson that no longer breaks is demoted, with data. The method is in [`simulations/`](simulations/README.md).

The first one was a website for a bike repair shop with a contact form and an admin page. Sonnet built it twice, and both versions escaped HTML properly, kept requests inside the public folder and held up under 300 messages at once. Even so, both silently lost the message that arrived after a cut-off write, both accepted hundreds of messages from a bot with no way to clean them up, and one said its test passed when it failed one time in ten. Every finding is in [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md) with its evidence, next to the code as it was left.

The second time, a script ran it ([`scripts/simulate.mjs`](scripts/simulate.mjs)): Sonnet 5.5 built in isolated sessions and Opus 5.5 reviewed. The mistake of seven of the nine web lessons happened again in both runs. WEB-1's exact mistake didn't, but its mechanism did: once the data file was damaged, every new message failed, so the lesson was sharpened, not demoted. And a new mistake showed up in both runs, an admin login with no limit on attempts, which became WEB-5. The comparison is in [the summary](simulations/web/runs/2026-10-sonnet-5-5-summary.md).

Ritual is checked with its own lessons too. WEB-1 found the same bug in Ritual's own log, and it was fixed with a test that was seen failing first.

## Contributing

The easiest way: **confirm a lesson**. If a lesson happened to you too, [open a confirmation](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml) with your anonymous example and the model you were using. Each confirmation adds that model to the lesson's `seen:` list, so the library learns which models a mistake applies to, and which newer ones no longer make it. A `lab` or `proposal` lesson with a real example becomes `field`, with your name if you want.

You can also:

- **Share a lesson** of yours: type `/ritual share`. It compares it with the library (a mistake already covered becomes a confirmation, not a duplicate), rewrites it so it helps someone building something else, checks that it names nothing of your project, decides where it goes, and opens the [form](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml) already filled in. You read it and submit it. A lesson that only happened with another model is [checked with Claude first](simulations/README.md#checking-a-contributed-lesson).
- **Open a new package** for a kind of project that's missing: `/ritual share` proposes one when a lesson fits none of the existing ones. Or **propose a simulation task** for it.
- **Review a translation**: the lessons are translated by a model, and each one says so (`by: ai`). If you are a native speaker, fix it and sign it with your GitHub user. The workflow is in [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md).
- **Add a guard rule**, or a case it should have let through.

Before opening a pull request, run `npm test`. It runs the calibration of every checker and hook, and checks that every lesson has its five parts and that the indexes are up to date (`node scripts/lessons.mjs --index` regenerates them).

## Languages

English is the original. The lessons are in seven languages: [English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md). Each translation says which version of the original it came from: when the original changes, the checker warns that the translation is out of date.

## License

MIT © 2026 Zurishadday
