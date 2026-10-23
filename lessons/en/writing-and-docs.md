# Writing and docs

What applies when you write for others: documentation, manuals, screen text, content, prompts.

### 11. Removing a chart doesn't remove the claim it made

`origin: field · ~opus · 2026-08` · `seen: ~opus 2026-10`

**The idea.** If you remove something because the data wasn't reliable, that same claim probably still lives in other texts, written in other words.

**Example.** An unreliable chart was pulled, but a "key findings" card and an action plan still recommended what the chart had said.

**Another example.** A chapter plan was renumbered from 7 to 15. Two lists in another document still pointed to "7.4" and "7.7" from the old plan, which now were different topics. When you replace a plan, the old numbers are claims too.

**One more example.** A project kept its own list of lessons, and a library had adopted them into its own list. Both numbered the same up to 44 and differently from 45 on. The project's instructions and its reviewer agents kept citing "46", which in the library is a different lesson. It came out only when the owner asked for a second review.

**Detector question.** What other texts say the same thing as what I just removed? When two numberings coexist, does each citation say which list it uses?

**Warning sign.** "I already removed the chart." · "The numbers are the same."

**What to do.** Search by topic, not by identifier. Echoes don't have a variable name. When two numberings coexist, cite with a prefix that names the list ("v2 #46", "library #46"), and search every citation of the changed range in every file, not only in the one you renumbered (see lesson 8).

### 37. Document what's there, not what you wish were there

`origin: field · ~opus · 2026-08`

**The idea.** A documentation review improves the document; it doesn't redesign the system. If the system has a limit, the document states it. It doesn't hide it or promise to fix it.

**Example.** A manual said data synced by itself. The system only synced when the app was opened. The review "fixed" the manual to promise it would soon be automatic, instead of stating the limit as it was.

**Detector question.** What I'm about to write, does it describe how it works today or how it should work?

**Warning sign.** "It should work this way" · "they're going to fix it".

**What to do.** Separate findings about the document ("it's badly written") from findings about the system ("it works differently than ideal"). The second kind gets declared as a limitation.

### 38. What you don't know gets marked, not invented

`origin: field · ~opus · 2026-08` · `seen: claude-opus-5-5 2026-10`

**The idea.** An official document states everything with the same authority. An invented detail, like an owner, a schedule, or a response time, reads the same as a real one.

**Example.** A procedure had a 24-hour response time that nobody had agreed to. It was written because it sounded reasonable, and once published it became a commitment.

**Another example.** A commit message said why two reviews had run nothing: the reviewer had typed certain commands. Nobody had seen those commands; the log only said "denied". The message was already public, and the next commit had to correct it.

**One more example.** Someone asked about a tool by a name that wasn't familiar. It was taken for a well-known one with a similar name, which was looked up and explained at length. They meant a new product with that exact name; searching for it as written would have found it at once.

**Variant.** The detail can be the current state of a tool, or what happened earlier. In two days, two statements about tools came from memory and were false: that an update command rebuilt a whole index (it reads only what changed), and that a plugin's automatic updates were "probably" off (the plugin's own `doctor` command said on). One look at each tool would have answered it. And when a project's rules were moved to a new format, several of their examples were rebuilt from memory and didn't match what had happened; one told of a mistake that never occurred. They were fixed by opening the old log.

**Detector question.** Do I know this detail, or am I assuming it because it sounds reasonable? A cause, a name, a figure, what a tool does, how a tool is set up: did I see it, or is it my best guess? Which record did I copy this example from?

**Warning sign.** "Surely it's like that." · "That must be why." · "They must mean…" · "That's how it happened, more or less."

**What to do.** Mark what's missing in a visible way, like "Pending" in red, and ask whoever does know. Neutral wording is better than false wording. In a commit message, a cause nobody saw in an output is written as a guess ("likely"). A name you don't recognize is searched for exactly as written; if nothing matches, ask which one they mean. Before saying what a tool does or how it is set up, run the cheapest look (its `doctor`, its `--help`, its config, a search) and say what it showed, or mark the statement as unchecked (see lesson 29 and lesson 52). A reviewer's "correct" is a guess too unless they looked (see lesson 28). An example of what happened is copied from its record (the log, the commit), never rebuilt.

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

