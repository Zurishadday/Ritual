# What the reviewer said

`claude-opus-5-5` · success · 32 turns · $1.4021718 · 29192 output tokens · 2 denied tool call(s)

I've finished the review and written `FINDINGS.md` and `verdicts.json`, which parses with all 10 lessons and 5 new mistakes. I fixed nothing in the build. Every server I started has been stopped.

**What I ran:** I started the build with `node servidor.mjs` as its README says. For the rest I used my own instances on port 3101 with temporary data and a known password. My probe scripts are in `_revision/`. The first run also created a `datos/` folder in the build, which now holds the generated password and some test requests.

**Real problems:**
- **Bot flood shuts out patients:** 99 bot requests from 11 addresses used up the 100-per-hour cap. The next real patient, sending their first request, got 429 and the message "Enviaste muchas solicitudes seguidas", which blames them.
- **The owner can't sort it out:** the real request wasn't on the first page of 50 and there's no search. The only bulk action, "Eliminar las N de esta vista", deleted all 100, the real patient included.
- **One bad record empties the panel:** I added one record that parses but has no phone or day. The panel then showed 0 of 52 requests and only a JavaScript error message.
- **Save failures are invisible to the owner:** when the data file can't be written, visitors are told to phone, but the warning appears only in the server console.
- **Login lockout locks out the owner too:** after 5 wrong passwords from an address, even the correct password gets 429. The README says to put it behind HTTPS, usually a proxy where every visitor shares one address. Then anyone could lock the owner out.
- **Without JavaScript, errors lose everything typed:** the error page's only link reloads an empty form.
- **Smaller issues:** the README promises times until 17:30, but the server rejects 17:30. Opening `/admin/login` directly gives a "Método no permitido" page with no link back. Comments over 500 characters sent straight to the server are cut short without warning. Input borders have 2.94:1 contrast, just under the 3:1 guideline.

**What held up:** server-side checks for every bad input I tried, including phone, email, past day, Sunday, 20:00 and oversized fields. A double click saves only one request. HTML in the name and comment shows as text. Path tricks to reach server files are refused. The admin API without a password returns 401, and the 5th wrong password is blocked. 50 requests and status changes arriving at once lost nothing, and a crash mid-write leaves the next request saving fine. With 100,000 requests the panel loads in 6–38 ms.

**Lesson verdicts:**
- **Broke:** 49, WEB-1 and WEB-2.
- **Held:** 45, 46, WEB-3 and WEB-5.
- **Not checked:** 32, 41 and WEB-4. Mobile, keyboard and contrast-over-photo checks need a browser, which I didn't have. I ran the panel's script in a minimal fake page in Node, which isn't the same as seeing it on screen.

There was no `lessons/TEMPLATE.md` in the folder, so the candidate lessons use five parts I chose: what happened, why, the rule, how to check, and the detector question.
