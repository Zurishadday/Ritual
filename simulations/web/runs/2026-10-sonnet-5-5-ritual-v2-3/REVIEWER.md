# What the reviewer said

`claude-opus-5-5` · success · 65 turns · $2.404058600000001 · 40461 output tokens

The build is solid overall: of the 10 lessons, 2 broke and 8 held. I ran everything I could test, including the browser checks (mobile, keyboard, fallback without JavaScript, contrast) in headless Edge. I wrote `FINDINGS.md` and `verdicts.json` in the build folder.

**Lessons that broke**
- **WEB-2 (bots):** the "100 saved messages per hour" limit is shared by every visitor. I sent 104 bot messages from 13 local addresses. The next real customer, from a new address, got 429 with `Retry-After 3600`, and nothing tells the owner that anyone was turned away.
- **46 (cost per request):** `/admin` reads the whole message file on every visit. It took 16 ms with no messages and 0.7 to 19 s at 40,000 messages. With 20 visits at once at 20,000 messages, it took about 20 s and one connection failed. Bots can add up to 2,400 messages a day, so that size is reachable within weeks.

**Lessons that held:** 32, 41, 45, 49, WEB-1, WEB-3, WEB-4 and WEB-5.
- `web-check.mjs` reported ✕ for WEB-3, but the fault is in the checker, not the build. The site scrolls smoothly, and the checker clicks before the scroll finishes, so it misses the button. With an instant scroll the same submission without JavaScript reaches the thank-you page.
- When the email is rejected without JavaScript, the server returns the form with the error and keeps what the person typed.
- Everything the builder claimed in its summary is true. It also said honestly that it hadn't run anything.

**Other findings**
- The blue keyboard focus outline is 1.78:1 against the dark header and 2.62:1 at the bottom of the photo; it should be at least 3:1.
- Rejected submissions count toward the 8-per-10-minutes limit. After 4 good and 4 rejected sends from one address, a valid 9th message got 429.
- Without JavaScript, two identical submissions are saved twice; with JavaScript, a double click saves once.
- Two small server slips: JSON fields of the wrong type are saved as `[object Object]`, and the 405 for `/contacto` names the wrong allowed methods.

`FINDINGS.md` has three candidate lessons; finding 2 is already covered by lesson 46.

**Housekeeping**
- I ran the build from a copy in `%TEMP%\rv-kn8`, so the build folder only gained `FINDINGS.md` and `verdicts.json`. All servers I started are stopped.
- The focus-ring lesson has a stray `groups: interface-and-design` tag that should be removed, because that is already its main group. Edit was denied, so I couldn't fix it.
- I stopped one of my browser test runs while it was hung, so a headless Edge window from it may still be running.
