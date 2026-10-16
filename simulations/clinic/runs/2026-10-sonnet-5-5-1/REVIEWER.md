# What the reviewer said

`claude-opus-5-5` · success · 37 turns · $1.7702942000000004 · 39347 output tokens · 1 denied tool call(s)

I finished the review and wrote `FINDINGS.md` (19 findings, 4 candidate lessons) and `verdicts.json` in the build folder. I changed nothing in the build. I ran the mobile, keyboard and no-JavaScript checks in headless Chrome, so those verdicts come from runs, not from reading code. All test servers are stopped and the test `datos/` folder is deleted.

**Lesson verdicts:** 9 broke and 1 held. The one that held is WEB-5 (login attempt limit): after 10 wrong passwords from one IP it returns 429.

**Most serious findings:**
1. **One failed save breaks saving until restart.** After a single failed disk write, every later request returned 500 even once the cause was removed: `[500,500,500]`. The owner still saw those requests in the list (65 in memory, 61 on disk), and they disappeared on restart.
2. **A damaged data file takes the whole site down.** With the file cut in half, the server exits with code 1 and the next visitor gets "connection refused".
3. **Typing mistakes lock patients out.** The limit of 10 requests per hour per IP is checked before validation and counts errors. 10 wrong phone numbers followed by a correct one gives 429 for an hour. Separately, the right admin password gets 429 from an IP that was already locked out.
4. **With JavaScript off, nothing is saved and personal data leaks.** The form sends `?nombre=…&telefono=…&correo=…` in the URL, saves nothing, and shows no message.
5. **Already-past slots are accepted.** At 21:03, a request for today at 09:00 was saved and the patient was told it was sent.
6. **Error messages and focus:**
   - On a phone, error messages appear off-screen.
   - After submitting, focus drops to the top of the page, both in the form and when the owner confirms a request.
7. **A long name breaks the admin page on mobile:** at 375 px wide the page is 991 px wide.
8. **The admin page doesn't scale and can't fight spam.** It sends and draws every request: 20,000 requests take 4.7 s to show. There is no search, no delete and nothing against bots.
9. **Weaker security points:**
   - The admin password defaults to `fisio2026` in the code.
   - The focus outline is very faint (1.84:1 contrast).
   - The address and phone are placeholders, and the call link dials `+520000000000`.
   - There is no README.

**What held up:**
- **Path tricks:** the file server blocked every attempt.
- **Server-side checks:** the server rejects bad input on its own, without relying on the browser.
- **Double click:** two quick clicks saved one request.
- **HTML in the name and comment:** it shows as plain text on the clinic's page.
- **Admin without password:** confirming or cancelling without the password is refused.
- **Simultaneous requests:** 60 at once lost nothing.
- **Crash:** a kill in the middle of writes left a valid file, and the next request saved.

`lessons/TEMPLATE.md` isn't in the folder, so I wrote the candidate lessons using the five parts as I understood them from the guide. That's noted in the file.
