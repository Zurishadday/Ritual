# Interface and design

What applies when a person is going to see or use what you build: screens, components, styles, pages.

### 10. Twin modules change together

`origin: field · ~opus · 2026-08`

**The idea.** If your product has two versions of the same screen, for two kinds of user, two regions, or two products, an improvement to one is a pending improvement to the other.

**Example.** The desktop version gained a date filter. The mobile version, which people see as "the same screen," went without it for a month.

**Another example.** In a web course, three things fit on mobile and failed there. A scaled-down preview of a document fit the width with 3 px text. A drag-and-drop exercise stacked six target boxes in one column, three screens tall, so the target was off the screen during the drag. A label in a drawn bar chart fit on desktop, but on mobile it wrapped and ran into the next label.

**Detector question.** Does what I'm touching have a twin that users see as "the same module"?

**Warning sign.** "They didn't ask me for it on the other one." · "It fits on mobile, so it's the same."

**What to do.** Don't close the change until you've checked the twin and written either "same" or "doesn't apply because…". When the twin is the mobile version, check it by using it there: read the text at its rendered size, finish each drag or tap with its target on screen the whole time, and look at the labels at the narrowest width. To compare every property, see lesson 19; to look at it the way the reader sees it, see lesson 41.

### 19. A review of one dimension is not a review

`origin: field · ~opus · 2026-08` · `seen: claude-sonnet-5-5 2026-10`

**The idea.** "They're already the same" requires having compared every property you can see, not just one.

**Example.** The design of two screens was made to match over four rounds: first the size, then the typography, then the colors, then the label color. Each delivery said "it's done."

**Another example.** The illustrations in a material were reviewed for content and size, but not for contrast: two text colors ended up below the minimum readable level in four images.

**Detector question.** Did I compare one property or all the ones the user sees?

**Warning sign.** "The size matches now, so the design is the same."

**What to do.** List all the differences before fixing the first one. And in your notes, the verb gives you away: "it's fixed" and "it becomes" are intentions; "it says" and "it shows" are measurements.

### 31. Nothing technical on screen unless it changes a decision

`origin: field · ~opus · 2026-08`

**The idea.** Every element of a business screen should help decide something. What helps audit goes in the code; what helps decide goes on the screen, in business language.

**Example.** A sales screen showed the internal ID of each order and the time of the last calculation in its first row. Nobody decided anything with it, and it took the space of the data that did matter.

**Detector question.** Does this change any decision of whoever uses the screen? If not, why is it here?

**Warning sign.** "In case someone needs it."

**What to do.** Before adding something to the screen, write down what decision it changes. If it changes none, it goes to the technical log or the code, not the screen.

### 32. Something that works but can't be seen gets reported as broken

`origin: field · ~opus · 2026-08` · `packages: web, apps` · `seen: claude-opus-5-5 2026-10`

**The idea.** If a button changes something outside the view, for the user, working and not working look the same.

**Example.** A filter did filter a table, but the table was two screens further down. They reported it as "does nothing."

**Variant.** Hiding a container hides everything inside it, even things that had nothing to do with it. For example, a useful link that lived inside a retired control.

**Another example.** A five-question sign-up form, sent empty, moved the focus to the first field, but its message sat under the submit button, about 900 px further down: on a phone the person saw the focus jump and nothing else. The accessibility tests passed; a review with phone screenshots found it.

**Detector question.** Right after using the control, without moving from where it is, does the user see what changed? On a phone too?

**Warning sign.** "It does work, it just doesn't show." · "Focus does go to the field and the screen reader reads the error."

**What to do.** Every control says what changed and takes the user to it. And before hiding something, check what other elements live inside it. A form's error goes right under its field, tied to it (`aria-describedby`, with `aria-invalid` marking the field), not next to the button; check it in a phone screenshot (see lesson 45 and WEB-4).

### 33. The glyph is not the text

`origin: field · ~opus · 2026-08`

**The idea.** In small print, "÷" and "+", "l" and "1", "O" and "0" get confused. If two people read the same thing wrong, they're not distracted: it's the size of the type.

**Example.** Two different people read "98 ÷ 441" as "98 + 441" on a card set in small print, and both reported that the calculation was wrong.

**Another example.** The code font of a material joined `>=` into a single symbol, ⩾. Whoever is learning copies what they see, and that symbol doesn't exist on the keyboard or in the language.

**Detector question.** At the size and font where it will be read, can this symbol be confused with another, or does it look like something that can't be typed?

**Warning sign.** "It looks fine on my screen."

**What to do.** When a symbol gets confused, replace it with a word: "98 over 441" instead of "98 ÷ 441".

### 41. Check in the format the reader actually sees

