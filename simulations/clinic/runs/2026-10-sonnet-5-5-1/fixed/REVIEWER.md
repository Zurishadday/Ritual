# What the reviewer said

`claude-opus-5-5` · success · 60 turns · $1.8737099999999998 · 37782 output tokens · 2 denied tool call(s)

I've written `FINDINGS.md` (10 findings) and `verdicts.json` in the build folder. All servers and headless browsers I started are stopped, and I changed nothing in the build. My test scripts and screenshots are in `%TEMP%\review-x29\`.

**What breaks most for a real person:**
1. **With JavaScript on, the appointment form never sends.** Every submit fails with an error in `app.js`, because it looks for an `#err-comentario` element that isn't in the page. The patient sees nothing, not even an error message, and the server saves 0 requests (two quick clicks: count stayed 10 → 10). Only the no-JavaScript fallback actually saves requests.
2. **The build's own `node prueba.mjs`, which the README tells the owner to run, deletes the whole `datos/` folder.** In my seeded copy it printed "Todo bien" and wiped 50,100 requests, the backup and the admin password.
3. **About 100 bot posts an hour lock every real patient out.** There is one global limit of 100 per hour shared by everyone. After 100 bot posts, a real patient from a fresh IP gets 429, with or without JavaScript.
4. **The login lockout doesn't stop guessing.** After 10 failures, wrong guesses get 429 but the correct password still gets in, and a success resets the counter. I made 200 attempts in 1.7 seconds.
5. **Smaller ones:**
   - The no-JavaScript error page throws away everything typed and shows one error at a time.
   - The server saves identical submissions twice.
   - The admin search box and status filter are about 20 px tall on a phone.
   - A damaged data file is only reported on the server console.
   - The README's claim that the test "checks the main things" is false: it only checks the server, never the page.

**What held up:**
- The server checks every field on its own, including the clinic rules (Sunday, past date, 20:00).
- Path-traversal requests return 403 or 404, and every admin action needs the password.
- Injected HTML shows as plain text in the panel.
- Neither page scrolls sideways at 375 px.
- Text contrast passes.
- Requests arriving at the same time are all saved, and a damaged file is recovered.
- The admin list loads in 14 ms with 50,000 requests.

**Lesson verdicts:**

| Verdict | Lessons |
|---|---|
| broke | 41, 45, WEB-2, WEB-5 |
| held | 32, 46, 49, WEB-1, WEB-3, WEB-4 |

I could check mobile and keyboard behaviour because Edge was installed and I drove it headless from Node.

**Notes:**
- I proposed four new candidate lessons. `lessons/TEMPLATE.md` isn't in the folder, so I used a five-part format of my own: title, what happened, why it happens, detector question, what to do instead.
- One risk I could only see in the code, not reproduce: if the data file can't be read at startup (locked, no permission), the server overwrites it with an empty file. It's noted in `FINDINGS.md` but not counted in the table.