**Another example.** A final project for a statistics module came in three parts. The second part accepted as correct "the second payment stayed the same" with a p-value of 0.875; the third taught that a high p-value does not prove there is no effect. After that was fixed, the same claim came back in three other places: a transition sentence ("when launched, it changed nothing"), a step title, and what a character said in a simulated meeting.

**Detector question.** How many corrections has this document had since someone last read it in full? Does any sentence, titles and dialogue included, break a rule this document teaches?

**Warning sign.** "I checked each fix where it was."

**What to do.** When you finish each round, search by topic for everything the document says about what you corrected. Then list the rules the document teaches and search for each one by topic, also in the parts that aren't about it: titles, transitions, examples and dialogue.

### 51. What looks obvious to you is the first thing to teach

`origin: field · ~opus · 2026-10` · `groups: interface-and-design`

**The idea.** Someone who already knows doesn't see the steps they take without thinking. So their first example brings several new things at once, and a beginner gets lost on the first line.

**Example.** A programming course for beginners opened with a cell that had six new things at once, and the plan never taught what a data type is or that `=` stores and reads right to left. The course owner said it in one sentence: "you assume a lot about the students." Later, three lessons said "like dragging a formula"; no lesson had taught dragging, only "copying the formula down".

**Another example.** In a beginners' module, the same small word named a spreadsheet cell in one step and the little square at its corner in another. A practice's own notices used a cell reference and the name of a screenshot tool before the text had introduced either of them.

**Detector question.** In my first example, how many things are new to someone who knows nothing? Has every symbol, every word, every button name and every action I ask for been taught before? Does one word name two things? Does a notice name something not yet taught?

**Warning sign.** "Anyone gets that" · "it's just one line" · "it's the usual word." · "The notice explains it."

**What to do.** Before writing, list what your example takes for granted (symbols, words, clicks, things the learner should have built already) and teach those first: one new idea at a time, each symbol explained the first time it appears. Search for each word that matches a button's name, and each action you ask for, the way you search for a symbol. If possible, let an automatic check compare what each example uses with what was already taught. Read the interface's notices and hints in the order the learner meets them, and search for each name they use the way you search for a symbol. Give each thing one name and keep it (see lesson 2).

### 52. Write about a fast-moving tool from today's practice, not from memory

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** A lesson or a guide about a tool that changes every few months goes stale while it's being written if it comes from what the author remembers. Its premise can be false before the first reader sees it.

**Example.** A plan for an "analysis with AI" module opened with "the AI can't see your data, so describe your table instead of pasting it". The course owner pointed out that agents now connect to the database, run the queries themselves and hand back the number. Research with sources and dates confirmed it: copying code out of a chat was how it was done two years earlier. Several lessons were rewritten around what still holds: defining the question, supervising the agent and checking the number.

**Detector question.** Which of this text's premises depend on what the tool can do today? When did I last check them, and against what source?

**Warning sign.** "That's how it works" · "everyone does it like this."

**What to do.** Before writing about a fast-moving tool, look up current practice with sources and dates: what the tool does now, what is free, what people actually use. Build the text around the skill that survives the next version (framing, supervising, verifying), and keep tool-specific steps in one place that can be updated. Mark what you couldn't verify, and try it by hand before publishing.

### 54. "The X at the start and the close": every translator picks the same wrong reading

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** A qualifier in front of two items joined by "and" can attach to both or to the first only. The writer knows which one is meant; a reader has to guess, and translators guess alike.

**Example.** A results page said "what changed it is the lessons at the start and the close", meaning two pieces of a tool: the lessons shown at the start, and a final check step. All six translations read it as one thing, lessons shown at the start and at the end. Two days later the same shape went into a new paragraph, and the translations misread it again.

**Another example.** A paragraph named a kind of mistake as "(the error path, keyboard focus, a damaged data file, a split written down before the runs)", meaning that the kind itself had been set before the runs. All six translations listed it as a fourth mistake. This lesson's question had been shown to the writer that same day.

