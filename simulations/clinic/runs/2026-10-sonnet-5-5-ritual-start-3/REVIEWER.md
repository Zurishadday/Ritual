# What the reviewer said

`claude-opus-5-5` · success · 68 turns · $2.806744200000001 · 54590 output tokens · 6 denied tool call(s)

I wrote `FINDINGS.md` and `verdicts.json` in the build folder, and fixed nothing in the build. Every check in the guide was actually run, using headless Chrome driven from Node, so none of the lessons are left as `not-checked`.

The build holds up well where it matters most:
- **Server validation:** every bad input I sent with curl was rejected, including empty, past, Sunday, 20:00 and 100 KB fields.
- **File server:** none of the path-traversal requests reached `servidor.mjs` or the saved data.
- **HTML in a request:** the panel shows it as plain text; nothing runs.
- **Double click:** only one request was saved.
- **Without the password:** confirming or deleting returns 401.
- **Saved data:** 200 requests arriving at once were all kept, and a cut-off or garbage line in the data file did not stop the next request from saving.
- **Keyboard and error path:** both work.

**Main findings:**
1. **Clinic panel on a phone:** a long name or a comment without spaces makes the page 3046 px wide at 375 px. The phone zooms out and the whole list becomes too small to read or tap.
2. **Past hours today are accepted:** at 10:02 a booking for today at 09:00 got "Listo, recibimos tu solicitud", from both the page and the server. Also, the server uses its own timezone for "today": the same booking was rejected as "Ese día ya pasó" with `TZ=Asia/Tokyo`.
3. **Limits are per IP only:** after 5 wrong passwords from the owner's address, the owner's correct password also gets a 429. The server only listens on localhost by default, so going public needs a proxy, and behind one every patient shares a single limit of 5 bookings per 10 minutes. The limit message also replaces the real field error.
4. **Bot flood:** bots that skip the hidden trap field get through. The panel shows only the newest 200, has no search or bulk delete, and asks for a confirmation on every single delete.
5. **Clinic panel without JavaScript:** it is a blank page. The "necesita JavaScript" message is inside a hidden section, so it never shows.
6. **Without JavaScript, a mistake costs everything typed:** the error page only links back to an empty form.
7. **Panel slows as data grows:** it re-reads the whole file on every load and status change, and the file is never cleaned up. That is fine at clinic scale (about 30 ms at 10,000 records, 201 ms at 100,000).
8. **Smaller ones:**
   - the phone link to call the clinic is only 30 px tall;
   - the headline crosses light lines in the photo;
   - there is no README, although the request asked how to test it;
   - the panel password is printed to the console on every start.

**Lesson verdicts:**
- **broke:** 41, 46, 49, WEB-2.
- **held:** 32, 45, WEB-1, WEB-3, WEB-4, WEB-5.
- **New candidate lessons:** four, on checking "now" to the minute in the clinic's timezone, wrapping text visitors type, how per-IP limits behave behind a proxy, and the size of the "call us" link.

`lessons/TEMPLATE.md` isn't in this folder, so I guessed the five parts of each candidate lesson; check them against the real template.

**Cleanup:**
- **`datos/` folder:** starting the build the documented way created a `datos/` folder in the build folder, holding the panel password file. I couldn't delete it with the shell I have, so it is still there.
- **Servers:** all the servers I started are stopped.
- **Port 3000:** something is still listening there, but it is a different app of yours (a Next.js site), not this build, so I left it running.
- **My scripts and screenshots:** they are in `%TEMP%\review-clinic-scripts` and `%TEMP%\review-clinic-shots`.
