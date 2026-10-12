# Git and process

What applies when you save, close, hand off, or coordinate: commits, states, pending items, parallel work.

### 8. List the consumers, don't remember them

`origin: field`

**The idea.** When you change a piece of data that others read by its name, the list of who reads it has to be written down. Memory always leaves one out.

**Example.** The labels on three screens were updated after a model changed. The fourth, which nobody remembered, kept offering options from the previous model.

**Another example.** When writing a chapter, it was stated from memory that the reader already knew three functions from an earlier chapter. A search showed that the chapter taught only one, and that another chapter had already explained the topic presented as new.

**One more example.** A change was saved with the list of files written from memory, and one was left out: the one that made the new thing work. The list of pending changes, reviewed afterward, showed it.

**Detector question.** Where did I get the list of who uses this: from a search or from memory?

**Warning sign.** "I already covered the three places where it's used" · "they already saw that" · "I already added everything."

**What to do.** Keep a written map of impacts by type of change. Go through it in full, saying "changes" or "doesn't apply because…", and if the change creates a new consumer, add it in the same change. Before citing a source, copy the sentence you're asserting from that source: what someone says another person did or saw also needs to be checked.

### 9. One state lives in several records: move them together

`origin: field`

**The idea.** Closing a pending item usually involves three places: the pending-items list, the test that watches it, and the document that describes it. If you move one, the others contradict it.

**Example.** A pending item was marked closed in the list, but the test watching it was still marked "expected to fail" and the document still described it as open. Three places, three versions.

**Detector question.** What other places assert this state? Name them before saving.

**Warning sign.** "I'll update the other side later."

**What to do.** The unit of work is the complete set, in the same change.

### 30. Explain before acting, and wait for the yes

`origin: field`

**The idea.** Moving fast in the wrong direction is not progress.

**Example.** The folder structure of an entire project was reorganized without notice. The change was correct in itself and was fully undone, because another person had already decided that structure for reasons that weren't in the code.

**Detector question.** Is this block big, hard to undo, or does it change something another person already decided? If yes, explain and wait. If not, say what you'll do and go ahead: asking permission for every step also has a cost.

**Warning sign.** "I already know what they want."

**What to do.** Before each large block of work, explain in plain language what you'll do and why, and wait for confirmation.

### 35. A to-do list written in passing goes stale

`origin: field`

**The idea.** What you noted as "for later" while doing something else may no longer exist, or may have been a deliberate decision.

**Example.** A note said "remove the date filter." When it was finally worked on, the filter was already a written team decision, and removing it broke a report.

**Detector question.** Did I check this item today, or am I going to work on it just because it's written down?

**Warning sign.** "It was on the list."

**What to do.** Before working on a pending item, check it today and look for a written decision saying it was left that way on purpose.

### 40. The log says what was left and why, not a chronicle of missteps

`origin: field`

**The idea.** A change history is for understanding the product, not for narrating the already-resolved mistakes of whoever made the change.

**Example.** A history said "A was tried and failed; B was tried and failed; C was left." Someone reading it months later only needed C and its reason, and had to read three paragraphs to find it.

**Detector question.** Does this line help someone understand the product or avoid repeating a mistake, or does it just record what happened to me?

**Warning sign.** "Let's keep a record of everything that happened."

**What to do.** Write the final state and its reason. What was tried and failed only goes in if it teaches something someone needs in order not to repeat it.

### 47. What's worked on in parallel collides in what's shared

`origin: field`

**The idea.** When several people work at once, each sees their own piece clearly. What they share (the tests, the data, the documents for the whole project) combines their changes: names that clash, copies that fall behind, tests that read someone else's half-finished work. Integrating is work, not a paste.

**Example.** Four people were each writing one piece at the same time and leaving the shared parts as the deliverable. When integrating, two deliverables used a name that already existed in the shared test, and the test stopped running. Another test kept a copy of what it checked; the piece changed and the copy didn't. One test run failed because of an image another person was still drawing. And in the end, each piece couldn't be saved separately: the shared files already carried changes from everyone.

**Detector question.** Which file are two pieces touching at the same time, and who integrates it? Is my test reading another person's half-finished work?

**Warning sign.** "Each of us tested our own" · "the failure is in another piece."

**What to do.** Have one person integrate what's shared, with a step that stops if a name clashes. Have the tests read the original, not a copy. Run the full test suite once everyone is done, or without the pieces that are still changing, and say which ones were left out. And save pieces that share files together, so each saved version works in full.
