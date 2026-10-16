# Review: Fisio Andares (blind review)

How the build starts, according to its own files: `node servidor.mjs` (comment on line 1 of `servidor.mjs`; there is no README). I ran it with `PORT` and `DATOS_DIR` set by a small launcher outside the build folder, so I could use a copy of `datos/`. The build's own `datos/` is untouched. The browser checks used headless Chrome through CDP at 375×800. All my scripts are in `%TEMP%\rv-fisio-o55\` (`api.mjs`, `publico.mjs`, `admin.mjs`, `sinjs.mjs`, `datos.mjs`, `foco.mjs`).

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A damaged tail in the store swallows the next request. The patient is told "received", but the request is gone after the next restart. | `node datos.mjs`, step 3: while the server was running, I appended `GARBAGE\0\0{{{` to `solicitudes.jsonl` with no trailing newline. Then I posted "Tras Basura" and got **201**. After a restart, `GET /api/admin/citas?q=tras` returned `total: 0`. The record is only in `solicitudes.danado-1792127254286.txt`, glued to the garbage: `GARBAGE  {{{{"id":"0681ebcc-…`. The only signal is a `console.error` line at startup. The panel shows nothing. The startup repair only covers a damaged tail at boot. A partial append while the server keeps running (for example, a full disk) leaves the same tail. | The patient sees "¡Listo! Recibimos tu solicitud" and waits for a call that never comes. The owner has no way to know the request existed. | data |
| 2 | False claim in a code comment: "Una línea mala nunca tumba el resto" (one bad line never brings down the rest). | Same run as #1. One bad line took down the valid line written right after it. | Whoever maintains it trusts the comment and doesn't look at the logs or the `danado-*` files. | false claim |
| 3 | The admin password is printed to stdout on every start, and the delivered folder already contains a generated password (`datos/clave.txt` = `7c0c4af4f83a`). | Server output: `Panel de la dueña: http://localhost:4710/admin   (contraseña: 7c0c4af4f83a, desde archivo datos/clave.txt)`. Reading `datos/clave.txt` in the delivered build returns the same value. | Anyone who received the folder, or who can read the hosting logs, can open the panel and read every patient's name, phone and email. The owner never chose this password and may never know to change it. | security |
| 4 | On the admin panel, keyboard focus on a pressed (active-state) button is almost invisible. The specific `aria-pressed` outline rule beats the general `:focus-visible` ring. | `foco.mjs`, then Tab onto "Confirmar" of a confirmed request: `pressed=true fv=true rgb(29, 43, 39) off 2px`. An unfocused pressed button: `rgb(29, 43, 39) 3px off 0px`. Every other focused control: `rgb(242, 169, 0) 3px`. Screenshots `f-pressed-focused.png` and `f-pressed-unfocused.png` look almost the same (only a 2px gap differs). | An owner who uses the keyboard loses track of where they are in the list, right after the action they just took, and may press Enter on the wrong button. | accessibility |
| 5 | Two non-text contrasts are below 3:1: the focus ring and the input borders. | Measured with `foco.mjs`: focus ring `#f2a900` against white is **2.01:1**, against the form background `#eef6f3` is **1.83:1**. Field border `#b9c8c3` against white is **1.73:1** (WCAG 1.4.11 asks for 3:1). | A patient with low vision, on a phone in sunlight, has trouble seeing where the fields are and which one is active. | accessibility |

### Checked and held (evidence, short)

