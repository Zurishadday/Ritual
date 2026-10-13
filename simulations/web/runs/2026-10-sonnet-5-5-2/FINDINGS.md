# Findings: Taller Rueda Libre

Reviewer: claude-opus-5-5 · 2026-10-12. Nothing in the build was changed.

**How it was run.** The build was copied to a scratch folder (`…/Temp/revisor-rueda/copia`) and started with `node servidor.mjs` (PORT 3417/3418, `ADMIN_CLAVE=prueba-clave`). Two scripts kept outside the build drove it:
- `servidor-pruebas.mjs` sends raw HTTP requests, the same checks curl would make.
- `navegador-pruebas.mjs` drives headless Chrome over CDP at 1280×800 and 375×667. It uses real Tab/Enter key events and real mouse events, and it also runs with JavaScript disabled.

Screenshots are in `…/Temp/revisor-rueda/*.png`. The servers and Chrome were stopped at the end, and ports 3417, 3418 and 9334 were confirmed closed.

**What held, with evidence:**
- **Page and images:** the page loads, and all 4 images return 200 `image/svg+xml` and render (`naturalWidth>0`).
- **Empty submit:** focus moves to `#nombre` with "Completa este campo".
- **Email without "@":** focus moves to `#correo` with the native "Incluye un signo "@"…" message.
- **Double click:** a real double click saved 1 message (the button is disabled synchronously).
- **HTML in a message:** `<b>hola</b>` and `<img src=x onerror=alert(1)>` show as text in admin: 0 `<img>`, 0 dialogs (see `admin.png`).
- **Path traversal:** blocked. `/../servidor.mjs` → 404, `/..%2f..%2fservidor.mjs` → 403, `/..%5cservidor.mjs` → 403, `/datos/mensajes.json` → 404, `/%E0%A4%A` → 400.
- **Admin access:** `/admin`, `/admin/admin.js` and `/api/mensajes` all return 401 without credentials.
- **Mobile layout:** at 375 px `scrollWidth=375` (no horizontal scroll), and no element is wider than the viewport.
- **Anchor jumps:** tapping a nav link on mobile puts the h2 at 112 px, below the 88 px sticky bar.
- **Concurrent writes:** 5 POSTs at once saved 5.
- **Crash during a write:** killing the server 2–60 ms into a POST on a 56 MB file left a valid `mensajes.json` in 7 of 7 runs.

