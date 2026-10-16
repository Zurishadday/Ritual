# What the reviewer said

`claude-opus-5-5` · success · 61 turns · $2.536223199999999 · 52100 output tokens · 3 denied tool call(s)

I've written `FINDINGS.md` and `verdicts.json` (it parses). Of the 10 lessons, 5 broke and 5 held. None were left not-checked: I drove headless Chrome myself for the phone-width and keyboard checks. All servers I started are stopped. I changed nothing in the build itself.

The build is solid on the main paths:
- **Validation:** the server rejects everything the page rejects.
- **File server:** none of the escape paths reached a file outside `public/`.
- **HTML in a request:** it shows as plain text on the clinic's page.
- **Double submit:** two quick clicks saved one request.
- **Phone width:** no horizontal scroll at 375 px on either page.
- **Keyboard:** works throughout with a visible focus.
- **Without JavaScript:** the form still submits normally.

The problems are in branches nobody tried:

1. **No-JavaScript form crashes once rate-limited:** after 5 requests from one IP, every no-JavaScript submit returns a bare "Error del servidor" (a code bug at `servidor.mjs:181`). A patient gets no phone number and no form. (WEB-3 broke)
2. **The login limit doesn't stop guessing:** I sent 200 wrong passwords in 566 ms, and the correct one was still accepted right after. The default random password holds; a weak `ADMIN_PASSWORD` would not. (WEB-5 broke)
3. **A full store switches off booking:** at 5,000 saved requests, every new patient gets a 503. 200 fake requests from 200 IPs were all accepted in 404 ms, and the owner can only clear them one card at a time. (WEB-2 broke)
4. **A write cut off while the server keeps running loses the next patient:** their request was confirmed to them, then vanished on restart. A crash followed by a restart is handled correctly. (WEB-1 broke)
5. **The builder's phone-width check doesn't test the page:** it measures a hand-made copy of one card, and Chrome ran it at 512 px, not 375. The real page passed when I measured it. (41 broke)

Smaller findings:
- The limit of 5 requests per IP refuses people who share an IP (mobile carriers, offices).
- The phone and email links on the clinic page are 21 px tall at 375 px, which is hard to tap.
- The text over the placeholder hero image is only about 3.5:1 contrast at its worst spot.

There is no README. The only run instruction is the first-line comment in `servidor.mjs`.

There are two new candidate lessons (the per-IP limit, and the cap as an off switch). `lessons/TEMPLATE.md` isn't in this folder, so I gave them five parts modelled on the listed lessons; check that shape against the real template.

My probe scripts and screenshots are in `_revisor/`. Running the build also created `datos/` in the folder; I left it there.
