# clinic · 2026-10 · claude-sonnet-5-5 · with Ritual

Built by `claude-sonnet-5-5` with Ritual loaded (its hooks; CLAUDE.md stays off, as in every run), reviewed by `claude-opus-5-5`, 4 run(s), Claude Code 2.1.296, isolation: subscription, flags (checked with --probe?), blind review.

## Spend

- Run 1 · builder 47 turns · $0.9040396000000002 · 44267 output tokens · 1 denied tool call(s) · reviewer 47 turns · $2.3751269999999995 · 54278 output tokens · 4 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 1 guard block(s) (node-e-backslashes), sent back once to check before finishing
- Run 2 · builder 53 turns · $0.9880309000000002 · 44703 output tokens · reviewer 69 turns · $2.4949582000000006 · 53040 output tokens · 2 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 0 guard block(s), sent back once to check before finishing
- Run 3 · builder 55 turns · $1.3354319000000001 · 65292 output tokens · 1 denied tool call(s) · reviewer 48 turns · $2.1689808 · 42918 output tokens · 3 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, writing-and-docs, 1 guard block(s) (node-e-backslashes), sent back once to check before finishing
- Run 4 · builder 45 turns · $0.8326867000000001 · 38432 output tokens · 1 denied tool call(s) · reviewer 62 turns · $2.2345102000000003 · 44422 output tokens · 2 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 1 guard block(s) (node-e-backslashes), sent back once to check before finishing

## Lessons of the package

- **The mistake happened in every run** (2): WEB-2, WEB-1. Confirmed with this model: `node scripts/maintain.mjs seen <id> claude-sonnet-5-5 2026-10` for each.
- **The mistake happened in no run** (3): 32, WEB-4, WEB-5. Candidates to demote for this model: check the evidence before anything else.
- **The mistake happened in some runs only** (5): 41, 45, 46, 49, WEB-3. They stay as they are.
- **Not checked** (0)

## New mistakes

- Run 1 · mobile · Every place that prints a stranger's text needs the long-word rule (admin card h3 has no overflow-wrap): Chrome 375px /admin with an 80-char name -> scrollWidth 917 vs clientWidth 375; dd wraps, .solicitud h3 does not
- Run 1 · server · A rate limit counted before validation spends a person's corrections and blocks the valid request: 10 invalid POST /api/citas then 1 valid from same IP -> 400,400,400,400,400,400,400,400,400,400,429,429
- Run 1 · accessibility · Focus ring colour checked against one background fails on the others: computed in Chrome: #f2a900 ring vs white 2.01:1, vs cream #f6f3ec 1.81:1 (< 3:1)
- Run 1 · server · Wrong-typed JSON bodies crash the handler (500) or get coerced into stored junk: POST /api/citas body null -> 500; nombre {toString:1} -> 500 with stack; nombre ['a','b'] -> 201 stored as 'a,b'
- Run 1 · false claim · Request asked how to test it; build ships no README and the password appears only once in the console: Glob **/* -> no README; first boot prints 'Contraseña generada (guardada en datos/clave.txt)' only
- Run 2 · server · Per-socket-address submission quota throttles every patient behind one proxy or shared Wi-Fi: after 5 accepted from 127.0.0.1, 3 different new patients at once -> 201,429,429; ipDe() uses req.socket.remoteAddress
- Run 2 · data · Shipped test scripts reset the live data store: copy with 3 saved requests -> node prueba-danado.mjs prints 'Todo bien' -> solicitudes.json = []
- Run 2 · false claim · Invented address, phone, prices and durations shown as real facts without placeholder marking: index.html shows 'Av. Andares 1234…', tel:+523312345678, '$650 MXN', none given in the request; grep for ejemplo|placeholder|reemplaza in page files -> no match
- Run 2 · accessibility · White hero text over the image fails contrast once composited: canvas composite of hero at 375px: 16px paragraph worst 2.47:1, mean 3.30:1 (needs 4.5:1)
- Run 3 · data · A safety cap must not silently close the front door (5000-request cap returns 503 to patients, owner never warned, closed/cancelled count too): datos.mjs: request #5001 -> 503 {"error":"Por ahora no podemos recibir más solicitudes en línea. Llámanos por teléfono, por favor."}
- Run 3 · server · A per-IP limit is a per-everyone limit behind a shared address (submit limit and login lockout keyed on socket IP): datos.mjs: 8 different people from 127.0.0.1 -> 201 201 201 201 201 429 429 429
- Run 3 · accessibility · Main call-to-action button has 1.73:1 non-text contrast against the hero behind it: node contrast calc: #0f766e vs #134e4a = 1.73 (needs 3:1); visible in desk-top.png
- Run 4 · data · Read-modify-write with an await in the middle loses requests that arrive meanwhile: race2.mjs: PATCH with a slow body + POST B -> 201 {ok:true}; PATCH 200; list afterwards: B present = false, total unchanged at 3
- Run 4 · mobile · Visitor-typed text without wrapping breaks the owner's mobile layout: 80-char name with no spaces, clinic page at 375px: documentElement.scrollWidth 841, widest element is the name SPAN in h2
- Run 4 · form · Booking accepts a time already past today and dates in the year 9999: at 10:57 on 2026-10-16, POST fecha 2026-10-16 hora 09:00 -> 201; POST fecha 9999-12-31 -> 201
- Run 4 · data · The test script moves the owner's live data folder; if interrupted, the real requests vanish from the panel: killed prueba.mjs after 500ms on a copy -> dir has datos + datos.respaldo, real record no longer in datos/citas.jsonl
- Run 4 · false claim · Server only listens on localhost and nothing outside the code says how to open it from a phone: node servidor.mjs running; fetch http://192.168.101.104:3000/ -> ECONNREFUSED; no README, HOST only in servidor.mjs:14

A new mistake becomes a lesson only if it broke in every run: compare the runs' FINDINGS.md by meaning.
