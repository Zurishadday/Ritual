# What the reviewer said

`claude-opus-5-5` · success · 59 turns · $2.0739662 · 43498 output tokens · 1 denied tool call(s)

I've written the review as `FINDINGS.md` and `verdicts.json` in the build folder. The build is solid on almost everything in the guide; I found 10 problems, and the most serious is a record cap that can silently shut off online booking.

**How I tested:** there's no README, so I started `servidor.mjs` from a small launcher, with its own data folder so the build's `./datos` wasn't touched. I ran the API checks with Node and `curl`, and the mobile, keyboard and no-JavaScript checks in headless Chrome at 375 px. The build's own test, `prueba.mjs`, passes 33/33.

**What held:**
- **Form errors:** each error appears next to its field, focus moves to the first wrong field, and 20:00 isn't offered. Double clicks save one request.
- **HTML in requests:** it shows as plain text on the clinic's page; nothing runs.
- **Server validation:** the server checks everything itself, not just the browser.
- **File server:** requests for files outside the public folder (`/../servidor.mjs` and variants) are blocked.
- **Login:** after 5 wrong passwords it locks for 5 minutes. Confirming or cancelling without the password gets a 401.
- **Mobile and keyboard:** no horizontal scroll at 375 px, even with a very long name. The keyboard reaches everything, and Enter submits.
- **Saved data:** simultaneous writes are all kept, and a damaged data file is set aside while the next request still saves.

**What broke, most serious first:**
1. **Record cap.** At 5,000 stored requests the public form tells everyone "call us" (503). Cancelled requests count toward the limit, and the clinic's page shows no warning.
2. **No spam tools.** The clinic's page has no search and no bulk delete. With 5,000 requests it's a 2.3-million-pixel page and each delete needs its own confirmation. That's how bots would reach the cap in item 1.
3. **Without JavaScript.** After any error, the "Volver al formulario" link brings back an empty form, so the patient retypes everything. The fallback hour list also offers slots the server then rejects (rodilla at 17:30).
4. **Hero text contrast.** The ends of two subtitle lines sit over the light part of the photo, at 2.9:1 and 3.2:1 (normal text needs 4.5:1).
5. **Focus ring.** The ring on form fields is about 1.7:1 against the background, hard to see.
6. **Silent truncation.** Over-long fields are cut instead of rejected, so a 121-character email was saved as `…@correo.co`, a different valid address.
7. **Malformed URL.** `/%E0%A4%A` returns a 500 and writes a stack trace to the log.
8. **Instructions and placeholders.** There's no README. The password hint the server prints (`ADMIN_PASSWORD=tuclave node servidor.mjs`) doesn't work on Windows. The address and phone are placeholders (`tel:+520000000000`).
9. **Shared IP limit.** The 5-requests-per-IP-per-10-minutes limit would block real patients behind a proxy. This is a risk I didn't reproduce.
10. **Small tap targets.** The "call us" link is 21 px tall, and phones and emails on the clinic's page aren't tappable.

**Lesson verdicts:** 41 and WEB-2 broke. 32, 45, 46, 49, WEB-1, WEB-3, WEB-4 and WEB-5 held. On WEB-1, the owner is only warned in the server console, not on their page. I marked 41 as broken because the hero text fails only as rendered; that's my inference about how the build was checked.

**Candidate lessons:** I wrote three new ones (for items 1, 3 and 6). `lessons/TEMPLATE.md` isn't in this folder, so I used a five-part order of my own: mistake, why it hurts, rule, detector question, how to check.

**Not checked:** a real crash in the middle of a file write. Only the build's own simulated write failure ran.

All the servers I started are stopped, and nothing in the build was changed. My scripts and screenshots are in `~\AppData\Local\Temp\rev-fisio2\`. The `review-clinic` folder next to it held another review's files, which I didn't touch.