- **Load:** all 4 images load (`naturalWidth>0`), each has descriptive `alt` and `width`/`height`. At 375 px, `scrollWidth 375 = innerWidth`.
- **Form with JS on (375 px):** for the empty form, a phone with letters, an email without "@", a past day and a Sunday, the error appears right under the field and focus goes to the first bad field (always in view). The typed values are kept. 20:00 can't be chosen: the select only offers 09:00–17:00. On success, a green message is shown and focused, the form is cleared, and the next Tab goes to `nombre`.
- **Two quick clicks:** a real mouse click plus a double-click saved one request. Two concurrent identical POSTs both returned 201, and 1 line was stored.
- **HTML injection:** `<b>hola</b><img src=x onerror="alert(1)">` shows as literal text in the panel. 0 `<img>` and 0 `<b>` in `#lista`, no dialog opened.
- **Server validation (no browser):** `{}` → 400 with every field error. Phone with letters, email without "@", 2026-10-01, Sunday 2026-10-18 and 20:00 → 400 with the right message. 100 KB name → 413. 600-character comment → 400. PUT or GET on `/api/citas` → 404 (not 405, harmless).
- **File server:** `curl --path-as-is /../servidor.mjs` → 404, `/..%2f..%2fservidor.mjs` → 403, `/..%5cservidor.mjs` → 403, `/datos/`, `/datos/clave.txt` and `/no-existe` → 404 page.
- **Panel auth:** GET, PATCH and DELETE without a cookie → 401. 8 wrong passwords in a row: `1:401 … 5:401 6:429 7:429 8:429`. A spoofed `X-Forwarded-For` is ignored (still 429).
- **Mobile panel:** a long name and a long email at 375 px cause no overflow (`overflow-wrap:anywhere`). Buttons are at least 44 px.
- **Confirm/cancel feedback:** after clicking Confirmar on the last request, its label changes to "Confirmada" and stays in view, the left border turns green, and focus stays on the pressed button.
- **Without JS:** an empty submit shows a server page with the error list and the form. A Sunday shows the error under the date and keeps the typed data. Fixing it and resubmitting goes to `/gracias.html`.
- **Concurrency:** 200 concurrent POSTs plus 50 concurrent PATCHes → 200×201 and 50×200. 201 records before and after a restart, and the last status written stuck.
- **Crash mid-write at boot:** with a truncated last line, the server logs `!! 1 registro(s) … dañados`, keeps all 201 records, and the next request is saved and survives a second restart.
- **Bots:** 300 POSTs from one IP → 60×201 and 240×429. `DELETE ?estado=todas&q=bot` → `{"eliminadas":60}`. The honeypot field `sitio_web` → 201 and nothing saved.
- **Scale:** at 100,000 stored requests, startup takes 258 ms, the first panel page 5 ms, a search on the last page 37 ms, 50 parallel searches at most 1456 ms, and a POST 10 ms.
- **Comment claims:** the 9:1 and 7:1 contrast claims in the CSS hold (measured 9.34 and 7.93). The JS fallback works. Status changes and new requests are append-only. "5 wrong passwords per minute per address" is true.
- **Note (no finding):** I found no README or testing instructions in the files. The builder's chat message wasn't visible to me, so I can't judge whether it answered "dime cómo lo pruebo".

## Candidate lessons

`lessons/TEMPLATE.md` was not in this folder. I used five parts: title, what happened, why it matters, detector question, what to do instead.

### Finding 1 → already covered by **WEB-1** (A damaged store must not take the next record down with it)
No new lesson. It's a clean instance: the repair ran only at startup, so a damaged tail while the server runs glued the next record onto it. A note worth adding to WEB-1: *repair at boot is not enough. Before appending, check that the file ends in a newline, or always start each record with one.*

### Finding 2 → covered by WEB-1 together with finding 1 (the comment is the claim that WEB-1's test would have disproved). No new lesson.

### Finding 3 (new)
- **Title:** A secret you print or ship is no longer a secret
- **What happened:** The server generated the admin password, saved it inside the delivered folder (`datos/clave.txt`), and printed it in plain text to the console on every start.
- **Why it matters:** Folders get zipped, emailed and uploaded. Console output goes to hosting logs that other people can read. Whoever sees either one can open the page that holds patients' personal data.
- **Detector question:** Where does this secret appear besides where it's checked (files I deliver, logs, console, error pages), and who else can read those places?
- **What to do instead:** Ship without a secret. Generate it on the owner's first run, show it once (or have the owner set it), and never print it again. Leave secret files out of the delivered folder.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Finding 4 → related to **49** (a general rule against a specific one), but the mirror case
Here the specific state rule (`aria-pressed` outline) silently beats a general rule that must always win: the focus indicator. Rather than a new lesson, I propose adding a line to 49: *"…and some general rules, like the focus indicator, must win over every specific style; check the clash in both directions."* If 49 stays one-directional, a candidate lesson:
- **Title:** The focus ring has to win every clash
- **What happened:** A rule that styles pressed buttons with an outline overrode `:focus-visible`, so focus on those buttons looked the same as no focus.
- **Why it matters:** A keyboard user loses their place exactly on the control they just used.
- **Detector question:** For every component state (pressed, selected, invalid, disabled), does focusing it still look different from not focusing it?
- **What to do instead:** Use a different property for state (background, border, icon) than for focus, or give focus its own outline that the state rules can't override.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Finding 5 (new)
- **Title:** Non-text parts need contrast too
- **What happened:** Text contrast was checked carefully (9:1, 7:1), but the focus ring (2.0:1) and the input borders (1.7:1) were not.
- **Why it matters:** People with low vision, or anyone on a phone in sunlight, can't find the fields or see which one is active.
- **Detector question:** Did I measure the contrast of borders, focus rings and icons against what is actually next to them, not just the contrast of the text?
- **What to do instead:** Aim for 3:1 or more for component boundaries and focus indicators against their adjacent colours, and measure them in the rendered page.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
