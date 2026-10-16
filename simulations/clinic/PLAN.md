# A/B on the clinic task: the plan, written before the runs

The first A/B ([simulations/README.md](../README.md#does-ritual-help-an-ab-on-the-web-task)) had four weaknesses: it was the task the web lessons were born from, the reviewer knew the arm, the arms were reviewed with different prompts, and the fixes were not reviewed again. This one is set up to remove them, and its metrics are fixed here, before any run.

## Setup

- **Task:** [TASK.es.md](TASK.es.md), new: no lesson was born from it.
- **Arms**, four runs each, interleaved one run at a time (A1, B1, C1, A2, …) so a change in Claude Code hits all three alike:
  - **A**, without Ritual: `node scripts/simulate.mjs clinic --language es --blind --runs 1`
  - **B**, with Ritual (package lessons at the start, and the close): add `--with-ritual`
  - **C**, the package lessons at the start only: add `--with-ritual --no-close`
- **Models:** `claude-sonnet-5-5` builds and fixes, `claude-opus-5-5` reviews. Same review prompt for every review.
- **Blind review:** the reviewer never gets the builder's last message. Any mention of Ritual or a lesson id left in a build is recorded in its `run.json`.
- **Fix, then review again:** each build gets `--fix`: the same builder, without Ritual in every arm, fixes what its review found, and the fixed build is reviewed again (`<run>/fixed/`).
- Before the first run, `node scripts/simulate.mjs --probe` must pass: isolation, and a builder can start a site and reach it.

## Metrics

Per build, averaged per arm, with each arm's spread (lowest and highest run):

1. Package lessons that broke (of the 10 web lessons).
2. New mistakes outside the lessons.
3. Spend: build, fix, and build plus fix. Reviews are not counted: they are the same work in every arm.
4. Package lessons still broken after the fix.
5. Which lessons broke in A but not in B or C, split into the ones decided while writing and the ones only seen by running. This tells whether the close catches what the lessons at the start can't.

A difference smaller than the spread between runs of the same arm is reported as no difference.
