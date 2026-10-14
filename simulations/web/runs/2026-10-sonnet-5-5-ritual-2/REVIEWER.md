# What the reviewer said

`claude-opus-5-5` · success · 44 turns · $2.0315516 · 46794 output tokens

I've written `FINDINGS.md` and `verdicts.json` in the build folder. All 10 listed lessons came out **broke**, each with output from a run, and there are 4 new findings no lesson covers. I didn't change anything in the build, and every server I started is stopped.

**How I ran it:** `node servidor.mjs` failed because another app on this machine already uses port 3000, so I don't count that as a finding. That one start did leave an empty `datos/` folder in the build folder. For the tests I ran a copy of the build on another port, with Node probe scripts and headless Chrome. The scripts and screenshots are in `review-tools-rl/`.

**Most serious findings:**
1. **The admin "lockout" blocks nothing (WEB-5, and a false claim).** After 10 wrong passwords, wrong guesses get a 429 instead of a 401, but the right password still gets in. In one test, 200 wrong guesses from one IP took 573 ms (10 got 401, 190 got 429), and the right password right after still worked.
2. **Without JavaScript, nobody sees a confirmation (WEB-3 and 41, and a false claim).** The message is saved, but the page comes back with no "Gracias". An error sends the person to a page with one line of plain text.
3. **A double click says it failed when it worked (32 and 45).** The message is saved once, then a red "Completa nombre, correo y mensaje." replaces the thanks.
4. **The send limit counts rejected attempts (49).** After 5 bad tries, a valid message from the same IP gets a 429. Someone without JavaScript sees raw JSON.
5. **A damaged message file can make every later message fail (WEB-1).** If `mensajes.json` holds valid JSON of the wrong shape (`{}` or `null`), every send and the admin page return 500. When the file is cut in half, recovery works, but the admin list goes from 252 messages to 1 and the only notice is in the console.
6. **The server slows down as messages pile up (46).** With 40,000 messages, 20 sends at once took 7 s, and the home page took 7 s to load during that.
7. **Spam gets in freely (WEB-2).** 200 spam posts from 40 IPs were all accepted. The admin page only deletes one message at a time, each with its own confirmation.
8. **Focus is lost after sending (WEB-4).** Focus drops to the page body, and the next Tab leaves the page.

**New findings:**
- The white hero text has 2.07:1 contrast at 375 px; it needs 4.5:1.
- The mobile nav links are only 25 px tall.
- Form errors don't mark which field is wrong.
- A JSON `null` body causes a 500 error, and non-text field values are stored as `"[object Object]"`.

**What held:**
- HTML in a message is shown as text in the admin page and doesn't run.
- Every path traversal attempt returned 404.
- Admin requires a password.
- The server validates fields itself, not only the browser.
- No horizontal scroll at 375 px.
- Focus is visible when tabbing, and the form can be sent with the keyboard.
- The page doesn't jump while loading.
- 40 sends at the same time were all saved.
- Killing the server in the middle of a send never damaged the file.

`FINDINGS.md` also has one new candidate lesson (checking text contrast over a photo at every width) and proposed refinements to WEB-5 and WEB-1.
