# What the reviewer said

`claude-opus-5-5` · success · 39 turns · $1.9247374 · 40773 output tokens

I ran the whole review and wrote `FINDINGS.md` and `verdicts.json` (it parses as valid JSON). The build itself is solid, and every concrete claim in the builder's summary matched what actually happened when I ran it. I found six problems: two match listed lessons and four aren't covered by any.

To keep the build folder clean, I ran the server from a copy in `%TEMP%\review-qD5Swv\runs\`, so there's no `datos/` folder or test messages in the build. The browser checks used headless Edge. Every server I started is stopped.

**Lesson verdicts**
- **Broke: 49.** On desktop, the "Visítanos" heading sits at the page edge (20 px) while its columns start at 121 px. A general heading rule (`.seccion h2`) overrides the rule meant to centre everything in that band.
- **Broke: 41.** The builder never looked at the rendered pages, and two layout problems got through: the heading above, and the admin page on a 375 px phone being 1307 px wide when a message has a long unbroken name.
- **Held: 32, 45, 46, 49's neighbours aside, WEB-1 to WEB-5.** In short:
  - Errors and the thank-you message appear right where the person is, and focus moves sensibly.
  - A real double-click saves one message.
  - Typed HTML is shown as text in the admin page.
  - The file server returns 404 for every path-traversal attempt and doesn't expose the message file.
  - The message limit holds even under 50 parallel requests from one IP (5 saved).
  - The admin login locks after 5 wrong passwords.
  - A message file cut off mid-line is handled: the next message saves and the owner gets a warning.
  - The admin page takes 35 ms with a full 10 MB message file.

**Four problems no listed lesson covers**
1. When the message file is full, customers are told "escríbenos por teléfono", but the site has no phone number anywhere.
2. With JavaScript off, a successful send returns the thank-you page directly instead of redirecting. Reloading that page saved the same message twice.
3. With JavaScript off, refusals other than field errors (rate limit, too large, can't save) bring the form back empty, so the person loses what they typed.
4. One line in the message file that is valid JSON but has no valid date makes the whole admin page fail with a 500 error. I propose this as a refinement of WEB-1 rather than a new lesson.

The admin page overflowing on a phone is the fifth new entry in `verdicts.json`.

`FINDINGS.md` has the evidence table and three candidate lessons for findings 1–3.

**Problem with Ritual's own checker:** `web-check.mjs` reported ✕ for WEB-3 (no JavaScript), but that was a false alarm. The page uses smooth scrolling, so the checker clicked where the submit button was before the scroll finished and missed it. When I scrolled instantly and clicked, all three no-JavaScript paths (good, empty, typo) worked. The fix belongs in the checker: turn off smooth scrolling or wait for the scroll to finish before clicking.

My test scripts and screenshots are in `%TEMP%\review-qD5Swv\`.
