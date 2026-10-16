# What the reviewer said

`claude-opus-5-5` · success · 62 turns · $2.7524333999999993 · 57238 output tokens · 4 denied tool call(s)

The review is finished: `FINDINGS.md` and `verdicts.json` are in the build folder, and I changed nothing in the build itself. Everything was run, not just read. I used copies of the build, Node for the server checks, and headless Chrome driven from Node for clicks, the keyboard, 375 px phone screens and the no-JavaScript case. All the test servers are stopped.

**Lessons: 5 broke, 5 held.**
- **WEB-1 (damaged store): broke.** If one entry in the saved file is `null`, every new request returns "Error del servidor" and the clinic's list fails too. If one saved record is missing its date, the clinic's page shows no requests at all and no error. A cut-off file is handled well: it's moved aside and the next request saves.
- **WEB-2 (bots): broke.** After 500 fake pending requests, a real patient gets "llámanos". The clinic can only delete them one at a time, each with a confirmation dialog. The default limit of 5 per hour per IP means it takes about 100 IPs to do this in an hour.
- **46 (grows with content): broke.** With 10,000 saved requests, the clinic's page takes 6.9 s to load, and one "Cancelar" click takes 15.4 s to redraw.
- **41 (check what the reader sees): broke.** The CSS does wrap long text inside the cards. But on a 375 px phone, a request with an 80-character name still makes the clinic's page 904 px wide, so every card is cut off.
- **32 (change you can't see): broke.** With the "Pendientes" filter on, confirming a request makes its card vanish. Focus jumps to the page body, and the success message is shown off-screen. A code comment says focus returns to the same button, which is false in this case.
- **Held: 45, 49, WEB-3, WEB-4, WEB-5.**
  - Form mistakes show the error next to the right field and move focus there.
  - Two quick clicks save one request.
  - The form still works with its script blocked.
  - The login allows 5 wrong tries, then blocks, even with 300 sent at once.

**Other things that held:**
- **Server:** HTML in a name or comment is shown as plain text, and every attempt to read files outside the public folder returned 404. The server rejects bad input on its own, without the page.
- **Data:** 100 simultaneous submissions plus 20 status changes all saved. Killing the server mid-write left a valid file.

**New findings, no lesson for them yet:**
- Without JavaScript, the error page's only button, "Volver al formulario", brings back an empty form, so the person loses everything they typed. I wrote one new candidate lesson for this.
- The server accepts `__proto__` or `toString` as a treatment, and an object as a name. This is a one-off slip.
- Two small contrast misses: on a phone the hero subtitle measures 3.86:1 (needs 4.5:1), and the focus outline over the hero is 1.84:1 (needs 3:1).

The build has no README; the only start instructions are in the server's first comment and what it prints at startup. I couldn't find `lessons/TEMPLATE.md` in this folder, so I used a copy left from an earlier Ritual session elsewhere in Temp for the lesson's five parts.

My test scripts are in `..\review-JBPzuT-tools\`. The server copies and their data are in the `..\review-JBPzuT-*` folders next to the build.