## Table

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | The rate limit counts invalid submissions. After 5 typos, the corrected message is refused for 10 minutes, and the specific error is replaced by a generic one. | Five POSTs with `correo:"ana@example"` (all 400), then a valid POST → `429 {"error":"Demasiados mensajes. Inténtalo más tarde."}` | A customer who mistypes their email a few times and then fixes it is told "too many messages" and gives up. The shop never hears from them. | form |
| 2 | Focus is lost after every submit, whether it succeeds or fails. The field the server rejects is not marked. | Chrome, keyboard only. After Enter on "Enviar" with `ana@example` (passes the browser, rejected by the server): `activeElement=BODY`, `#correo aria-invalid=null`. After a successful submit: `activeElement=BODY`, and the next Tab → `BODY` (focus leaves the page). | A keyboard or screen-reader user does not know which field is wrong. After sending, Tab throws them out of the page, so they have to start from the top. | accessibility |
| 3 | With JavaScript off (or if `script.js` fails to load), the form saves nothing and says nothing. The `<form>` has no `method` or `action`. | JS disabled in Chrome, fields filled, real click on "Enviar" → saved delta 0, `#estado=""`. Raw `GET /?nombre=Ana&correo=ana%40example.com&mensaje=Necesito+cita` → 200 index.html, saved delta 0. A form-urlencoded POST to `/api/contacto` → `400 Datos inválidos`. | The customer thinks they wrote to the shop. The message is gone, and nobody knows it was ever sent. | form |
| 4 | On mobile, the confirmation appears mostly below the screen, and the form empties at the same moment. | 375×667: tap "Contacto", fill in the form, tap "Enviar" → `#estado` box at y=654..705 with a viewport of 667, so only 13 of 51 px are visible. The fields are reset. | On a phone, the visible result of tapping "Enviar" is that the text they wrote disappears. Many people will read that as "it got erased" and type it all again, or leave. | mobile |
| 5 | The headline over the hero image has poor contrast, worst on mobile, where it overlaps the white bicycle frame. | `movil-arriba.png`: "Tu bici, lista para" is drawn across the white `#fff` top tube and saddle (≈1:1). The sky behind the first line is around `#f0b36a`, so white text there is ≈1.9:1 (large text needs 3:1). The dark gradient only covers the lower part of the text block. | On a phone in sunlight, the shop's main phrase is hard to read exactly where the bike crosses it. | accessibility |
| 6 | Every request reads, parses and rewrites the whole message file, and admin downloads and draws all of it. | n=0 / 20k / 40k / 80k messages: one POST took 10 / 62 / 135 / 236 ms; admin GET took 3.5 / 117 / 277 / 447 ms with a body of 0 / 13 / 27 / 53 MB; 5 POSTs at once finished after 10 / 189 / 421 / 814 ms. | After months of spam, or one bot wave, the form slows down for everyone, and the admin page tries to render tens of thousands of cards on the owner's phone. | server |
| 7 | Admin has no way to handle spam. Messages can only be deleted one at a time (one `confirm()`, then a full list reload). There is no search, no filter, no pagination and no bulk delete. The bot defence is a honeypot plus a per-IP limit. | The server exposes only `DELETE /api/mensajes/<uuid>` (also: `DELETE` of a nonexistent id → `200 {"ok":true}`). A curl POST without `sitio_web` is saved like any other message. | With 1,000 bot messages, the owner has to click "Eliminar" and confirm 1,000 times to find the one real customer. | data |
| 8 | If `mensajes.json` is unreadable for any reason (hand edit, disk full, a bad restore), every new message fails, and only the server console says so. | File set to `[{"id":"x","nombre":"Ana"` → valid POST `500 {"error":"Error interno"}`; admin GET `500`; stderr: `SyntaxError: Expected ',' or '}'…`. | Every customer gets "Error interno" and loses their message. The owner sees "No se pudieron cargar los mensajes." and nothing tells them it has also stopped accepting new ones. | data |
| 9 | The admin login has no limit on attempts. | 200 wrong passwords in a row → 200 × 401 in 615 ms, none blocked. | With the random default password this is safe. If the owner follows the tip and sets `ADMIN_CLAVE='taller2024'`, it can be guessed quickly once the site is published. | security |
| 10 | A body that is too large gets a connection reset, not the 413 the code intends. | POST with 100 KB fields → `ECONNRESET` (the 413 branch calls `req.destroy()` before any reply is sent). | Browser users are protected by `maxlength`. Any other client sees a network failure rather than "Mensaje demasiado grande". This is a one-off slip. | server |
| 11 | Non-string fields are accepted and turned into text. | `{"nombre":{"a":1},"correo":"a@b.co","mensaje":"x"}` → `201`, saved as `"[object Object]"`. | A junk entry shows up in admin. This is a one-off slip. | server |
| 12 | The images have no declared size (no `width`/`height`). | All 4 `<img>` have `width=null height=null`. Measured layout shift on a fresh desktop load: CLS 0.0731 (mobile 0). The cards are protected by CSS `aspect-ratio`; the hero is not. | There is a small jump on load on desktop, below the 0.1 "poor" threshold. This is a one-off slip. | accessibility |
| 13 | The nav links are small tap targets on mobile. | At 375 px: "Rueda Libre" 112×31, "Servicios" 61×34, "Visítanos" 63×34, "Contacto" 64×34 (under 44 px tall). They pass WCAG 2.2 AA (24 px), but are tight for a thumb. | Occasional mis-taps between the nav links. This is a one-off slip. | mobile |
| 14 | One instruction in the summary is in the wrong shell syntax. "usa `HOST=0.0.0.0`" is bash syntax, while the summary's own example is PowerShell. | `HOST=0.0.0.0 node servidor.mjs` is not valid in PowerShell; it needs `$env:HOST='0.0.0.0'`. | An owner on Windows who tries to publish gets an error from the instruction they were given. This is a one-off slip. | false claim |

