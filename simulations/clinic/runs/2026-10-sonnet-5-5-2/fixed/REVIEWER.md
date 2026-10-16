# What the reviewer said

`claude-opus-5-5` · success · 60 turns · $2.0918651999999995 · 44851 output tokens · 3 denied tool call(s)

The review is done: 12 findings in `FINDINGS.md` and verdicts for all 10 lessons in `verdicts.json`. All checks were actually run. I used curl and Node scripts for the server, and headless Chrome driven from Node for the mobile, keyboard and no-JavaScript checks, so no lesson is `not-checked`. I didn't change the build. All servers and browsers I started are stopped.

There is no README. The only start instruction is the comment at the top of `servidor.mjs` (`node servidor.mjs`).

**Most serious problems**
1. **Admin login can be guessed without limit (WEB-5 broke).** The correct password is checked before the lockout. After 5 wrong tries the server answers "too many attempts" instantly. Over 20 s that was 2,902 guesses, about 8,700 a minute, and the right password still got in afterwards. The randomly generated password holds up, but one the owner sets themselves would not. A comment in `servidor.mjs` says every failed try is slowed down; only the first five are.
2. **The 10-requests-per-hour limit can be bypassed (WEB-2 broke).** It checks the count before saving to disk and records it after. 40 requests sent at once were all saved. Deleting spam is one request at a time, each with a confirmation box.
3. **On a phone, error messages are off-screen (lessons 32, 41, 45 broke).** After an empty submit, a phone with letters or an email without "@", the text is below the visible area. The person only sees fields turn red.
4. **Without JavaScript, any error loses everything typed.** The "Volver al formulario" link reloads an empty form.
5. **Smaller problems:**
   - Field borders have 1.45:1 contrast; 3:1 is required.
   - The general hover style beats the main "Pedir cita" button's own style, so it nearly disappears on hover (lesson 49 broke).
   - If the saved-requests file gets damaged, the owner's page just says there are no requests. Only the server console says why.
   - A past date is reported on the hour field.
   - The 11th request in an hour from a shared connection is turned away.

**What held**
- **Server validation:** it rejects everything the browser does, including a Sunday, a past date and 20:00. It refuses 100 KB fields.
- **Security:** the path-traversal attempts all return 404. HTML in a name or comment shows as plain text in the admin page. Confirming or cancelling without the password returns 401.
- **Data:** saves are queued and atomic, and no record was lost under parallel requests.
- **Speed:** with 20,000 saved requests the admin list loads in 27 ms (lesson 46 held).
- **Mobile:** no horizontal scroll at 375 px, even with very long names.
- **Keyboard:** focus is always visible, and after submitting it moves to the confirmation message (WEB-4 held).
- **Fallbacks:** with JavaScript off or `cita.js` blocked, the form still submits to the server (WEB-3 held).
- **Damaged file:** the next request is still saved (WEB-1 held, with the caveat in point 5).

`FINDINGS.md` proposes two new candidate lessons and suggests adding to WEB-3. The first new lesson is that a limit checked before an `await` and recorded after it doesn't hold. The second is that input borders need enough contrast to be seen, and errors need more than a colour change. The addition to WEB-3 is that a fallback must keep what the person typed.

The test scripts and screenshots are in `%TEMP%\review-clinic-scratch\`.

Files are in the build folder:
- `FINDINGS.md`
- `verdicts.json`
