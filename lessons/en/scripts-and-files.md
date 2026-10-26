# Scripts and files

What applies when a program writes, generates, transforms, or moves files and data.

### 6. The business definition lives in one place

`origin: field · ~opus · 2026-08` · `groups: tests-and-checks` · `seen: claude-opus-5-5 2026-10`

**The idea.** If the rule for "what counts as active" is repeated in every query, the copies will drift apart. It's not a question of if, but when.

**Example.** A validator had the count of reference items typed in by hand as 43. When the document grew to 47, it rejected the four new ones as nonexistent. Now it counts the items in the document itself.

**Another example.** A practice simulator of customer conversations secretly made one in three customers "not a fit", with a list of reasons written in its code; an evaluator then graded the person practicing against the sales manual. One reason in the code was not in the manual's rule. The simulated customer refused to buy for it, and the evaluator blamed the person for not ruling the customer out. The verdict measured the gap between two copies of the rule, and the person concluded the simulator was built so nobody could sell.

**Detector question.** If I change this definition, how many files do I have to touch? If it's more than one, the rule isn't set up in one place. Do the code that builds a case and the code that judges it read the rule from the same place?

**Warning sign.** "I'll put it here too, it's just one line" · "that number won't change" · "this list is only for generating cases".

**What to do.** Put the definition in one spot that every query goes through, and have all of them read from there. A hand-typed number that copies a value from somewhere else is also a repeated definition. A generator of cases and its judge read the same rules file, and a test fails if the generator produces a condition that file doesn't know. Before blaming whoever was judged, check the case against the official rule.

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

**Another example.** A review searched for the text "int(" to check whether someone converted a number, and it matched inside "print(": any line that printed something seemed to pass. A count of keyboard shortcuts searched for "Ctrl+" followed by a letter, ignoring case, and counted Ctrl+Shift+V as "Ctrl+S": the S was the first letter of "Shift". What you search for has to be a whole word, not a piece of another one.

**One more example.** A review took the last line the code printed as its answer. With a function that prints the number inside and doesn't return it, that line existed for another reason: the answer showed up on screen, even though the code never delivered it.

**Detector question.** Can the text I use as an anchor exist for another reason, or can something grow inside it?

**Warning sign.** "I'll anchor on the title, it's unique."

**What to do.** Use markers of your own, like an ID or a section comment. And when a change touches many blocks at once, check all of them, not just the first one. A count that comes from a search is checked in its matches, not only in its total: open three of the matches.

### 22. The second run is the one that finds the bug

`origin: field · ~opus · 2026-08` · `groups: console-and-tools`

**The idea.** A change that repeats without breaking anything has to be checked by running it twice, not once.

**Example.** To check that a script changed nothing on its second run, the checksum of the same run was compared twice, and then two checksums taken from different file lists. Both comparisons said "same" or "different" without proving anything. The comparison that works takes the checksum, runs the script, and takes the checksum again, from the same files and in a single command.

**Another example.** A double-click launcher started two local servers on fixed ports and opened the browser. It was tested once, with everything closed, and it worked. It was run again to get a new version while the old one was still running: both new servers failed with "port already in use", and the browser stayed on the old version with nothing saying so (see lesson 27). Here the second run collided with processes and ports, not with files.

**Detector question.** Did I run my change on something that already had it applied? What other process touches this same text after me? What happens if I start it again while the first run is still alive?

**Warning sign.** "It ran fine, so it's done."

**What to do.** Run it twice from the same starting point and compare the files: the second run must not change anything. Test a launcher by starting it again without closing the previous run. Before it starts anything, the launcher stops only its own processes (found by their process name or their window title, never by "whatever is on the port"), and warns if another program holds the port.

### 23. Position-based addresses expire

`origin: field · ~opus · 2026-08` · `groups: interface-and-design`

**The idea.** If you insert something before "cell 9," cell 9 is now a different cell.

**Example.** A script inserted a title cell before cell 9 of a notebook, then edited "cell 9": it edited the cell it had just inserted.

**Another example.** A mark that points at something drawn (a box, an arrow, a highlight) is a position-based address too. A video built with code redrew a code cell with a new, wider design. The box around the result had `x = 150` typed by hand, from the old cell, and ended up across two columns of the result table. Whoever watched the full video saw it; the reviewer of still frames had passed it.

**Detector question.** Does this tool locate things by position, and did I just insert or delete something before it? Does a mark come from what it marks, or from coordinates typed by hand?

**Warning sign.** "Cell 9 is the one I just looked at." · "Only the style changed, the marks are the same."

