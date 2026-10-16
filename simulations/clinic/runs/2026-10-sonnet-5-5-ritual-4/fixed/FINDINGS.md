# Findings: Fisio Andares (blind review)

Started as the README says (`node servidor.mjs` → `http://localhost:3000`, curl returned 200 for `/`, `/img/portada.svg`, `/admin.html`). Most probes ran against the same unchanged `servidor.mjs` on ports 3300–3302, with a temporary `DATOS_DIR` and `ADMIN_PASSWORD` (`_revisor/arranque.mjs`), so the real `datos/` folder was not touched. Browser checks used headless Chrome driven over CDP (`_revisor/cdp.mjs`, `navegador*.mjs`). Screenshots are in `_revisor/fotos/`. The build's own `node prueba.mjs` passed 43/43.

Overall this is a careful build. Server-side validation, path traversal, auth, XSS, double submit, concurrency, damaged-line recovery, scale and mobile layout all held up when I ran them. The findings below are what I could actually make go wrong.

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | Global cap of 40 valid requests/hour (all IPs together) shuts out real patients once bots use it up | `_revisor/sondas.mjs flood`: 9 loopback source IPs × 5 posts → 37×201, then 429. Next, a "real person" from a fresh IP 127.0.0.50 → **429** ("Estamos recibiendo muchas solicitudes. Inténtalo más tarde") | One cheap script that sends 40 plausible requests at the top of each hour means no patient can book online all day. The owner sees 40 fake requests and no sign that real ones were refused (the 429s are never logged or counted) | security |
| 2 | "Mostrar más" button shows in the panel even when there is nothing more to load | Headless Chrome, `admin.html` with 4 requests: `#mas` has `hidden=true` but computed `display:block`, visible text **"Mostrar más (0 restantes)"**. Cause: `admin.css` `#mas { display:block }` overrides the UA `[hidden]{display:none}` | The owner sees a "Show more (0 left)" button under every list, and clicking it does nothing. It looks broken, and they may think requests are missing | accessibility |
| 3 | Hero text sits on top of the light silhouettes in the picture, at about 2.5:1 contrast | Screenshots `desk-portada.png` / `mob-portada.png`: "movimiento," and "y un" (desktop), "vuelve a" and "y / un" (375 px) are drawn over the `#f6f3ec` figures at 55 % opacity over `#14503f` ≈ `#90aa9e`; white on that ≈ 2.5:1 (needs 4.5:1 for the body line, 3:1 for the heading). The text-shadow helps a little | Patients with low vision, or anyone reading the hero in the sun on a phone, struggle to read the one sentence that says what the clinic does | accessibility |
| 4 | Without JS, the error page's own button drops everything the person typed | JS file blocked (`Network.setBlockedURLs */cita.js`), Sunday submitted → server page "Revisa tus datos … Volver al formulario". Clicking that link → `/#cita` with `nombre="" telefono=""`. Browser Back does keep the values | A patient on a slow or old phone fixes one date and has to type name, phone, email, everything again. Some give up | form |
| 5 | When the store can't be written, every patient is turned away and the owner is never told | `datos.mjs`: `citas.jsonl` set read-only → POST returns **500** "No pudimos guardar tu solicitud. Por favor llámanos". Panel API afterwards: `total 3, danadas 0`, no error field. The only trace is `console.error` in the server window | A full permissions problem (or disk full) can turn away every booking for days. The owner opens a calm-looking panel and has no idea anything is wrong | data |
| 6 | Hero alt text describes a scene the image doesn't show | Alt: "fisioterapeuta ayudando a un paciente a caminar". `desk-portada.png` shows two silhouettes standing apart, nobody helping anyone | A screen-reader user is told about something that isn't there (minor, since it's a placeholder) | false claim |
| 7 | After logging in, focus lands on "Salir" (log out) | CDP after a correct password + Enter: `activeElement` = `salir` (`admin.js:173` focuses the first button in `#resumen`'s parent, which is Salir) | A keyboard user who presses Enter again, or a screen-reader user who hears "Salir" first, logs straight back out | accessibility |
| 8 | Console tip uses POSIX syntax on a Windows setup | Startup output: `Para abrirlo desde el celular: HOST=0.0.0.0 node servidor.mjs`. In PowerShell that is a parse error (the README gives the correct `$env:HOST = "0.0.0.0"; node servidor.mjs`) | The owner copies the hint from the console, it fails, and they think the phone option doesn't work | false claim |

### Checked and held (no finding)
- **Form paths in the browser:** empty submit shows 6 inline errors with focus on `nombre`. Phone "cinco cinco" and email without "@" get field errors with focus on `telefono`. Sunday 2026‑10‑18 → "Atendemos de lunes a viernes". Past date → "de hoy en adelante". 20:00 is not offered, and if forced into the select the server returns 422 with the error on `hora`. Every error is visible where the person is, and they can carry on.
- **Server validation without the page (curl/fetch):** `{}` → 422 with every field listed. 100 KB JSON or urlencoded → 413. Sunday, past date and 20:00 → 422. `text/plain` → 415. `nombre` as an array → 422. `DELETE /` → 405.
- **Two quick clicks** (single click, then a double-click within ms) → the panel shows one "Doble Navegador" request. Note: two identical concurrent `fetch` posts are both saved (no server-side dedupe), so only the client guard stops it.
- **HTML in name and comment:** stored as typed and shown as literal text in the panel. 0 `<img>`/`<b>` inside `#lista`, no dialog fired. A CSP header is also set.
- **File server:** `/../servidor.mjs` → 404. `/..%2f..%2fservidor.mjs`, `/..%5c..%5cdatos%5cclave-admin.txt` → 403. `/datos/`, `/datos/citas.jsonl`, `/datos/clave-admin.txt` → 404. `/%00` → 400. A path that doesn't exist → friendly 404 page.
- **Login:** 12 wrong passwords from one IP in 104 ms → `401×5, 429×7`. Even the correct password gets 429 for the next minute. List, PATCH and bulk DELETE without a cookie, or with a forged `sid`, → 401.
- **Mobile 375 px:** public page and panel (80-char unbroken name, 110-char email, 500-char comment) have `scrollWidth 375 = clientWidth`, everything wraps, and no tap target is under 24 px (screenshots `admin-mob*.png`).
- **Keyboard:** Tab order is skip link → nav → CTA → cards → fields → submit → call button, with a visible amber outline. The one exception is the 4th Tab stop inside Chrome's native date control, which has no outline. After a successful Enter, focus goes to the success message and the next Tab goes to `nombre`.
- **JS blocked:** a good submit goes to `gracias.html` and a bad one gets a server-rendered list of errors.
- **Store:** 5 000 / 50 000 records → startup 156/214 ms, first panel page 7/10 ms, search 8/21 ms, PATCH (full rewrite) 9/47 ms. 10 PATCHes plus 40 POSTs at the same time → after a restart the file holds 40/40 new requests and 10/10 cancellations. A truncated last line (simulated crash mid-append) → the next POST still saved (the leading `\n` guard), and after a restart the panel reports `danadas 1`. A blocked `.tmp` → PATCH returns 500 and is rolled back, and POST still saves.
- **README claims:** "contraseña … se imprime en la consola" is true only the first time (as it says). The panel shows 50 per page, newest first, with filter, search and bulk delete, all verified through the API and the browser.

## Candidate lessons

(`lessons/TEMPLATE.md` is not in this folder, so I used the five parts the listed lessons show: title, mistake, why it happens, what to do, detector question.)

### Candidate A: An anti-bot cap that covers everyone is also a switch for turning off the real users
- **Mistake:** a site-wide limit ("40 valid requests per hour across all IPs") was added so bots can't flood the owner. Once bots fill it, every real visitor is refused, and nothing records that this happened.
- **Why it happens:** the builder pictures the owner's inbox (what the cap protects) and not the patient on the other side of the 429. The test checks that request #4 gets 429 and stops there.
- **What to do:** never refuse a real person because of other people's traffic without a record of it. Prefer measures that cost the bot more than the human (honeypot, per-IP limits, a timing check), mark suspected spam for review instead of rejecting it, and if a global cap exists, count and show the refused requests in the panel.
- **Detector question:** if a bot uses up this limit, what does the next real person see, and how does the owner find out they turned someone away?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
- Related to WEB-2 (that one is about the owner's side, finding the real message). This one is the patient's side, so I'm proposing it as new.

### Candidate B: A rule that fires only in the reader's browser can't be checked by an API test
Lesson **49** already covers it (an ID rule `#mas { display:block }` silently beats the general `[hidden]` rule) together with **41** (the source says `hidden`, the screen shows the button). No new lesson. Suggested addition to 49's examples: "`display:` on an element that also uses the `hidden` attribute; add `[hidden]{display:none!important}` or check computed style."

### Candidate C: When the store fails, tell the owner, not only the visitor
- **Mistake:** a write failure turns the visitor away with "call us", but it only goes to `console.error`. The panel keeps looking normal.
- **Why it happens:** error handling is designed for the request that failed, and the person who has to fix the cause is not in that request.
- **What to do:** record every save failure where the owner looks (a banner in the panel with a count and the time of the last failure, or an email), and keep the request in memory or in a fallback file so it can be recovered.
- **Detector question:** if saving fails for a whole day, where does the owner see it before a patient complains?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
- This extends **WEB-1** ("…and who finds out?"). It may be better folded into WEB-1 than kept as a separate lesson.

### Candidate D: The no-JS error page must give the typed data back
- **Mistake:** the server-rendered error page lists the errors, but its only button goes to a blank form.
- **Why it happens:** the fallback is tested for "does it save / does it show errors" and not for "can the person fix one field and continue".
- **What to do:** re-render the form with the submitted values and the errors inline, or make the button `history.back()` while keeping a plain link as well.
- **Detector question:** with JS off, after one wrong field, how much does the person have to type again?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
- Close to **WEB-3** (the fallback was tested here, but only halfway). Proposed as a sharpening of WEB-3.

Findings 3, 6, 7 and 8 are one-off slips, so they have no lesson.
