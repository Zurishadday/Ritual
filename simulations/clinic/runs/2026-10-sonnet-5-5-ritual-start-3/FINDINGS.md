# Review: Fisio Andares (blind review)

**How it was started.** There is no README. The only start instructions are the comment at the top of `servidor.mjs` (`node servidor.mjs`, optional `PORT`, `HOST`, `CONTRASENA_ADMIN`) and the smoke test `prueba.mjs`. `node servidor.mjs` started on `127.0.0.1:3000` and printed the panel password. It also created `datos/contrasena-admin.txt` inside the project folder; that folder is left over from this review. All other tests ran on separate instances, started by a small launcher with `PORT=3100–3102`, a temp `DATOS_DIR` and a known password. Browser checks used headless Chrome driven over CDP from Node. The scripts are in `%TEMP%\review-clinic-scripts` and the screenshots in `%TEMP%\review-clinic-shots`. Today is Friday 2026-10-16, about 10:02, America/Mexico_City.

**What held (tried, did not break).**
- The page loads with no console errors. All 4 images load and each has `width`, `height` and descriptive alt text.
- Server-side validation catches all of these: an empty body, `{}`, a phone with letters, an email without `@`, a past day, a Saturday or Sunday, 20:00, 18:00, 08:30, 10:15, 2027-02-30, a date two years ahead, an unknown treatment, malformed JSON and a JSON array. 100 KB returns 413, a cross-origin `Origin` returns 403, `GET` and `DELETE /api/citas` return 404, and `PUT /` returns 405.
- Path traversal is blocked: `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `%2e%2e`, `%5c`, overlong UTF-8, `/datos/` and `/..%2fdatos/contrasena-admin.txt` all return 404 or 400.
- In-browser form paths all work: empty, bad phone, bad email, past day and Sunday each show inline errors, focus the first wrong field (visible below the sticky header), and show a summary.
- A double click saved 1 request.
- `<b>hola</b><img src=x onerror="alert(1)">` shows as literal text in the panel: 0 injected elements and 0 dialogs.
- Without the password, confirming or deleting returns 401, including with a forged cookie.
- 200 simultaneous requests from 200 IPs, with 10 status changes mixed in: 200 saved, nothing lost.
- A torn last line or garbage lines do not stop the next request: it returns 201, is listed, and the panel warns about damaged lines.
- Keyboard: focus ring visible on every control, `aria-disabled` instead of `disabled`, focus moves to the result message, and the next Tab goes to the phone link.
- The public page has no horizontal scroll at 375 px.
- With JS off, an empty submit is stopped by native validation and the page stays put.
- The build's own `prueba.mjs` reports 20/20 OK.

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | The clinic panel overflows sideways on a phone when a request has a long word (long name, long email, or a comment with no spaces). No `overflow-wrap` on `.solicitud` text. | Headless Chrome at 375 px, mobile emulation, panel with a request named `"Maximiliano"×9` and a 300-character comment: `scrollWidth 3046, innerWidth 1500`. Screenshot `panel-375.png`: the page is zoomed out and every card is about 220 px wide on a 1875 px canvas. | The owner opens the panel on their phone and gets a page shrunk to unreadable size, with Confirmar/Cancelar buttons too small to tap. One spam message with a long string is enough to break the whole list. | mobile |
| 2 | A same-day slot that has already passed is accepted, by both the page and the server. | At 10:02 on Fri 2026-10-16: `POST /api/citas fecha=2026-10-16 hora=09:00` returned `201 {"ok":true,...}`. In the browser, the same choice showed "Listo, recibimos tu solicitud." The hour list is never filtered by the current time. | A patient books "today 9:00" at noon and believes it is booked. The clinic has to call back, or the patient turns up to a slot that is gone. | form |
| 3 | The login lockout and the booking limit are keyed on the socket IP only, and `X-Forwarded-For` is ignored. Anyone on the same address can lock the owner out, and after 5 bookings in 10 minutes from one address every later request is refused. | 30 wrong passwords from 127.0.8.8 in 197 ms: `401×5, 429×25`. Then the owner's **correct** password from the same IP returned `429 "Espera 60 segundos"`. 7 attempts with a different `X-Forwarded-For` each returned `401×5, 429×2`, so the header is ignored. After 5 valid bookings from 127.0.0.1, a no-JS submit returned the "Demasiadas solicitudes" page. `HOST` defaults to `127.0.0.1`, so a public deployment needs a reverse proxy, and behind one every visitor shares one IP. | Behind a proxy, which the default bind to localhost all but requires, the 6th patient in any 10 minutes is told "Has enviado varias solicitudes seguidas", and anyone can keep the owner locked out of the panel by sending 5 bad passwords a minute. | security |
| 4 | The rate-limit check runs before validation, so its message replaces the field error. | No-JS submit with a Sunday date after the IP's 5 valid bookings returned the "Demasiadas solicitudes … Llámanos" page instead of "Atendemos de lunes a viernes". | Someone at a shared front-desk or family connection fixing a mistake is told they sent too many requests and never learns the actual problem is the date. | form |
| 5 | A bot flood buries real requests. Only bots that fill the honeypot are stopped. The panel has no search, no bulk delete, shows only the newest 200, and asks for a `confirm()` on every single delete. | 200 scripted requests from 200 IPs, honeypot left empty: all `201`. With 100,001 records the panel shows "Se muestran las 200 más recientes de 100001". The panel has 4 status filters, no search or checkbox controls (`bulk actions / search present: false`), and per-card Eliminar opens `confirm()`. | After a spam night the owner cannot find the real patient's request among the fakes, and deleting 1,000 fakes takes 1,000 clicks plus 1,000 dialogs. | data |
| 6 | The clinic panel with JavaScript off is a blank white page. The `<noscript>` message is inside `<section id="login" hidden>`, so it never shows. | Headless Chrome, scripts disabled, `/admin.html`: `document.body.innerText` is `""`. Screenshot `panel-sinjs.png` is empty. The source does contain "Este panel necesita JavaScript activado.". | The owner, using a browser with JS blocked or a script that failed to load, sees a white page and assumes the site is down. | accessibility |
| 7 | The no-JS fallback works, but an error sends the person to a separate page. That page only links back to `/#cita`, a fresh load with an empty form, and oversized bodies return raw JSON. | `POST /api/citas` without `Accept: application/json` and a Sunday date returned `422 text/html "Revisa tu solicitud"` with the link `<a href="/#cita">Volver al formulario</a>`. A 100 KB no-JS post returned `413 {"error":"El mensaje es demasiado largo."}` as JSON. | A patient without JS who makes one mistake has to type every field again. Many will give up and not call. | form |
| 8 | The panel reads and parses the whole event log on every list, and twice on every status change. The log only grows: deletes and status changes are appended and the file is never compacted. | The list took 8, 30, 116 and 201 ms at 1k, 10k, 50k and 100k records (0.4 to 39.5 MB). One status change took 5, 27, 99 and 201 ms over the same sizes. 10 parallel lists took 1882 ms at 100k. | At clinic scale (thousands of records) this is fine today. It only becomes visible after a spam flood or years of use, when confirming each request starts to lag. Low severity. | server |
| 9 | Small tap targets on the public page at 375 px, including the main "call us" link. | Measured at 375 px: phone link `55 1234 5678` is 141×30 px, "Acceso del consultorio" 169×22, brand link 125×31, skip link 172×42. | On a phone, the number people tap to call the clinic is a short target; mis-taps are likely, especially for older patients. | mobile |
| 10 | Hero text crosses the illustration's light strokes. | Screenshot `publico-375.png`: "rodilla," and "dolor" sit over the figure's white strokes (`stroke="#fff" opacity=.9`, image `opacity:.55` on `#0a4d47`). Estimated local background about rgb(134,164,161), which gives roughly 2.6:1 against white text, softened by a text-shadow. This was not measured with a contrast tool. | Low-vision visitors may lose a word of the headline on small screens. | accessibility |
| 11 | The server's idea of "today" is its own clock and timezone, not the clinic's. | The same request (`fecha=2026-10-16 hora=09:00`) returned `201` on a server in local time and `422 "Ese día ya pasó"` on the same server started with `TZ=Asia/Tokyo`. The browser computes `min` from the visitor's clock. | On a host in another timezone, the page and the server disagree about which day is "today". Patients get errors the page did not warn about, or past days are accepted. | server |
| 12 | What the build says vs. what is there: there is no README, and the request explicitly asked "dime cómo lo pruebo". The smoke test prints "Todo bien (parte 1)" but there is no part 2. Every start prints the panel password to the console. | The `Glob` of the folder has no README. `node prueba.mjs` ends with "Todo bien (parte 1)". The `node servidor.mjs` output includes `Contraseña del panel: QUwBomoZj292`. | The owner has no written instructions for testing, deploying or changing the password. The password ends up in any log or screen recording of the terminal. | false claim |

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder, so the five parts below are: rule, why, detector question, how to check, example.

