# Review: Fisio Andares (appointment requests for a physiotherapy clinic)

Blind review. The build has no README. The only run instructions are the first-line comment in `servidor.mjs` ("node servidor.mjs") and the console output. I started it with `node servidor.mjs`. It printed the URL, the panel URL, a generated password (stored in `datos/clave.txt`) and the data file. Every probe I wrote is in `_revisor/` and every screenshot is in `_revisor/shots/`. I added extra servers with seeded data via `node _revisor/lanzar.mjs <port> <dir> <n>`. All servers I started were stopped at the end.

The build is careful in most places. It validates on the server, escapes output, defends the file server, makes the keyboard work and keeps the page usable on a phone. The problems are in the branches nobody exercised: the no-JS form once rate-limited, the login after its "limit", the store once full or after a cut write, and the builder's own mobile check.

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | The no-JavaScript form crashes with a bare 500 once the per-IP limit is hit. `fallar()` reads `datos` before its `let` (TDZ) on the rate-limit branch. | `node _revisor/sondas.mjs 3000 nojs-limite` → 7 valid urlencoded posts, every one returns `500 Error del servidor` (text/plain). Server log: `ReferenceError: Cannot access 'datos' before initialization at fallar (servidor.mjs:181)`. The JS path on the same IP gets a polite 429 message. | A patient with JS off, or whose `app.js` failed to load, sees a plain-text "Error del servidor". There is no phone number, no form and no way back. Their request is not saved, and they don't know whether to retry. | form |
| 2 | The public-form limit is 5 valid requests per IP per 10 minutes. Everyone behind one IP (mobile carrier CGNAT, office or gym Wi-Fi, a family) shares it. | `node _revisor/sondas.mjs 3000 doble 30` → `200,200,429×28` once the IP had 3 earlier requests. Message: "Hiciste muchas solicitudes seguidas…". | A patient who never submitted anything is told they "sent too many requests" because strangers on the same carrier IP booked first. They give up or have to call. | server |
| 3 | The login "limit" doesn't stop guessing. After 5 failures, wrong passwords get 429, but every guess is still checked and the right one is accepted. Requests run in parallel, so the 400 ms delay doesn't slow an attacker. | `node _revisor/sondas.mjs 3000 login <clave>` → `200 wrong passwords in parallel took 566 ms, statuses: {"401":5,"429":195}`, then `correct password right after 200 failures -> 200 {"ok":true}`. | The default 12-character random password holds. If the owner sets `ADMIN_PASSWORD` to something memorable (the code invites it), an attacker can find it at about 350 guesses/s per IP. They then read every patient's name, phone, email and comments, and can cancel appointments. | security |
| 4 | The store is capped at 5,000 requests. Once full, the public form refuses every patient with 503. Bots from many IPs can fill it quickly, and cleanup is one card at a time. | 200 posts from 200 IPs → `{"200":200}` in 404 ms (`node _revisor/datos.mjs 3101 … concurrencia`). At 5,000 stored: `public request when store holds 5000 -> 503 "Ahora mismo no podemos recibir solicitudes en línea"`. Deleting needs Cancel on each card, then "Borrar canceladas". At 5,000 cards one Confirm takes 1.3 s (`node _revisor/navegador.mjs muchas 3102`). There is no bulk select or search. | A bot run (or a few months of normal use without cleanup) quietly switches off online booking for every real patient. To recover, the owner clicks thousands of buttons. | data |
| 5 | A write cut off while the server keeps running (for example, disk full) glues the next patient's record onto the broken fragment. That patient is told "¡Listo!", and the request disappears at the next restart. | `node _revisor/corte.mjs 3101 _revisor/d-a` → `next request after a cut write -> 200 {"ok":true…}`; `last line on disk parses: false | starts: {"t":"cita","id":"a-medias",…"Escritura cort{"t":"cita","id":"b8947a…`. After restart: `request present: false`, `lineasDanadas: 2`. (The crash-then-restart case is handled: the build closes a cut last line on start-up, and the next request saves; see the lessons section.) | The patient waits for a call that never comes. The owner only sees "2 registro(s) dañados" with no name to call back. | data |
| 6 | False claim: `herramientas/medir-ancho.mjs` says it checks the panel "a 375 px". It actually measures a hand-written copy of one card (`ancho.html`), not `admin.html`, and Chrome headless ran it at 512 px. | `node herramientas/medir-ancho.mjs` → `RESULT sw=512 iw=512`, exit 0 ("pass"). | Nobody is harmed today: my own run on the real page at 375 px shows no horizontal scroll (`scrollWidth=375 innerWidth=375` for both pages). But the check would pass even if the real panel broke on phones. | false claim |
| 7 | On the clinic page at 375 px, the phone and email links on each card are only 21 px tall. | `node _revisor/navegador.mjs admin 3101` → `small tap targets (<44px tall) in panel: A:Tel: 55 9876 5432:21 | A:lucia@correo.com:21 …` | The owner, calling patients from her phone, mis-taps between the phone and email lines of a card. | mobile |
| 8 | The hero text depends on the photo for contrast. With the shipped placeholder, the worst spot behind the 1 rem paragraph is about 3.5:1 (computed from `portada.svg` colours, `#ffffff88` figure over `#2f8f78`, at opacity .55 over `#14503f`). That is below 4.5:1 and is helped only by `text-shadow`. | `_revisor/shots/01-publico-375-arriba.png`: the paragraph runs over the light figures. Calculation in the evidence column above. | Readable today in the screenshot. When the owner swaps in a real, brighter photo (as the request implies), the tagline and its paragraph can become hard to read for low-vision visitors. | accessibility |

