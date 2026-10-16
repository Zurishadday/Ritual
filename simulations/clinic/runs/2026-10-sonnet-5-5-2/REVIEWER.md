# What the reviewer said

`claude-opus-5-5` · success · 65 turns · $2.1711978 · 46215 output tokens · 2 denied tool call(s)

I ran the build myself and wrote up 14 findings. Seven of the ten listed lessons broke, two held, and one (WEB-1) broke in two separate ways. I wrote two files in the build folder: `FINDINGS.md` and `verdicts.json`. For the browser checks I drove headless Chrome from Node, so mobile, keyboard, no-JavaScript and contrast were all actually tested. None of the lessons is `not-checked`.

**Most serious findings**
1. **One failed save breaks saving for good.** I made a single disk write fail, then removed the cause. Every later request and status change still returned `500 Error del servidor`. The owner's page kept showing all four requests, but only one was on disk, so a restart would lose the rest.
2. **A damaged `citas.json` stops the whole site from starting** (`SyntaxError … servidor.mjs:85`). Nobody can book, and the owner gets no clear message.
3. **The anti-spam limit locks out real patients.** It allows 10 attempts per IP per hour and counts rejected ones too. Ten tries with a mistyped phone, then the corrected request, got `429 Demasiadas solicitudes`. Patients sharing a mobile network's IP all share those 10.
4. **Without JavaScript the form does nothing useful.** The hour can't be chosen, the page reloads to the top with no message, nothing is saved, and the name, phone and email end up in the URL.
5. **Keyboard focus is lost after every submit.** After an error, a success, or confirming a request, focus drops to the top of the page. The next Tab goes to the clinic's phone link, past the form.
6. **The clinic's page on a phone:** a long email or comment makes it scroll sideways (854 px of content on a 375 px screen).
7. **The clinic's page with many requests:** with 20,000 saved, it takes 2.4 s to load. Every Confirmar click takes 2.6 s, and there is no delete, filter or search.

Smaller findings:
- The hero text drops to about 2.4:1 contrast where it sits on light shapes in the image.
- The focus outline is too faint (about 2:1 against white).
- An oversized request gets its connection cut instead of the intended 413 error.
- The owner can be locked out of the login page by someone else's wrong passwords from the same network.
- The error for an empty form doesn't say which field is missing.
- There is no README telling the owner how to test it.

**What held:**
- The server checks everything again, including past dates, Sundays and 20:00.
- Every attempt to read files outside `public/` returns 404.
- HTML in the name and comment is shown as plain text on the clinic's page and never runs.
- The login blocks after 5 wrong passwords, even when 200 are sent at once.
- A double click on submit sends only one request.
- Simultaneous saves and status changes are all kept.
- The public page fits a 375 px screen with no sideways scroll.

`lessons/TEMPLATE.md` isn't in the folder, so the three new candidate lessons use a five-part layout I chose: rule, why, detector question, how to check, example. They cover the rate limit, the save queue and the sideways scroll on the clinic's page. Each is tagged `origin: lab · claude-sonnet-5-5 · 2026-10` and `packages: web, apps`.

My test data and scripts are in a separate temporary folder, `review-clinic-tools`, and I changed nothing in the build. All the servers I started are stopped.
