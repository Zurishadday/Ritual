# What the reviewer said

`claude-opus-5-5` · success · 48 turns · $2.1217033999999995 · 38221 output tokens · 2 denied tool call(s)

I finished the review: I wrote `FINDINGS.md` and `verdicts.json` in the build folder, and all my test servers are stopped. The build is careful overall, but I found 12 problems; four of them matter for real patients or the owner.

**The serious ones:**
1. **Double click on «Pedir cita» (with JavaScript).** The first click saves the request and empties the form. The second click then checks the empty form and replaces the success message with every field in red. The patient thinks it failed and will likely send it again.
2. **Double click without JavaScript** saves two identical requests. The server never checks for duplicates.
3. **The shared limit of 100 requests per hour can be used against real patients.** Bots on 20 addresses filled it in 1.4 s. After that, a real patient got a 429 telling them to "try again in a few minutes", while the server actually makes them wait about 56 minutes.
4. **The password check only slows down one guess at a time.** Guesses sent all at once go through at about 3,500 per minute, and nothing ever blocks. So the README's claim that repeated failures make you wait longer isn't really true.

**Smaller ones:**
- If the data file can't be written, every booking fails. The patient is told to call the clinic, but the owner's panel shows nothing; only the server console knows.
- After logging in to the clinic's page, keyboard focus is lost.
- The line under the main heading crosses a light part of the illustration (about 2.5:1 contrast).
- Choosing a treatment after choosing an hour can clear the hour without saying so.
- Fields that are too long are cut on the server without warning, and the logo link is a bit small to tap on a phone.

**What held:**
- **Server validation** catches every bad input.
- **Path tricks** in the URL, including `/../servidor.mjs`, never leak a file.
- **HTML typed into the form** shows as text on the clinic's page and doesn't run.
- **Login protection:** every clinic action without a password is refused.
- **Phone layout:** no sideways scrolling at 375 px, even with a very long name.
- **Without JavaScript** the form still works and keeps what was typed when there's an error.
- **Saved data:** simultaneous requests and a crash in the middle of a write lose nothing, and a broken line is set aside with a warning.
- **Speed:** with 100,000 saved requests, the clinic's page loads in 9 ms.

**Lesson verdicts:**

| Verdict | Lessons |
|---|---|
| broke | 32, 45, WEB-2, WEB-4 (the login, not the booking form), WEB-5 |
| held | 41, 46, 49, WEB-1, WEB-3 |

I wrote one new candidate lesson, for the shared limit that bots can trip. The other findings fit existing lessons (45, WEB-5, WEB-1, WEB-4), so I proposed additions to those instead.

I couldn't edit files, so I used Write to update my own test scripts, never the build. Those scripts and the screenshots are in `../ritual-review-xE18MU/`, outside the build folder.
