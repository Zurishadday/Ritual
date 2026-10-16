# Findings: Fisio Andares (blind review)

How the build starts: there is no README. The header comment in `servidor.mjs` says `node servidor.mjs`, with `PORT`, `ADMIN_PASSWORD` and `DATOS_DIR` as optional settings. I ran it through a small launcher that sets those variables, so each test used its own temporary data folder and the build folder was never changed. It started fine and printed the admin URL and a generated password. All four images load (`naturalWidth > 0`, `image/svg+xml`).

Tools: `curl`, Node scripts, and headless Chrome driven over the DevTools protocol from Node, used for the mobile, keyboard, no-JS, admin and pixel-contrast checks. Today is Thursday 2026-10-15.

## What held (tested, no problem)

- **Server validation.** It matches the browser and is stricter. `{}` → `400 Escribe tu nombre.`; phone `abc12345678` → `400 Escribe un teléfono válido.`; email with no `@` → 400; `2026-10-14` → `400 Elige una fecha y hora futuras.`; Sunday `2026-10-18` → `400 Atendemos de lunes a viernes.`; `20:00` → 400; a 5000-character comment → 400; `PUT /api/citas` → 401.
- **File server.** `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5cservidor.mjs`, `/..%2fdatos%2fclave.txt`, `/datos/citas.json`, a path that doesn't exist, and a malformed `%E0%A4%A` all return `404 No encontrado`.
- **HTML in the name and comment** (`<b>hola</b><img src=x onerror="alert(1)">`). It is saved as text. On the admin page the card title shows the markup literally: `#lista b` = 0, `#lista img` = 0, no dialog fired. The page uses `textContent` and the server sends a CSP.
- **Login limit.** 8 wrong passwords in a row → `401×5, 429×3`. 200 wrong passwords in parallel → `401×5, 429×195`. `PATCH` with no token or a fake token → 401.
- **Double click on Submit (browser).** Two clicks sent 1 POST, because the button is disabled synchronously.
- **Concurrent writes.** 9 POSTs at once → 9 saved. A PATCH, a POST and another PATCH at once → all three on disk. Writes go through `.tmp` and then `rename`.
- **Public page at 375 px.** `scrollWidth 375 = clientWidth 375`. Error and success messages appear inside the viewport next to the button.

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | One failed disk write breaks saving for good: the write queue `cola` stays rejected and every later `guardar()` fails, even after the disk problem is gone. | `escritura.mjs`: I made `citas.json.tmp` a directory for one request, then removed it. Request 2 → `{"error":"Error del servidor."}`. Requests 3 and 4, after recovery → still `Error del servidor.`. Disk still holds only `['Antes']`. Admin (memory) shows `['Despues 2','Despues 1','Durante','Antes']`. PATCH → 500. | One brief disk hiccup (antivirus lock, full disk) means every later patient is told "server error" until someone restarts the server. The owner sees those requests on screen, so nothing looks wrong. Then a restart wipes all of them, and the confirmations too. | data |
| 2 | A damaged `citas.json` stops the whole site from starting. | `citas.json` = `[{"id":"a","nombre":"Ana"},{"id":"b","nom` → `node lanzar.mjs 3918 …` exits 1 with `SyntaxError: Unterminated string in JSON at position 41 … servidor.mjs:85`. | After a hand edit or a bad copy, the home page, the form and the admin page are all down. Nobody can book, and the owner gets no message about what happened. | data |
| 3 | The per-IP limit (10 POSTs per hour) also counts rejected attempts, and it is per IP. | Fresh IP: 10 tries with phone `55-12-ABC` → `400×10`. The corrected, valid request → `429 Demasiadas solicitudes. Inténtalo más tarde.` Earlier, from 127.0.0.1: 1 success + 8 errors + 1 oversized → the 11th got 429. | A patient who mistypes the phone or picks a time already past (only the server checks these) is locked out for an hour just as they fix it. Patients on the same mobile carrier NAT, or the clinic's own wifi, share one budget of 10 per hour. | form |
| 4 | Without JavaScript, the form sends a GET to `/` with the personal data in the URL and saves nothing. The hour can't even be chosen. | Chrome with JS off: hour options `["Elige…"]`. Enter in the name field → navigated to `http://localhost:3917/?nombre=Sin+JS&telefono=5512345678&correo=s%40example.com&…&hora=&comentario=`. `#mensaje` = `""`, `scrollY 0`, citas saved: 0. | If `cita.js` fails to load (flaky mobile connection, blocker), the patient lands back at the top of the page with no message and thinks they booked. The clinic never gets the request. Name, phone and email end up in the browser history and in any proxy logs. | form |
| 5 | Focus is lost after every server round trip: the button is disabled and focus falls to `<body>`. | After a server error (phone, past date) and after success: `activeElement` = `<body>`. The next Tab goes to `<a href="tel:+525500000000">` (the contact section, past the form). Admin: after Confirmar (Enter), focus = `BODY`, and the next Tab goes to the first card's phone link. | A keyboard or screen-reader user who has to fix the phone field loses their place and must Tab back through the page. The owner, confirming one request after another with the keyboard, starts over at the top each time. | accessibility |
| 6 | The admin page scrolls sideways on a phone when a request has a long email or text with no spaces. | Admin at 375 px: `scrollW 854, clientW 375` (screenshot: email and comment cut off at the right edge). | The owner, reading on their phone, can't see the full email address to reply to, and the page shifts sideways while scrolling. | mobile |
| 7 | The admin list doesn't scale: every load and every click re-downloads everything and re-renders every card. There are no pages, no filter and no delete. | 20,000 saved requests: `GET /api/citas` = 5.6 MB in 49 ms (server). Browser: cards shown after 2351 ms, 320,039 DOM nodes. One Confirmar click → 2642 ms until the label changes (`cargar()` fetches and rebuilds everything). | After a bot wave, or a few years of use, each confirm takes seconds on a laptop and longer on a phone. The owner can't find the real requests among thousands. | server |
| 8 | Nothing defends against bots beyond the per-IP limit, and the owner has no way to get rid of junk. | `DELETE /api/citas/<id>` → 404. Admin controls per card: `Confirmar, Cancelar` only. No search, filter or honeypot (`input[type=search], select` in admin = 0). Requests from 10 different IPs are each allowed in full. | A botnet fills the list with fake requests. The owner can only scroll and "cancel" them one at a time, waiting 2.6 s per click (#7), and real patients get lost in the noise. | security |
| 9 | Hero text sits on top of light shapes in the photo. The CSS says white on dark green, but on screen parts of the text land on beige and grey-green. | Text hidden, pixels sampled under the text boxes: 375 px paragraph worst `2.43:1` (11% of the box under 4.5:1). 1280 px h1 worst `2.56:1`, paragraph `3.21:1` (12% under 4.5:1). | Parts of the main sentence are hard to read in sunlight or with low vision. Swapping in a real photo with bright areas makes it worse, because there is no darkening overlay behind the text. | accessibility |
| 10 | The focus ring color `#7cc4bb` is too faint against white and cream backgrounds. | Computed `outline: solid 3px rgb(124,196,187)` on inputs and buttons. Contrast against `#fff` ≈ 2.0:1 (WCAG 1.4.11 asks for 3:1). | A keyboard user has trouble seeing which field is active. | accessibility |
| 11 | An oversized request gets its connection reset instead of the 413 the code prepares. | 100 KB name → `fetch failed … ECONNRESET`. `curl -i` → `code=000`, empty. (`req.destroy()` runs before the 413 can be written.) | Only clients that skip `maxlength` hit this. Any that do would show "No hay conexión con el servidor", a wrong reason. Low impact. | server |
| 12 | The empty-submit error doesn't say which field is missing, and no field gets marked. | Empty submit: `msg "Completa todos los campos obligatorios."`, `[aria-invalid]` count 0. Focus stays on the button, and the fields are scrolled off-screen at 375 px (screenshot `p375-empty.png`). | A patient who filled everything but the hour has to scroll up and look for the empty field. | form |
| 13 | The login limit is per IP, and failures reset a 15-minute block, so anyone on the same network can lock the owner out. | 8 wrong passwords from 127.0.0.10, then the **correct** password from the same IP → 429. | Someone on the clinic's wifi (or a shared NAT) who types wrong passwords keeps the owner out of the admin page. Low likelihood. | security |
| 14 | The build doesn't explain how to test it. There is no README, and the request asked for "dime cómo lo pruebo". | The file list has only `servidor.mjs` and `public/`. The only instructions are the one-line comment in `servidor.mjs`. | The owner gets no steps for testing the form and the admin page, and doesn't learn that the password is stored in `datos/clave.txt`. (The final message wasn't shown to me, so this only covers what is in the files.) | false claim |

Minor notes, not counted as findings:
- The `<img>` tags have no `width` or `height`. The CSS reserves the space anyway (`aspect-ratio: 3/2` on the cards, a fixed `height` on the hero), so the layout doesn't jump.
- The alt text is useful and says "Imagen de ejemplo".
- The `servidor.mjs` comment "escrituras en serie y atómicas" is true for atomic writes. As finding #1 shows, "en serie" becomes "never again" after one failure.

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder, so I used five parts: **Rule, Why, Detector question, How to check, Example.**

### Covered by existing lessons
- #1, #2 → **WEB-1** (a damaged store takes later records down). #1 is a variant worth adding to WEB-1's examples: the store isn't damaged on disk, but the *write queue* is permanently rejected.
- #4 → **WEB-3**.
- #5 → **WEB-4**.
- #7 → **46**.
- #8 → **WEB-2**.
- #9 → **41**. The color pair in the source passes; the pixels the reader sees do not.
- #3 → partly **49**: a general guard overrides the form's own "fix it and resend" path. It also needs its own lesson, below.

### New: A rate limit must not punish the person who is fixing their mistake
- **Rule:** Count only accepted submissions (or cheap pre-checks) against a per-person limit. Never count validation failures the user is expected to correct. Size per-IP limits for shared IPs (carrier NAT, office wifi).
- **Why:** The error path and the abuse guard meet at the same request. When the guard counts every attempt, the people who make the most typos get locked out at the moment they get it right.
- **Detector question:** If a real person gets the form wrong 10 times and then right, or 20 patients book from the same carrier IP in an hour, does the correct submission go through?
- **How to check:** From one IP, send N invalid submissions (N = the limit), then one valid one. Repeat with N valid submissions from different "people" on the same IP.
- **Example:** Fisio Andares: 10 × `400 Escribe un teléfono válido.` then the valid request → `429 Demasiadas solicitudes`.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### New: A promise-chain write queue must recover from one failure
- **Rule:** When you serialize writes with `queue = queue.then(write)`, keep the chain alive after a failure (`queue = queue.then(write).catch(log)` and return the un-caught promise to the caller). Keep memory and disk consistent: don't keep a record in memory that the caller was told failed.
- **Why:** A rejected promise in the chain skips every later `.then`. One transient error turns into a permanent outage with no crash and no log after the first one. Meanwhile the in-memory list keeps showing data that will vanish on restart.
- **Detector question:** If one write fails and the cause goes away, does the *next* write succeed, and does what the user was told match what is on disk?
- **How to check:** Make the target unwritable for one request (for example, create `file.tmp` as a directory), then restore it and send two more writes. Compare the responses, the admin view and the file on disk.
- **Example:** Fisio Andares: after one failed write, every later POST and PATCH → 500. Admin shows 4 requests, disk has 1.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### New: Admin lists must not break the layout on unbroken user text
- **Rule:** Any container showing user-supplied text (names, emails, comments, URLs) gets `overflow-wrap: anywhere` (or `min-width: 0` plus wrapping), and is tested at 375 px with a 100-character token that has no spaces.
- **Why:** Emails and URLs have no spaces, so the browser can't wrap them and the whole page widens.
- **Detector question:** With the longest realistic email or a pasted URL in a record, does the page at 375 px scroll sideways?
- **How to check:** Insert a record with a 90-character email and comment, open the page at 375 px, and compare `document.documentElement.scrollWidth` with `clientWidth`.
- **Example:** Fisio Andares admin: `scrollWidth 854` vs `clientWidth 375`.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
