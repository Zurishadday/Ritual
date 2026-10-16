# What the reviewer said

`claude-opus-5-5` · success · 48 turns · $2.1689808 · 42918 output tokens · 3 denied tool call(s)

I've written `FINDINGS.md` and `verdicts.json` in the build folder; the JSON loads with all 10 lessons and 3 new items. It's a careful build: its own `node pruebas.mjs` passed 44/44, and nearly everything I tried in a real browser held. The real problems show up when data grows or arrives in an odd shape, and in how the limits are keyed.

I ran the mobile, keyboard and no-JavaScript checks in headless Chrome, which was installed on this machine, driven from Node scripts. So none of the lessons is `not-checked`.

**Lesson verdicts:**
- **Broke: WEB-1.** If the requests file is damaged in a way that still reads as a list, like `[null]`, every new booking fails with a 500 error and so does the clinic's page. The server says why only in its own console. An empty or cut-off file is handled fine: the booking saves and the clinic's page shows a warning.
- **Broke: WEB-2.** The clinic's page can only filter by status and delete one request at a time, each behind a confirmation. With 5,000 requests stored, the next real patient gets a 503 telling them to call instead.
- **Held: 32, 41, 45, 46, 49, WEB-3, WEB-4, WEB-5.** Specifically:
  - Every form error path shows a message where the person is and keeps what they typed.
  - Two quick clicks save one request, and injected HTML shows as plain text.
  - All the file-path tricks return 404.
  - After 4 wrong passwords the 5th try locks out for 60 seconds.
  - Both pages fit 375 px with no horizontal scroll, even with a very long name.
  - Focus is always visible, and lands on the result after submitting.
  - Without JavaScript, the form still works and going Back keeps the values.
  - 40 simultaneous bookings plus status changes all saved, and the file survived the server being killed.
  - With 5,000 requests, the clinic's page takes about 1.9 s to load; it grows in step with the number of requests.

**New mistakes no listed lesson covers:**
1. **The 5,000-request cap closes the form for patients, and the owner is never warned.** Confirmed and cancelled requests count toward it and are never archived, so a busy clinic would hit it in about a year.
2. **The booking limit and login lockout count per address, not per person.** Eight different people from one address got through 5 times, then 3 refusals. Behind a proxy or shared Wi-Fi, that means 5 bookings per 10 minutes for the whole site, and anyone on that address can lock the owner out of her page.
3. **The main "Pedir cita" button on the photo blends in.** Its edge has 1.73:1 contrast against the background (3:1 is the minimum); its text is readable.

The server silently cutting over-long fields is also in the table, as a one-off slip without a lesson.

`lessons/TEMPLATE.md` isn't in the folder, so I guessed the five parts for the new lessons (title, what happened, why it happens, the rule, detector question). They may need reshaping to match the real template.

Starting the server the way the README says created a `datos/` folder in the build, including the generated password file; I couldn't delete it with the commands allowed. All servers and browsers I started are stopped. My scripts and screenshots are in `%TEMP%\revisor-clinic\`.
