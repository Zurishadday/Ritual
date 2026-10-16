# What the reviewer said

`claude-opus-5-5` · success · 65 turns · $2.4374670000000003 · 50609 output tokens · 2 denied tool call(s)

I've written `FINDINGS.md` and `verdicts.json` in the build folder; the JSON parses. The build is solid overall, and its own `node prueba.mjs` passes all 26 checks. I ran everything over HTTP and in headless Chrome, with the data saved in a temporary folder so the build's folder wasn't touched. All servers I started are stopped.

**Findings:**
1. **Security: a bot can close the form for everyone.** There is a shared cap of 40 requests per hour for all visitors. Sending 31 fake requests from 8 different addresses was enough to fill it. After that a real patient got "Llámanos" (call us) instead of a booking. This is lesson WEB-2.
2. **Mobile: one long name breaks the clinic's page.** One request with an 80-character name and a 117-character email made the page 1014 px wide on a 375 px phone. "Cancelar" and "Eliminar" were cut off on every card, not just that one. This is a new lesson; I wrote the candidate.
3. **Data: a damaged record stops all new requests.** A saved line that is valid JSON but missing fields made every new request fail with a server error (500). The clinic's page then showed zero requests and a technical error. A cut-off line (as after a crash mid-write) was handled correctly. This is lesson WEB-1.
4. **Data: corrections are silently dropped.** If someone sends the request again with a corrected email or name, they see success, but the old data stays. Another person using the same phone and time slot gets their comment added to the first person's request. This is lesson 49.
5. **Accessibility: the clinic's page is blank without JavaScript.** There is no message at all. This is a variant of WEB-3.
6. **Accessibility: the status button looks like the main action.** On each request, the button for the current status is painted dark, so "Dejar pendiente" (leave pending) stands out on every new request. This is a one-off slip.

**What held:**
- Every form error path shows a clear message, the data stays in the form, and the person can keep going.
- Two quick clicks saved one request.
- HTML in a request shows as plain text.
- The server does its own validation.
- Requests for files outside the public folder are refused.
- After 5 wrong passwords, logins from that address are refused for a minute, including during a burst of 201 at once.
- The keyboard path and where the focus lands work.
- The public form works with JavaScript off.
- The public page has no sideways scroll on a phone.
- No data was lost when requests and status changes arrived at the same time.
- It handles 100,000 saved requests fine (the clinic's list loads in about 20 ms).
- Every claim in the README is true.

**Verdicts:**

| Verdict | Lessons |
|---|---|
| broke | 41, 49, WEB-1, WEB-2 |
| held | 32, 45, 46, WEB-3, WEB-4, WEB-5 |

My test scripts and screenshots are in `review-clinic-9eWKru`, next to the build folder.
