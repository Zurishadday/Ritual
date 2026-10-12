# Writing and docs

What applies when you write for others: documentation, manuals, screen text, content, prompts.

### 11. Removing a chart doesn't remove the claim it made

`origin: field · ~opus · 2026-08`

**The idea.** If you remove something because the data wasn't reliable, that same claim probably still lives in other texts, written in other words.

**Example.** An unreliable chart was pulled, but a "key findings" card and an action plan still recommended what the chart had said.

**Another example.** A chapter plan was renumbered from 7 to 15. Two lists in another document still pointed to "7.4" and "7.7" from the old plan, which now were different topics. When you replace a plan, the old numbers are claims too.

**Detector question.** What other texts say the same thing as what I just removed?

**Warning sign.** "I already removed the chart."

**What to do.** Search by topic, not by identifier. Echoes don't have a variable name.

### 37. Document what's there, not what you wish were there

`origin: field · ~opus · 2026-08`

**The idea.** A documentation review improves the document; it doesn't redesign the system. If the system has a limit, the document states it. It doesn't hide it or promise to fix it.

**Example.** A manual said data synced by itself. The system only synced when the app was opened. The review "fixed" the manual to promise it would soon be automatic, instead of stating the limit as it was.

**Detector question.** What I'm about to write, does it describe how it works today or how it should work?

**Warning sign.** "It should work this way" · "they're going to fix it".

**What to do.** Separate findings about the document ("it's badly written") from findings about the system ("it works differently than ideal"). The second kind gets declared as a limitation.

### 38. What you don't know gets marked, not invented

`origin: field · ~opus · 2026-08`

**The idea.** An official document states everything with the same authority. An invented detail, like an owner, a schedule, or a response time, reads the same as a real one.

**Example.** A procedure had a 24-hour response time that nobody had agreed to. It was written because it sounded reasonable, and once published it became a commitment.

**Detector question.** Do I know this detail, or am I assuming it because it sounds reasonable?

**Warning sign.** "Surely it's like that."

**What to do.** Mark what's missing in a visible way, like "Pending" in red, and ask whoever does know. Neutral wording is better than false wording.

**Not to be confused with.** The mark is for the person deciding, not for the final reader. A "pending confirmation" inside a published text is another piece of data that shouldn't be there. If the document goes out before it's confirmed, use neutral wording that doesn't claim what's missing, and leave the pending item in the report or the project record.

### 39. Version it in plain sight

`origin: field · ~opus · 2026-08` · `groups: git-and-process`

**The idea.** Every change carries a new version number on the cover and a line in the history, with the date, what changed, and who changed it. When two copies are circulating, the version is the only thing that says which one is the good one.

**Example.** Two copies of a manual were circulating by email. The old one said the tool "opens with a double click," which was no longer true, and nobody could tell which of the two was the good one.

**Detector question.** If someone has last week's copy, how do they know it's no longer the good one?

**Warning sign.** "It's a small change, it doesn't need a version."

**What to do.** Bump the version number and write the history line in the same change that modifies the document.

### 42. Work on the current version

`origin: field · ~sonnet · 2026-09` · `groups: git-and-process`

**The idea.** A review done on an old copy brings back errors that had already been fixed.

**Example.** A reorganization of the manual was done on a version from weeks earlier. It said again that the tool "opens with a double click," which was no longer true.

**Detector question.** The version I'm editing, is it the most recent one or the one I had open?

**Warning sign.** "I've had the version open since yesterday."

**What to do.** Take the structure the review proposes and pour the most recent content into it, not the other way around.

### 43. Reread from start to finish after many corrections

`origin: field · ~sonnet · 2026-09`

**The idea.** After several rounds of spot fixes, a document can contradict itself. Each correction was true in its own section, but nobody reread the others.

**Example.** One section said that nothing is saved without a connection. The FAQ still said that whatever is captured is kept on the device.

**Detector question.** How many corrections has this document had since someone last read it in full?

**Warning sign.** "I checked each fix where it was."

**What to do.** When you finish each round, search by topic for everything the document says about what you corrected.
