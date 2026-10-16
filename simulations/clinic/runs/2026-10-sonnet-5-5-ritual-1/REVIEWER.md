# What the reviewer said

`claude-opus-5-5` · success · 47 turns · $2.3751269999999995 · 54278 output tokens · 4 denied tool call(s)

I've written `FINDINGS.md` (13 findings, 3 new candidate lessons) and `verdicts.json` (checked that it parses) in the build folder. I fixed nothing in the build.

It's a solid build. Its own `node prueba.mjs` passes 27/27. The server checks the form itself: empty fields, letters in the phone, an email without "@", past days, Sundays and 20:00 are all rejected with clear messages. Path tricks against the file server get 403 or 404. HTML in a name or comment shows as plain text in the clinic's page. The login locks after 5 wrong passwords, and writing many requests at once lost nothing. I used headless Chrome for the mobile and keyboard checks. In the browser, form errors and the success message appear in view and take focus, and a double click saved one request.

**What broke, most serious first:**
1. **Dead button without JS.** When JavaScript is off or `app.js` fails to load, the error page's only button, "Volver y corregir", does nothing. Its `javascript:history.back()` link is blocked by the site's own security header (CSP); Chrome logs the violation.
2. **A lost request.** If the saved-requests file is damaged while the server is running, the next request still gets "¡Solicitud enviada!" but disappears on the next restart. The only warning is a console line at startup.
3. **Mobile admin page.** An 80-character name pushes the page to 917 px wide at 375 px, so the owner has to scroll sideways.
4. **Slow with many requests.** At 10,000 requests, one "Confirmar" click takes 2.8 s because the whole list is redrawn.
5. **Bots.** 1,000 fake requests from different IPs were all saved, with the real patient at position 21. There's no search or bulk delete; each delete is a click plus a confirm.
6. **Mistakes block the real attempt.** 10 rejected submissions from one IP cause the 11th, correct one to be refused (429).
7. Smaller issues:
   - After confirming a request, the page jumps back to the top.
   - The focus outline has too little contrast (2.0:1 on white, 1.8:1 on cream, below 3:1).
   - JSON of the wrong type gives a server error (500) instead of a validation error.
   - The server saves the same request twice if it arrives twice.
   - There's no README or instructions on how to test it, and the admin password is printed only once, on the first run.
   - Two code comments claim protections that items 1 and 2 disprove.

**Lesson verdicts:**

| Verdict | Lessons |
|---|---|
| broke | 41, 45, 46, 49, WEB-1, WEB-2, WEB-3 |
| held | 32, WEB-4, WEB-5 |

Where an existing lesson covered a finding, I named its id and suggested a sharper wording for WEB-1, WEB-3 and WEB-4 instead of writing a new lesson.

Two caveats:
- **Keyboard path.** I couldn't complete a full keyboard-only submit because my test script couldn't type into the date field, so the success-by-keyboard path rests on the mouse-click run.
- **IP spoofing.** The bot and login tests faked different IPs using local addresses (127.x.x.x).

All the servers and Chrome instances I started are stopped; no test port is still listening. My test scripts and screenshots are in `review-clinic-tools`, next to the build folder.