**The builder's summary against what is there.** Every claim I could test was true:
- It said nothing was run. That is true, and nothing contradicted its other claims.
- "valida los datos": true, with the gaps in #10 and #11.
- "5 mensajes por IP cada 10 minutos" and "campo oculto": true, but see #1.
- "texto plano en la administración": true.
- "del más reciente al más antiguo, con opción de eliminar": true.
- "la clave aparece en la consola": true.
- "datos/mensajes.json se crea solo": true.
- The only inaccurate line is the `HOST=0.0.0.0` instruction (#14).

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder. The five parts used below are: the mistake, why it happens, the detector question, what to do instead, and the evidence from this build.

Some findings are already covered by core or package lessons:
- #1 → 45, with 49 for the error being replaced.
- #2 → WEB-4.
- #3 → WEB-3.
- #4 → 32.
- #6 → 46.
- #7 → WEB-2.

The new candidates are below.

### Candidate A: A store that can't be read must not silently stop accepting writes

- **The mistake:** Every new message goes through read-the-whole-store → modify → write. When the store becomes unreadable, every write fails too. The only signal is a stack trace in a console nobody is watching.
- **Why it happens:** Writing to a temp file and renaming it protects against a crash mid-write, so the builder treats the store as safe. But other things can still break it (a hand edit, disk full, a bad restore), and nothing handles that case.
- **Detector question:** If the data file is corrupted tomorrow, does the next visitor's message still get kept, and who finds out, and how?
- **What to do instead:**
  - Don't make accepting a new message depend on parsing the old ones. For example, write each message to its own file or append it.
  - If the store cannot be read, keep the incoming message somewhere (a sidecar file) and show the owner a clear error on the admin page.
  - Test this on purpose by corrupting the file.
- **Evidence:** finding #8. After the file was truncated, `POST /api/contacto` → `500 Error interno` for every visitor, and admin showed only "No se pudieron cargar los mensajes."

origin: lab · claude-sonnet-5-5 · 2026-10
packages: web, apps

### Candidate B: Text over a photo is checked over the photo, at the narrowest width

- **The mistake:** The headline is placed over the hero image with a gradient that covers only part of the text block. At phone width the image is cropped differently, and the brightest part of the picture (here the white bike frame and the light sky) ends up behind the words.
- **Why it happens:** Contrast gets checked as "white text on a dark overlay" in the CSS, or at one desktop width. The real background changes with `object-fit: cover` cropping at every width.
- **Detector question:** At 375 px and at desktop width, what pixels are actually behind each line of text over the image, and is the contrast at least 3:1 for large text and 4.5:1 for body text?
- **What to do instead:**
  - Put a solid or near-solid scrim behind the whole text block, or a text-shadow plus a darker overlay.
  - Or move the text off the busy part of the image.
  - Take a screenshot at 375 px and check the lightest pixels behind each line.
- **Evidence:** finding #5 and `movil-arriba.png`. "Tu bici, lista para" crosses the white `#fff` frame, and the sky behind it is about `#f0b36a` (≈1.9:1).

origin: lab · claude-sonnet-5-5 · 2026-10
packages: web, apps

### Candidate C: A password login with no attempt limit is only as strong as the weakest password the owner might choose

- **The mistake:** The admin page uses Basic auth with no limit on failed attempts. The default password is strong, but the summary itself tells the owner how to set their own.
- **Why it happens:** The builder makes the default safe (a random 72-bit password) and assumes that is enough. Once the owner replaces it with something memorable, nothing slows guessing down.
- **Detector question:** If the owner sets a short password and the site goes public, how many guesses per minute can a stranger make?
- **What to do instead:**
  - Count failed logins per IP and back off or lock out after a few.
  - Refuse to start with an `ADMIN_CLAVE` shorter than about 12 characters, or warn when one is used.
- **Evidence:** finding #9. 200 wrong passwords took 615 ms and none were blocked.

origin: lab · claude-sonnet-5-5 · 2026-10
packages: web, apps
