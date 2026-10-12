# How to write a lesson

A lesson comes from a real mistake, not from theory. It has five parts, always all five, and a number that never changes. It lives in `lessons/en/<group>.md`, in the group of **what you were doing** when it happened (writing, numbers, tests, scripts, interface, console or git). If it also applies to another group, say so with `groups:`. If it belongs to one kind of project, say so with `packages:`.

The checker (`node scripts/lessons.mjs --check`) checks all of this, and each language's index and the page of [mistakes by model](BY-MODEL.md) are generated (`--index`): they are never edited by hand.

## Template

```markdown
### 13. A checker that never saw the error verifies nothing

`origin: field · claude-opus-5-5 · 2026-10` · `groups: scripts-and-files` · `packages: web`

**The idea.** The rule, in one or two sentences that make sense without the context.

**Example.** The real case, anonymous: what was done, what happened, how it was noticed.

**Detector question.** The concrete question that separates the case that applies from the one that does not.
Without it, the lesson is a warning, and warnings get ignored.

**Warning sign.** The phrase you say to yourself right before making the mistake again: "It already passes,
so it's set up right".

**What to do.** What you do differently from now on, as concrete as possible.
```

Extra parts such as **Another example.**, **Variant.** or **Not to be confused with.** are allowed; the five above are required.

## The lesson's data line

| Data | Values | Meaning |
|---|---|---|
| `origin: field · claude-opus-5-5 · 2026-10` | model and month | It came from a real mistake in a project, and the example is that mistake. The model is the one Claude Code was running when it happened; `/ritual` writes it for you. If the entry comes from memory rather than a record, put `~` before the model (`~opus · 2026-08`); if nobody knows, `unknown`. Never make it up. |
| `origin: lab · claude-sonnet-5-5 · 2026-10` | exact model and month | It broke in a Ritual simulation: that model built the task that month. The run recorded it, so it is always exact. When someone confirms it in their own project, it becomes `field`. |
| `origin: proposal` + `source: <link>` | | Only for what does not visibly break (security, mostly), from a public source. No model: it did not come from one. |
| `seen:` | `<model> <YYYY-MM>`, comma-separated | The models it was later confirmed with: `seen: claude-sonnet-5-5 2026-11, gpt-5 2026-12`. A lesson seen with several models is a general mistake; one only seen with an old model is the first to be demoted when a newer one no longer breaks. |
| `groups:` | other groups, comma-separated | Secondary groups where it also applies. |
| `packages:` | `web`, `apps`, `crm`, `ai`, `security` | Kinds of project it belongs to. Without it, it applies to all. |

## Where a lesson goes

Groups and packages are defined in one place, [`taxonomy.json`](taxonomy.json), each with what it `covers`. A lesson goes to the first step that holds:

1. **It refines an existing lesson.** It does not get a number of its own: it sharpens that one (a better detector question, a missing case, a confirmation with another model).
2. **It holds in different kinds of project.** It goes to the core, in the group of what was being done. The test: write what the same mistake looks like in two other kinds of project. If you can't, it is a lesson for that project, not for the library.
3. **It only holds for one kind of project, and a package covers it.** It goes to that package (`packages: web`).
4. **No package covers that kind of project.** Propose a new package with its first lesson: a slug named after the kind of project (`mobile`, `data`, `games`), never after a framework an existing package covers (`nextjs` is `web`), what it covers, and one to three dependencies that detect it. New packages are welcome: they are how the library reaches new kinds of software.
5. **The activity fits none of the groups.** Propose a new group. Groups are the backbone, so a group is created when three lessons need it; until then the proposal waits in its issue.

`/ritual share` walks these steps for you and checks the result. Accepting a new package or group means adding it to `taxonomy.json` (with its `covers`, and `detect` for a package) in the same pull request as its first lesson; the checker rejects a lesson whose package or group is not there.

## Numbers

- The core goes from 1 on, with no gaps. Packages use a prefix: `WEB-1`, `AI-3`.
- Nothing is renumbered or deleted. A lesson already covered by another keeps its number and only says: `Merged into N.`
- To cite another lesson write "see lesson 44" or "lesson 44"; the checker makes sure it exists.

## Languages

English is the original. Translations live in `lessons/<language>/` (`es`, `pt`, `fr`, `zh-CN`, `ja`, `ko`) with the same numbers and the five parts named in that language (see `PARTS` in `scripts/lessons.mjs`). Chinese and Japanese close the part name with 「。」: `**要点。**`.

A translation's data line does not repeat the original's. It says which version of the original it was made from and who made it:

```markdown
### 13. Un verificador que nunca vio el error no verifica nada

`from: 3fa2c1d9` · `by: ai`
```

- `from` is the fingerprint of the English lesson (its title and parts). Nobody writes it by hand: translate the lesson without a data line and run `node scripts/lessons.mjs --stamp <language>`.
- `by: ai` means a model translated it and no native speaker has reviewed it yet. If you review one, put your GitHub user there: `by: @your-user`. `by: author` marks the Spanish lessons, written by Ritual's authors before English became the original.
- When the English lesson changes, its fingerprint changes and the checker warns that the translation is out of date. Translate it again, delete its data line and stamp it.

To add or redo a translation, follow [TRANSLATING.md](TRANSLATING.md): fixed part names and group titles per language.

A missing, unstamped or outdated translation is a **warning**, never an error: a new lesson can go in English alone, and translations catch up after.