### Checked and held (no finding)

- **Page and images:** the page loads. All 4 images load, have useful `alt` text and declare `width`/`height`.
- **Form errors, JS path:** empty submit, a phone with letters, an email without "@", a Sunday, a Saturday, a past day and today. Each one moves focus to an error summary in view and shows a message under the field (`03-vacio-375.png`). 20:00 is not offered (options 09:00–17:00), and the server rejects `20:00` and `17:30` with 422.
- **Double click:** two quick clicks with JS saved exactly 1 request.
- **HTML in the name and comment:** shown as literal text on the clinic page. There were 0 `<img>`/`<b>` elements and no dialogs.
- **Server validation:** the server rejects everything the browser does. An empty body or `null` gets 422, a 100 KB field gets 413, a Sunday, a past date or 30 February gets 422, `__proto__` as treatment gets 422, and PUT or GET on `/api/citas` gets 404.
- **File server:** `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5cdatos%5cclave.txt`, `/datos/citas.jsonl`, `/datos/clave.txt`, `/datos/` and `/img/` all return 404. A malformed `%` returns 400.
- **Admin API without the password:** `estado`, `borrar` and `citas` all return 401, including with a forged cookie.
- **Keyboard:** a logical Tab order with a visible 3 px amber outline. Enter on submit works. Focus goes to the errors, or to the success message, and the next Tab goes to the phone link.
- **Without JS:** empty and Sunday submits show an HTML page listing the errors with the form refilled. After correcting, the request lands on `gracias.html`.
- **Concurrency:** 200 requests plus 50 status changes at the same time produced 201 records, 50 of 50 confirmed and no broken lines.
- **Load:** the admin API takes 28 ms at 5,000 records and about 200 ms at 50,000. The browser renders 5,000 cards in 0.9 s.
- **Builder's other tests:** `probar.mjs` and `verificar-arreglos.mjs` pass and test what their labels say.

## Candidate lessons

- Finding 1 is covered by **WEB-3** (a fallback nobody tested is not a fallback): the no-JS path was tested, but not its rate-limited branch.
- Finding 3 is covered by **WEB-5**.
- Finding 5 is covered by **WEB-1**.
- Finding 6 is covered by **41** (check in the format the reader actually sees).
- Finding 4 is partly covered by **WEB-2**. The "off switch" part is new; see below.
- Findings 7 and 8 are one-off slips.

`lessons/TEMPLATE.md` is not in this folder, so the five parts below follow the shape of the listed lessons: title, mistake, why it happens, detector question, rule.

### Candidate: A per-IP limit punishes everyone who shares the IP
- **Mistake:** a public form limits valid submissions per IP (here 5 per 10 min), and treats one IP as one person.
- **Why it happens:** it's the simplest anti-abuse key, and in local tests every request comes from 127.0.0.1, which looks like one person.
- **Detector question:** If fifty real people reach this form from the same IP (a mobile carrier, an office, a gym), what does person number six see, and was it their fault?
- **Rule:** limit by something closer to a person (the same phone or email, a honeypot or token, a global ceiling with alerting), or set per-IP limits far above one household's use. Word the refusal so it doesn't blame the visitor, and always show the phone number.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate: A hard cap on a public store is an off switch anyone can flip
- **Mistake:** to protect the server, the store accepts at most N records and then refuses all new ones. Anyone able to submit N records turns the feature off for real users, and recovery is manual work at that same scale.
- **Why it happens:** a cap is an easy answer to "what if it grows forever?", and the refusal path looks polite in a test.
- **Detector question:** Who can fill this cap, how fast, and when it is full, who is refused: the bot, or the next real person? How many clicks does it take the owner to make room?
- **Rule:** don't let a cap drop the newest legitimate entries silently. Rotate or archive old or handled records, quarantine suspected spam separately, and tell the owner early. Give the owner a bulk action that matches the scale of what can be filled.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
