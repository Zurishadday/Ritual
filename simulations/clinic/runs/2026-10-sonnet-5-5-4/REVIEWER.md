# What the reviewer said

`claude-opus-5-5` · success · 45 turns · $1.7626631999999998 · 43648 output tokens · 5 denied tool call(s)

The review is finished. I've written `FINDINGS.md` (16 findings, 3 candidate lessons) and `verdicts.json`. I fixed nothing in the build, and I stopped both the server and headless Chrome (curl to ports 3210 and 9333 now fails to connect).

**How I tested:** there's no README, so I followed the comment at the top of `servidor.mjs` (`node servidor.mjs`). I started it on port 3210 with a known admin password. For the browser checks (mobile width, keyboard, JavaScript off, the clinic's page) I drove headless Chrome from Node scripts, and the screenshots are in `_revisor/capturas/`. Tests that damage saved data ran on a copy of the build.

**Most serious findings:**
1. **The build's own test deletes the clinic's data.** Running `prueba.mjs` removes the `datos/` folder, so `datos/` no longer exists afterwards. If the owner runs it in the live folder, every patient request is gone.
2. **A damaged data file is silently wiped (lesson WEB-1).** With a truncated file holding 3 requests, the server started normally and the next booking saved over it, leaving 1 request. Nobody is told.
3. **One failed disk write breaks every save after it.** After a single failure, every later request got a 500 even once the disk was fine. The clinic's page still showed those requests, and they disappeared on restart.
4. **Without JavaScript the form saves nothing (WEB-3).** The page reloads at the top with the name, phone and email in the address bar. There's no message, and no hour can be picked.
5. **Errors from the server can't be seen (lessons 32 and 45).** A phone with letters passes the browser check. The server's error then appears above the visible screen, and the keyboard focus is lost.
6. **Focus is lost after sending (WEB-4).** After submitting, the next Tab jumps to the phone link in the contact section. Confirm and Cancel on the clinic's page also lose focus.
7. **The clinic's page doesn't fit a phone with a long name.** At 375 px the page becomes 994 px wide, and the name, email and one button are cut off.
8. **Bots can fill the form (WEB-2).** There's no bot defence and no way to delete requests. Once 5000 are stored, every real patient gets an error.
9. **The server accepts nonsense values.** Sending `constructor` as the treatment books 23:00, and the clinic's page shows JavaScript code instead of a treatment name. Yesterday's date and off-grid times like 09:07 are also accepted.

**What held:**
- HTML in a request shows as plain text on the clinic's page and doesn't run.
- The file server blocks `../` paths.
- The login locks after 5 wrong passwords (WEB-5).
- 50 requests sent at once all saved.
- The clinic's page loads in 36 ms with about 5000 requests (lesson 46).
- The public page at 375 px has no sideways scroll.
- A double click in the browser saved once.

**Lesson verdicts:** WEB-1, WEB-2, WEB-3, WEB-4, 32, 41 and 45 broke; 46, 49 and WEB-5 held.

`lessons/TEMPLATE.md` isn't in the folder, so I wrote the five lesson parts in a standard shape. My scripts (`_revisor/`) and the test requests I sent (`datos/solicitudes.json`) are still in the folder.