`origin: field · ~sonnet · 2026-09` · `groups: tests-and-checks` · `packages: web` · `seen: claude-sonnet-5-5 2026-10, claude-opus-5-5 2026-10`

**The idea.** Finding a word in the text doesn't prove it shows up. The text can be somewhere else in the document while the format that was supposed to display it comes out empty.

**Example.** Three numbered steps came out as empty bullets. The automatic check passed them because those words appeared somewhere else in the document.

**Another example.** A "there are more columns to the right" notice was added and taken as done because the code was there. It never appeared: a general table style removed the condition that turned it on. Someone else saw it in a screenshot.

**One more example.** An answer option said "Total: {2 * 78}" in the file. When the page was drawn, the system calculated what was between the braces and showed "Total: 156": two identical options. Only someone who looked at the screen saw it.

**Variant.** The screenshots a reviewer judges can show a screen nobody reaches. A course's capture tool answered each code exercise with a filler line just to move on, so the "after" screenshot showed that line and a "not the expected result" message: reviewers never saw what a learner sees after getting it right. On desktop the captures also took in the header and the side menu, and the lesson came out as an unreadable strip. When capturing for review, answer each step the way a successful user would, and capture only the part under review.

**Detector question.** Did I see the exact element the way the reader sees it, or did I only find the word (or the code) in the source?

**Warning sign.** "The word is in the file" · "it's a one-line fix."

**What to do.** Check the exact element, like "these three steps, as bullets," and look at the page as the reader will see it at least once. A small fix still gets checked: it's where another rule is least expected to override it. And the first time you use a new resource on the page (a code block, a fixed header), look at it on mobile too.

### 45. Someone walks the error path too

`origin: field · ~sonnet · 2026-09` · `packages: web, apps` · `seen: claude-sonnet-5-5 2026-10`

**The idea.** If you only test what happens when everything goes right, whoever makes a mistake finds the gap. And when learning, making mistakes is the most common thing.

**Example.** A query cell counted an attempt only when the query ran. With a typo, the button to advance never activated, and the person got stuck. The tests passed, because they always ran the starting query, which had no errors.

**Detector question.** If the user does the most likely wrong thing (a typo, an empty answer, two clicks), what do they see, and can they keep going?

**Warning sign.** "It works with the right answer."

**What to do.** For each control, test three paths: the good one, the most common error, and the empty one. All three say what happened and let the user keep going.

### 46. What runs on every request can't grow with the content

`origin: field · ~sonnet · 2026-09` · `packages: web` · `seen: claude-sonnet-5-5 2026-10`

**The idea.** Something done on every page, like reading all the content or recalculating an index, costs little with ten pages and a lot with a hundred. It grows gradually and nobody notices, until something starts failing "every now and then."

**Example.** Every page of a site read and parsed all the content to build the table of contents. Alone, one page took 0.4 s. But the sidebar requested about 40 at a time, and together they took 16 s. Months later, the tests started failing when switching pages, and the failure looked like a problem with the test.

**Detector question.** Does this thing that runs on every request go through all the content? How long does it take today, how long with double, and how long with many requests at once?

**Warning sign.** "It loads fast locally" · "it's an intermittent failure."

**What to do.** Measure on the compiled server and the way people use it, with all its requests together, not one page alone. Cache what doesn't change while the server runs, and leave a test that measures it with the case that actually made it slow.

### 49. A general rule must not silently beat the specific ones

`origin: field · ~sonnet · 2026-09` · `packages: web` · `seen: claude-sonnet-5-5 2026-10`

**The idea.** A rule that applies to everything (a global style, a default value) can override what each piece decided for itself, without anything warning you.

**Example.** The keyboard focus style, written for the whole site, came with its own border radius. Because it ranked above each component's own styles, a pill-shaped button changed shape when focused with the keyboard. Nobody noticed, because with the mouse the focus doesn't appear.

**Detector question.** Does this general rule touch something each piece already decides for itself? If they clash, which one wins?

**Warning sign.** "I made it global so I wouldn't have to repeat it."

**What to do.** Let the general rule touch only what's its own (the focus outline, not the shape). If it should win on purpose, write that down next to it. And test it on the most different piece, not only the common one.

### 57. A key arrives differently on each system

`origin: field · claude-opus-5-5 · 2026-10` · `groups: tests-and-checks`

**The idea.** What a program receives from a key depends on the system and the keyboard layout. On Windows, AltGr arrives as Ctrl and Alt together; on a Mac, many symbols are typed with Option; the same key position types another symbol on another layout. Code that filters keys by their modifiers, tested only with the key the test sends, rejects people who did it right.

**Example.** A web exercise asked learners to type symbols one by one, and ignored every key that came with Ctrl, so shortcuts would not count. On a Spanish-layout keyboard on Windows, @ is typed with AltGr, which arrives as Ctrl and Alt: nobody on that setup could finish. The test sent @ with no modifier and passed. A reviewer found it reading the code.

