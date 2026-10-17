# Tests and checks (this repository's lessons)

### P-7. Green on your machine is one machine's verdict

`origin: field · claude-opus-5-5 · 2026-10`

Merged into 55.

**The idea.** A check that passed where I ran it says the work holds on that machine: its system, its speed, its clock, its time zone, its file names. Where the work will really run (another system, a server, CI, the user's computer), any of those can differ, and the same check can fail there while it still passes here.

**Example.** A summary's test passed on the developer's Windows machine and was pushed, six commits in a row. On the Linux CI runners it failed every time: the machines were fast enough to log an entry in the same millisecond as the mark the test had just written, so "after the mark" left it out. The local verdict was read every time; the other machines' verdict sat in an email until the user found it.

**Detector question.** Where will this really run, and did my check run there, or only here? If a verdict from there exists (CI, a staging server, the user's device), did I read it before saying it works?

**Warning sign.** "It works on my machine", or a push followed by the next task while CI is still running or red. Anything that depends on time, order, speed, file name case, path separators, line endings, locale or time zone.

**What to do.** Name the machines the work runs on and get a verdict from each: read CI to its end after a push (each job, not the first green), run on the server or a copy of it, or ask for the user's result. A failure on one of them is real even if it never shows here: reproduce it here by forcing the difference (a fixed date, a fast clock, a case-sensitive path) before fixing it, and fix the assumption, not the machine.
