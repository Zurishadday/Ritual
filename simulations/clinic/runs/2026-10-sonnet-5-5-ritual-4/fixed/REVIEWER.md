# What the reviewer said

`claude-opus-5-5` · success · 45 turns · $1.8941201999999997 · 38866 output tokens

I finished the review and wrote `FINDINGS.md` and `verdicts.json` (it parses: 10 lessons, 5 new mistakes). I fixed nothing in the build, and all the servers I started are stopped.

**How I tested.** `node servidor.mjs` starts and serves `localhost:3000`. The build's own test (`node prueba.mjs`) passed 43/43. Most of my checks ran against the same server on other ports with a temporary data folder, so the real `datos/` was not touched. A headless Chrome let me do the mobile, keyboard and no-JavaScript checks for real.

**What broke, worst first:**
1. **Bots can switch off online booking.** The server accepts only 40 requests per hour in total, from everyone. In my test, bot requests from 9 addresses used them up, and the next real person from a new address was refused (429). Nothing records that anyone was refused.
2. **A "Mostrar más (0 restantes)" button always shows in the clinic's panel**, even with nothing left to load. A stylesheet rule overrides the code that is supposed to hide it.
3. **If saving fails, only the patient finds out.** With the data file read-only, every patient is told "llámanos" (an error). The panel still looks normal, and the only trace is in the server window.
4. **Without JavaScript, the error page's own button empties the form**, so the person retypes everything. The browser's Back button does keep the data.
5. **Smaller ones:**
   - The white text on the cover sits on light figures in the picture, at about 2.5:1 contrast (4.5:1 is needed).
   - The cover photo's description talks about a therapist helping someone walk, but the image just shows two standing figures.
   - After logging in, focus lands on "Salir" (log out).
   - The startup message suggests a command that doesn't work in PowerShell; the README gives the right one.

**What held up** (all tried, with the results in `FINDINGS.md`):
- **Server checks:** it validates every field itself (empty, wrong phone or email, Sunday, past date, 20:00, 100 KB fields).
- **Abuse:** paths outside the site are blocked, HTML in a request shows as plain text, and five wrong passwords lock that address out for a minute.
- **Browser:** a double click saves only one request, everything fits at 375 px, and the keyboard order is clear with visible focus.
- **Data:** nothing is lost under simultaneous requests, and a half-written line doesn't block the next request. With 50,000 saved requests the panel still loads in about 10 ms.

**Lesson verdicts:**

| Verdict | Lessons | Why |
|---|---|---|
| broke | 41, 49 | Both from the panel button that should be hidden |
| held | 32, 45, 46, WEB-1 to WEB-5 | Tried and did not happen |

I proposed two new lessons: the bot limit that shuts out real patients, and telling the owner when saving fails (possibly better folded into WEB-1). I also proposed sharpening WEB-3 for the no-JS error page, and added an example to lesson 49 instead of writing a new one.

`lessons/TEMPLATE.md` isn't in the folder. I used the five parts the listed lessons seem to follow (title, mistake, why it happens, what to do, detector question).

My test scripts and screenshots are in `_revisor/`. The build serves only `public/`, so they aren't reachable from the site.