### Candidate A: "Not in the past" means not before now, in the business's timezone
- **Rule:** Any check against "now" (past day, past hour, opening hours) runs to the minute, in the business's timezone, on the server. The page applies the same rule only as a convenience.
- **Why:** Date-only checks let today's earlier hours through, and server-local clocks drift from the clinic's day as soon as it's hosted elsewhere.
- **Detector question:** If someone picks today at an hour that has already passed, or the server runs in UTC, what does the form say?
- **How to check:** Submit today plus the first slot after it has passed, and start the server with a different `TZ` and submit today.
- **Example:** Findings 2 and 11: `201` for today 09:00 at 10:02, and `422 "Ese día ya pasó"` for the same request under `TZ=Asia/Tokyo`.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate B: Text that visitors write has to wrap everywhere it is shown
- **Rule:** Every element that shows visitor-typed text (names, emails, comments) gets `overflow-wrap: anywhere` or an equivalent, and is tested at 375 px with a long string that has no spaces.
- **Why:** Test data has normal words. Real data and spam don't, and one long string widens the whole page, so a phone zooms out and everything becomes too small to tap.
- **Detector question:** At 375 px, with a 100-character name and a 300-character word in the comment, does the page scroll sideways?
- **How to check:** Compare `document.documentElement.scrollWidth` with `innerWidth` on the admin view after saving such a request.
- **Example:** Finding 1: `scrollWidth 3046` on a 375 px phone.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate C: A per-IP limit must not lock out the owner or merge every visitor into one bucket
- **Rule:** Before keying a limit on the client IP, decide how the app learns the real IP (trusted proxy header) and what a lockout does to the legitimate user on that IP. Prefer slowing attempts down (delays, per-account backoff) over a hard block on the correct password. Run validation before the limit so its message doesn't replace field errors.
- **Why:** On a shared IP (proxy, office NAT, family Wi-Fi), the limit either blocks real users or hands an attacker a switch to lock the owner out.
- **Detector question:** If 5 wrong passwords arrive from the owner's IP, can the owner still log in? If the app is behind a proxy, how many patients can book in 10 minutes?
- **How to check:** Send 5 bad logins from one IP, then the right password from the same IP. Send 6 valid bookings from one IP.
- **Example:** Findings 3 and 4: the correct password returned `429`, and the 6th booking got "Demasiadas solicitudes" instead of the date error.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate D: The main call-to-action link must be a full-size tap target on a phone
- **Rule:** Links that are the main action on mobile (call, map, book) are at least 44×44 px, styled like buttons, not inline text.
- **Why:** On the phone this site is built for, "call us" is often the main conversion, and a 30 px-tall link is easy to miss.
- **Detector question:** At 375 px, what are the width and height of the link people tap to call?
- **How to check:** Measure `getBoundingClientRect()` of every `a, button` at 375 px and list any under 44 px.
- **Example:** Finding 9: the phone link is 141×30.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Findings already covered by existing lessons
- Finding 5 (bot flood, no search or bulk delete): **WEB-2**.
- Finding 8 (full-file scan on every panel request): **46**.
- Finding 6 (the `<noscript>` text is in the source but never shown): **41**. The builder found the text in the source but never looked at the page with JS off.
- Finding 7 (the no-JS error page throws away what was typed): **WEB-3**, and **45** for the error path. The fallback was tested for success only.
- Finding 4 (the general rate-limit message beats the specific validation message): **49**.
- Findings 10 and 12 are one-off slips, so no lessons are written for them.