**Detector question.** Did I test this key the way it arrives on Windows, on a Mac and on another layout, with its modifiers, or only the way the test sends it?

**Warning sign.** "In the test it goes through."

**What to do.** Before filtering a key by its modifiers, list how it arrives on each system (AltGr: Ctrl and Alt on Windows, which `getModifierState("AltGraph")` tells apart; Option: `altKey`; Command: `metaKey`), or accept the key when `event.key` is the expected character, whatever came with it. Write the test with the event each system sends, not with the bare character (see lesson 13). What can't be simulated (a shortcut the system keeps for itself) gets another path on the same screen, and a person tries it on a real machine.

### 59. An event from something already replaced must not act

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** When something can be started again before the previous one finishes (a microphone, a search, a connection, a timer), the late callback of the previous one arrives while the new one is running. If it does not check that it is still the current one, it acts on the new state: it restarts, sends or overwrites.

**Example.** A dictation button started a speech recognizer; on its "end" event it either sent the text or, if listening was still on, restarted. Between "done" and that event there was half a second with the button already back to "talk". A quick click started a new recognizer, and the old one's end event saw "still listening" and restarted itself. The microphone stayed on while the other side's synthesized voice answered, and transcribed it as if the person had said it.

**Detector question.** If this is started again before the previous one finishes, can the previous one's late callback act on the new one? What stops it from being started again while the previous one is still closing?

**Warning sign.** "When it ends, it checks the flag and decides".

**What to do.** Every callback first checks that its instance is still the current one (`if (current !== me) return`), and the control stays disabled (or `aria-disabled`, see lesson WEB-4) while the previous one finishes closing. To test it, double-click, or fire two searches in a row where the first is slower.

### 73. A page that has to persuade is designed from what it shows

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** A page that has to convince someone (sign up, buy, attend) is built from the pictures and pieces people see; the words come with them. Written first as text and decorated afterwards, it reads like a document, not an invitation.

**Example.** A sign-up page for a free live class came out correct (accessible, honest, tidy) but made of paragraphs and a date card. The owner felt it was "too plain, no pictures". Rebuilt from what it shows (the one piece nobody else has on the first screen, each section carried by an image or a heavy piece, about 80 words per screen), it was approved at once.

**Detector question.** If I delete every word on the page, what does each section still say with what is left? Does the first screen show the result being promised, or only describe it?

**Warning sign.** "The content is done; we will add pictures later."

**What to do.** Before the first paragraph, list what the page can show (real photos of the person, the product working, made-up data that adds up, drawn with code) and decide which piece carries each section. Draw pictures of data or screens with code, so every number and label in them is real; pictures of people are real photos. Then write the text, the least that works.

### VIDEO-1. In a video, each action lands when the narration names it

`origin: field · claude-opus-5-5 · 2026-10` · `groups: writing-and-docs` · `packages: video`

**The idea.** When the screen does something before or after the voice says it, the viewer looks at what they are not hearing and hears what they are not seeing. A click that comes before its word teaches the click without its name.

**Example.** In a series of narrated spreadsheet videos built with code, each click was placed as a fraction of its scene. A pedagogical reviewer found clicks that landed before the voice named the option (a color in a side panel), and a sentence that opened with context while the cursor was already making its first click. The rule that came out: if a sentence opens with context, that stretch has no clicks, and each click sits on the word that names it.

**Another example.** In the same series, the course owner said a video jumped from one idea to the next too fast. A still pause of 1 to 1.5 seconds at the end of each new idea fixed it.

**One more example.** In videos of the same kind, the voice said "we leave it open, C2:C" while the screen showed C1:C1000. Another sentence said "we wrap it in IFERROR" without saying where the cursor goes, and without naming the quotation marks that get typed. The pedagogical reviewer marked both as required.

**Detector question.** For each click and key press in this scene, which word of the narration does it land on? Does that word name it? Does the narration say what the frame shows, and does it say where each move is made? Does each new idea end with a still moment before the next one starts?

**Warning sign.** "It says it around there" · "it's a fraction of the scene, it lines up" · "the picture makes it clear".

**What to do.** If the voice gives no timestamp per word, place each action by where its word sits in the sentence (the characters before it), and check it in the full video at its real speed, not in still frames. If the voice engine gives word timestamps, place actions on them. Changing the voice or rewording a sentence moves every word: check the scene again. Close each new idea with a short still pause, about a second, and judge it at real speed too. What the voice says is checked against the frame where it plays (render that exact frame); when each action lands is checked at real speed. Wherever the voice and the frame differ, change one of them. The narration says where each new move is made, and names each symbol the first time it appears.

### VIDEO-2. In a video, what changes without showing gets marked

