# Findings: Fisio Andares (blind review)

**How I ran it.** I started the build as its README says (`node servidor.mjs`), from a copy at `review-x29/build` on port 3000. A second copy (`review-x29/build2`, port 3101) was seeded with 50,000 requests. HTTP probes used Node scripts (`probe1–4.mjs`). Browser checks used headless Edge, driven over CDP from Node (`browser1–3.mjs`, `cdp.mjs`), at 375×740 and 1280×800. All my scripts live in `review-x29/`, outside the build. I changed nothing in the build, and every server I started has been stopped.

**What held up.** The server validates every field without the page:
- `{}` → 400 `campo:nombre`
- Sunday 2026-10-18 → 400 "Atendemos de lunes a viernes."
- past date 2026-10-14 → 400
- 20:00 → 400
- 2026-02-30 → 400
- `__proto__` as treatment → 400
- 100 KB body → 413
- PUT → 404, DELETE / → 405

The file server returns 403 or 404 for `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5c…`, `/datos/` and `/datos/solicitudes.jsonl`.

Every admin endpoint returns 401 without a token: list, PATCH, DELETE and bulk delete.

Injected `<b>hola</b><img src=x onerror="alert(1)">` shows as plain text in the panel (0 `img`/`b` elements in `#lista`, no dialog fired).

At 375 px there is no horizontal scroll on either page (scrollWidth 375 = clientWidth 375), even with a 98-character name and a 550-character comment with no spaces.

All four images load and have alt text and width/height. Text contrast is fine: button 5.17:1, grey text 5.28:1, errors 6.17:1.

Storage holds up too:
- 6 parallel creates plus 1 PATCH → all saved, the status kept.
- A garbage line plus a truncated last line → 50,100 kept, `danado-*.bak` written, and the next visitor saved (201) and found.
- The admin list over 50k records loads in 14 ms; 50 concurrent loads take 92 ms.

## Table

