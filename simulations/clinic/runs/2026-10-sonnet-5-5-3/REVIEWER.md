# What the reviewer said

`claude-opus-5-5` · success · 35 turns · $1.3248594 · 27163 output tokens · 1 denied tool call(s)

I've written the review to `FINDINGS.md` and `verdicts.json`, which covers all 10 lessons and proposes 2 new ones. The server runs with `node servidor.mjs`, the pages and images load, and the server checks the form on its own, not just in the browser. But it has two ways of losing data. All servers I started are stopped.

**The biggest problems:**
1. **A damaged data file wipes all requests without warning.** I cut off the end of a file holding 3 requests and restarted the server. It said nothing, and the next request replaced the file, which then held just that 1 request.
2. **One failed save blocks every save after it, until the server restarts.** After a single save failure, every later request got "Error del servidor", even once the cause was gone. The panel still listed them, but only 1 of 5 survived a restart.
3. **Patients who make mistakes get locked out.** The limit of 10 submissions per hour counts wrong ones too, and every attempt goes to the server. After 10 tries with a bad phone number, the correct one was refused for an hour.
4. **Passed hours are accepted.** At 09:11 it accepted an appointment for 09:00 the same day.
5. **Without JavaScript the form doesn't work.** The hour list is empty, and submitting just reloads the page without saving anything.
6. **It stops taking requests after 5000, and none can be deleted.** Bots could fill it, and from then on every real patient gets turned away.

Smaller ones: some malformed requests cause server errors instead of a clear rejection, and the same request sent twice at once is saved twice. The image descriptions describe photos the placeholder images don't show. There's no README, even though the request asked how to test it.

**What held:** the server's form checks (empty fields, a phone with letters, an email without "@", a past day, a Sunday, 20:00, oversized fields), attempts to read files outside the site, and the login (blocked after 5 wrong passwords). It also handled 200 requests and 20 status changes arriving at once with nothing lost, and a crash during a save leaves the file intact. The clinic's page loads in 34 ms with 4999 requests. HTML in a name is displayed as text, though I only confirmed that in the code, not on screen.

**Lesson verdicts:** broke for 45, 49, WEB-1, WEB-2 and WEB-3; held for 46 and WEB-5. I marked 32, 41 and WEB-4 not-checked. Those, plus the 375 px phone view and keyboard-only use, need a browser, which I didn't have.

`lessons/TEMPLATE.md` isn't in the folder, so the two new lessons follow the five parts as I understood them. My test scripts and their copies of the build are in a separate folder, `review-clinic-scratch`.

Running the server as documented created a `datos/` folder in the build. It holds my test requests and a generated password; I left it in place, and you can delete it.
