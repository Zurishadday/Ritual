# A/B on the clinic task: results

As [PLAN.md](PLAN.md) set it up, before any run: a new task, three arms, four builds each, interleaved, every review blind, every build fixed and reviewed again. `claude-sonnet-5-5` built and fixed, `claude-opus-5-5` reviewed, Claude Code 2.1.296, 2026-10-15 and 16. No build left a mention of Ritual or a lesson id for the reviewer to see. Two reviews could not check three lessons each (32, 41 and WEB-4 in [A3](runs/2026-10-sonnet-5-5-3), and in the fixed build of [B1](runs/2026-10-sonnet-5-5-ritual-1/fixed)); they count as not broken.

- **A**, without Ritual: [1](runs/2026-10-sonnet-5-5-1), [2](runs/2026-10-sonnet-5-5-2), [3](runs/2026-10-sonnet-5-5-3), [4](runs/2026-10-sonnet-5-5-4)
- **B**, with Ritual, lessons at the start and the close: [1](runs/2026-10-sonnet-5-5-ritual-1), [2](runs/2026-10-sonnet-5-5-ritual-2), [3](runs/2026-10-sonnet-5-5-ritual-3), [4](runs/2026-10-sonnet-5-5-ritual-4)
- **C**, with Ritual, lessons at the start only: [1](runs/2026-10-sonnet-5-5-ritual-start-1), [2](runs/2026-10-sonnet-5-5-ritual-start-2), [3](runs/2026-10-sonnet-5-5-ritual-start-3), [4](runs/2026-10-sonnet-5-5-ritual-start-4)

## The metrics

Average per build, with the lowest and highest run.

| | A, without | B, start + close | C, start only |
|---|---|---|---|
| 1. Package lessons that broke (of 10) | 7.25 (5–9) | 4.5 (2–7) | 3.5 (2–5) |
| 2. New mistakes | 5.0 (2–8) | 4.25 (3–5) | 5.25 (4–7) |
| 3. Build | $0.33 (0.29–0.40) | $1.02 (0.83–1.34) | $0.61 (0.54–0.69) |
| 3. Fix | $0.55 (0.40–0.67) | $0.60 (0.34–0.94) | $0.55 (0.31–0.84) |
| 3. Build + fix | $0.88 (0.71–0.99) | $1.62 (1.41–1.93) | $1.15 (1.00–1.49) |
| 4. Lessons still broken after the fix | 4.5 (2–6) | 2.5 (1–4) | 4.25 (3–5) |

By the rule set in advance, a difference smaller than the spread between runs of an arm is no difference:

- **Lessons that broke:** neither B nor C beats A on the total. A alone went from 5 to 9.
- **New mistakes:** no difference.
- **Spend:** B costs more than A, about $0.74 more per build plus fix, past both arms' spread. C against A: no difference.
- **After the fix:** no difference.

## 5. Which lessons, and when they can be stopped

Builds, of four, where each lesson broke:

| Lesson | A | B | C |
|---|---|---|---|
| **Decided while writing** | | | |
| 45 · Someone walks the error path too | 4 | 1 | 0 |
| WEB-1 · A damaged store must not take the next record down with it | 4 | 4 | 1 |
| WEB-4 · If you disable the button, focus goes with it | 3 | 0 | 0 |
| WEB-5 · A password login without an attempt limit… | 0 | 0 | 0 |
| **Only seen by running** | | | |
| 41 · Check in the format the reader actually sees | 3 | 3 | 4 |
| 46 · What runs on every request can't grow with the content | 2 | 3 | 2 |
| 49 · A general rule must not silently beat the specific ones | 3 | 2 | 2 |
| WEB-2 · A public form gets bots from day one | 4 | 4 | 4 |
| **Not split in advance** | | | |
| 32 · Something that works but can't be seen gets reported as broken | 2 | 0 | 1 |
| WEB-3 · A fallback nobody tested is not a fallback | 4 | 1 | 0 |

The split into the two kinds was written down before these runs, from the first A/B.

- **What the lessons at the start stop:** the mistakes decided while writing went from 11 of 16 in A to 5 in B and 1 in C, and with 32 and WEB-3 from 17 of 24 to 6 and 2.
- **What nothing stopped:** the mistakes only seen by running broke 12 of 16 times in every arm. The close ran in every B build, and its builders report the web check's phone and desktop screenshots. But that check covers the public form, and what kept breaking was elsewhere:
  - the owner's page with thousands of requests: seconds per click (46);
  - no way to clear a wave of bot requests (WEB-2);
  - a long name off the screen at 375 px, on the owner's page (41);
  - in B, a site-wide security header that blocked the error page's own "go back" link (41, 49).
- **WEB-1 broke in all four B builds and in one C build:** we have no explanation from these runs.

## Ritual without a review, against a review without Ritual

C is what Ritual does by default since these runs: the close is off unless a project turns it on. A C build, with no review at all, ended with 3.5 package lessons broken on average (2–5). An A build, after its review and its fix, ended with 4.5 (2–6). C cost $0.61 per build; A cost $0.33 to build, $1.76 for its review and $0.55 for its fix: $2.64.

## What else they show

- **A fix round doesn't finish the job.** After one fix, every arm still had 2 to 5 lessons broken. Lessons the build had held broke after its fix: 6 times in A (2 of them unchecked in A3's first review), 4 in B and 9 in C.
- **The close is the expensive part.** B and C build alike until the close, which costs about $0.41 per build. In these runs it bought no fewer mistakes: B 4.5, C 3.5.

## What it does not say

It is one task, four builds per arm and one model. The reviewer is a model too: a lesson can be judged broken in one review and held in the next for the same code, which is part of the spread. The costs are Claude Code's own estimates on a subscription, not an invoice.
