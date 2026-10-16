# What the reviewer said

`claude-opus-5-5` · success · 49 turns · $2.0281545999999997 · 41445 output tokens

The build holds up well on almost everything. One real data-loss bug broke lesson WEB-1, and I found three new problems no listed lesson covers. I wrote `FINDINGS.md` and `verdicts.json` in the build folder. I fixed nothing in the build, and its own `datos/` folder is unchanged.

I ran everything for real: the server on a copy of its data, `curl`/`fetch` against the API, and headless Chrome at 375 px for the form, the clinic's page, keyboard, JavaScript-off and contrast. My test scripts are in `%TEMP%\rv-fisio-o55\`.

**Findings**
1. **Data loss (WEB-1 broke):** if the end of the requests file gets damaged while the server is running, the next request sticks to the damaged line. The patient is told it was received (201), but after a restart it no longer appears on the clinic's page. It only survives inside a `solicitudes.danado-*.txt` copy, and the only signal is a console line at startup. A crash between restarts is handled correctly.
2. **False claim:** the comment "Una línea mala nunca tumba el resto" ("one bad line never brings down the rest") is disproved by finding 1.
3. **Security:** the admin password is printed to the console on every start. A pre-generated password (`7c0c4af4f83a`) also ships inside the folder in `datos/clave.txt`. Anyone with the folder or the hosting logs can read every patient's details.
4. **Accessibility:** on the clinic's page, the outline that marks a pressed Confirmar/Cancelar button overrides the keyboard focus outline. A focused pressed button looks almost the same as an unfocused one.
5. **Accessibility:** the focus outline is 2.0:1 against white and the input borders are 1.7:1. Both are below the 3:1 minimum for controls.

**What held (all run, not just read)**
- **Form:** every error path shows the message under the field and keeps the typed values. A double click saved one request. With JavaScript off, the form still submits and ends on the thank-you page.
- **Panel display:** `<img onerror>` and `<b>` in a name show as plain text. Nothing overflows at 375 px, and after Confirmar/Cancelar the new status shows right next to the button.
- **Server:** it validates everything without the browser (empty, 100 KB, Sunday, past date, 20:00). Path traversal returns 403/404. Changing a request without the password returns 401, and the 6th wrong password returns 429.
- **Load and bots:** 200 simultaneous requests plus 50 status changes lost nothing. With 100,000 saved requests the clinic's page loads in 5 ms. 300 bot posts from one address were capped at 60, and bulk delete removed them.

**Lesson verdicts:** 32, 41, 45, 46, 49, WEB-2, WEB-3, WEB-4 and WEB-5 held; WEB-1 broke.

`lessons/TEMPLATE.md` wasn't in the folder, so for the candidate lessons I chose the five parts myself: title, what happened, why it matters, detector question, what to do instead. I didn't write new lessons for findings 1 and 2 because WEB-1 already covers them. Finding 4 is the reverse of lesson 49 (there, the specific rule wins over the general one), so I proposed extending 49 and also wrote a fallback lesson.

There is no README, and the builder's final message was hidden from me, so I couldn't judge whether it told the owner how to test the site. The server I started is stopped.
