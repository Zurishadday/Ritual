# Tests and checks

What applies when you check something: automated tests, validators, reviews, calibration.

### 13. A checker that never saw the error verifies nothing

`origin: field`

**The idea.** A test that always passes may be broken. The only way to know is to watch it fail against the real error.

**Example.** A test that banned a word only looked for the lowercase version; with capital letters or an accent, it passed.

**Another example.** 37 duplicate records were seeded for an exercise and the count came back 92: the data already had natural matches. A check that compared the count with what was seeded, before saving, caught it.

**One more example.** A rule that detected indented code flagged a line that started with a text: the case that should pass did not have that shape. And a test that the text comparison worked passed even though the comparison was broken, because another review rejected the error first.

**Detector question.** Did I test my check against the error in the forms it would really appear? And against the correct case?

**Warning sign.** "It already passes, so it's set up right."

**What to do.** Calibrate it with two cases: one where it must find something and one where it must not, and run it for real on the day it's born. The good case matters as much as the bad one: a checker that rejects what's correct is broken too, and that is harder to notice because it looks strict. The good case includes the real forms of what's correct, including the ones you didn't write yourself: another order, another name. Each check calibrates itself: if another one catches the error first, yours was never tested. And a review that repeats what it already read can't fail (a "second run" that rereads the same file): replace it with a reconciliation that does fail if something is wrong.

### 14. The probe doesn't travel the channel it investigates

`origin: field`

**The idea.** If your check goes through the same pipeline that could have caused the damage, the damage affects the check too, and it answers the same whether things are right or wrong.

**Example.** They were looking for an accent problem by sending queries with accents through the same route that was damaging them.

**Detector question.** Does the transformation I'm investigating also transform my test?

**Warning sign.** "I check it by sending another query just like it."

**What to do.** Build the test in a form the damage cannot touch.

### 15. A test that switches itself off doesn't report that it switched off

`origin: field`

**The idea.** The branches that say "if I can't find the data, I skip the test" activate exactly when the world changes, and they stop watching without anyone noticing.

**Example.** A test located a table by its title and, if it didn't find it, skipped. The title changed, and the test passed for weeks without checking anything.

**Variant.** A check that falls over at the first broken file leaves every file after it unwatched. A validator that crashes, instead of reporting "this page can't be read, line 12", switches off the whole review.

**Detector question.** Does my test have a silent exit that activates with a legitimate change?

**Warning sign.** "If I can't find the anchor, I skip the test."

**What to do.** If what's missing is a tool, skipping it is honest. If what's missing is the data being watched, the test must fail. And a file that can't be read is a finding with its line, not the end of the review.

### 16. Your checker's filter usually excludes exactly what matters

`origin: field`

**The idea.** Every automatic review filters for what's "relevant", and that filter can leave it blind exactly where the problem is.

**Example.** A design auditor reviewed only elements with no children. The labels that needed review had a help icon inside them, so it never saw them.

**Another example.** A test went through every page always marking the first option and running each query as it came. It always passed, and it never checked that the correct answer was accepted.

**One more example.** To decide whether someone changed a text, whitespace was ignored. That left out exactly the case of the page that explained how to lay out that text with spaces and line breaks. Normalizing is also filtering.

**Detector question.** What does my filter leave out? Write it down before you believe the result.

**Warning sign.** "It found 48 differences, I already have the list" · "the test goes through all of them."

**What to do.** Write down what the filter leaves out and check a sample of the excluded items by hand. And when you learn that a filter left you blind, look for the other similar filters you already wrote: a review that stripped all spaces from the code joined two words into one and rejected correct code, shortly after the same lesson had been learned from a different normalization.

### 17. Code that compiles is not code that runs

`origin: field`

**The idea.** A syntax checker approves code that crashes when it runs. A blank screen with everything "green" is the worst possible failure.

**Example.** A page passed the syntax check and the type check. When opened it was blank: it used a variable that only exists on the server.

**Detector question.** My test: does it run the code or only read it?

**Warning sign.** "The syntax check passes, the code is fine."

**What to do.** Have at least one test that runs the full page or program.

### 18. Checking the source is not checking what gets delivered

`origin: field`

**The idea.** If you check X and the user gets Y, derived from X, there's code between the two that nobody is looking at.

**Example.** They verified that each published result was correct, but a version built from it traveled to the screen, one that used a different rule for missing data.

**Another example.** A reviewer read the source file of each page and approved it. A table that stacked into cards on mobile, and could no longer be compared, only showed up when the page was looked at.

**Detector question.** Does anyone check what reaches the screen, or only what comes out of the source?

**Warning sign.** "It comes from data that's already verified" · "the file is fine."

**What to do.** Check at the point where it reaches the person: the page as it is seen, the file they download, the message they receive (see also lesson 41).

### 26. What's in production can go bad too

`origin: field`

**The idea.** Quality filters usually review what's new. What's already in is left alone, and its assumptions age without anyone asking again.

**Example.** A published report kept filtering by a column the source had stopped filling. It showed zero, and since it was "already validated", nobody asked again.

**Detector question.** This thing that has been running for months, has anyone re-verified its assumptions since it was published?

**Warning sign.** "We already validated that when it was published."

**What to do.** Subject what's already in use to the same tests as the new candidate, in every review.

### 28. Whoever runs it and whoever verifies it are different people

`origin: field`

**The idea.** If the same person runs it and confirms it, an execution error confirms itself.

**Example.** Whoever wrote each page also took the review screenshots, and only of the steps they thought were risky. The reviewer read the source file. The steps without a screenshot were seen by no one.

**Detector question.** Besides the person who did it, who reviewed the result as the user receives it?

**Warning sign.** "I already reviewed it myself."

**What to do.** One runs it and the other checks by reading the result. "I already did it" is the sign that it can now be verified, not the verification. And whoever verifies does not look through the same channel as whoever did it (see lesson 14): if both read only the source, neither sees the screen.

### 34. Trust the symptom in a QA finding and measure the cause

`origin: field`

**The idea.** A QA report is usually right about the symptom and proposes a cause that is only a hypothesis.

**Example.** A report asked to fix a chart that added up wrong, but that chart did not exist on screen: the data traveled without anything drawing it.

**Detector question.** Can I reproduce the cause with my own measurement, or do I accept it because it sounds right?

**Warning sign.** "The report already says what the cause is."

**What to do.** Measure before and after the fix. A fix that only partly improves the symptom is not closed yet.
