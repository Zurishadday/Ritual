# Findings: Taller Rueda Libre

Reviewer run on 2026-10-13. Node v26.7.0, headless Chrome driven over CDP, Windows 11.

**How it was run.** `node servidor.mjs` in the build folder failed with `EADDRINUSE :::3000`. Another app on this machine (a Next.js site) already holds port 3000, so this is not counted as a finding. That one start did create an empty `datos/` folder in the build, because `mkdirSync` runs before `listen`. To keep the build untouched, it was copied to `review-copy-rl/` and started with `PORT=3417 ADMIN_PASSWORD=clave-prueba`. The env vars were set from a Node launcher, `review-tools-rl/launch.mjs`. The generated-password path was also started, on port 3420, and printed `contraseña: e2e1f0937885 (generada; …)`. All probe scripts are in `review-tools-rl/` and screenshots are in `review-tools-rl/shots/`. Every server started was stopped at the end.

## What held (tried, did not break)

- **Load:** `/`, the CSS, the JS and all 4 SVGs return 200 with correct types. All 4 `<img>` render (`complete && naturalWidth>0`).
- **HTML in a message:** a message with `<b>hola</b>` and `<img src=x onerror="alert(1)">` shows as literal text in admin. No dialog fired, and there is no `<img>` or `<b>` element in the article.
- **File server:** these all return 404: `/../servidor.mjs` (raw, path-as-is), `/..%2f..%2fservidor.mjs`, `/..%5cservidor.mjs`, `/%2e%2e/servidor.mjs`, `/datos/mensajes.json`, `/..%2fdatos%2fmensajes.json`, `/privado/admin.html`, `/index.html%00`, a missing path, and malformed `%E0%A4%A`.
- **Admin protection:** `/admin`, `/api/admin/mensajes` and `/api/admin/borrar` without credentials all return 401.
- **Server-side validation:** empty fields, a bad email, `ana@gmail` (no dot) and a 9 KB message all get 400 with a clear text. PUT, DELETE, PATCH and OPTIONS get 405.
- **Mobile at 375 px:** `scrollWidth 375 = clientWidth 375`, so there is no horizontal scroll and no element sticks out. Tapping a nav link puts its h2 at y=100, below the 85 px header.
- **Keyboard:** the Tab order is logo, 3 nav links, Escríbenos, nombre, correo, mensaje, button. Every stop matches `:focus-visible` (the browser ring, or a 3 px yellow outline on fields). Enter on the button submits, and the message was saved.
- **Images:** the alt text is useful. There are no `width`/`height` attributes, but CSS `aspect-ratio` and the absolutely positioned hero give a measured cumulative layout shift of `0` after load and scroll.
- **Concurrency:** 40 simultaneous POSTs from 40 IPs saved 40 out of 40.
- **Crash mid-write:** a second server process was SIGKILLed 50 to 1200 ms after a POST against a 58 MB store. In all 9 cases the store still parsed (30000, then 30001…30006), with no `.tmp` and no corruption.
- **Truncated store:** after cutting the file in half, the next visitor's POST got `201`. The damaged file was kept as `mensajes.danado-….json`, and `AVISO: mensajes.json estaba dañado…` printed in the console.

## Table

