# Tests and checks

What applies when you check something: automated tests, validators, reviews, calibration.

### 13. A checker that never saw the error verifies nothing

`origin: field · ~opus · 2026-08`

**The idea.** A test that always passes may be broken. The only way to know is to watch it fail against the real error.

**Example.** A test that banned a word only looked for the lowercase version; with capital letters or an accent, it passed.

**Another example.** 37 duplicate records were seeded for an exercise and the count came back 92: the data already had natural matches. A check that compared the count with what was seeded, before saving, caught it.

**One more example.** A rule that detected indented code flagged a line that started with a text: the case that should pass did not have that shape. And a test that the text comparison worked passed even though the comparison was broken, because another review rejected the error first.

**Detector question.** Did I test my check against the error in the forms it would really appear? And against the correct case?

**Warning sign.** "It already passes, so it's set up right."

**What to do.** Calibrate it with two cases: one where it must find something and one where it must not, and run it for real on the day it's born. The good case matters as much as the bad one: a checker that rejects what's correct is broken too, and that is harder to notice because it looks strict. The good case includes the real forms of what's correct, including the ones you didn't write yourself: another order, another name. Each check calibrates itself: if another one catches the error first, yours was never tested. And a review that repeats what it already read can't fail (a "second run" that rereads the same file): replace it with a reconciliation that does fail if something is wrong.

### 14. The probe doesn't travel the channel it investigates

`origin: field · ~opus · 2026-08`

**The idea.** If your check goes through the same pipeline that could have caused the damage, the damage affects the check too, and it answers the same whether things are right or wrong.

**Example.** They were looking for an accent problem by sending queries with accents through the same route that was damaging them.

**Detector question.** Does the transformation I'm investigating also transform my test?

**Warning sign.** "I check it by sending another query just like it."

**What to do.** Build the test in a form the damage cannot touch.

### 15. A test that switches itself off doesn't report that it switched off

`origin: field · ~opus · 2026-08`

**The idea.** The branches that say "if I can't find the data, I skip the test" activate exactly when the world changes, and they stop watching without anyone noticing.

**Example.** A test located a table by its title and, if it didn't find it, skipped. The title changed, and the test passed for weeks without checking anything.

**Variant.** A check that falls over at the first broken file leaves every file after it unwatched. A validator that crashes, instead of reporting "this page can't be read, line 12", switches off the whole review.

**Detector question.** Does my test have a silent exit that activates with a legitimate change?

**Warning sign.** "If I can't find the anchor, I skip the test."

**What to do.** If what's missing is a tool, skipping it is honest. If what's missing is the data being watched, the test must fail. And a file that can't be read is a finding with its line, not the end of the review.

### 16. Your checker's filter usually excludes exactly what matters

`origin: field · ~opus · 2026-08`

**The idea.** Every automatic review filters for what's "relevant", and that filter can leave it blind exactly where the problem is.

**Example.** A design auditor reviewed only elements with no children. The labels that needed review had a help icon inside them, so it never saw them.

**Another example.** A test went through every page always marking the first option and running each query as it came. It always passed, and it never checked that the correct answer was accepted.

**One more example.** To decide whether someone changed a text, whitespace was ignored. That left out exactly the case of the page that explained how to lay out that text with spaces and line breaks. Normalizing is also filtering.

**Detector question.** What does my filter leave out? Write it down before you believe the result.

**Warning sign.** "It found 48 differences, I already have the list" · "the test goes through all of them."

**What to do.** Write down what the filter leaves out and check a sample of the excluded items by hand. And when you learn that a filter left you blind, look for the other similar filters you already wrote: a review that stripped all spaces from the code joined two words into one and rejected correct code, shortly after the same lesson had been learned from a different normalization.

### 17. Code that compiles is not code that runs

`origin: field · ~opus · 2026-08`

**The idea.** A syntax checker approves code that crashes when it runs. A blank screen with everything "green" is the worst possible failure.

**Example.** A page passed the syntax check and the type check. When opened it was blank: it used a variable that only exists on the server.

**Detector question.** My test: does it run the code or only read it?

**Warning sign.** "The syntax check passes, the code is fine."

**What to do.** Have at least one test that runs the full page or program.

### 18. Checking the source is not checking what gets delivered

`origin: field · ~opus · 2026-08`

**The idea.** If you check X and the user gets Y, derived from X, there's code between the two that nobody is looking at.

**Example.** They verified that each published result was correct, but a version built from it traveled to the screen, one that used a different rule for missing data.

**Another example.** A reviewer read the source file of each page and approved it. A table that stacked into cards on mobile, and could no longer be compared, only showed up when the page was looked at.

**Detector question.** Does anyone check what reaches the screen, or only what comes out of the source?

**Warning sign.** "It comes from data that's already verified" · "the file is fine."

**What to do.** Check at the point where it reaches the person: the page as it is seen, the file they download, the message they receive (see also lesson 41).

### 26. What's in production can go bad too

`origin: field · ~opus · 2026-08`

**The idea.** Quality filters usually review what's new. What's already in is left alone, and its assumptions age without anyone asking again.

**Example.** A published report kept filtering by a column the source had stopped filling. It showed zero, and since it was "already validated", nobody asked again.

**Detector question.** This thing that has been running for months, has anyone re-verified its assumptions since it was published?

**Warning sign.** "We already validated that when it was published."

**What to do.** Subject what's already in use to the same tests as the new candidate, in every review.

### 28. Whoever runs it and whoever verifies it are different people

