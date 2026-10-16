# What the reviewer said

`claude-opus-5-5` · success · 37 turns · $1.7806727999999998 · 39696 output tokens · 2 denied tool call(s)

The review is done. I wrote `FINDINGS.md` and `verdicts.json` in the build folder and changed nothing in the build.

**How I ran it:** there is no README. The only start instruction is the first-line comment in `servidor.mjs`, so I started `node servidor.mjs` on spare ports with its data in a temp folder. The builder's own smoke test passes 39 of 39. For the browser checks I drove the installed headless Chrome from Node, at 375 px and on desktop, including one run with JavaScript turned off. Every server and browser I started has been stopped. My test scripts are in `%TEMP%\review-clinic-hrrSh5\`, outside the build.

**Main findings, in the order listed in `FINDINGS.md`:**
1. **Clinic page on a phone:** one request with long text that has no spaces (name, email or comment) makes the page 2953 px wide instead of 375. The whole page shrinks until it can't be read.
2. **Names with a `"` in them:** if a name contains a double quote (e.g. `Juan "Toño" López`), confirming or cancelling that request throws an error. The status still saves, but keyboard focus jumps back to the top of the page.
3. **Request limit:** after 5,000 saved requests (cancelled ones count too), the public form tells every patient to phone instead. The owner gets no warning, and there is no way to delete requests or clear spam in bulk.
4. **Treatment check:** the server accepts the treatment values `toString` and `__proto__` (the request returns 200 and is saved).
5. **Without JavaScript:** after one mistake, the error page's only way back reloads an empty form, so everything typed is lost.
6. **Login lockout:** five wrong passwords from one IP also block the correct password for 60 seconds. Anyone on the owner's network can keep her out.
7. **Failed saves:** if the data file can't be written, the patient is told to call, but the owner's page shows nothing. The error only appears in the server console.
8. **Minor:** without JavaScript, a double click saves two copies of the request, and wrong methods on `/api/citas` return 404 instead of 405.

**What held:** the server checks every field itself, and it blocks the file-path tricks I tried. HTML typed into the form shows as plain text and does not run. The login and form rate limits stood up to 300 and 50 requests sent at once. Simultaneous writes lost nothing, and a crash mid-write didn't stop the next request from saving. Focus and error messages on the public form work, and submitting without JavaScript still saves.

**Lesson verdicts:** WEB-2 and 41 **broke**. Lesson 41 broke because the builder only checked "shown as text" in the server's raw data, never on the rendered page, and that is where findings 1 and 2 show up. Lessons 32, 45, 46, 49, WEB-1, WEB-3, WEB-4 and WEB-5 **held**. I wrote five new candidate lessons, one each for findings 1, 2, 4, 5 and 6; findings 3, 7 and 8 point to existing lessons or are one-off slips.

`lessons/TEMPLATE.md` is not in this folder, so I guessed the five parts: title, what happened, why, detector question, rule. They may need reformatting to match the real template.
