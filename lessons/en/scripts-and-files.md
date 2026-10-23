# Scripts and files

What applies when a program writes, generates, transforms, or moves files and data.

### 6. The business definition lives in one place

`origin: field · ~opus · 2026-08`

**The idea.** If the rule for "what counts as active" is repeated in every query, the copies will drift apart. It's not a question of if, but when.

**Example.** A validator had the count of reference items typed in by hand as 43. When the document grew to 47, it rejected the four new ones as nonexistent. Now it counts the items in the document itself.

**Detector question.** If I change this definition, how many files do I have to touch? If it's more than one, the rule isn't set up in one place.

**Warning sign.** "I'll put it here too, it's just one line" · "that number won't change".

**What to do.** Put the definition in one spot that every query goes through, and have all of them read from there. A hand-typed number that copies a value from somewhere else is also a repeated definition.

**Not to be confused with.** Repeating an explanation on purpose, in learning material, is not copying a definition. What you shouldn't copy is the rule that computes the value.

### 7. Read what was published, not the intent

`origin: field · ~opus · 2026-08`

**The idea.** A process declares what it plans to do, but publishes what it actually did, and the two don't always match. Whoever consumes the output should read the result.

**Example.** A screen builds its controls from the list of variables the model was *going* to use. Training dropped one of them, and for days there was a control that did nothing.

**Detector question.** Is this built from a process's configuration or from its published result?

**Warning sign.** "The declared list and the model are the same thing."

**What to do.** Derive it from the published result. And whatever can't be derived should fail loudly instead of quietly disappearing.

### 20. Idempotent is not the same as updatable

`origin: field · ~opus · 2026-08`

**The idea.** "Insert if it doesn't exist" prevents duplicates, but it freezes things: what's already there is never written again.

**Example.** A legend with the ranges for a classification was inserted once. The ranges changed, and the legend kept showing the old ones.

**Detector question.** If I change what this code injects, will the next run update it?

**Warning sign.** "It's already in there, I'm not touching it again."

**What to do.** Replace it: remove the old one, inject it again, and check that only one copy is left.

### 21. Your marker must be your own

`origin: field · ~opus · 2026-08` · `seen: ~opus 2026-10`

**The idea.** If you locate your change by searching for text the user reads, like a title or a label, another improvement will stick something on top of it, and your change will stop finding it.

**Example.** A help icon was added next to several titles, and the updates that located themselves by those titles stopped working.

**Another example.** A review searched for the text "int(" to check whether someone converted a number, and it matched inside "print(": any line that printed something seemed to pass. What you search for has to be a whole word, not a piece of another one.

**One more example.** A review took the last line the code printed as its answer. With a function that prints the number inside and doesn't return it, that line existed for another reason: the answer showed up on screen, even though the code never delivered it.

**Detector question.** Can the text I use as an anchor exist for another reason, or can something grow inside it?

**Warning sign.** "I'll anchor on the title, it's unique."

**What to do.** Use markers of your own, like an ID or a section comment. And when a change touches many blocks at once, check all of them, not just the first one.

### 22. The second run is the one that finds the bug

`origin: field · ~opus · 2026-08` · `groups: console-and-tools`

**The idea.** A change that repeats without breaking anything has to be checked by running it twice, not once.

**Example.** To check that a script changed nothing on its second run, the checksum of the same run was compared twice, and then two checksums taken from different file lists. Both comparisons said "same" or "different" without proving anything. The comparison that works takes the checksum, runs the script, and takes the checksum again, from the same files and in a single command.

**Detector question.** Did I run my change on something that already had it applied? What other process touches this same text after me?

**Warning sign.** "It ran fine, so it's done."

**What to do.** Run it twice from the same starting point and compare the files: the second run must not change anything.

### 23. Position-based addresses expire

`origin: field · ~opus · 2026-08` · `groups: interface-and-design`

**The idea.** If you insert something before "cell 9," cell 9 is now a different cell.

**Example.** A script inserted a title cell before cell 9 of a notebook, then edited "cell 9": it edited the cell it had just inserted.

