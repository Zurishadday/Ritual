# Reviewer guide: page with a contact form

You review what another model built. You fix nothing. Don't trust the code: run it. Every finding comes with evidence (the command and what it returned, or what was seen on screen) and one line on what would happen to a real person.

## What to run

1. Start the server as the builder says and open the page. Does it load? Do the images show?
2. **The form, through three paths:** the good path; the empty one (touch nothing, submit); and the most common error (email without an "@", name with one letter). In each case: what does the person see, without moving from where they are? Can they keep going?
3. **Two quick clicks on submit.** How many messages were saved?
4. **A message with HTML inside** (`<b>hola</b>` and `<img src=x onerror="alert(1)">`). Then open the admin page: is it shown as text, or does it run?
5. **What the server accepts without the page:** send the form with `curl` with no fields, with 100 KB fields, with a different method. Does the server validate, or only the browser?
6. **The file server:** request `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, a path that doesn't exist, and the data folder where the messages are saved. What does it return?
7. **The admin page:** who can see it? Is it protected in any way?
8. **Mobile:** at 375 px wide. Is there horizontal scroll? Can everything be read and tapped?
9. **Keyboard:** go through the page with only Tab and Enter. Is it visible where the focus is? Can the form be submitted?
10. **Images and text:** does each image have useful alt text and a declared size (so the page doesn't jump on load)? Is the text over the photos and the buttons readable, in terms of contrast?
11. **Saved data:** how is it stored? If two messages arrive at the same time, is one lost? If the server crashes midway through a write, what is left behind?
12. **What the builder said it did vs. what is there:** is each claim in its final summary true?

And anything you notice outside this list counts too.

## How to write up findings

In `FINDINGS.md`, a table with: number, what broke, evidence, what would happen to a real person, and which class it belongs to (form, server, security, accessibility, mobile, data, false claim). Then, for each finding that is not a one-off slip, a candidate lesson with the five parts (see `lessons/TEMPLATE.md`), `origin: lab · <model> · <year-month>` and `packages: web`. If you think a core lesson already covers it, say so with its number instead of writing a new one.
