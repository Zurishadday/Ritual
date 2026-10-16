# What the reviewer said

`claude-opus-5-5` · success · 44 turns · $2.183551 · 50871 output tokens · 2 denied tool call(s)

I've written `FINDINGS.md` (17 findings) and `verdicts.json` in the build folder; `verdicts.json` parses, with 10 lesson verdicts and 7 new items. Nothing in the build was changed. Tests ran on fresh copies of the server in `…/Temp/review-fisio/`, and every server I started is stopped (ports checked). Chrome was installed, so I drove it headless from Node to run the mobile, keyboard and no-JavaScript checks myself. None of those checks ended up `not-checked`.

**What broke, worst first:**
1. **The login form stays on screen after logging in.** A general CSS rule (`form { display: grid }`) overrides the `hidden` attribute. In Chrome the password box sits above the requests at 375 px, so the owner will think her login failed.
2. **The appointment form shuts off for everyone at 5,000 stored requests.** Handled requests count toward that limit. Patients then get "No podemos recibir más solicitudes ahora. Llámanos.", and the clinic's page shows no warning. One IP can send 240 requests a day, enough to fill the store in about 3 weeks. The owner can only delete requests one at a time, each with a confirm dialog.
3. **After a failed submit on a phone, the patient can't see what's wrong.** With an empty form, 4 of the 6 field errors are off-screen. The only visible text is "Revisa los datos.", which names no field. The cursor isn't moved to the first wrong field.
4. **Keyboard focus is lost after submitting**, and after Confirmar on the clinic's page. It drops to the page body, so a keyboard or screen-reader user loses their place.
5. **The clinic's page reloads and redraws every request on every action.** At 4,999 requests it downloads 2.18 MB, and each Confirmar click takes about 0.95 s.
6. **The clinic's page scrolls sideways on a phone.** One comment with no spaces made the page 1,137 px wide at 375 px.
7. **The limits are per IP.** The 11th valid request from one network is refused. Five wrong passwords from someone else also block the owner's *correct* password for 15 minutes.
8. **With JavaScript off:**
   - After a form error, "Volver" brings back an empty form, so everything typed is lost.
   - The clinic's login sends the password in the URL (`/admin?clave=…`).
9. **Smaller issues:**
   - The focus outline is 1.88:1 against white, below the 3:1 needed.
   - The images have no width or height.
   - A damaged data file empties the clinic's page with only a console warning.
   - There is no README, so the client's "dime cómo lo pruebo" goes unanswered in the files.

**What held:**
- Server-side checks on every field, including Sunday, past dates and 20:00.
- A double click saved only one request.
- HTML in the name and comment showed as plain text.
- Path traversal attempts were refused.
- Without the password, confirming, cancelling or listing requests returned 401.
- The wrong-password limit held even with 1,000 attempts at once.
- Saving is atomic and survives concurrent writes.
- The form still works when `cita.js` is blocked.

**Lesson verdicts:**

| Verdict | Lessons |
|---|---|
| broke | 41, 45, 46, 49, WEB-2, WEB-4 |
| held | 32, WEB-3, WEB-5 (owner-lockout caveat), WEB-1 (silent-to-owner caveat) |

`lessons/TEMPLATE.md` isn't in the folder, so I chose the five parts myself: title, detector question, what happened, the rule, how to check. I wrote five new candidate lessons. The other findings are covered by existing lessons, which I cite by id.
