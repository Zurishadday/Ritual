# clinic · 2026-10 · claude-sonnet-5-5

Built by `claude-sonnet-5-5`, reviewed by `claude-opus-5-5`, 4 run(s), Claude Code 2.1.296, isolation: subscription, flags (checked with --probe?), blind review.

## Spend

- Run 1 · builder 14 turns · $0.39845769999999997 · 19596 output tokens · reviewer 37 turns · $1.7702942000000004 · 39347 output tokens · 1 denied tool call(s)
- Run 2 · builder 15 turns · $0.3076847 · 20321 output tokens · reviewer 65 turns · $2.1711978 · 46215 output tokens · 2 denied tool call(s)
- Run 3 · builder 13 turns · $0.3143408 · 20566 output tokens · reviewer 35 turns · $1.3248594 · 27163 output tokens · 1 denied tool call(s)
- Run 4 · builder 15 turns · $0.2922966 · 18747 output tokens · reviewer 45 turns · $1.7626631999999998 · 43648 output tokens · 5 denied tool call(s)

## Lessons of the package

- **The mistake happened in every run** (4): 45, WEB-2, WEB-3, WEB-1. Confirmed with this model: `node scripts/maintain.mjs seen <id> claude-sonnet-5-5 2026-10` for each.
- **The mistake happened in no run** (1): WEB-5. Candidates to demote for this model: check the evidence before anything else.
- **The mistake happened in some runs only** (5): 32, 41, 46, 49, WEB-4. They stay as they are.
- **Not checked** (0)

## New mistakes

- Run 1 · data · A serialized write queue (promise chain) stays rejected after one failure, so every later save fails and in-memory records are lost on restart: node datos.mjs: tmp path blocked once -> 500; unblocked -> next 3 POSTs [500,500,500]; in memory/on disk [65,61]; after restart [61,false]
- Run 1 · form · Same-day time slots that have already passed are accepted: node api.mjs at 21:03 on 2026-10-15: fecha 2026-10-15 hora 09:00 -> 201; browser shows '¡Solicitud enviada!'
- Run 1 · security · Without JavaScript the GET-submitted form leaks name/phone/email into the URL and saves nothing: node sinjs.mjs: URL after submit /?nombre=Sin+JS&telefono=5551112222&correo=nojs%40ej.mx&...; saved on server 0
- Run 1 · mobile · A long name overflows the admin card on mobile (h2 lacks overflow-wrap): node navegador.mjs: admin at 375px scrollWidth/clientWidth [991,375]; admin-375.png shows name running off card
- Run 1 · security · Admin password hard-coded default 'fisio2026' works when started as instructed: servidor.mjs:15; node navegador.mjs logged into /admin with 'fisio2026' on a server started without env
- Run 1 · accessibility · Focus ring color too faint (non-text contrast under 3:1): node datos.mjs: #8ccbc1 vs white 1.84:1, vs cream 1.73:1
- Run 1 · false claim · Placeholder address and tel:+520000000000 shipped without any note to replace them; no README: index.html:111-112; folder contains no README, run instructions only in servidor.mjs line 1 comment
- Run 1 · mobile · Images without declared width/height; phone link tap target 27px tall: node navegador.mjs: all img width/height null; tap targets <44px: '(000) 000 0000:27', nav links 38
- Run 2 · form · Rate limit counts rejected validation attempts per shared IP, locking out the person who just fixed their typo: fresh IP: 10× 400 'Escribe un teléfono válido.' then valid request → 429 'Demasiadas solicitudes. Inténtalo más tarde.'
- Run 2 · data · Promise-chain write queue stays rejected after one failure; memory and disk diverge: after one EISDIR on citas.json.tmp and recovery: POSTs 3 and 4 → 500, disk ['Antes'], GET /api/citas shows ['Despues 2','Despues 1','Durante','Antes']
- Run 2 · mobile · Admin page scrolls horizontally on mobile with a long email/comment: Chrome 375px admin: scrollWidth 854 vs clientWidth 375
- Run 2 · accessibility · Focus ring color too faint (≈2.0:1 on white): computed outline solid 3px rgb(124,196,187) on inputs/buttons over #fff/#f6f3ee
- Run 2 · server · Oversized body gets a connection reset instead of the intended 413: curl 100 KB POST → code=000, empty; fetch → ECONNRESET
- Run 2 · security · Per-IP login lockout also blocks the owner's correct password: 8 wrong from 127.0.0.10 then the correct password from the same IP → 429
- Run 3 · form · A 'not in the past' booking rule checked only by day accepts slots already over today: At 09:11 local, POST /api/citas fecha=2026-10-16 hora=09:00 -> 201.
- Run 3 · server · Handlers assume input shape, so null body / Origin: null / bad %-escape give 500 with stack traces: POST body 'null' -> 500 TypeError reading 'web'; Origin: null -> 500; GET /%E0%A4%A -> 500.
- Run 4 · data · Project's own test script deletes the live data folder: prueba.mjs run in a copy: before datos/=['solicitudes.json'], after datos/ ENOENT (rm('datos') at lines 5 and 32)
- Run 4 · data · One failed write poisons the write queue; requests shown in admin are lost on restart: datos.mjs: after one EISDIR write failure, next POSTs 500/500 with disk healthy, file stuck at 1, admin shows 4, after restart 1
- Run 4 · server · Inherited object keys accepted as treatment, bypassing the hour check: POST tratamiento='constructor' hora='23:00' -> 201; admin shows 'function Object() { [native code] } · 19/10/2026 a las 23:00'
- Run 4 · server · Server accepts past dates (yesterday, earlier today) and off-grid times: POST fecha=2026-10-15 (yesterday) -> 201; today 09:00 -> 201; hora 09:07 -> 201

A new mistake becomes a lesson only if it broke in every run: compare the runs' FINDINGS.md by meaning.
