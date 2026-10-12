# Simulations

**English** · [Español](README.es.md)

The lessons from the packages (`web`, `apps`, `crm`, `ai`) are not invented. They come from watching a model build something and break. Each simulation is a realistic task, written the way a client would ask for it, that a model builds without Ritual. Then another model, in another session, runs what was built and notes what broke, with evidence. What breaks becomes a lesson with `origin: lab · <model> · <year-month>`. What doesn't break doesn't go in.

## Method

1. **Build** with a mechanical model (Sonnet), in a clean folder, using the text of `TASK.md` as it is and nothing else. It does not see lessons, hooks, or this folder.
2. **Review** with a judgment model (Opus), in another session, using `REVIEW.md`. It runs what was built and tries the paths people actually take (empty input, errors, a double click, mobile, the keyboard), and it looks for what doesn't blow up but is still wrong (a password, unescaped text). Each finding comes with its evidence: the command and its output, or what was seen on screen. The reviewer fixes nothing.
3. **Write the lessons** with the same judgment model, in the five parts. The human reviewer of the repository then integrates them: checks that none of them is already covered by the core, and runs the verifier.
4. **Each task is run twice.** What breaks both times is a lesson. What breaks once stays a candidate.

Each run is saved in `<task>/runs/<year-month>-<model>-<n>/` (`2026-10-sonnet-1`, `2026-10-sonnet-2`): the code as it was left (it is the example project with real bugs, and the calibration case for its lessons) and `FINDINGS.md`.

## How to repeat a simulation

When a new model comes out, the task is run again. A lesson that no longer breaks is not deleted. It is demoted (`demoted` in the configuration of the project that uses it), and the run records it. This way the library shrinks on its own when the models improve, based on data.

To propose a new task, open an issue with the text of the task and the kind of project it represents.
