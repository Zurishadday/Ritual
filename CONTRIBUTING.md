# Contributing to Ritual

Ritual grows from real mistakes. The most useful thing you can send is one that happened to you.

## Ways to help, from easiest

1. **Confirm a lesson.** A lesson's question showed up and the mistake happened anyway, or it happened again with another model. Type `/ritual share <lesson number>` in Claude Code, or fill the [confirmation form](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml). It records which models make the mistake, which decides what stays in the library.
2. **Share a lesson.** Type `/ritual share` in Claude Code. It compares your lesson with the library, makes it generic, checks that it names nothing of your project, and shows you the exact text in a box. If you say yes, it opens the issue under your GitHub account with the GitHub CLI (`gh`). Without `gh` signed in, it gives you the [form](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml) already filled in, to submit yourself.
3. **Open a package** for a kind of project that's missing (mobile, data, games…). `/ritual share` proposes one when a lesson fits none of the existing ones. See [where a lesson goes](lessons/TEMPLATE.md#where-a-lesson-goes).
4. **Review a translation** in your language. Lessons marked `by: ai` were translated by a model. Fix what reads wrong and put your GitHub user in its stamp: `node scripts/lessons.mjs --stamp <language> --by @your-user`. See [TRANSLATING.md](lessons/TRANSLATING.md).
5. **Propose a simulation task** for a kind of project: a short request, written like a client's, that a model builds while we watch what breaks. See [simulations](simulations/README.md).
6. **Fix or improve the code.** Open an issue first if the change is large.

Something not working? Type `/ritual doctor` and paste its output in a [bug report](https://github.com/Zurishadday/Ritual/issues/new?template=bug.yml).

## Rules for lessons

- From a real mistake, with its example, anonymous: no clients, products, people or paths.
- Five parts: the idea, an example, a detector question, a warning sign, what to do ([template](lessons/TEMPLATE.md)).
- The model and month it happened with. `~model` if you only remember it, `unknown` if nobody knows; never invented. Ritual runs on Claude, so a mistake seen only with another model is [checked with Claude first](simulations/README.md#checking-a-contributed-lesson).
- In English if you can: English is the original, and translations are made from it.

## Rules for code

- Node only, no dependencies, and everything in English: code, names, comments, docs.
- Every hook, checker or guard rule comes with its cases, seen failing against the real mistake before it passes.
- `npm test` must pass. GitHub runs it on Windows, macOS and Linux with Node 20 to 26 on every pull request.
- Core lessons are never renumbered or deleted: a redundant one says `Merged into N.`

## How a contribution goes in

The maintainer runs `/maintain <number>` (in `.claude/skills/maintain/`). It checks whether the lesson is already covered, whether it helps other kinds of project, and whether it breaks with Claude. Then it picks its number and place, and has it translated into the other six languages. A confirmation adds your model to the lesson's `seen:`. Either way, the issue is closed by the commit that adds it.