| # | What broke | Evidence | What happens to a real person | Class |
|---|---|---|---|---|
| 1 | **With JavaScript on, the appointment form never sends anything, and nothing appears on screen.** `limpiarErrores()` calls `errorCampo('comentario','')`, but there is no `#err-comentario` element, so every submit throws after `preventDefault()`. | Headless Edge, `browser1/debug2.mjs`: empty submit → `rejection: TypeError: Cannot set properties of null (setting 'textContent')`, `#mensaje` = "", `err-comentario exists: false`. A fully valid form → same TypeError, `msg=""`, URL unchanged, and the server search for "Buena Ana" returns `total 0`. Double click on a valid form: saved before/after = 10/10. Keyboard (Tab to the button, Enter) → focus on `enviar`, message "". | A patient fills in everything and taps "Enviar solicitud". Nothing happens: no error, no "sent". They tap again, and again nothing happens. They leave, or they think they booked and show up for an appointment that doesn't exist. The clinic gets zero online requests. | form |
| 2 | **The empty submit and the common mistakes give no feedback.** This follows from #1. The only error path that works is choosing a Saturday or Sunday in the date field, which runs on `change`, not on submit. | `browser1.mjs`: empty → `msg:"" errs:[]`; phone `55abc12345` → `msg:"" errs:[]`; email `ana.correo.com` → same; past date → same. Sunday on `change` → "Atendemos de lunes a viernes. Elige otro día." visible, focus on `fecha`, value cleared. | Someone who mistypes the email is never told. To them the form just looks frozen. | form |
| 3 | **The build's own test, `node prueba.mjs`, deletes all saved requests and the admin password.** It calls `rm('datos', {recursive:true})` at the start and at the end, and the README tells the owner to run it. | `runprueba.mjs` in the seeded copy: `before: clave-admin.txt,danado-….bak,solicitudes.jsonl / jsonl 19203435 bytes` → prueba prints "Todo bien" → `after: datos/ DELETED`. | The owner follows the README's "Prueba" step on the live install. Every pending patient request is gone, with no backup, and the panel password changes. | data |
| 4 | **About 100 bot posts an hour lock every real patient out of the form.** There is a global cap of 100 per hour shared by everyone, and the honeypot only catches bots that fill the `sitio` field. | `probe3.mjs`: 110 valid posts from 11 loopback IPs (127.0.0.2–12) → `{"201":100,"429":10}`. Then a real patient from a fresh IP → `429`. Without JS → `429 Hay demasiadas solicitudes en este momento. Llámanos por teléfono`. | One cheap script per hour shuts the online booking for the whole clinic. Patients see "too many requests". The owner sees 100 junk entries, but nothing tells them their real patients were turned away. | security |
| 5 | **The login "lockout" does not stop guessing.** After 10 failures, wrong guesses get 429, but the correct password still gets 200, and a success resets the counter. | `probe2.mjs`: 200 wrong logins in 1,681 ms → `{"401":10,"429":190}`. Right after, the correct password → `200 {"token":…`. The next wrong one → `401`, so the counter was reset. | An attacker can try about 120 passwords a second without end: 429 means "wrong", 200 means "in". If the owner sets a memorable `ADMIN_PASSWORD` as the README invites, patients' names, phones and emails leak, and the attacker can confirm, cancel or delete their requests. | security |
| 6 | **The README and the test claim a working form, but the browser form is dead.** `prueba.mjs` only posts JSON to the API, never through the page; README: "revisa lo principal". | `prueba.mjs` → "Todo bien" (run in #3), while the same build's page form saves 0 requests (#1). | The owner trusts "Todo bien", publishes the site, and waits for requests that never come. | false claim |
| 7 | **Without JS, an error page throws away everything the person typed, and it reports one error at a time.** | `browser2.mjs` with scripts disabled: Sunday plus a filled-in form → `/cita` "No pudimos enviar tu solicitud / Atendemos de lunes a viernes." → "Volver al formulario" → `nombre= ""`. Empty submit → only "Escribe tu nombre." | A patient with a blocked or failed script has to retype everything once per mistake. Many give up. | form |
| 8 | **The server saves identical submissions twice.** There is no idempotency key or duplicate check, so the client-side `aria-disabled` guard is the only protection, and #1 means that guard never runs. | `probe2.mjs`: two parallel identical POSTs → `201,201`, and both appear in the list. | Once the form works, a retry on a bad connection or a double tap through the no-JS form gives the clinic duplicate requests to sort out. | data |
| 9 | **The admin filter controls are unstyled and tiny on a phone.** | `browser3.mjs` at 375 px: `buscar 21x177 font 13.3px`, `estado 19x98 font 13.3px` (other buttons 45 px). Screenshot `admin-375.png`. | The physio, checking requests on their phone between sessions, struggles to hit the 19 px search box and status select. | mobile |
| 10 | **A damaged data file is reported only on the server console.** | `probe4.mjs` after damage: the admin API keys are `citas,total,pagina,paginas,conteos,tratamientos`, with no warning. The only notice is the console `AVISO: 1 línea(s) dañada(s)`. | If records are lost to damage, the owner never learns, unless they are watching the terminal at startup. | data |

Not reproduced, from reading only: in `cargar()`, any read error other than ENOENT (EBUSY, EACCES) leaves `solicitudes = []`. The compaction step then overwrites `solicitudes.jsonl` with an empty file. I could not force a locked file from Node on Windows, so this is not in the table.

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder. I used five parts: title, what happened, why it happens, detector question, and what to do instead.

### Covered by existing lessons (no new lesson)
- #1, #2, #6: **41** (checked through the API, never through the page the reader uses) and **45** (error path never walked).
- #4: **WEB-2**.
- #5: **WEB-5**.
- #10: close to **WEB-1** (the "who finds out" half).

### New: A test script that cleans up must never touch the real data
- **What happened:** `prueba.mjs` runs `rm('datos', {recursive:true, force:true})` against the same folder the live server writes to. The README tells the owner to run it. One run deleted 50,100 requests, their backup and the admin password.
- **Why it happens:** the test was written for the builder's empty sandbox. Cleaning up "its own" files looks harmless when the folder has always been empty.
- **Detector question:** If the owner runs this test on the day the site is full of real data, what is left afterwards?
- **What to do instead:** have tests use their own temporary directory (an env var for the data path, `mkdtemp`). Never delete a path the production server also uses, and refuse to run if that path already has data.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### New: A global rate limit is a switch anyone can flip off
- **What happened:** to stop floods, the server caps everyone together at 100 requests an hour. 100 bot posts from rotating IPs got 201, and every real patient after that got 429.
- **Why it happens:** a global cap feels like a safety net against bots, but it is shared by attackers and real users alike, so reaching it is a denial of service the builder installed.
- **Detector question:** Once this limit is reached, who is blocked: the abuser, or everyone?
- **What to do instead:** limit per source (and per identity such as a phone or email), keep accepting but flag or queue suspicious entries rather than refuse them, and tell the owner when limits trigger.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### New: A lockout that still accepts the right answer is not a lockout
- **What happened:** after 10 failures, the login returned 429 for wrong passwords but 200 for the right one, and a success reset the counter. Guessing never really stopped.
- **Why it happens:** the builder made sure a locked-out owner could still get in, which is the specific case, so the general limit stopped protecting anything. The 429 just became another way of saying "wrong".
- **Detector question:** While the limit is active, does a correct guess get a different answer from a wrong one?
- **What to do instead:** while locked, reject every attempt the same way without checking the password, and add a growing delay. This is a refinement of WEB-5 and could be merged into it as a second detector.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### New: An error path that discards the input is a dead end
- **What happened:** the no-JS fallback shows one error on a new page, and "Volver al formulario" returns an empty form.
- **Why it happens:** the fallback was built to say "no", not to let the person fix and resubmit.
- **Detector question:** After an error, how much does the person have to type again?
- **What to do instead:** re-render the form with the submitted values and every field error inline. This is a refinement of 45 and WEB-3.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
