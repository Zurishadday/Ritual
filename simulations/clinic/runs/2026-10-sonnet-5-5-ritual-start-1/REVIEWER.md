# What the reviewer said

`claude-opus-5-5` · success · 68 turns · $2.540783 · 50688 output tokens · 3 denied tool call(s)

The review is finished and `FINDINGS.md` and `verdicts.json` are written. The main result: the clinic's page never shows a single request. The public side holds up well, but the owner can't see, confirm or cancel anything from her panel.

I ran everything: the plain `node servidor.mjs`, curl-style checks from Node scripts, headless Chrome at 375 px and desktop, and the builder's own `prueba.mjs`, which passes 26 of 26. I fixed nothing in the build, and all five servers I started are stopped (ports checked).

**What broke:**
1. **The clinic's page is empty.** With even one saved request, `admin.js` crashes while drawing the first card: `tarjeta()` creates the status badge without the `insignia` class, so `pintarEstado()` fails on a null. The panel shows a blank list.
2. **The owner gets no error message.** The crash message is written into the login form, which is already hidden. She would just think nobody has asked for an appointment.
3. **A stranger can lock the owner out.** The login allows 30 wrong passwords per minute across all addresses combined. After 35 wrong tries from 7 addresses, the owner's correct password from a new address got "Demasiados intentos", and it stays that way as long as the attack continues.
4. **A resend can lose its new comment.** If a patient sends the same phone, treatment, day and hour again with a new comment ("tengo marcapasos"), they see "¡Solicitud recibida!", but the new comment is never saved.
5. **Six failed tries block the seventh.** The limit of 6 submissions per 10 minutes counts rejected ones too. After 6 tries with a mistyped phone, the correct 7th was refused.
6. **Smaller items:**
   - **Misleading test line:** a line in `prueba.mjs` says the name "se muestra con textContent" but only checks the API.
   - **No instructions:** there is no README or how-to-test, which the request asked for.
   - **Phone number in three places:** the placeholder phone is hard-coded in three files, but the comment names two.
   - **Contrast on mobile:** part of the hero subtitle sits over a light shape in the photo, at about 2.7:1.

**What held:**
- **Form:** every error path in the browser (empty, phone with letters, email without "@", past day, Sunday, an hour already gone today) shows the error in view with focus on it, and the person can keep going.
- **Duplicates and blocked JS:** double clicks save one request. With `app.js` blocked, the form still submits and shows a result page.
- **Security:** the file server can't be tricked into serving files outside `publico/`, and nothing in the admin API works without logging in.
- **Data:** no request was lost under concurrent writes, and a damaged data file doesn't stop the next request from saving.
- **Scale:** with 20,000 saved requests the list loads in about 10 ms.

**Lesson verdicts:**

| Verdict | Lessons |
|---|---|
| broke | 41, 49, WEB-2 |
| held | 32, 45, 46, WEB-1, WEB-3, WEB-4, WEB-5 |

`verdicts.json` also lists five new mistakes. I couldn't check how a very long name looks on the clinic's page at 375 px, because the list never renders.

`FINDINGS.md` has four candidate lessons, each pointing to the existing lesson it refines (41, WEB-5 and 49, 49, WEB-2). One note: the template's data line uses the single word `packages: web`; I used `packages: web, apps` because your instructions asked for that.

My test scripts and screenshots are in `revision/`, inside the build folder. The default run also created `datos/` there with the password file and the request I posted.