**Detector question.** In this sentence, does any "the X at A and B" have two readings? Translated word by word, would the other reading come out? In a list, does a note about the list sit where it reads as one more item?

**Warning sign.** A list of two where one item is a thing and the other is a moment or a place. A note about a list written inside it, as its last item.

**What to do.** Make the split visible. Count it ("two pieces: …"), give each item its own article ("the lessons at the start, and the close"), or put the short item first ("the close, and the lessons at the start"). A note about a list goes outside it, in its own clause. Then read the translation of that sentence for the reading you meant.

### 58. An instruction made of many pieces is seen before it is assembled

`origin: field · claude-opus-5-5 · 2026-10` · `groups: interface-and-design`

**The idea.** When what you teach is assembled from several pieces (a formula with five arguments, a command with several options), dictating them one after another while they are typed loses the learner: they must understand each piece and the assembly at once. First each piece is shown doing its job in the data, with its name and meaning in view; then it is assembled.

**Example.** A tutorial video for a formula with two conditions dictated each range and each condition while it was typed. The owner: each parameter wasn't understood, and with many parameters one gets lost. Remade with the question in words, each piece painted in the data with its colour, the count done by hand, the formula built in pieces with the same colours, and the only new thing at the end, it worked much better.

**Detector question.** Before the first character is typed, has the learner seen in the data what each piece does? Does each piece carry its name and what it means in view, not only its colour?

**Warning sign.** "The voice names each argument as it appears."

**What to do.** First the question in words. Then each piece shown in the data, one colour each, with its name and what it means beside it. Then the result worked out by hand. Only then the instruction, built in parts with the same colours and a pause between parts, with the new thing last. Not the same as lesson 51: here every piece may already be known, and what fails is the order.

### AI-1. If you restrict where the model may write, it writes wherever you let it

`origin: field · claude-opus-5-5 · 2026-10` · `groups: interface-and-design` · `packages: ai`

**The idea.** When the prompt or the code forbids an output field that the model does have something to say in, the model does not stay quiet: it puts it in the field you did allow, even if it does not belong there. Each field must say what it may contain and that leaving it empty is fine (see lesson 38).

**Example.** A live assistant had three zones: warnings, facts about the client, and the line to say next. The prompt said "in the first 2 minutes, only use warnings", and the code dropped everything else. The model wanted to suggest a question and put it in the warnings zone ("Don't explain more: ask 'what would you like to get out of this?'"). When it did send the line in its own zone, the code dropped it and the panel stayed empty. The person reported it with a screenshot.

**Detector question.** If the model has something to say and the right field is forbidden right now, where will it put it? Does each field say what fits and what doesn't, and that it may stay empty? Does the code drop something the prompt doesn't know gets dropped?

**Warning sign.** "In that phase, have it use only field X".

**What to do.** Define each field by its content ("warnings only; never a line to say"), not by the moment. If a phase should not show something, the prompt and the code must say the same thing (see lesson 9). Test with a case where the model does have something to say in the forbidden field.

### AI-2. A rule written as a checklist gets executed as a checklist, even after the other person answered

`origin: field · claude-opus-5-5 · 2026-10` · `packages: ai`

**The idea.** If the prompt lists what must be covered (the points of an opening, the fields of a form), the model asks for them one by one even when the person already gave them in other words, and stops responding to what they just said.

**Example.** A sales assistant had to cover four opening points in the first minute; one was "what they want to get out of the call". The client had just said "I'm in accounting and wanted to see what this data thing is about". The assistant suggested "If it's not for you, just tell me. What would you like to get out of today?": it ignored what the client said and asked something already answered. The person noticed ("it doesn't fit what the client is asking me right now").

**Detector question.** If the person already gave this point in other words, does the prompt tell the model to count it as covered? Does the reply build on the last thing the person said, or jump to the next item on the list?

**Warning sign.** "Have it cover the four points".

**What to do.** Next to every list, write: "a point said in other words is already covered", "whatever is missing goes in as a bridge inside the reply that follows the thread" and "never ignore the last thing they said". Test it with a real conversation where the person answers a point before being asked.

### EDU-2. What learners see before answering can't contain the answer

`origin: field · ~opus · 2026-10` · `packages: education` · `seen: claude-opus-5-5 2026-10`

