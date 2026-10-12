## What this changes

<!-- One or two sentences. -->

## If it adds or changes a lesson

- [ ] Five parts, anonymous example, in the group of what was being done.
- [ ] Data line with the model and month it happened with: `origin: field · claude-opus-5-5 · 2026-10` (`~model` if from memory, `unknown` if nobody knows).
- [ ] It happened with Claude. If it only happened with another model, say which: it will be checked with Claude first ([how](https://github.com/Zurishadday/Ritual/blob/main/simulations/README.md#checking-a-contributed-lesson)).
- [ ] Translations: none needed. If you translated one, run `node scripts/lessons.mjs --stamp <language> --by @your-user`.

## Checks

- [ ] `npm test` passes.
- [ ] A new guard rule, checker or hook was seen failing against the real mistake before it passed.
