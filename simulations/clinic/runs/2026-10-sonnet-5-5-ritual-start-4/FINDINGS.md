# Findings: Fisio Andares (blind review)

**How I ran it.** The build has no README. The only instructions are in its own files: `servidor.mjs` line 1 says `node servidor.mjs`, and on startup the server prints the public URL, `/admin` and a generated password, which it saves in `datos/clave.txt`. I ran copies of the build (so `datos/` stays out of the reviewed folder) with `node servidor.mjs` on spare ports. The server-side checks used `fetch`/`http` from Node. The browser checks drove headless Chrome over the DevTools protocol from Node: real clicks, real Tab/Enter key events, 375 px and 1280 px viewports, and blocking `cita.js` for the no-JavaScript path. The test scripts are in `..\review-JBPzuT-tools\`; I did not change any file in the build.

## What held (tried, did not break)

- **Load:** `/` → 200, all 4 images load (`naturalWidth > 0`). Every image has `width`/`height` and a descriptive alt.
- **Form error paths (browser):** empty submit, phone `abc12345678` / `cincocinco`, email without `@`, a past day, a Sunday, and a date over 90 days ahead. In every case the message appears next to the field and focus moves to the first wrong field, which is on screen. Nothing was saved. The hour list only offers slots that end by 18:00 (rodilla ends at 17:00).
- **Good path:** saved 1. The message "Recibimos tu solicitud…" is on screen and gets focus. The next Tab goes to the phone link.
- **Two quick clicks / two Enters:** each saved exactly 1.
- **Network failure:** "No pudimos conectar… Tus datos siguen aquí". The fields are kept.
- **HTML in name and comment:** shown as literal text on the clinic's page. 0 `<img>`/`<b>` nodes in the list, 0 dialogs. The CSP also blocks inline scripts.
- **Server validation without the page:** `{}` → 400 with per-field errors. A past day, a Sunday or 20:00 → 400. Rodilla at 17:30 → 400 (ends 18:30). 100 KB fields → 413. multipart → 415. PUT/GET/DELETE `/api/citas` → 404.
- **File server:** `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5c..%5cWindows%5cwin.ini`, `/img/..%5c..%5cdatos%5cclave.txt`, `/datos/`, `/datos/citas.json`, `/no-existe.html` → all 404. Bad encoding → 400.
- **Admin auth:** PATCH, DELETE and the list without a cookie or with a forged cookie → 401. Wrong passwords: `401 ×5 then 429`. 300 wrong guesses sent concurrently → `{"401":5,"429":295}`. Even the correct password at #250 gets 429, so the race is closed.
- **Concurrent writes:** 100 POSTs + 20 PATCHes at once → 120 records on disk and 20 confirmed. Nothing was lost.
- **Crash mid-write:** with a 20,000-record store I sent POSTs in a loop and `SIGKILL`ed the server. The file was still valid JSON (20,024 records), with no leftover `.tmp`. After a restart, the next POST → 201. Writes go to a temp file that is then renamed.
- **Truncated JSON store:** it was renamed to `citas.danado-<date>.json`, and the next POST → 201.
- **Keyboard:** every stop shows a 3 px outline (except Chrome's own date-picker button). Tab from the comment reaches "Enviar", Enter submits, and focus goes to the status message.
- **No JavaScript (`cita.js` blocked):** an empty submit is stopped by the native "Completa este campo". A valid submit → "Solicitud recibida" page and 1 saved.
- **Mobile public page at 375 px:** `scrollWidth 375 = clientWidth`. No tap target is under 24 px. Nav anchors do not land under the sticky header.
- **Cascade:** the specific rules win over the general ones (`.cita h2` 19.2px over `.seccion h2`, `.filtro select` auto width, white on `.boton` over `a {color}`).

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | One saved request with a long unbroken name widens the whole clinic page on a phone | Headless Chrome 375×740, `/admin` with a request named `"Maria"×16` (80 chars, allowed by `maxlength`): `scrollWidth 904, clientWidth 375`. Wide elements: `LI.cita right=904, H2 right=883, P right=883…`. Screenshot: the name, date, email and comment are cut at the right edge. `.cita p` has `overflow-wrap:anywhere` but `.cita h2` is `normal`, and the grid track grows to the h2's min-content, so every card gets wider. | The physio checks requests on their phone and every card is cut off. They have to scroll sideways to read the date and email of each patient, and one bot with a long name does this to the whole list. | mobile |
| 2 | Confirming or cancelling while the "Pendientes" filter is on makes the card disappear, focus is lost, and the message is off-screen | Filter = Pendientes, 8 cards, click "Confirmar" on the last one: cards 8 → 7, `document.activeElement = BODY`, the message "La cita de Doble Enter quedó confirmada." is shown at the top with `avisoInView:false` (scrollY 1428). The comment in `admin.js` says "El foco vuelve al mismo botón", but that button no longer exists. | The physio taps Confirmar and the patient's card just vanishes with no explanation where they are looking. With a keyboard or screen reader they are thrown to the top of the page. They may think the request was deleted. | accessibility |
| 3 | One record without a `fecha` blanks the whole clinic page, with no message | Store = `[{"id":"vieja","creada":…,"estado":"pendiente","nombre":"Registro viejo"}]` + 1 new valid POST (201). On `/admin` after login: `cards 0`, title "Solicitudes de cita", the message is empty, page error `TypeError: Cannot read properties of undefined (reading 'split')` (`fechaBonita`). The API itself returns 200. | After a hand-edit or an older data format, the physio logs in and sees an empty page, as if nobody had asked for an appointment. The real requests are on disk but invisible, and nothing tells the physio something is wrong. | data |
| 4 | A store with a `null` entry makes every new request fail | `datos/citas.json = [null]`, then a valid POST → `500 {"error":"Error del servidor."}`. The owner's list → `500`. Console: `TypeError: Cannot read properties of null (reading 'estado')`. `cargar()` only checks that the file is an array, not what is inside it. | From that moment every patient who submits gets "Error del servidor" and the request is lost, until someone reads the console and edits the file by hand. | data |
| 5 | The clinic's page and every status change slow down with history, which is never archived | 10,000 saved requests: login → list rendered in **6,904 ms** (10,021 cards in the DOM, page 2.78 M px tall). One "Cancelar" click → repaint **15,437 ms** (`pintar()` rebuilds every card). API list: 1k → 35 ms/0.4 MB, 10k → 140 ms/3.8 MB, 40k → 285 ms/15.2 MB. Every POST rewrites the whole pretty-printed file (16.3 MB at 40k, 20 concurrent POSTs 712 ms). | After a year or two of use (about 20/day), each tap on Confirmar freezes the physio's browser for seconds. On a phone it is worse, and they stop using the page. | server |
| 6 | 500 bot requests shut the form for real patients, and the clinic can only delete them one by one | Honeypot filled → 200, not saved (good). 510 bot POSTs with the honeypot empty (per-IP limit raised to simulate many IPs; the default 5/hour/IP lets about 100 IPs do this in one hour) → `{"201":500,"503":10}`. Then a real patient → `503 "Ahora mismo no podemos recibir más solicitudes por la web. Por favor llámanos."` The clinic page has no bulk delete, no search and no "spam" status. Each deletion is a click plus a `confirm()` dialog. | One night of spam and from the morning on every real patient is turned away. To reopen the form the physio has to click Eliminar and accept a dialog 500 times. | security |
| 7 | Without JavaScript, the error page's only button throws away everything the person typed | `cita.js` blocked, Sunday + rodilla 17:30 (the static list offers 17:30 for every treatment) → `/api/citas` page "Revisa tu solicitud … Atendemos de lunes a viernes … Volver al formulario". Clicking "Volver al formulario" → `nombre: ""`, `comentario: ""`. | A person on a blocked or slow-loading script fixes one field and finds the whole form empty, including their comment, so they may give up. | form |
| 8 | Server accepts treatments the clinic doesn't offer, and non-text names | `{"tratamiento":"__proto__"…}` → 201, `{"tratamiento":"toString"…}` → 201 (`TRATAMIENTOS[x]` reads the prototype, and the 18:00 end check is skipped because `minutos` is undefined). `{"nombre":{}}` → 201 saved as `"[object Object]"`. `{"nombre":{"toString":1}}` → 500. | Bots fill the list with "__proto__ · lunes…" requests the physio cannot act on. One-off slip. | server |
| 9 | Hero subtitle is under 4.5:1 on a phone | 375 px, hero text made transparent, lightest pixel behind each line: `"Fisioterapia personalizada para"` line 3.86:1, second line 4.38:1 (19.2 px regular text needs 4.5:1). The heading is fine (large text: 3.72–7.1:1). At 1280 px it is 5.6–5.9:1. On a phone the text runs to 95 % of the width, where the overlay fades to 0.45. | On a phone outdoors the line saying what the clinic does is hard to read. Minor. | accessibility |
| 10 | Focus ring is nearly invisible over the dark hero | `#1a5fd0` outline vs the hero background (overlay .88): 1.84:1 (needs 3:1). | A keyboard user tabbing to "Pedir cita" on the hero can barely see where focus is. Minor. | accessibility |