`origin: field · claude-opus-5-5 · 2026-10` · `packages: video`

**The idea.** When a step's effect is invisible on screen (removing a trailing space, turning a formula into its value), a video that shows that step looks like it does nothing. The viewer cannot click around to find out, so the video has to mark what changed and hold still long enough to see the mark.

**Example.** A generated video taught how to trim extra spaces in a spreadsheet column and then paste the result as values only. The cleaned column looked exactly like the dirty one, and pasting values changed nothing visible. The course owner watched it and said the change was not noticeable and that it was unclear why values-only mattered. It was fixed with an orange dot on every extra space, a side-by-side scene of both columns, and an arrow from the source cell to the formula that reads it, each held still for a moment.

**Detector question.** With the sound off, does the screen show what this step changed, and does it stay on it long enough to be seen?

**Warning sign.** "The narration explains it" · "the change is subtle, but it's there".

**What to do.** For each step in the script, write down what changes on screen. If nothing visible changes, add a mark (a dot, the formula bar, an arrow, a before and after side by side), hold the frame on it for a moment, and say in the narration that it is the video's mark, not the program's.

### WEB-2. A public form gets bots from day one

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: scripts-and-files` · `packages: web`

**The idea.** A form open to the internet isn't filled out only by people. If nothing stops automated submissions and whoever reads the messages can't clean them up, the first wave of junk buries the real customers.

**Example.** In both runs of the Web simulation, the contact form accepted 650 messages from a script in a couple of seconds, all of them saying "thanks." The admin had no pages and no delete button: the admin page grew to between one and six million pixels tall, and on mobile the text of the message ran off the screen. Both times, the builder noted it as pending.

**Detector question.** If a thousand fake messages arrive tomorrow, how does the owner find the one real one, and how do they delete the rest?

**Warning sign.** "It's a small site, nobody's going to attack it" · "we'll add the limit later."

**What to do.** From the start, a cheap brake: a hidden field that people don't fill in, and a limit on submissions per address per minute. And an admin with pages, newest first, and a way to delete or mark as junk. Test it by sending hundreds of messages with a script and opening the admin on a phone.

### WEB-3. A fallback nobody tested is not a fallback

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web`

**The idea.** A form with `method` and `action` promises a fallback that works even if JavaScript fails. If the server only answers what the JavaScript expects, the promise is false and the person ends up staring at code.

**Example.** In both runs of the Web simulation, the form submitted with JavaScript and declared `method="post"`. Without JavaScript, in one version the server rejected the submission with a line of JSON and the message was lost; in the other it saved the message and showed only `{"ok":true}` on a blank page. This second version's summary said it would not submit without JavaScript.

**Detector question.** If this JavaScript file doesn't load, what does the person see when they submit?

**Warning sign.** "Everyone has JavaScript anyway" · "I'll leave the `action` in just in case."

**What to do.** Decide on one of two and test it: either the server accepts the normal submission and replies with a page (or redirects to a thank-you page), or the form doesn't declare a fallback it doesn't have. Submit once with JavaScript turned off.

### WEB-4. If you disable the button, focus goes with it

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web`

**The idea.** Disabling the button while submitting prevents a double submission, but the button loses focus and the browser moves focus to the document. Someone using the keyboard, after the notice, starts over from the top.

**Example.** In both runs of the Web simulation, submitting disabled the button. With an email the server rejected, the notice appeared below the button, focus landed on the document, and the next Tab took the user to the first link on the page, far from the field that needed fixing.

**Detector question.** After submitting, whether it succeeded or failed, where does focus end up and where does the next Tab go?

**Warning sign.** "I disable it so nobody can submit twice."

**What to do.** When submission finishes, put focus where the person needs to continue: on the field with the error (marked with `aria-invalid` and its message next to it) or on the success notice. Or prevent the double submission without disabling, using `aria-disabled` and a flag. Go through the error using only the keyboard.

### WEB-5. A password login without an attempt limit is only as strong as the weakest password

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web`

**The idea.** A login that answers every wrong password at full speed lets anyone try thousands a minute. A strong default password hides the problem until the owner sets their own, and nothing stops that one from being short.

**Example.** In both runs of the Web simulation rerun, the admin page asked for a password and never limited failed attempts: 200 wrong passwords in a row got 200 refusals in under a second, none blocked. The default password was long and random, but the builder's own summary told the owner how to set a new one, and nothing required it to be long.

**Detector question.** How many wrong passwords can someone try against this login in a minute, and what happens after the fifth?

**Warning sign.** "The default password is strong" · "it's only the admin page".

**What to do.** Slow down or block repeated failures, per address and per account, with a wait that grows. Require a minimum length when the owner sets a password. Test it: send twenty wrong passwords in a row and check that the last ones are refused.