`origin: field · ~opus · 2026-08`

**The idea.** If the same person runs it and confirms it, an execution error confirms itself.

**Example.** Whoever wrote each page also took the review screenshots, and only of the steps they thought were risky. The reviewer read the source file. The steps without a screenshot were seen by no one.

**Detector question.** Besides the person who did it, who reviewed the result as the user receives it?

**Warning sign.** "I already reviewed it myself."

**What to do.** One runs it and the other checks by reading the result. "I already did it" is the sign that it can now be verified, not the verification. And whoever verifies does not look through the same channel as whoever did it (see lesson 14): if both read only the source, neither sees the screen.

### 34. Trust the symptom in a QA finding and measure the cause

`origin: field · ~opus · 2026-08`

**The idea.** A QA report is usually right about the symptom and proposes a cause that is only a hypothesis.

**Example.** A report asked to fix a chart that added up wrong, but that chart did not exist on screen: the data traveled without anything drawing it.

**Detector question.** Can I reproduce the cause with my own measurement, or do I accept it because it sounds right?

**Warning sign.** "The report already says what the cause is."

**What to do.** Measure before and after the fix. A fix that only partly improves the symptom is not closed yet.

### 55. Green on your machine is one machine's verdict

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** A check that passed where I ran it says the work holds on that machine: its system, its speed, its clock, its time zone, its file names. Where the work will really run (another system, a server, CI, the user's computer), any of those can differ, and the same check can fail there while it still passes here.

**Example.** A summary's test passed on the developer's Windows machine and was pushed, six commits in a row. On the Linux CI runners it failed every time: the machines were fast enough to log an entry in the same millisecond as the mark the test had just written, so "after the mark" left it out. The local verdict was read every time; the other machines' verdict sat in an email until the user found it.

**Detector question.** Where will this really run, and did my check run there, or only here? If a verdict from there exists (CI, a staging server, the user's device), did I read it before saying it works?

**Warning sign.** "It works on my machine", or a push followed by the next task while CI is still running or red. Anything that depends on time, order, speed, file name case, path separators, line endings, locale or time zone.

**What to do.** Name the machines the work runs on and get a verdict from each: read CI to its end after a push (each job, not the first green), run on the server or a copy of it, or ask for the user's result. A failure on one of them is real even if it never shows here: reproduce it here by forcing the difference (a fixed date, a fast clock, a case-sensitive path) before fixing it, and fix the assumption, not the machine.

### EDU-1. If the answer comes out the same without the skill, the exercise doesn't measure it

`origin: field · ~opus · 2026-10` · `packages: education` · `seen: claude-opus-5-5 2026-10`

**The idea.** An exercise checks a skill only if someone who skips that skill gets a different result. If the starting point, an example or a shortcut already produces the right answer, the exercise passes everyone. It is lesson 13 for exercises: a check is worth something only once you have seen it reject the mistake.

**Example.** A practice asked for the largest purchase of the summer, using a date filter. The largest purchase of the whole table was also from the summer: without the filter the number was the same, and the exercise accepted it. Another practice required the code to contain an `=`; it passed with the result typed by hand, `total = 1945`. The check looked at the letter, not the skill.

**Another example.** A practice done in a spreadsheet asked learners to set the region, import a CSV and type back how many units of one product it had. The count was a whole number stored in the file: a plain text editor showed it with no import and no region set. It was replaced by units times a price with a decimal point, which only gives the expected number when the sheet reads that decimal correctly. In the same course, an exercise to sort files by their extension could be solved from the file names alone.

**Detector question.** What result does someone get who skips exactly what I teach, or who submits the exercise untouched? Is it different from the right one? Did I pick a case where both calculations happen to match (the first group, the first step, the total)?

**Warning sign.** "With the right answer it gives the number, so it works." · "They'll do the setup anyway."

**What to do.** Solve every exercise three times: untouched, with the most likely mistake, and correctly. Only the third may pass. Then run the same list of shortcuts on every exercise: the number typed by hand, the starting code with the answer added at the end, the symptom fixed by hand instead of the cause, the required word used empty, and a run with memory left over from an earlier attempt. Keep any tolerance smaller than the distance between the answer and the most likely mistake, and write three correct forms a learner would use, so the check doesn't reject what is right. When the practice happens in another tool and only a typed number comes back, ask for one that only appears after the taught step (a calculation the setup affects), not a value stored in the file, and add "the setup skipped" to the shortcuts. In a sorting exercise, keep everything equal except the feature being taught.

### EDU-4. If you can guess the right option by its place or its length, the quiz measures guessing

`origin: field · ~opus · 2026-10` · `packages: education`

**The idea.** Each question can be fine on its own and the set still give the answer away: the right option is always second, always the longest, or always the middle-sized one. Learners notice patterns faster than authors do.

**Example.** In one module's closing quiz the right answer was the second option in six of seven questions. Across a course, the right option was the longest in 55 % of questions, when chance with three options is one in three. After the length was balanced by hand, the right option ended up as the shortest in six of seven questions of one lesson, and as the middle one in every question of three lessons in a row.

**Detector question.** If I read only the position and the length of the options, without the text, do I guess the right one more than once in three?

**Warning sign.** "I checked each question, they're all correct."

**What to do.** Shuffle the options when they are shown, with an order that doesn't come from where the right one was written. Measure longest, shortest and middle per file, and pool small files per module, so a few questions don't hide the pattern. Read the count against what you asked for: a balancing pass can move the giveaway instead of removing it.
