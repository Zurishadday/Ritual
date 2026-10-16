# What the reviewer said

`claude-opus-5-5` · success · 62 turns · $2.2345102000000003 · 44422 output tokens · 2 denied tool call(s)

The review is finished. I found 11 problems; the worst is that a patient's request can be silently lost. Everything was run, not just read: Node scripts against the API, plus headless Chrome driven from Node for the mobile, keyboard, double-click, no-JS and HTML-injection checks. All servers I started are stopped. The build's own `datos/` folder is unchanged; anything that wrote data ran on copies in `%TEMP%\rv-clinic`.

**What broke (worst first):**
1. **A request can be silently lost.** If a patient submits while the owner is confirming or cancelling another request, the patient is told "¡Listo!" but the request never reaches the clinic. Reproduced: before 3, after 3, and the new request is missing.
2. **One incomplete record blanks the clinic page.** A record that reads as valid but is missing fields leaves the page empty with a script error and no message. Broken or half-written lines are handled fine.
3. **A long name breaks the clinic page on a phone.** An 80-character name with no spaces makes the page 841 px wide at 375 px.
4. **Times that have already passed are accepted.** At 10:57 the server accepted today at 09:00, and it also accepted 9999-12-31.
5. **Spam from many IPs gets in.** 30 fake requests from 30 different IPs were all accepted. The clinic page has no filter or bulk delete, so cleaning up means one confirmed delete per request.
6. **The clinic page slows down as requests pile up.** It loads every request every time: about 1.7 s for 10,000 and 8.8 s for 50,000, with no paging.
7. **`prueba.mjs` can hide the owner's real requests.** It moves the real `datos/` folder aside while it runs; if it's interrupted, the real requests disappear from the clinic page.
8. **It can't be opened from a phone.** The server only listens on the local machine, so it can't be opened from a phone on the same Wi-Fi (connection refused), and there's no README explaining how to change that.
9. **Smaller issues:**
   - The login limit is per IP only, and a custom `ADMIN_PASSWORD` can be anything, however weak.
   - Without JavaScript, the error page's "back to the form" link opens an empty form.
   - Part of the hero subtitle has about 2.5:1 contrast.

**What held:**
- Server-side validation, including requests sent with `curl` and 100 KB fields.
- All the path-traversal attempts on the file server.
- Inline errors with focus on the first bad field.
- A double click saves one request.
- HTML in the name and comment shows as plain text on the clinic page.
- The no-JS fallback works.
- Keyboard focus is visible and goes somewhere sensible after submitting.
- Admin actions need a password.
- 5 failed logins per minute triggers a lockout.
- The build's own test passes 30/30.

**Lesson verdicts:**

| Verdict | Lessons |
|---|---|
| broke | 41, 46, WEB-1, WEB-2 |
| held | 32, 45, 49, WEB-3, WEB-4, WEB-5 |

The repo has no `lessons/TEMPLATE.md`, so I wrote the five candidate lessons using these five parts: Title · The mistake · Why it happens · Detector question · The check.

Files are in the build folder:
- FINDINGS.md
- verdicts.json