**What to do.** Locate the spot again after every insertion, and check the result by reviewing the full structure. Have one function return the box of each drawn thing, and ask that function for every mark. After a redraw, search the code for loose position numbers.

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

### 56. An incremental update is not a rebuild: read what it drops

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** An update that processes only what changed does not give the same result as a full rebuild. When it replaces everything that came from a re-read file, it also removes what other files contributed to the same entries. Before accepting that something disappears, list what is lost and where it came from.

**Example.** A knowledge graph of a repository was updated with only the changed files. A guard against shrinking stopped it twice. First, nodes that only shared a label were merged into one (see lesson 2). Then, replacing the nodes of a re-read file also removed the nodes other files pointed to: ten entries that should have shown their own titles showed the generic label of an old node instead.

**Detector question.** What was there before and is gone now, and which file did each lost thing come from?

**Warning sign.** "It's the same run, only with the new files."

**What to do.** Compare before and after by identifier and save the list of what was lost with its source file. Force the write only if each loss is explained by a change in its own source file, and put the fix in the script that merges, not in the output. A full rebuild gets the same comparison (see lesson 48).

### 61. A helper that guesses intent from the shape of its arguments

`origin: field · claude-opus-5-5 · 2026-10` · `groups: interface-and-design`

**The idea.** A function that decides what to do based on whether an argument was passed (with a body it is POST, without one GET; with an id it updates, without one it inserts) turns an omission into a different operation, with no error.

**Example.** A front-end helper for calling the server sent POST when it got data and GET when it did not. A new endpoint was POST but needed no data; it was called without any, went out as GET, and the server answered "method not allowed". The screen only showed a short error line, and it was noticed only when testing in the browser.

**Detector question.** Does this function switch operation on an optional argument? If I leave it out because I don't need it, does it silently do something else?

**Warning sign.** "This one takes no data, I'll call it with nothing".

**What to do.** Make the operation explicit (`api.post(path)`, `save(x, create=True)`), or make the default the safe case. While the ambiguous helper exists, review every call that omits that argument.

### 63. Before bulk-cleaning something nobody has saved, save it as it is

`origin: field · claude-opus-5-5 · 2026-10` · `groups: git-and-process`