Not findings: the address and phone are placeholders (`Calle Ejemplo 123`, `55 0000 0000`), which is fair for sample content. There is no README, but the server prints the URLs and password on start. The comment "Si este archivo no carga, el formulario sigue funcionando" is true (checked in the browser). The comment "Archivo dañado: se conserva aparte" is true for invalid JSON only (see #3, #4).

## Candidate lessons

**#1 → already covered by lesson 41** (the wrap rule is in the source, `overflow-wrap:anywhere` on `.cita p`, but the rendered card still overflows; only the 375 px render showed it). It is also a mobile instance of "test with the worst real content", so I'm not writing a new one.

**#2 → already covered by lesson 32** (the control worked, but where the user is looking the only visible change is the card disappearing). Lesson WEB-4 could gain a variant: "after a list re-renders, the element you return focus to may no longer exist."

**#3, #4 → sharpen WEB-1**, no new number. Add: *"Damage is not only invalid JSON. Valid JSON with a bad record (null, a missing field) must be skipped and reported, not crash the next write or blank the owner's view."*

**#5 → already covered by lesson 46** (the owner's page and every write go through the whole history).

**#6 → already covered by WEB-2.** The sharpening is the cap: a cap that protects the server from bots also locks out real people when it fills up.

**#7 → new lesson (WEB):**

### WEB-?. The no-JS error page must not throw away what the person typed

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface` · `packages: web, apps`

**The idea.** When a form falls back to a normal browser POST, the server's error answer is a new page. If that page only offers a link back to a fresh form, every correction costs the person their whole entry.

**Example.** An appointment form worked without JavaScript: the server validated it and answered with an HTML page listing the errors and a "Volver al formulario" button linking to `/#cita`. A person who picked a Sunday clicked it and found every field empty, including a long comment. The JS path kept the data, so it was only noticed by blocking the script and walking the error path.

**Detector question.** With the script blocked, after a server-side error, how many keystrokes does it take to resubmit, and are the fields still filled?

**Warning sign.** "Without JS it still works, the server validates and shows the errors."

**What to do.** In the no-JS error response, re-render the form with the submitted values and the errors next to each field (escaped), or at least link back with `history.back()` semantics instead of a fresh URL. Test the fallback's error path, not only its success path.

**#8** is a one-off slip (prototype lookup on a plain object): no lesson. **#9, #10** are small contrast misses, no lesson.
