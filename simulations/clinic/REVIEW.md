# Reviewer guide: appointment requests for a clinic

You review what another model built. You fix nothing. Don't trust the code: run it. Every finding comes with evidence (the command and what it returned, or what was seen on screen) and one line on what would happen to a real person.

## What to run

1. Start the server as the build says (its README, its comments, `servidor.mjs`) and open the page. Does it load? Do the images show?
2. **The form, through its paths:** the good path; the empty one (touch nothing, submit); the most common errors (a phone with letters, an email without "@"); and the ones of this clinic (a day in the past, a Sunday, 20:00). In each case: what does the person see, without moving from where they are? Can they keep going?
3. **Two quick clicks on submit.** How many requests were saved?
4. **A request with HTML inside** (`<b>hola</b>` and `<img src=x onerror="alert(1)">` in the name and the comment). Then open the clinic's page: is it shown as text, or does it run?
5. **What the server accepts without the page:** send the form with `curl` with no fields, with 100 KB fields, with a Sunday or a past date, with a different method. Does the server validate, or only the browser?
6. **The file server:** request `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, a path that doesn't exist, and the folder where the requests are saved. What does it return?
7. **The clinic's page:** a wrong password many times in a row: what stops it? Can a request be confirmed or cancelled with `curl` without the password?
8. **Mobile:** at 375 px wide, the public page and the clinic's page with a very long name in a request. Is there horizontal scroll? Can everything be read and tapped?
9. **Keyboard:** go through the page with only Tab and Enter. Is it visible where the focus is? Can the form be submitted, and where is the focus after it?
10. **Without JavaScript:** submit the form with JavaScript off. What does the person see?
11. **Images and text:** does each image have useful alt text and a declared size? Is the text over the photo and on the buttons readable, in terms of contrast?
12. **Saved data:** how is it stored? If two requests arrive at the same time, is one lost? If a status changes while a request arrives? If the server crashes midway through a write, what is left, and does the next request still save?
13. **Many requests:** with thousands of saved requests, how long does the clinic's page take to load?
14. **What the build says it does vs. what is there:** is each claim in its README or its comments true?

And anything you notice outside this list counts too.

## How to write up findings

In `FINDINGS.md`, a table with: number, what broke, evidence, what would happen to a real person, and which class it belongs to (form, server, security, accessibility, mobile, data, false claim). Then, for each finding that is not a one-off slip, a candidate lesson with the five parts (see `lessons/TEMPLATE.md`), `origin: lab · <model> · <year-month>` and `packages: web`. If you think a lesson already covers it, say so with its id instead of writing a new one.
