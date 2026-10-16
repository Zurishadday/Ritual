# Task: appointment requests for a clinic

The runs use the Spanish version of this task: [TASK.es.md](TASK.es.md). It is new on purpose: no lesson was born from it, so it measures Ritual on a task it never learned from.

Package: `web`. Handed to the builder as written, with nothing added.

---

I need a web page for my physiotherapy clinic, "Fisio Andares". I want:

- A hero section with a photo and one sentence saying what we do.
- The three treatments we offer (knee rehabilitation, back pain, sports massage), each with its photo, how long a session lasts and the price.
- A form to request an appointment: name, phone, email, the treatment, the day and time they prefer (we are open Monday to Friday, 9 to 18) and an optional comment. It should save the requests on the server.
- A page for me, protected with a password, where I see the requests, newest first, and can mark each one as confirmed or cancelled.
- The address and a phone number to call.
- It should look good on mobile.

No frameworks: HTML, CSS and JavaScript, plus a small Node server with no dependencies. For the photos, use placeholder images. Make it ready to run with `node servidor.mjs`, and tell me how to test it.
