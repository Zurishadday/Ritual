# Simulations

**English** · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

The lessons from the packages (`web`, `apps`, `crm`, `ai`) are not invented. They come from watching a model build something and break. Each simulation is a realistic task, written the way a client would ask for it, that a model builds without Ritual. Then another model, in another session, runs what was built and notes what broke, with evidence. What breaks becomes a lesson with `origin: lab · <model> · <year-month>`. What doesn't break doesn't go in.

## Method

1. **Build** with a mechanical model (Sonnet), in a clean folder, using the text of `TASK.md` as it is and nothing else. It does not see lessons, hooks, or this folder.
2. **Review** with a judgment model (Opus), in another session, using `REVIEW.md`. It runs what was built and tries the paths people actually take (empty input, errors, a double click, mobile, the keyboard), and it looks for what doesn't blow up but is still wrong (a password, unescaped text). Each finding comes with its evidence: the command and its output, or what was seen on screen. The reviewer fixes nothing.
3. **Write the lessons** with the same judgment model, in the five parts. The human reviewer of the repository then integrates them: checks that none of them is already covered by the core, and runs the verifier.
4. **Each task is run twice.** What breaks both times is a lesson. What breaks once stays a candidate.

Each run is saved in `<task>/runs/<year-month>-<model>-<n>/` (`2026-10-sonnet-1`, `2026-10-sonnet-2`): the code as it was left (it is the example project with real bugs, and the calibration case for its lessons) and `FINDINGS.md`.

## How to repeat a simulation

When a new model comes out, the task is run again. A lesson that no longer breaks is not deleted. It is demoted (`demoted` in the configuration of the project that uses it), and the run records it. This way the library shrinks on its own when the models improve, based on data.

The script does it: `node scripts/simulate.mjs <task>` (for example `web`). Sonnet builds and Opus reviews, twice, each in its own isolated Claude Code session, and the script compares the runs: a lesson whose mistake happened in every run is confirmed with that model, and one whose mistake happened in none is a candidate to demote. Check the isolation first with `node scripts/simulate.mjs --probe`: the model that builds must not see your CLAUDE.md, memory or plugins. Nothing in the library changes until the maintainer applies it with `/maintain`.

To propose a new task, open an issue with the text of the task and the kind of project it represents.

## Does Ritual help? An A/B on the web task

The same task (the Spanish web request), the same builder (`claude-sonnet-5-5`) and the same reviewer (`claude-opus-5-5`), 2026-10, with Claude Code 2.1.295–2.1.296. Without Ritual, then with Ritual's hooks loaded and the project set up with the `web` package (`--with-ritual`). Then the rework: the same builder, without Ritual, gets the reviewer's findings for a build and fixes them (`--fix`), so the cost of building and of fixing what was left compares in full.

| | Lessons that broke (of 9) | New mistakes | Build | Fix what was found | Build + fix |
|---|---|---|---|---|---|
| Without Ritual ([1](web/runs/2026-10-sonnet-5-5-1), [2](web/runs/2026-10-sonnet-5-5-2)) | 7, 8 | 6, 7 | $0.28, $0.27 | $0.53, $0.45 | **$0.82, $0.72** |
| Questions only ([1](web/runs/2026-10-sonnet-5-5-ritual-1), [2](web/runs/2026-10-sonnet-5-5-ritual-2), [3](web/runs/2026-10-sonnet-5-5-ritual-3)) | 6, 9, 8 | 4, 4, 7 | $0.26, $0.27, $0.27 | | |
| With Ritual today ([1](web/runs/2026-10-sonnet-5-5-ritual-v2-1), [2](web/runs/2026-10-sonnet-5-5-ritual-v2-2), [3](web/runs/2026-10-sonnet-5-5-ritual-v2-3)) | **1, 2, 2** | 4, 5, 4 | $0.38, $0.53, $0.60 | $0.24, $0.17, $0.29 | **$0.63, $0.70, $0.90** |

What it says:

- **Mistakes:** the nine lessons broke 7.5 times per build on average without Ritual, 1.7 with it: about three quarters fewer. New mistakes, outside the lessons, went from 6.5 to 4.3.
- **Cost:** building with Ritual costs more (about $0.23 more per build: it designs for the lessons and goes back once to check). Fixing what is left costs about half (−52% in money, −53% in output tokens: 24,300 against 11,300 on average). Build plus fix comes out about the same: $0.77 against $0.74 on average, a difference smaller than the spread between runs. The end result starts from far fewer mistakes for the same money.
- **The questions alone did nothing.** The version that only showed each group's questions while writing ended where the build without Ritual did. What changed it is the package lessons at the start and the close, which sends the builder back once before it finishes.

What it does not say: it is one task, two or three runs per arm and one model. Finding the mistakes is not counted: the review cost $1.30–$2.40 per build, the same for both arms. Every build and fix that mentions it says the shell was denied for the commands it tried, in both arms, so none of them ran the site: the close's automatic web check never ran, and the fixes were not reviewed again.

## Checking a contributed lesson

Ritual runs inside Claude Code, so a lesson only earns a question in someone's session if the mistake happens with Claude. Every contributed lesson and every confirmation says which model and month it happened with.

1. **It happened with Claude, in a real project, with its example:** it goes in as `field` with that model, after the usual review (five parts, anonymous, not already covered).
2. **It happened with another model, or the example is doubtful:** the maintainer turns the situation into a small task, written like a client request, and runs it with the current Claude models, as in the method above.
   - It breaks with Claude: it goes in as `lab` with that Claude model, and the contributor's model goes into `seen:`.
   - It only broke with the other model: it stays a candidate in the issue, with its model noted. Nobody gets its question until someone sees it happen with Claude.
3. **A confirmation** of an existing lesson adds `<model> <YYYY-MM>` to its `seen:`. A lesson seen with several models is a general mistake; one only seen with an older model is the first one a new run checks before demoting it.