**Detector question.** Does this tool locate things by position, and did I just insert or delete something before it?

**Warning sign.** "Cell 9 is the one I just looked at."

**What to do.** Locate the spot again after every insertion, and check the result by reviewing the full structure.

### 24. Write with a safety net

`origin: field · ~opus · 2026-08`

**The idea.** Opening a file for writing empties it instantly. If something fails midway through writing, you're left with an empty file.

**Example.** A script opened the config file to rewrite it, failed while calculating one of the values, and left the file empty. The server never started again.

**Detector question.** Can something fail between opening the file and finishing the write?

**Warning sign.** "It's a simple replacement, I'll just write it directly."

**What to do.** Prepare everything in memory, write to a temporary file, and at the end replace the original in a single step.

### 25. A setting is not a status, and an alert is not a guarantee

`origin: field · ~opus · 2026-08`

**The idea.** "The scheduled task is enabled" doesn't mean "it ran this month." And waiting for something to alert you when it fails means trusting that the alert never fails.

**Example.** A scheduled task showed as "active" but had not run for two months because of an expired credential. The dashboard showed the last data point as if it were from today.

**Detector question.** Am I counting on something to "fire on its own"?

**Warning sign.** "It's scheduled, so it's running."

**What to do.** Show on screen when the data was last updated. Check which periods are missing. And make processes safe to re-run without duplicating rows.

### 48. If a file comes from a generator, the fix goes in the generator

`origin: field · ~sonnet · 2026-09`

**The idea.** When a file is assembled by a script or from other pieces, the file is an output, not the original. Anything fixed directly in it gets lost the next time it's generated, with no warning.

**Example.** A note was assembled from the sections each person handed in. Three rows were fixed directly in the note, and when it was rebuilt from the submissions, the three old rows came back. In another piece, a reviewer hand-fixed the alt text of a page that came from a template; its author regenerated the page, and the fix disappeared.

**Detector question.** Is this file written by something else (a script, a template, a parts assembly)? If I regenerate it, is my change still there?

**Warning sign.** "I fixed it directly in the file" · "I just regenerated it".

**What to do.** Before fixing a file, find out where it comes from. Fix the source (the template, the script, the submission) and regenerate; if you have to fix the output, fix the source too in the same step. Whoever reviews generated output says what changed so it gets moved into the source. And before rebuilding a file from its sources, compare it with what's going to come out: anything that differs is a fix that would be lost.

### WEB-1. A damaged store must not take the next record down with it

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web`

**The idea.** However a site saves its records, one damaged write can take what comes after it down too. With records appended as lines, a line cut short glues the next record onto it, and a reader that skips "damaged lines" drops both, silently. With all records in one file that is read, changed and written back whole, once that file can't be read every new record fails, and only a console nobody watches says so. It is the other side of lesson 24: there the file gets emptied; here, whatever comes after is lost.

**Example.** In both runs of the first Web simulation, the form saved each message as a JSON line, and the admin panel skipped any it couldn't read. With a line cut off at the end of the file, the next message got the reply "Thanks!", was saved, and never showed up in the admin panel. One of the two versions had a comment that said "damaged line: skipped".

**Another example.** In both runs of the rerun, every message lived in one JSON file, written to a temporary file and then renamed, so a crash mid-write no longer hurt. But with the file damaged any other way (a hand edit, a full disk, a bad restore), every new visitor got "Internal error", the admin page showed nothing, and the only signal was a stack trace in the server console.

**Detector question.** If the store is damaged tomorrow, what happens to the next visitor's record, and who finds out?

**Warning sign.** "Damaged lines get skipped" · "it's just appending to the end" · "the write is atomic, so the file can't break".

**What to do.** Keep a new record from depending on old ones: append to a file that ends in a line break (start the record with one if it doesn't), or save each record in its own file, rather than rewriting one file that holds them all. When reading, count what couldn't be read and show that count where the owner will see it. Test it by damaging the store by hand (cut the last line short, truncate the file), then sending a record.