**The idea.** A question stops measuring once its answer has already appeared: in an image, in the key idea, in another exercise's explanation, in a step title or in an earlier lesson. Whoever answers right may have just read it.

**Example.** An illustration with the right figure sat above the practice that asked for it. A lesson asked what happens when you store a new value in a variable, in a step titled "Storing again replaces it". A summary placed under the final quiz was read before answering it. A feedback box that appears after the first attempt, even a failed one, gave the direction of the answer.

**Another example.** An exercise asked learners to type a formula sign by sign, with the formula shown right above the box and pasting allowed: it measured copy and paste.

**One more example.** In a course with drawn interfaces, four components carried in their source code the figures that a later exercise asked for. The automatic check for leaked answers never searched there; reviewers found them. In five of seven steps of one module, the question sat right under the text that answered it: a heading "Double click: open" over the question "what opens a folder?".

**Detector question.** Does the learner see this figure, image or phrase before answering, here or in an earlier lesson? Not only the exact number: also an approximation ("about 25"), the conclusion written in a caption, a title, a "you just saw that…", or what the most likely wrong answer of an earlier exercise shows on screen.

**Warning sign.** "It's just context" · "it's only the title" · "it's the caption."

**What to do.** Look for each answer in everything shown before its question, including what appears after a first failed attempt, what starting code prints when run, downloadable files and what can be counted in a drawing. Write the step title and the learning goals last, and read them next to the result of each prediction. An automatic check finds exact figures; approximations and paraphrases are found only by someone reading with the answer in mind. When an exercise asks learners to type what is on screen, block pasting and say why. Extend the check to every file that draws the learner's screen, the code of components included (see lesson 16). In a step that explains and then asks, the explanation that gives the answer comes after the question, or the question asks about a case the explanation doesn't cover.

### EDU-3. A question with two defensible answers measures nothing

`origin: field · ~opus · 2026-10` · `packages: education`

**The idea.** If, with what the prompt says, another option can also be defended, whoever picks the "wrong" one for a good reason is marked wrong, and whoever gets it right may have been lucky. The question measures the missing sentence, not the idea.

**Example.** A question asked what to do with an empty discount "when the sale had no discount". The lesson had taught that a blank that is a fact stays blank, so "leave it" was defensible; the expected answer, filling it with zero, depended on something the prompt never said: that the goal was the average over all sales. In another, "the main metric is the share who pay the second month" didn't say share of whom, and the two versions tied or differed depending on the reading.

**Detector question.** With what the prompt says and what the lesson taught, can I defend another option? What fact would I need to rule it out, and is it written?

**Warning sign.** "It goes without saying" · "obviously it means…"

**What to do.** For each wrong option, write one line on why it is wrong using only the prompt and the lesson. If ruling it out needs a fact that isn't written, add it to the prompt: the purpose of the calculation, the rule of the system, the denominator of a proportion, what is known about the data. In a sorting exercise, test every item against every category, not only its own.

### EDU-5. A hint points at the cause of the mistake, not at the answer

`origin: field · claude-opus-5-5 · 2026-10` · `groups: tests-and-checks` · `packages: education`

**The idea.** A hint shows up after a wrong attempt. If it gives the answer, the line that solves the exercise, or what separates the solution from the most likely mistake, the second attempt measures copying.

**Example.** A review of a course's 277 checked practices changed 82 hints in 49 files. Some gave the line that solves it ("the second one is the…"). Some dictated the order that separates the solution from its common mistake. In "check against an earlier result" exercises, the hint said "it should match what you got in lesson 2.2": whoever remembered the earlier number could type it without doing the step.

**Detector question.** Could someone who reads this hint pass the next attempt without the skill? Does it name the answer, the solving line, the steps the exercise measures, or the earlier number it should match?

**Warning sign.** "It's only a nudge" · "they already tried once."

**What to do.** Write the hint about the cause of the likely mistake ("positions start at 0, not at 1"), and cite only what was already taught. Keep the "it should match the earlier number" for the explanation shown after answering, where it teaches that two methods giving the same number is a verification. Review hints against the exercise's most likely mistake, not on their own.
