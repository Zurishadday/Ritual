# What the reviewer said

`claude-opus-5-5` · success · 36 turns · $1.3306652 · 29508 output tokens

I ran every check in the guide against a copy of the build, all of them, including the mobile, keyboard and no-JavaScript ones in headless Edge. The build mostly holds up. One listed lesson broke (WEB-2), I found four new problems, and two claims in the builder's summary are false by one. The results are in `FINDINGS.md` and `verdicts.json` in the build folder.

**Lesson verdicts:** 9 held, 1 broke, none left unchecked.

- **Held:** 32, 41, 45, 46, 49, WEB-1, WEB-3, WEB-4, WEB-5.
- **Broke, WEB-2 (bots):** the honeypot and per-IP limit only stop a bot sending from one address.
  - With 1000 bot messages seeded, `/admin` shows 21 pages with no search and no bulk select. The owner can delete one message at a time or everything, including the real customer.
  - Once the 5000-message cap fills, real customers get a 503 saying "Ahora mismo no podemos recibir mensajes".

**New findings:**
1. **Too-large messages:** a request over 16 KB gets a connection reset, not the "Mensaje demasiado grande" page the code writes, because the server closes the connection before replying.
2. **Broken link encoding:** a URL like `/%E0%A4%A` returns 500 ("Algo salió mal") instead of "Página no encontrada".
3. **Limits off by one (false claim):** both limits allow 6, not 5. Six wrong passwords got 401 before the first 429, and the contact form saved a sixth message in the same window.
4. **Damaged lines take up space:** they count toward the 5000 cap, and neither "Borrar" nor "Borrar todos" in admin removes them.

Smaller issues: the mobile menu links are 38 px tall (under the usual 44 px). The no-JavaScript error page shows the message but doesn't mark the wrong field or move focus to it.

**What held when I tried it:**
- The form works on the good path, on an empty submit and with a bad email. It keeps what the person typed and shows the result where they are looking.
- Double and triple clicks save one message.
- HTML in a message shows as plain text in admin.
- No path tried reads files outside the public folder.
- There is no horizontal scroll at 375 px.
- The focus outline is visible at every Tab stop.
- `/admin` takes 63 ms with a full mailbox.

**Two candidate lessons** are written up in `FINDINGS.md`: one on the error reply that never arrives, one on testing a limit at N and N+1. WEB-2 already covers the bot finding. Two of the five lesson parts are my own structure, because `lessons/TEMPLATE.md` wasn't in the folder.

**What the builder said:** "I couldn't run anything" is true, and `web-check.mjs` isn't in the folder either. The rest of the summary checked out except the two limits.

**Notes:**
- Everything ran against a copy in `%TEMP%\rv-rueda`, so the build folder only gained `FINDINGS.md` and `verdicts.json`.
- My scripts and screenshots are in `%TEMP%\rv-tools`.
- I stopped the servers I started, and the browser closed when the test script ended.
- The test script's first run gave false failures because of smooth scrolling. I fixed the script and ran it again; only the second run counts.
