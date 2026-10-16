# What the reviewer said

`claude-opus-5-5` · success · 47 turns · $2.0112677999999997 · 39370 output tokens · 4 denied tool call(s)

The review is written up in `FINDINGS.md` and `verdicts.json`. I changed nothing in the build. The build is solid overall, and its own `node pruebas.mjs` passes 47/47. I found 7 problems, 5 of which I'd call real.

**What broke:**
1. **A corrected resubmission is thrown away but reported as sent.** A patient who sends the form again within 2 minutes with a fixed email is told "¡Listo!". The clinic keeps only the first, wrong email and never sees the added comment. This falls under lesson 49.
2. **The clinic's page loads every request at once.** With 20,000 saved requests it takes 5.6 s to appear and about 3 s per letter typed in the search box. It takes 1.5 s at 5,000. This is lesson 46.
3. **Pending spam can't be removed in bulk.** Bulk delete only works for cancelled or confirmed requests; for pending ones the server answers 400. The owner has to cancel bot requests one by one first. This is WEB-2.
4. **New lesson candidate: once hosted behind a proxy, the limits apply to everyone together.**
   - After 30 posts in 10 minutes, every patient gets "too many requests".
   - Anyone who tries 5 wrong passwords locks the owner out too: the correct password then gets "wait 60 seconds".
   - The `TRUST_PROXY` setting that fixes this is only in a code comment, not in `LEEME.md`.
5. **Confirming a long request gives no visible result.** When the owner taps "Confirmar" at the bottom of a long card, the "Confirmada" badge and the message end up above the screen. This is lesson 32.

The two minor ones: some header links are under 44 px tall on a phone, and with JavaScript on, a field the server rejects isn't marked as wrong.

**What held:**
- The server checks every field itself: past days, weekends and 20:00 are all rejected.
- Paths like `/../servidor.mjs` return 404.
- HTML in a name or comment shows as text, not code.
- With JavaScript off, the form still sends and shows readable errors.
- Two quick clicks save one request.
- 20 requests at once plus a status change lose nothing.
- A crash leaves valid data, and a damaged file is set aside so the next request still saves.
- Keyboard focus is always visible, and there is no sideways scroll at 375 px.

Verdicts: lessons 32, 46, 49 and WEB-2 broke. Lessons 41, 45, WEB-1, WEB-3, WEB-4 and WEB-5 held. The mobile and keyboard checks ran in headless Chrome at 375 px.

**Things you need to know:**
- **A server is still running on port 3000.** It's the one I started with `node servidor.mjs`. Stopping the task didn't kill it, it still answers, and my shell isn't allowed to end the process, so please stop it yourself. Port 3101 is down.
- **Running the build created `datos/` in this folder.** It holds a generated password and 5 test requests, one of which contains `<img onerror>`.
- **`lessons/TEMPLATE.md` isn't in this folder,** so I guessed the five parts for the new lesson.
- **My test scripts and screenshots are in `..\ritual-review-BA7GY3\`,** outside the build.