| # | What broke | Evidence | What happens to a real person | Class |
|---|---|---|---|---|
| 1 | The admin "lockout" still checks every password. After 10 failures, wrong guesses get 429, but the right password still gets 200. | `probe.mjs brute`: 200 wrong passwords from one IP in 573 ms gave `{401:10, 429:190}`. The right password from the **same IP** right after gave `200 [{"id":…`. The next wrong one gave 429 again. | Someone can try about 350 passwords per second per IP and tell the right one apart (200 vs 429). If the owner sets an easy `ADMIN_PASSWORD` like `taller2026`, an attacker reads every customer's name, email and message. | security, false claim |
| 2 | Without JavaScript, a successful send shows no confirmation. | `browser2.mjs nojs`: JS disabled, valid form submitted, ended on `/?enviado=1#contacto` with `saved: 1`. `#estado` text is `''` and the page contains "Gracias" `false`. The thank-you text is written only by `script.js` (screenshot `nojs-good.png`). | The person sees the same empty form again and doesn't know whether it was sent. They send it again, or they phone the shop because they think the site is broken. | form, false claim |
| 3 | Without JavaScript, any error replaces the whole page with one line of plain text. | Empty submit with JS off led to URL `/api/contacto` with page text `"Escribe tu nombre (máx. 100 caracteres)."` and nothing else (`nojs-empty.png`). | The person must find the Back button, and on some phones the typed message is gone. Nothing on the page points back to the shop. | form |
| 4 | The rate limit counts rejected attempts, and on the no-JS form it answers with raw JSON. | `probe.mjs rate`: 5 empty submits gave 400. The 6th gave `429 application/json {"error":"Demasiados envíos…"}`. Then a **valid** message from the same IP also got 429. | A person without JS who gets the email wrong a few times is locked out for a minute right when they get it right, and sees a raw `{"error":…}` page. Behind a proxy or a shared Wi-Fi network (one IP), 5 customers per minute share one quota. | form, server |
| 5 | Double-click: the message is saved, but the screen says it was not. | `browser2.mjs double`: two clicks 30 ms apart gave `saved: 1`, and `#estado` showed `"Completa nombre, correo y mensaje."` in red. The local response came back before the second click, `reset()` emptied the form, the button was re-enabled, and the second click validated an empty form. | On a fast connection the customer sees a red error after their message actually went through. They type it again, so the owner gets duplicates, or they give up thinking it failed. | form |
| 6 | After submitting, focus is lost and the next Tab leaves the page. | `browser.mjs keyboard`: Enter on the button gave activeElement `BODY` right away (the button became disabled). After the response it was still `BODY`. The next Tab was `BODY`, which means it left the document; only the 2nd Tab reached the top link (`browser2.mjs focusafter`). | A keyboard or screen-reader user loses their place after sending and ends up in the browser toolbar, then has to come back through the whole page. | accessibility |
| 7 | A store that parses but has the wrong shape makes every later message fail. | `data.mjs shape`: with `mensajes.json` set to `{}`, `null`, `"texto"` or `{"mensajes":[]}`, every visitor POST got `500 {"error":"Error interno."}` and admin got 500. The file was left as is and the console only shows `TypeError: lista.push is not a function`. | Every customer from then on gets "Error interno" and their message is lost. The admin page is also broken, so the owner sees an empty, failing admin page and a stack trace nobody reads. | data |
| 8 | After the truncated-store recovery, admin shows the old messages as simply gone. | `data.mjs damaged`: before the damage there were 252 messages. After, the admin list shows `1`. The only notice is a console line, and the backup `mensajes.danado-….json` is not shown or merged anywhere. | The owner opens admin and sees their inbox emptied without explanation. Unless they watch the console, they never learn the old messages are in a side file. | data |
| 9 | Every send reads, parses and rewrites the whole file synchronously, and admin downloads everything. | `data.mjs growth`: at 1k msgs (1.9 MB) one POST took 41 ms. At 10k (19 MB) it took 116 ms, and 20 at once took 1.8 s. At 40k (77 MB) one POST took 429 ms, 20 at once took **7.0 s**, the **home page took 7013 ms to load during that burst**, and admin GET took 2.0 s for 74 MB of JSON. | After a bot wave (see #10), every visitor waits seconds just to load the home page, and the owner's admin page tries to load tens of MB onto a phone. | server, data |
| 10 | Bots get straight in, and the owner can only delete messages one at a time. | `probe.mjs bots`: 200 spam posts (honeypot left empty, 5 per IP, 40 IPs) took 1036 ms and **200 were accepted**. The admin controls are only `["Actualizar","Borrar"]`, with one `confirm()` per message, and there is no search, filter or bulk delete. | The real customer's message ends up among hundreds of spam ones. Cleaning up means hundreds of click+confirm actions, so the owner stops checking the inbox. | form, data |
| 11 | The white hero text is not readable over the light part of the image on phones. | `contrast.mjs` (text hidden, background pixels sampled): at 375 px, the subtitle's worst contrast is **2.07:1** and the H1 is 2.66:1. At 768 px the subtitle is 2.73:1. At 1280 px the subtitle is 4.10:1. The thresholds are 4.5:1 for text and 3:1 for large text. See `mobile-top.png`, where "cariño," sits over light gray-green. | On a phone in sunlight the tagline is hard to read, which is the first thing a customer sees. | accessibility, mobile |
| 12 | The nav tap targets are small on mobile. | `browser.mjs mobile`: Servicios, Horarios and Contacto are **25 px** tall and about 60 px wide. The recommended minimum is 44×44. | Thumb taps hit the wrong link or miss. This is a minor annoyance. | mobile |
| 13 | A form error doesn't mark which field is wrong. | `browser2.mjs formjs`: after an empty or bad-email submit, all fields have `aria-invalid=null`, the border stays `rgb(170,170,170)`, and focus stays on the button. The message itself is visible 14 px under the button. | With the name, email and message all on screen, a person has to work out which one "Escribe un correo válido" refers to. A screen-reader user gets no link from the error to the field. This is minor. | accessibility |
| 14 | The server accepts non-string values and crashes on a `null` body. | `probe.mjs raw`: a JSON body `null` gave `500 Error interno` (`TypeError: …reading 'sitio'`). `{"nombre":12345,"mensaje":{"a":1}}` gave 201 and was stored as `"[object Object]"`. A 100 KB body got `ECONNRESET` with no response at all. | Only scripts do this, not real people, so this is a one-off slip. | server |
| 15 | The builder said "bloquea tras 10 intentos fallidos por minuto". | See #1: nothing is blocked, because the correct password is still accepted during the "lock". | The owner believes there is brute-force protection that does not exist. | false claim |
| 16 | The builder said "Funciona incluso si el navegador no carga JavaScript". | See #2 and #3: the message is saved, but the person gets no confirmation, and errors drop them on a bare text page. | The owner believes the no-JS path was tested. It was written by hand and never seen in a browser. | false claim |

The other claims in the builder's summary were checked and hold. These are: the generated password is printed at start-up, `ADMIN_PASSWORD` works, admin asks for a password, 5 sends per minute per IP, the honeypot (a filled `sitio` gets a fake 303 and is not saved), delete works, the damaged-file copy is kept, prices and SVGs are as described, and the layout adapts at 375 px.

## Candidate lessons

Most findings are already covered by listed lessons:

- **#1 and #15:** WEB-5. Refinement proposed below.
- **#2, #3 and #16:** WEB-3, plus lesson 41 for how the claim was made.
- **#4:** lesson 49. The general per-IP limit runs before the specific rules (validation, and the classic-vs-JSON response) and overrides both.
- **#5:** lessons 32 and 45. The work succeeded, but what is visible says it failed, and it is triggered by the most common slip (a double click).
- **#6:** WEB-4.
- **#7 and #8:** WEB-1. Refinement proposed below.
- **#9:** lesson 46.
- **#10:** WEB-2.
- **#12, #13 and #14:** one-off slips; no lesson.
- **#11:** not covered. A new candidate follows.

### WEB-? Text over a photo has to be checked against the photo's lightest part, at every width

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface` · `packages: web, apps`

**The idea.** A dark overlay that looks fine on desktop doesn't guarantee readable text. When the screen narrows, the photo is cropped differently and the text wraps over other parts of it. Contrast has to be measured against the pixels actually behind each line of text, at each width.

**Example.** A bike-shop landing page put white text over a hero SVG with a left-to-right gradient (`rgba(0,0,0,.65)` → `.15`). At 1280 px the text sat on the dark left side. At 375 px the subtitle wrapped across the whole width and its end ran over the light, barely darkened right side. The measured worst contrast was 2.07:1, against the 4.5:1 required. The builder had picked the overlay by eye and never looked at it on a phone.

**Detector question.** At the narrowest width, what is the lightest pixel behind each line of text on the image, and what is the contrast of the text color against it?

**Warning sign.** "It has a dark overlay, so the white text is readable."

**What to do.** Make the overlay uniform where the text can go, at least `rgba(0,0,0,.55)` across the text's full width, or put the text on its own solid or semi-opaque panel. Then check at 375, 768 and 1280 px: hide the text, screenshot, and take the worst pixel inside each line's box.

### Refinement to WEB-5: a "lockout" that still checks the password is not a lockout

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

**The idea.** An attempt limit only works if, once tripped, it refuses **before** comparing the password. If the right password still gets in while "locked", the limit only changes the error code. The attacker keeps guessing at full speed and spots the success by its different status.

**Example.** The admin login counted failures per IP and returned 429 after 10. But `autorizado(req)` ran first, so a correct password returned 200 even after 190 rejected guesses from the same IP. The builder's summary said "bloquea tras 10 intentos fallidos por minuto".

**Detector question.** After the limit trips, does the *correct* password from that IP still get in? If yes, the limit blocks nothing.

**Warning sign.** "Wrong attempts get a 429 after ten, so it's locked."

**What to do.** Check the limit first and refuse every attempt from that key while it lasts, right or wrong. Then test it: N wrong attempts, then the right one, and expect a refusal.

### Refinement to WEB-1: "damaged" includes a store that parses but has the wrong shape

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

**The idea.** Guarding the store against a JSON parse error is only half of it. Valid JSON of the wrong shape (`{}`, `null`, an object around the list) passes the guard and then makes every write fail. Recovery also has to be visible where the owner looks, not only in a console.

**Example.** `leerMensajes()` caught `JSON.parse` errors and moved the bad file aside, so a truncated file was handled. But with `mensajes.json` set to `{}`, every POST hit `lista.push is not a function` and returned 500, and so did admin. In the truncated case, admin silently went from 252 messages to 1, and the warning was only in the console.

**Detector question.** If the store holds valid JSON of the wrong type tomorrow, does the next visitor's message get saved? And does the owner see the problem on the page they actually open?

**Warning sign.** "I wrapped the parse in try/catch, so a bad file can't hurt."

**What to do.** After parsing, check the shape (`Array.isArray`) and treat a mismatch exactly like a parse error. Show recovered or set-aside files on the admin page, not only in stdout.
