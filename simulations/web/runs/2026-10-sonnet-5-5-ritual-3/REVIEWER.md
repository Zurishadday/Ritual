# What the reviewer said

`claude-opus-5-5` · success · 52 turns · $1.7077030000000002 · 36942 output tokens

The review is finished: `FINDINGS.md` and `verdicts.json` are written in the build folder, and the JSON parses. I ran everything: the server through `node servidor.mjs`, raw HTTP probes from Node scripts, and headless Chrome driven from Node at 375 px and 1280 px wide, with screenshots. I changed nothing in the build, and every server I started is stopped.

**Lessons:** eight broke, two held, none left unchecked.
- **32, 41, WEB-3 (broke):** with JavaScript off, a good submit saves the message but shows nothing. The page reloads at `/?enviado=1` and the notice stays hidden, because only `app.js` fills it in. On an error the form comes back empty with no message. So the builder's claim that it "works without JavaScript" is false from the visitor's side.
- **45, 49 (broke):** the 5-per-10-minutes limit is checked before validation, so rejected attempts count. Five typo submits use up the quota, and the corrected email then gets 429 "Demasiados mensajes".
- **WEB-4 (broke):** after a server-side error, focus drops to the page body and the next Tab stays there.
- **46, WEB-2 (broke):** the admin page shows every message on one page, and each save rewrites the whole file. With 40,000 messages the admin page is 14.4 MB of HTML, and 20 parallel requests take 2.7 s. There is no delete, search or paging.
- **WEB-5 (held):** after 5 wrong passwords, the 6th attempt gets 429.
- **WEB-1 (held):** the message after a damaged file is still saved, and the damaged file is set aside. But the owner is only told in the console; `/admin` just shows "(0)".

**Findings no listed lesson covers:**
- **Behind the HTTPS proxy the builder recommends, the per-IP limits apply to everyone at once.** I put a minimal proxy in front: after 5 messages from any visitors, the 6th and 7th got 429. After an attacker sent 5 bad passwords, the owner got 429 with the correct password from a different IP.
- **The browser and the server disagree on valid emails.** `luis@gmail` passes the browser's email check, then the server rejects it.
- **A 100 KB body gets a dropped connection**, not the promised "Mensaje demasiado largo." (413).
- **The mobile nav links are 21 px tall**, small to tap.
- **The amber focus ring has 2.0:1 contrast on white**, below the 3:1 guideline.

I wrote two candidate lessons, for the proxy rate limit and the mismatched email rules. The rest map to existing lessons or are one-off slips.

**Things that held:**
- Path traversal attempts are refused and the data folder isn't served.
- Wrong methods get 405, and the server validates empty or missing fields.
- HTML in a message shows as text in the admin page and doesn't run.
- 10 messages sent at once were all saved, and a double click in the browser saved only one.
- There's no horizontal scroll at 375 px.
- The whole form works with Tab and Enter alone.

`datos/` in the build folder now holds my test messages and a `mensajes.json.dañado-*` file from the damaged-store test. My shell couldn't delete files, so I left them. The test scripts and screenshots are in `%TEMP%\revisor-rl\`.
