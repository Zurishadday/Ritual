# Interface and design

What applies when a person is going to see or use what you build: screens, components, styles, pages.

### 10. Twin modules change together

`origin: field`

**The idea.** If your product has two versions of the same screen, for two kinds of user, two regions, or two products, an improvement to one is a pending improvement to the other.

**Example.** The desktop version gained a date filter. The mobile version, which people see as "the same screen," went without it for a month.

**Detector question.** Does what I'm touching have a twin that users see as "the same module"?

**Warning sign.** "They didn't ask me for it on the other one."

**What to do.** Don't close the change until you've checked the twin and written either "same" or "doesn't apply because…".

### 19. A review of one dimension is not a review

`origin: field`

**The idea.** "They're already the same" requires having compared every property you can see, not just one.

**Example.** The design of two screens was made to match over four rounds: first the size, then the typography, then the colors, then the label color. Each delivery said "it's done."

**Another example.** The illustrations in a material were reviewed for content and size, but not for contrast: two text colors ended up below the minimum readable level in four images.

**Detector question.** Did I compare one property or all the ones the user sees?

**Warning sign.** "The size matches now, so the design is the same."

**What to do.** List all the differences before fixing the first one. And in your notes, the verb gives you away: "it's fixed" and "it becomes" are intentions; "it says" and "it shows" are measurements.

### 31. Nothing technical on screen unless it changes a decision

`origin: field`

**The idea.** Every element of a business screen should help decide something. What helps audit goes in the code; what helps decide goes on the screen, in business language.

**Example.** A sales screen showed the internal ID of each order and the time of the last calculation in its first row. Nobody decided anything with it, and it took the space of the data that did matter.

**Detector question.** Does this change any decision of whoever uses the screen? If not, why is it here?

**Warning sign.** "In case someone needs it."

**What to do.** Before adding something to the screen, write down what decision it changes. If it changes none, it goes to the technical log or the code, not the screen.

### 32. Something that works but can't be seen gets reported as broken

`origin: field` · `packages: web, apps`

**The idea.** If a button changes something outside the view, for the user, working and not working look the same.

**Example.** A filter did filter a table, but the table was two screens further down. They reported it as "does nothing."

**Variant.** Hiding a container hides everything inside it, even things that had nothing to do with it. For example, a useful link that lived inside a retired control.

**Detector question.** Right after using the control, without moving from where it is, does the user see what changed?

**Warning sign.** "It does work, it just doesn't show."

**What to do.** Every control says what changed and takes the user to it. And before hiding something, check what other elements live inside it.

### 33. The glyph is not the text

`origin: field`

**The idea.** In small print, "÷" and "+", "l" and "1", "O" and "0" get confused. If two people read the same thing wrong, they're not distracted: it's the size of the type.

**Example.** Two different people read "98 ÷ 441" as "98 + 441" on a card set in small print, and both reported that the calculation was wrong.

**Another example.** The code font of a material joined `>=` into a single symbol, ⩾. Whoever is learning copies what they see, and that symbol doesn't exist on the keyboard or in the language.

**Detector question.** At the size and font where it will be read, can this symbol be confused with another, or does it look like something that can't be typed?

**Warning sign.** "It looks fine on my screen."

**What to do.** When a symbol gets confused, replace it with a word: "98 over 441" instead of "98 ÷ 441".

### 41. Check in the format the reader actually sees

`origin: field` · `groups: tests-and-checks` · `packages: web`

**The idea.** Finding a word in the text doesn't prove it shows up. The text can be somewhere else in the document while the format that was supposed to display it comes out empty.

**Example.** Three numbered steps came out as empty bullets. The automatic check passed them because those words appeared somewhere else in the document.

**Another example.** A "there are more columns to the right" notice was added and taken as done because the code was there. It never appeared: a general table style removed the condition that turned it on. Someone else saw it in a screenshot.

**One more example.** An answer option said "Total: {2 * 78}" in the file. When the page was drawn, the system calculated what was between the braces and showed "Total: 156": two identical options. Only someone who looked at the screen saw it.

**Detector question.** Did I see the exact element the way the reader sees it, or did I only find the word (or the code) in the source?

**Warning sign.** "The word is in the file" · "it's a one-line fix."

**What to do.** Check the exact element, like "these three steps, as bullets," and look at the page as the reader will see it at least once. A small fix still gets checked: it's where another rule is least expected to override it. And the first time you use a new resource on the page (a code block, a fixed header), look at it on mobile too.

### 45. Someone walks the error path too

`origin: field` · `packages: web, apps`

**The idea.** If you only test what happens when everything goes right, whoever makes a mistake finds the gap. And when learning, making mistakes is the most common thing.

**Example.** A query cell counted an attempt only when the query ran. With a typo, the button to advance never activated, and the person got stuck. The tests passed, because they always ran the starting query, which had no errors.

