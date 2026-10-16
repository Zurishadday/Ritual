# What the reviewer said

`claude-opus-5-5` · success · 49 turns · $2.0326412 · 41799 output tokens · 2 denied tool call(s)

I wrote `FINDINGS.md` and `verdicts.json` (the JSON parses) in the build folder. I stopped every server I started, checked that ports 3100 and 3200 are down, and changed nothing in the build.

**How I tested.** The build has no README. The first line of `servidor.mjs` says to run `node servidor.mjs`, and on start it prints the URL, the `/admin` page and a generated password. I ran the original for the basic checks and copies for the destructive ones. I drove headless Chrome from Node, so the mobile, keyboard and no-JS checks were really run, not just read in the code.

**Overall the build is solid.**
- **Server checks:** the server rejects every bad input on its own: empty fields, a phone with letters, an email without "@", a Sunday, a past date, 20:00, oversized fields and wrong methods.
- **Security:** reaching the server's own files gives 404. HTML in a name or comment shows as plain text. Without the password, every admin action returns 401. After 5 wrong passwords from the same address, logins are refused for a minute.
- **The form:** a double click saves only one request. Focus goes to the wrong field, or to the confirmation message. With JavaScript off the form still works and keeps what the person typed.
- **Mobile and storage:** there's no horizontal scroll at 375 px. Parallel writes and a damaged data file don't lose the next request.

**What broke:**
1. **One bot burst shuts the form for an hour.** There is a site-wide cap of 100 requests per hour. 100 bot requests from 20 addresses took about 2 seconds, and after that a real patient on a new connection got "Estamos recibiendo muchas solicitudes…".
2. **No way to sort out bot requests.** The clinic's page has no search and only filters by status. The bulk delete removes every request with the current status, so the real pending ones go too.
3. **"Ver más solicitudes" always shows.** A general button style overrides the hidden attribute, so the button appears with only 4 requests and does nothing when tapped.
4. **The server uses its own clock for "today."** I ran it in UTC at 11:46 Mexico City time: a slot today at 15:00 was rejected with "Esa hora ya pasó."
5. **A damaged data file empties the clinic's page.** The server keeps the old requests in a separate file and keeps saving new ones. But the clinic's page showed 1 request out of 62, and the only notice is a line in the server console.
6. **"Llámanos" with no number.** The error pages tell the person to call but don't show the phone number.
7. **Every save rewrites the whole data file.** With 50,000 saved requests, the home page took 809 ms to load while 20 requests arrived at once.
8. **Login limit is per address only, with no overall limit.** Lower risk, since the generated password is strong.
9. **The no-JS form lists hours that don't fit.** It offers hours like 17:30 for the 60-minute knee session. The server explains the problem and keeps the data, so this is a one-off slip.

**Lesson verdicts:** 46, 49 and WEB-2 broke. 32, 41, 45, WEB-1, WEB-3, WEB-4 and WEB-5 held. I proposed four new candidate lessons: the business's time zone, telling the owner when the data file is repaired, a phone number on every "call us" page, and global caps that lock out real people. There's no `lessons/TEMPLATE.md` in this folder, so I guessed the five-part structure and said so in the file.

The run of the original created a `datos/` folder inside the build, holding my test requests and `clave.txt`. My test scripts and screenshots are in `%TEMP%\review-clinic-scripts\`. That folder already had scripts from an earlier session. I reused only its Chrome driver (`cdp.mjs`) and didn't rely on any of its old results.
