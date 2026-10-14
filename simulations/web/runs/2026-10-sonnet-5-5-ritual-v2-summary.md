# web · 2026-10 · claude-sonnet-5-5 · with Ritual

Built by `claude-sonnet-5-5` with Ritual loaded (its hooks; CLAUDE.md stays off, as in every run), reviewed by `claude-opus-5-5`, 3 run(s), Claude Code 2.1.296, isolation: subscription, flags (checked with --probe?).

## Spend

- Run 1 · builder 14 turns · $0.38315049999999995 · 24374 output tokens · reviewer 36 turns · $1.3306652 · 29508 output tokens · Ritual: package lessons at the start, questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s), sent back once to check before finishing
- Run 2 · builder 24 turns · $0.5295415 · 33081 output tokens · reviewer 39 turns · $1.9247374 · 40773 output tokens · Ritual: package lessons at the start, questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s), sent back once to check before finishing
- Run 3 · builder 15 turns · $0.6028137000000001 · 39166 output tokens · reviewer 65 turns · $2.404058600000001 · 40461 output tokens · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 0 guard block(s), sent back once to check before finishing

## Lessons of the package

- **The mistake happened in every run** (0)
- **The mistake happened in no run** (6): 32, 45, WEB-3, WEB-4, WEB-5, WEB-1. Candidates to demote for this model: check the evidence before anything else.
- **The mistake happened in some runs only** (4): 41, 46, 49, WEB-2. They stay as they are.
- **Not checked** (0)

## New mistakes

- Run 1 · server · Oversized body: socket destroyed before the coded 413 reply, so the client gets a connection reset: node http.mjs form: api 100KB fields -> FETCH-ERROR ECONNRESET; form 100KB fields -> FETCH-ERROR ECONNRESET
- Run 1 · server · Malformed percent-encoding in the path throws in decodeURIComponent and returns 500: node http.mjs basic: RAW /%E0%A4%A -> HTTP/1.1 500 Internal Server Error
- Run 1 · false claim · Stated rate limits are off by one (6 allowed, summary says 5): node http.mjs login -> 401 x6 then 429; contact flood after 5 browser saves still got one 200
- Run 1 · data · Damaged lines count toward the 5000 cap and cannot be deleted from admin: node http.mjs admin after corrupt+seed: '4999 mensaje(s)', 'Hay 1 línea(s) dañada(s)', 'El buzón está lleno'; borrar() keeps unparsable lines
- Run 2 · form · Error message tells the customer to phone, but the site has no phone number: node tools/full-test.mjs with an 11.2 MB store -> 503 '…o escríbenos por teléfono.'; 'home mentions a phone: false'
- Run 2 · form · No-JS success answered with 200 instead of a 303 redirect: reload saves the message twice: node tools/reload-test.mjs (Edge, JS off) -> after submit saved 1, after reload saved 2: ["recargar","recargar"]
- Run 2 · form · No-JS refusals other than field errors (429/413/503) re-render the form empty and lose what was typed: 100 KB form POST -> 413 page 'El mensaje es demasiado largo. Nombre Correo electrónico Mensaje' with all fields empty; falla() never passes valores
- Run 2 · mobile · Admin page scrolls sideways on a phone when a message has a long unbroken name: message with a 100-char name, /admin at 375px in Edge -> scrollWidth 1307 (shots/m-admin.png)
- Run 2 · data · One parseable store line without a valid fecha makes the whole admin page return 500 (refines WEB-1): append {"id":"a3","mensaje":"sin fecha"} -> GET /admin 500 'Algo salió mal', server log 'RangeError: Invalid time value'
- Run 3 · security · A brake shared by all visitors lets bots shut the form for real customers, silently: probe4 flood: 104 bot POSTs from 13 addresses use up the global 100/hour cap; a real customer from a new address gets 429 Retry-After 3600; the owner is never told
- Run 3 · accessibility · Global focus ring color is visible on the page background but not on the dark header or hero: outline #1d4ed8 vs header #0f3d3e = 1.78:1, vs hero bottom #081c1d = 2.62:1 (needs 3:1); shots2/focus-header.png
- Run 3 · form · The per-address limit counts rejected submissions before validating them: probe2: 4 accepted + 4 rejected from one address, then a valid 9th message -> 429
- Run 3 · data · The server doesn't remove duplicates: two identical POSTs (double submit without JS) are saved twice: probe2 b: two simultaneous identical POSTs -> 303,303, 'saved copies of the double-click message: 2'

A new mistake becomes a lesson only if it broke in every run: compare the runs' FINDINGS.md by meaning.
