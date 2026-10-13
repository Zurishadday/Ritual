# Numbers and data

What applies when you calculate, measure, or display a number: dashboards, reports, models, metrics.

### 1. "I couldn't read it" is not "there's nothing"

`origin: field · ~opus · 2026-08` · `groups: tests-and-checks`

**The idea.** Every data point has three states: I have it, there really was nothing, and I don't know. The last two get drawn the same way on a chart, as a zero, and they mean the opposite.

**Example.** A query fails because of an expired permission, and the dashboard shows "0 sales" for the region. Nobody questions it: a zero looks like data.

**Detector question.** Could the number I'm about to show, or the "everything's fine" I'm about to believe, come from a query that failed, an empty table, a denied permission, or an output I didn't read in full (see lesson 44)?

**Warning sign.** "If it fails, I'll just set it to zero and move on."

**What to do.** If the read fails, show the error on the card itself, not a gap or a zero. And a counter that says "0 problems" is only trustworthy if it first found a problem you planted on purpose.

### 2. Two things with the same name are not the same thing

`origin: field · ~opus · 2026-08`

**The idea.** "Active customer," "date," "the boss," "the threshold": the same word often hides two definitions. When two reports don't match, it's almost always this.

**Example.** "Date" can be the event date, the load date, or the partition date. Or "the boss": the person's current boss, or the boss they had when the thing you're measuring happened.

**Another example.** One campaign table had the spend for the whole company, but the revenue came from a sample of one purchase in every hundred. Both columns were labeled "pesos," and the return came out negative for every campaign.

**Detector question.** Is there a rule that's true for one of the two things and false for the other? And if I combine two figures in one calculation, do they come from the same universe, the same scale, and the same period?

**Warning sign.** "It's the same date" · "the view already filters it" · "they're both in pesos."

**What to do.** Give each variant a different name in the code and on the screen, even if it's ugly. And before dividing or subtracting two figures from different sources, write down where each one comes from: if a result comes out the same in every case (they all lose, they all win), suspect the scale before the business.

### 3. The current period is always incomplete

`origin: field · ~opus · 2026-08`

**The idea.** A month that hasn't finished always looks worse than a closed one. It's not a trend: it's the calendar.

**Example.** The sales curve "drops" at the last point, which is the month that's only halfway done.

**Detector question.** Does this calculation include a period that hasn't ended yet?

**Warning sign.** "You can already see the trend."

**What to do.** Cut the indicators at the last closed period, or mark the partial period on screen. And keep the two clocks apart: group-level numbers use closed months; named individuals use the current day.

### 4. A field the source overwrites is not history

`origin: field · ~opus · 2026-08`

**The idea.** Many systems store only today's value. If you build a "historical" variable on top of that field, you're measuring the present and dressing it up as the past.

**Example.** The system stores only each person's latest boss. For people who have left, that boss is frozen in place, so "turnover of each boss's team" ends up measuring "this team no longer exists."

**Detector question.** Does this field keep its previous value when it changes, or does it replace it?

**Warning sign.** "The column's right there, I'll just use it."

**What to do.** Ask the source whether the data is a snapshot or a history before using it to look backward.

### 5. A perfect result is a warning, not a win

`origin: field · ~opus · 2026-08`

**The idea.** If a single variable separates the people who left from the people who stayed with almost no errors, it most likely has the outcome itself hidden inside it.

**Example.** A model suddenly gets much better. It turns out one variable is 1 for everyone who left and 0 for everyone who stayed, because the source fills it in differently for each group. Another variant: the model learns in which year something happened, not who it happened to.

**Detector question.** Could my quality measure be going up because the model is guessing when something happened instead of who it happened to?

**Warning sign.** "It came out almost perfect!" · "let's just adjust for year and move on."

**What to do.** Test forward: train on the past and evaluate on a later period. And before adjusting for something, ask whether that something is what decides the result you want to predict.

### 12. Running the query doesn't prove the number is right

`origin: field · ~opus · 2026-08` · `groups: tests-and-checks`

**The idea.** "It didn't error" is not "it's correct." Compare against something independent of your own calculation.

**Example.** A multiple-choice question claimed that comparing a number with a quoted text string throws an error. In some other engines it does; in the one people actually used, the query ran and returned rows.

**Another example.** One text correctly explained that a named block only lives inside its own query, but its own example assumed three separate queries shared it. When run, the second query threw an error: the table didn't exist.

**One more example.** Every example on one page was run, and three sentences still turned out false: the explanation of an option, written at the end, described what a line does that nobody had run; a rule for reading errors ("if it says this, then that's missing") was contradicted by another step on the same page; and the introduction said a function "returns a result" when it doesn't.

**Detector question.** What outside my own code am I going to check this result against? And for anything the text says the system does, whether in an example, a rule, or the explanation of an option, did I run it on the real engine?

**Warning sign.** "It runs on my machine" · "it didn't error" · "that's how it works, I just explained it."

**What to do.** Reconcile against a known figure, the source system, or the previous period. Test in the real environment: with its permissions, its libraries, and the copy of the code that actually runs. Every claim about how the system behaves gets run once before you write it down, including the one that shows up in passing in an example or gets written last. If the claim is a general rule ("only," "always," "never"), find the case that would break it and run that too: "converting to an integer only reads integers" was checked with a text string that had decimals, and it turned out false for a number with decimals. When you state a fraction ("five in six"), name the whole it's a fraction of; and a made-up scenario gets checked too: the size, the difference, and the p-value have to be consistent with each other.

### 36. Measure before you write

`origin: field · ~opus · 2026-08` · `groups: writing-and-docs`

**The idea.** Every figure in a document comes from a measurement with a date and a source, not from memory or from an earlier version of the document.

**Example.** An explanation said a bug made you lose "almost one in five" tickets. When measured, it was more than one in five: the sentence came from mental math, not from the data.

**Another example.** One text said a group of cohorts "was above 50 %"; five of the twelve were below. In another, the illustration showed a hand-done calculation that didn't add up: the percentage times the total didn't give the number drawn.

**Detector question.** What data and what date did this number, or this comparison ("more than a thousand," "over half," "almost all"), come from?

**Warning sign.** "It's the figure we already had" · "it comes out about that" · "you can see they all pass."

**What to do.** Before writing a figure, measure it again and note next to it what data and what date it came from. Quantity words ("almost," "more than," "most") are numbers in disguise: measure them the same way. And if an image has calculations in it, have the same script that draws it do the math.

### 50. If two explanations predict the same thing, your example doesn't choose between them

`origin: field · ~opus · 2026-10` · `groups: writing-and-docs, tests-and-checks`

**The idea.** An example confirms your explanation only if the rival explanation would give a different result. If both predict the same, the example lets you believe whichever came to mind first.

**Example.** A lesson compared raising a funnel's first step by five points against raising its last step. The first won, and the text said: "they're worth more where there are more visits". But the first step was also the one that converted least, and that was the cause; in a funnel where the first step converts better, the last one wins despite having fewer visits. In another project, a page was blamed for loading in 2.7 s; a test that requested pages one by one passed even without the fix, because the real cause was forty requests at once.

**Detector question.** What other explanation would give this same result? Does my example rule it out?

**Warning sign.** "The numbers confirm it."

**What to do.** Before teaching or reporting why something happens, write the rival explanation and build a case where the two predict differently. Compare parts of the same size, try another example size, and measure a general claim on simulated data before writing it. If you can't separate them, say that the example is compatible with both.