**The idea.** Freshly generated files (data, reports, an agent's output) are often not under version control yet. If the next step rewrites them in bulk (dedupe, relabel, drop lines) and removes too much, there is no way back to the original. Lesson 24 protects a write that fails midway; this one protects against a cleanup that works and is wrong.

**Example.** Seven agents wrote 3,780 training sentences into new files. The next step was to clean them: drop the ones too similar to the test set and the duplicates across files. The files were not in git yet. Before the rewrite ran, the permission system blocked it as irreversible, and it was right. The 3,780 were committed first, and the cleanup (73 lines removed, 1 relabeled) went into its own commit that can be reviewed and reverted.

**Detector question.** Is what I'm about to rewrite saved anywhere in its current state? If my cleanup removes too much, where do I get it back from?

**Warning sign.** "They're new files, I'll just clean them in one go."

**What to do.** First a commit (or a copy) of the original state. Then the cleanup in its own commit, with a count of what was removed and why (see lesson 56), so the change can be reviewed line by line and undone.

### 66. A new script inherits the setup the project already uses

`origin: field · claude-opus-5-5 · 2026-10` · `groups: console-and-tools`

**The idea.** If the project already loads a library in another script with special setup (native library paths, environment variables, device, model version), a new script that uses it needs that same setup. Writing it from scratch repeats a problem the project already solved.

**Example.** A throwaway script to transcribe on the GPU failed with a missing CUDA DLL. The project's dataset script already solved that by adding the deep-learning framework's library folder to the DLL search path before importing the speech library; the new script did not copy it.

**Detector question.** Is this library already loaded in another script of the project? What does that script do right before importing or creating it?

**Warning sign.** "It's a five-line script, I don't need to see how the other one does it".

**What to do.** Before writing a script that uses a project library, search where it is already loaded and copy its setup, or better, import the project's loader, so the setup lives in one place (lesson 6). If a loading error appears, look for it in the project's code before researching outside.

### 67. A value tuned on one sample does not fit every sample

`origin: field · claude-opus-5-5 · 2026-10` · `groups: numbers-and-data`

**The idea.** A setting chosen by trying it on one sample (a threshold, a cut, a gain) is fitted to that sample. When a louder, longer or rarer one comes in, the same number no longer gives the result that was approved.

**Example.** Breaths in a generated voice were lowered by 18 dB; in a 15 s sample they became inaudible and the user approved it. In the full lesson the model breathed louder, and four breaths stayed audible. Before cutting harder, each one was inspected: three were not breaths but the final "s" of words, which the detector had confused (lesson 13), and cutting to −35 dB made the transcription lose the "s".

**Detector question.** On how many samples, and which extreme ones, was this number chosen? Does it describe the result I want, or a step that only gave that result on the sample?

**Warning sign.** "It was perfect on the sample, apply it the same to everything" · "a few are left, cut harder".

**What to do.** Choose the value on the extremes, not on one sample: the loudest, the longest, the rarest case. Where you can, write it as the result you want, with limits ("end at −61 dBFS, cutting between 18 and 35 dB"), rather than as a fixed step. When something survives the setting, look at each case before tightening it: it may not be what the setting is for.

### 68. A step that reads past an edge goes before the step that cuts it

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** Some steps need material beyond the edge of what they work on: a reverb or an echo extends a sound past its end, and a smoothing filter or a rolling average reads the neighbours of each point. Placed after a trim, a fade or a filter, they find nothing left to read, and the result comes out unchanged, or wrong at the edges.

**Example.** To make narration phrases fade out more naturally, a light reverb was tested. It was applied to phrases already trimmed and faded out: the reverb tail came out 8 to 30 dB below the background, inaudible, and the test changed nothing.

**Detector question.** Does this step need material that lies past the point where I already cut, faded or filtered? Where in the chain am I putting it?

**Warning sign.** "I'll add the effect at the end, on what's already done".

**What to do.** Before adding a step to a processing chain, write down what it needs as input and what it leaves as output, and place it where its input still exists. Then check that it changed the output (lesson 50) before asking anyone to look or listen.

### VIDEO-3. Pasting clips onto digital silence exposes their background noise

`origin: field · claude-opus-5-5 · 2026-10` · `packages: video`

**The idea.** When audio pieces are placed on a timeline of zeros, each piece carries its own background noise and the gaps are absolute silence. The ear hears the background switch on and off at every cut. A background laid under the gaps only hides that if it matches the pieces in level and in sound, and even a matching one can be heard as a constant hiss.

**Example.** A lesson narration was built by placing each generated phrase on zeros. With a clean voice (noise floor −83 dB) nothing was audible; with a cloned voice that carried room noise (−48 dB), the user heard a sudden silence at all 17 cuts. Later, a filler at −63 dB under a voice with a −58 dB floor left steps, and one at −58 dB was heard as a constant faint hiss.

**Detector question.** What is the noise floor inside each piece, and between pieces? Do they match in level and in sound, or does the cut change either?

**Warning sign.** "The gap is silent, it can't get cleaner" · "I'll just put a background under it".

**What to do.** Measure the pieces' floor before joining them. If it is as low as the gaps (here, the clean voice at −83 dB showed no seams), leave the gaps silent. Otherwise clean the pieces down toward that level before joining them; if you lay a background under the gaps instead, take it from the pieces themselves at their level and listen to the whole on headphones before keeping it. Check the output for level steps at every cut. Where the noise came from is lesson AI-3.

### WEB-1. A damaged store must not take the next record down with it

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web`

**The idea.** However a site saves its records, one damaged write can take what comes after it down too. With records appended as lines, a line cut short glues the next record onto it, and a reader that skips "damaged lines" drops both, silently. With all records in one file that is read, changed and written back whole, once that file can't be read every new record fails, and only a console nobody watches says so. It is the other side of lesson 24: there the file gets emptied; here, whatever comes after is lost.

**Example.** In both runs of the first Web simulation, the form saved each message as a JSON line, and the admin panel skipped any it couldn't read. With a line cut off at the end of the file, the next message got the reply "Thanks!", was saved, and never showed up in the admin panel. One of the two versions had a comment that said "damaged line: skipped".

**Another example.** In both runs of the rerun, every message lived in one JSON file, written to a temporary file and then renamed, so a crash mid-write no longer hurt. But with the file damaged any other way (a hand edit, a full disk, a bad restore), every new visitor got "Internal error", the admin page showed nothing, and the only signal was a stack trace in the server console.

**Detector question.** If the store is damaged tomorrow, what happens to the next visitor's record, and who finds out?

**Warning sign.** "Damaged lines get skipped" · "it's just appending to the end" · "the write is atomic, so the file can't break".

**What to do.** Keep a new record from depending on old ones: append to a file that ends in a line break (start the record with one if it doesn't), or save each record in its own file, rather than rewriting one file that holds them all. When reading, count what couldn't be read and show that count where the owner will see it. Test it by damaging the store by hand (cut the last line short, truncate the file), then sending a record.