**Detector question.** If the user does the most likely wrong thing (a typo, an empty answer, two clicks), what do they see, and can they keep going?

**Warning sign.** "It works with the right answer."

**What to do.** For each control, test three paths: the good one, the most common error, and the empty one. All three say what happened and let the user keep going.

### 46. What runs on every request can't grow with the content

`origin: field` · `packages: web`

**The idea.** Something done on every page, like reading all the content or recalculating an index, costs little with ten pages and a lot with a hundred. It grows gradually and nobody notices, until something starts failing "every now and then."

**Example.** Every page of a site read and parsed all the content to build the table of contents. Alone, one page took 0.4 s. But the sidebar requested about 40 at a time, and together they took 16 s. Months later, the tests started failing when switching pages, and the failure looked like a problem with the test.

**Detector question.** Does this thing that runs on every request go through all the content? How long does it take today, how long with double, and how long with many requests at once?

**Warning sign.** "It loads fast locally" · "it's an intermittent failure."

**What to do.** Measure on the compiled server and the way people use it, with all its requests together, not one page alone. Cache what doesn't change while the server runs, and leave a test that measures it with the case that actually made it slow.

### 49. A general rule must not silently beat the specific ones

`origin: field` · `packages: web`

**The idea.** A rule that applies to everything (a global style, a default value) can override what each piece decided for itself, without anything warning you.

**Example.** The keyboard focus style, written for the whole site, came with its own border radius. Because it ranked above each component's own styles, a pill-shaped button changed shape when focused with the keyboard. Nobody noticed, because with the mouse the focus doesn't appear.

**Detector question.** Does this general rule touch something each piece already decides for itself? If they clash, which one wins?

**Warning sign.** "I made it global so I wouldn't have to repeat it."

**What to do.** Let the general rule touch only what's its own (the focus outline, not the shape). If it should win on purpose, write that down next to it. And test it on the most different piece, not only the common one.

### WEB-2. A public form gets bots from day one

`origin: lab · sonnet · 2026-10` · `groups: scripts-and-files` · `packages: web`

**The idea.** A form open to the internet isn't filled out only by people. If nothing stops automated submissions and whoever reads the messages can't clean them up, the first wave of junk buries the real customers.

**Example.** In both runs of the Web simulation, the contact form accepted 650 messages from a script in a couple of seconds, all of them saying "thanks." The admin had no pages and no delete button: the admin page grew to between one and six million pixels tall, and on mobile the text of the message ran off the screen. Both times, the builder noted it as pending.

**Detector question.** If a thousand fake messages arrive tomorrow, how does the owner find the one real one, and how do they delete the rest?

**Warning sign.** "It's a small site, nobody's going to attack it" · "we'll add the limit later."

**What to do.** From the start, a cheap brake: a hidden field that people don't fill in, and a limit on submissions per address per minute. And an admin with pages, newest first, and a way to delete or mark as junk. Test it by sending hundreds of messages with a script and opening the admin on a phone.

### WEB-3. A fallback nobody tested is not a fallback

`origin: lab · sonnet · 2026-10` · `packages: web`

**The idea.** A form with `method` and `action` promises a fallback that works even if JavaScript fails. If the server only answers what the JavaScript expects, the promise is false and the person ends up staring at code.

**Example.** In both runs of the Web simulation, the form submitted with JavaScript and declared `method="post"`. Without JavaScript, in one version the server rejected the submission with a line of JSON and the message was lost; in the other it saved the message and showed only `{"ok":true}` on a blank page. This second version's summary said it would not submit without JavaScript.

**Detector question.** If this JavaScript file doesn't load, what does the person see when they submit?

**Warning sign.** "Everyone has JavaScript anyway" · "I'll leave the `action` in just in case."

**What to do.** Decide on one of two and test it: either the server accepts the normal submission and replies with a page (or redirects to a thank-you page), or the form doesn't declare a fallback it doesn't have. Submit once with JavaScript turned off.

### WEB-4. If you disable the button, focus goes with it

`origin: lab · sonnet · 2026-10` · `packages: web`

**The idea.** Disabling the button while submitting prevents a double submission, but the button loses focus and the browser moves focus to the document. Someone using the keyboard, after the notice, starts over from the top.

**Example.** In both runs of the Web simulation, submitting disabled the button. With an email the server rejected, the notice appeared below the button, focus landed on the document, and the next Tab took the user to the first link on the page, far from the field that needed fixing.

**Detector question.** After submitting, whether it succeeded or failed, where does focus end up and where does the next Tab go?

**Warning sign.** "I disable it so nobody can submit twice."

**What to do.** When submission finishes, put focus where the person needs to continue: on the field with the error (marked with `aria-invalid` and its message next to it) or on the success notice. Or prevent the double submission without disabling, using `aria-disabled` and a flag. Go through the error using only the keyboard.
