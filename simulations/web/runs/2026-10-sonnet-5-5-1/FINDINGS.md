# Review findings: Taller Rueda Libre

Reviewer: claude-opus-5-5, 2026-10-12. I fixed nothing in the build.

**How it was run.** Node v26.7.0 on Windows 11. I started the server as documented (`node servidor.mjs`), on ports 3107 to 3112, with `ADMIN_PASSWORD` set so the scripts could log in. I also did one run without it to check that a password is generated. The test scripts are in a separate folder, `%TEMP%\review-scratch-rl\`, and none of them are inside the build:

- `http-tests.mjs` and `http-tests2.mjs` send raw HTTP requests to the server. They use separate loopback source IPs (`127.x.y.z`) so the per-IP limit doesn't hide other results.
- `browser-tests*.mjs` drive headless Edge through the DevTools protocol: real mouse clicks, Tab and Enter, at 1280×800 and 375×740 (mobile), plus screenshots.

Every server and browser I started was stopped. The test data in `datos/` was deleted afterwards. That folder didn't exist before the review.

**What worked (checked, not assumed).**

- **Page:** it loads and all 4 images display. Each image has meaningful alt text and `width`/`height` set.
- **Mobile:** no horizontal scroll at 375 px (`scrollWidth 375 vs clientWidth 375`), including on the admin page.
- **Form, normal path:** a valid message saves and the thank-you text appears on screen next to the button. An empty submit and an email without "@" both show an error in the same place.
- **Double submit:** a quick double click saves 1 message, and so does pressing Enter twice.
- **HTML in messages:** `<b>hola</b>` and `<img onerror>` show up as plain text in the admin page. No dialog opened and no `<b>`/`<img>` elements were created.
- **Server validation:** the server rejects `{}`, `null`, numbers and 2001-character messages (400), 100 KB bodies (413), urlencoded bodies (415) and PUT (405).
- **Path traversal:** every attempt to reach files outside `publico/` returns 403 or 404, and `datos/mensajes.json` can't be fetched.
- **Admin:** it returns 401 without credentials, and DELETE without `X-Admin` returns 403.
- **Concurrent writes:** 50 simultaneous POSTs saved 50.

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | **A message gets lost on Windows when the admin page is open while a message arrives.** `leerMensajes()` for `GET /api/mensajes` runs outside the write queue. On Windows, `rename(tmp → mensajes.json)` fails with EPERM while that file is open for reading. | `http-tests.mjs`: 40 POSTs interleaved with 40 admin GETs gave `POST {"201":39,"500":1} … saved: 39`. `http-tests2.mjs` round 0: same result, and the server stderr showed `Error: EPERM: operation not permitted, rename '…\datos\mensajes.json.tmp' -> '…\datos\mensajes.json'`. | The owner refreshes the admin page just as a customer sends a message. The customer sees "Error interno", and the message is not saved. The owner never learns it existed. The OS the owner uses (Windows) is exactly where this happens. | data |
| 2 | **Bots silently push real messages out, and the admin can't clean up a flood.** The list is capped at `MAX_MENSAJES = 5000` and the oldest are dropped without notice. The per-IP limit is bypassed just by changing the source IP. The admin has no filter or bulk delete, and each deletion needs its own `confirm()`. | `http-tests2.mjs` sent 4,900+ "bot" POSTs from rotating `127.x.y.z` addresses, all accepted. Result: `Seed (first real msg) present before: false … count 5000`. The first real message had been evicted. | After one night of spam, the customer who wrote first is gone, with no trace or warning. To clean up 1,000 spam messages, the owner has to click Eliminar → OK 1,000 times. | data |
| 3 | **The form does nothing useful if `app.js` doesn't load.** The `<form>` has no `action` or `method`, so the browser does a GET to `/` with the fields in the URL. | `browser-tests3.mjs` with scripts disabled, then a real click on "Enviar mensaje": `url after submit: http://127.0.0.1:3111/?nombre=Sin+JS&correo=nojs%40example.com&mensaje=mensaje+sin+javascript&web= \| saved: 0 \| status text: "" \| message field now: "" \| scrollY: 0` | The person on a flaky mobile connection (or with a blocked script) presses Enviar. The page jumps to the top and the form is blank. Nothing tells them the message wasn't sent, and it wasn't. Their name, email and message are now in the URL, in browser history and in any proxy logs. | form |
| 4 | **The rate limit punishes typos, and behind the recommended proxy it applies to everyone.** `limitado(ip)` runs before validation, so rejected attempts count too. It's keyed on `req.socket.remoteAddress`, but LEEME tells the owner to put the site behind Caddy or nginx, where every visitor arrives as the proxy's IP. | `http-tests.mjs`, same IP: 5 POSTs rejected for `correo: "a@b"` (which the browser's own email check accepts), then a valid one returned `429 {"error":"Demasiados mensajes. Intenta en un minuto."}`. Browser run 1: every browser POST comes from 127.0.0.1, and the 6th message in a minute (the HTML test) was never saved (`summary: 4 mensajes`). | A customer types `ana@gmail` a few times, finally gets it right, and is told to wait a minute. Once deployed behind HTTPS as advised, only 5 messages per minute can be sent in total. A 6th real customer is turned away while bots, which rotate IPs, are not. | server |
| 5 | **If the server can't be reached, the error message is in English and technical.** `err.message` from `fetch` is shown verbatim. | `browser-tests.mjs`, server killed, then submit: `server down -> {"text":"Failed to fetch","cls":"error",…,"inView":true}` (the fields were kept) | A Spanish-speaking customer sees "Failed to fetch" in red. They can't tell whether the message was sent, and nothing suggests retrying or calling the shop. | form |
| 6 | **Focus is lost on submit.** The button is disabled while it has focus, so focus falls to `<body>`. The same happens in the admin after Eliminar, because the list is rebuilt. | `browser-tests.mjs`, keyboard only: `focus while sending: BODY \| focus after success: BODY`, and the next Tab went to BODY. Admin: `focus after delete: BODY`, and the next Tab went to `A[enter@example.com]`, the first link in the list. | A keyboard or screen-reader user submits and loses their place. Next to the form there's nothing focused to continue from. In the admin, deleting several messages means hunting for the next button each time. | accessibility |
| 7 | **Prices don't line up across the service cards.** `.tarjeta-cuerpo p { margin: 0 0 .8rem }` (0,1,1) is more specific than `.precio { margin-top: auto }` (0,1,0), so the general rule wins and the price is not pushed to the bottom of the card. | `browser-tests.mjs` at 1280 px: `.precio computed margin-top: ["0px","0px","0px"]`; `priceTop: 360 / 384 / 384` px, `gapBelowPrice: 58 / 33 / 33`. In `desktop-servicios.png`, "$250 MXN" sits visibly higher than the other two prices, with empty space under it. | On desktop the three prices zig-zag and the cards look unfinished. This would get worse if a description is edited to a different length. | mobile |
| 8 | **White text on the orange buttons is below the WCAG AA contrast minimum.** | `browser-tests2.mjs` computed contrast for white on `#e8742c`: **3.01:1** (hover `#cc5f1b`: 4.02:1). The button text is `16px 600`, which is not "large text", so it needs 4.5:1. While sending, the disabled `opacity:.6` makes it lower still. | People with low vision, or anyone reading a phone in sunlight outside the shop, struggle to read "Escríbenos" and "Enviar mensaje", the two main calls to action. | accessibility |
| 9 | **Every message rewrites the whole file, so cost grows with the number of stored messages.** Each POST reads, parses, re-serializes and writes all messages, and the admin downloads all of them in one response. | `http-tests2.mjs`, POST cost by stored size: `120 msgs (198 KB): 33.6 ms`, `2540 msgs (5.2 MB): 49.6 ms`, `5000 msgs (10.3 MB): 61.4 ms`. `admin list GET: 10123110 B`. `30 concurrent visitors at cap: last answered after 879 ms`. | During a spam wave, each real customer waits behind a 10 MB rewrite per queued message. The owner's admin page downloads 10 MB of text on a phone connection. It's bounded by the cap, but the cap itself causes finding 2. | server |
| 10 | **A damaged `mensajes.json` stops the whole form and the admin page.** | `http-tests2.mjs` truncated the file to 5000 bytes: `POST after damaged mensajes.json: 500 {"error":"Error interno"}`, `admin list after damage: 500`, server log `SyntaxError: Unterminated string in JSON at position 5000`. A half-written `.tmp` from a simulated crash did **not** cause harm: next POST `201`, `.tmp left: false`. | The file is the owner's only copy and the documentation points them at it. If they hand-edit it and leave a stray comma, every customer gets "Error interno" and the admin shows "No se pudieron cargar los mensajes". Nothing says why or which file. | data |
| 11 | **Empty submit doesn't say which field is missing.** No field gets `aria-invalid` and focus doesn't move. Name "A" is accepted, and so is `a@b` on the client (the server then rejects it). | `browser-tests.mjs` (375 px): `empty submit -> "Por favor llena todos los campos." … focus: BUTTON … aria-invalid on fields: 0`; `name "A" valid email -> "¡Gracias!…" saved`; `email "a@b" -> "Correo inválido"` (from the server, after a round trip). | The person can recover (the message sits right under the button and the fields are kept), but on a long form they'd have to guess which field is wrong. Screen readers aren't told which field is invalid. Minor. | form |
| 12 | **The startup instructions don't match Windows, the owner's OS.** The terminal banner says `Para fijar una propia: ADMIN_PASSWORD=tuclave node servidor.mjs`, which is bash syntax that fails in PowerShell. The summary says to start with `HOST=0.0.0.0` (also bash syntax) to test from a phone, but with that setting the banner prints `http://localhost:3112` instead of the PC's LAN IP. The password changes on every restart. | Startup-banner check (`node -e` that starts the server twice): `RUN1 … Contraseña de esta sesión: 70i_OqMcz_73 … ADMIN_PASSWORD=tuclave node servidor.mjs`, `RUN2 … yqHp0pTGtBnf`. `HOST=0.0.0.0` gave `Taller Rueda Libre en http://localhost:3112`. | The owner copies the hint from the terminal into PowerShell and gets an error. They try the phone test and are shown a "localhost" address that can't work on the phone. After every restart, the saved browser login stops working until they read the new password from the terminal. | false claim |
| 13 | **The admin login has no throttle.** | `http-tests.mjs`: `50 wrong passwords in a row, all 401 (no lockout/throttle): 50`. | With the default random 12-character password this is harmless. If the owner sets a short password of their own (nothing enforces a minimum), it can be guessed online over plain HTTP. Low. | security |

**Builder's claims checked one by one:**

- "límite de 5 mensajes por minuto por IP": true as written, but see #4 for how it behaves.
- "campo trampa": true (a filled honeypot gets 201 and nothing is saved).
- "validación en el servidor": true.
- "todo el texto … como texto, no como HTML": true.
- "solo en local por defecto": true.
- "contraseña generada en la terminal": true.
- "`datos/mensajes.json` se crea solo": true.
- "verás … poder eliminarlo": true.
- "adaptada a celular": mostly true. There's no horizontal scroll, the sticky bar doesn't hide headings after tapping a nav link (`h2 top 96 vs bar bottom 92`), and inputs and buttons are about 49–50 px tall. Nav links are 33 px tall, which is above the 24 px minimum.
- "arranca con `HOST=0.0.0.0`" to test from a phone: misleading on the owner's Windows setup (#12).
- "no está probado": honest. Findings #1, #3, #7 and #8 are the kind that only show up when it's run.

## Candidate lessons

Several findings are already covered by existing lessons, so I'm not writing new ones for them:

| Finding | Covered by |
|---|---|
| #2 | WEB-2 |
| #3 | WEB-3 |
| #5 and #11 | 45 |
| #6 | WEB-4 |
| #7 | 49 (and 41: the rule was in the source, but nobody rendered it) |
| #9 | 46 |

#12 and #13 are one-off slips. New candidates follow for #1, #4 and #8. I couldn't find the template file (`lessons/TEMPLATE.md` isn't in this folder or its parent), so these use the five parts that the listed lessons show: title, what happened, why it happens, what to do, and the detector question.

### Candidate: An atomic replace is only atomic if every reader takes part

- **What happened:** writes went through a queue and used write-to-`.tmp`-then-`rename`, which is correct for crash safety. But the admin read of the same file ran outside the queue. On Windows, `rename` over a file that is open for reading fails with EPERM. 1 message in 40 was lost, and the customer saw "Error interno".
- **Why it happens:** "atomic rename" is learned as a POSIX fact. On POSIX an open reader never blocks a replace, so nobody thinks of reads as part of the protocol. The bug only appears on the OS the owner actually uses, under concurrent load.
- **What to do:** put reads in the same queue as writes (or serve reads from an in-memory copy that the writer updates). Retry `rename` on EPERM/EBUSY a few times before failing. Test with reads and writes interleaved, on the target OS.
- **Detector question:** while one request is replacing the file, can another request have it open? What does the replace do on Windows if it does?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate: A limit keyed on who connects counts the proxy, not the person

- **What happened:** the spam limit was 5 per minute per `req.socket.remoteAddress`, and it counted rejected attempts as well. The same README told the owner to deploy behind Caddy or nginx. From then on, every visitor shares one IP, so the whole site gets 5 messages a minute. A customer who mistypes their email 5 times is locked out, while a bot that rotates addresses is never limited.
- **Why it happens:** the limit is written and tested from one laptop, where the socket address is the person. The deployment advice is written separately, and nobody puts the two together.
- **What to do:** decide where the real client IP comes from in the deployment you recommend (a trusted `X-Forwarded-For` hop, only when behind a known proxy). Count only accepted submissions, or count failures separately with a higher threshold. Don't rely on per-IP limits alone against bots; pair them with the honeypot, content checks and admin tools.
- **Detector question:** in the deployment I'm recommending, what address does this limit see, and who else shares it? Does a person fixing a typo use up the same budget as a bot?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate: A brand colour on a button is a contrast decision

- **What happened:** the main call-to-action buttons used white 16px semi-bold text on the brand orange `#e8742c` at 3.01:1, below the 4.5:1 AA minimum for text that size. The hover colour was also below (4.02:1), and the disabled state (`opacity .6`) was lower still. Everything else on the page passed (5.26:1 to 7.67:1).
- **Why it happens:** orange "looks" bold and readable on a bright monitor. Contrast gets checked for body text, but buttons are treated as decoration rather than text.
- **What to do:** compute the ratio for every text-on-colour pair, including the hover, focus and disabled states. If the brand colour fails, darken the button background (orange around `#b8551a` or darker reaches 4.5:1 with white) or use dark text.
- **Detector question:** what is the contrast ratio of the text on each button, in every state it can be in, and is that text "large" by the WCAG definition?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
