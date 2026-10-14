#!/usr/bin/env node
// The web package's lessons as a check: it drives a headless Edge or Chrome against a site running on this machine and
// tries what the A/B simulation found broken in every build, whatever the questions said:
//   41    the page as the reader sees it: no sideways scroll on a phone, and screenshots to look at
//   49    a few rejected submissions don't use up the limit of the good one that follows
//   WEB-3 with JavaScript off, submitting shows something new on screen (not raw JSON, not the same page)
//   WEB-4 after a keyboard submit, ok or rejected, focus is somewhere, not on the bare document
//   WEB-2 a burst of submissions from one client meets a brake
// It sends test submissions named "Ritual Check" and says how many: only to local addresses (localhost, 127.x, [::1],
// *.localhost, *.test), never to a site on the internet.
// Usage: node scripts/web-check.mjs http://localhost:3000[/page] [--out <folder>]
//        node scripts/web-check.mjs --selftest
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { isMain } from "../hooks/common.mjs";

// Node 20 has WebSocket only behind a flag: run again with it.
if (typeof WebSocket === "undefined" && isMain(import.meta.url)) {
  const r = spawnSync(process.execPath, ["--experimental-websocket", ...process.argv.slice(1)], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const NAME = "Ritual Check";
const EMAIL = "ritual-check@example.com";

export function isLocal(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return false; }
  return host === "localhost" || host === "[::1]" || /^127\.\d+\.\d+\.\d+$/.test(host) || host.endsWith(".localhost") || host.endsWith(".test");
}

/** Edge or Chrome: CHROME_PATH, then the usual places for this platform. */
export function browserPath(env = process.env, platform = process.platform, exists = existsSync) {
  if (env.CHROME_PATH) return env.CHROME_PATH;
  const win = [env["ProgramFiles(x86)"], env.ProgramFiles, env.LOCALAPPDATA].filter(Boolean)
    .flatMap((base) => [path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"), path.join(base, "Google", "Chrome", "Application", "chrome.exe")]);
  const mac = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Chromium.app/Contents/MacOS/Chromium"];
  const found = (platform === "win32" ? win : platform === "darwin" ? mac : []).find((p) => exists(p));
  if (found || platform === "win32" || platform === "darwin") return found ?? null;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"]) {
    const r = spawnSync("which", [name], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

/** A value a person would type in a field of this kind. */
export function valueFor(field) {
  const hint = `${field.type} ${field.name}`.toLowerCase();
  if (field.tag === "textarea") return `${NAME}: an automatic test message.`;
  if (field.type === "email" || /mail|correo/.test(hint)) return EMAIL;
  if (field.type === "tel" || /phone|tel/.test(hint)) return "5551234567";
  if (field.type === "url") return "https://example.com";
  if (field.type === "number" || field.type === "range") return String(field.min || 1);
  if (field.type === "date") return "2030-01-15";
  return NAME;
}

/** The form's fields as a submission: what a person fills (`values` overrides by name), hidden fields as they came,
 * fields a person can't see (a honeypot) left empty. */
export function formBody(form, values = {}) {
  const body = new URLSearchParams();
  for (const f of form.hidden) body.append(f.name, f.value);
  for (const f of form.fields) body.append(f.name, values[f.name] ?? (f.type === "checkbox" || f.type === "radio" ? f.value || "on" : valueFor(f)));
  return body;
}

// In the page: the first form that posts (or the first form), what a person can see of it, and what they can't.
const FORM_JS = `(() => {
  const f = [...document.forms].find((x) => x.method === "post") ?? document.forms[0];
  if (!f) return null;
  f.setAttribute("data-ritual-check", "");
  const seen = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0 && s.visibility !== "hidden" && s.opacity !== "0" && !el.closest("[aria-hidden=true]") && el.tabIndex !== -1; };
  const named = [...f.elements].filter((e) => e.name && !["submit", "button", "reset", "file", "image"].includes(e.type));
  const describe = (e) => ({ name: e.name, type: e.type, tag: e.tagName.toLowerCase(), min: e.min ?? "", value: e.type === "checkbox" || e.type === "radio" ? e.value : "" });
  return {
    action: f.action, method: f.method, attrs: { action: f.hasAttribute("action"), method: f.hasAttribute("method") },
    fields: named.filter((e) => e.type !== "hidden" && seen(e)).map(describe),
    hidden: named.filter((e) => e.type === "hidden").map((e) => ({ name: e.name, value: e.value })),
    traps: named.filter((e) => e.type !== "hidden" && !seen(e)).map((e) => e.name),
  };
})()`;

const fillJs = (values) => `(() => {
  const f = document.querySelector("form[data-ritual-check]") ?? [...document.forms].find((x) => x.method === "post") ?? document.forms[0];
  f.setAttribute("data-ritual-check", "");
  const values = ${JSON.stringify(values)};
  for (const [name, v] of Object.entries(values)) for (const el of f.querySelectorAll("[name='" + CSS.escape(name) + "']")) {
    if (el.type === "checkbox" || el.type === "radio") { el.checked = true; break; }
    if (el.tagName === "SELECT") el.selectedIndex = Math.min(1, el.options.length - 1); else el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const b = f.querySelector("button:not([type=button]):not([type=reset]), input[type=submit]");
  if (!b) return null;
  b.scrollIntoView({ block: "center" });
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;

const ACTIVE_JS = `(() => { const a = document.activeElement; return !a || a === document.body || a === document.documentElement ? "BODY" : a.tagName + (a.id ? "#" + a.id : a.name ? "[" + a.name + "]" : ""); })()`;

/** A headless browser on a free port, with one page. */
async function launch(bin) {
  const profile = mkdtempSync(path.join(os.tmpdir(), "ritual-web-check-"));
  // ponytail: no sandbox on Linux, where runners often lack the user namespaces it needs; only local pages are opened.
  // On Linux runners /dev/shm is small and Chrome can crash on it; a cold start there has taken over ten seconds.
  const child = spawn(bin, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, ...(process.platform === "linux" ? ["--no-sandbox", "--disable-dev-shm-usage"] : []), "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  let port = null, ended = null, said = "";
  child.on("error", (e) => { ended = e.message; });
  child.on("exit", (code, signal) => { ended ??= `exited ${code ?? signal}`; });
  child.stderr.on("data", (d) => { said = (said + d).slice(-600); });
  for (let i = 0; i < 300 && !port && !ended; i++) { await sleep(100); try { port = readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0].trim(); } catch { /* not up yet */ } }
  const stop = async () => { child.kill(); await sleep(400); try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold it */ } };
  if (!port) { await stop(); throw new Error(`the browser did not start (${ended ?? "no answer in 30 s"}): ${bin}${said.trim() ? `\n${said.trim()}` : ""}`); }
  let target;
  for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* not yet */ } if (!target) await sleep(100); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
  let id = 0;
  const pending = new Map(), waiting = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    for (const w of waiting.filter((x) => x.method === m.method)) { waiting.splice(waiting.indexOf(w), 1); w.done(true); }
  });
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const once = (method, ms) => new Promise((r) => { const w = { method, done: r }; waiting.push(w); setTimeout(() => { const i = waiting.indexOf(w); if (i >= 0) { waiting.splice(i, 1); r(false); } }, ms); });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const goto = async (url) => { const loaded = once("Page.loadEventFired", 10000); await send("Page.navigate", { url }); await loaded; await sleep(300); };
  const size = (width, height, mobile = false) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  const shot = async (file) => {
    const { result } = await send("Page.getLayoutMetrics");
    const h = Math.min(Math.ceil(result?.cssContentSize?.height ?? 900), 8000), w = Math.ceil(result?.cssLayoutViewport?.clientWidth ?? 1280);
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
    if (r.result?.data) writeFileSync(file, Buffer.from(r.result.data, "base64"));
  };
  const click = async ({ x, y }) => { for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  const enter = async () => { for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, ...(type === "keyDown" ? { text: "\r" } : {}) }); };
  await send("Page.enable");
  return { send, once, evaluate, goto, size, shot, click, enter, close: async () => { ws.close(); await stop(); } };
}

const post = (form, body) => fetch(form.action, { method: "POST", body, redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" } }).then((r) => r.status, () => 0);

const NO_POST = "not checked: the form doesn't post (it works only with JavaScript)";

/** 49 (and 45): six submissions with every field empty, then a good one. Plain HTTP. @returns {{sent: number, results: string[][]}} */
export async function limitCheck(form) {
  if (form.method !== "post") return { sent: 0, results: [["–", "49", NO_POST]] };
  const empty = Object.fromEntries(form.fields.map((f) => [f.name, ""]));
  const rejected = [];
  for (let i = 0; i < 6; i++) rejected.push(await post(form, formBody(form, empty)));
  const good = await post(form, formBody(form));
  const seen = [...new Set(rejected)].join(", ");
  return { sent: 7, results: [
    ...(rejected.every((s) => s >= 200 && s < 400) ? [["✕", "45", `6 submissions with every field empty were accepted (${seen}): the server doesn't validate`]] : []),
    good > 0 && good < 400 ? ["✓", "49", `after 6 rejected submissions (${seen}), a good one was accepted (${good})`]
      : ["✕", "49", `after 6 rejected submissions (${seen}), a good one got ${good || "no answer"}: the limit counts what it rejected, or blocks too early`],
  ] };
}

/** WEB-2: a burst of good submissions from one client must meet a brake. Plain HTTP. */
export async function burstCheck(form, burst = 40) {
  if (form.method !== "post") return { sent: 0, results: [["–", "WEB-2", NO_POST]] };
  const start = Date.now(), statuses = [];
  for (let i = 0; i < burst; i++) statuses.push(await post(form, formBody(form)));
  const refused = statuses.filter((s) => s >= 400);
  return { sent: burst, results: [refused.length ? ["✓", "WEB-2", `a burst of ${burst} submissions in ${Date.now() - start} ms met a brake: ${refused.length} refused (${[...new Set(refused)].join(", ")})`]
    : ["✕", "WEB-2", `${burst} submissions from one client in ${Date.now() - start} ms, all accepted: nothing stops a script. Add a per-client limit and a hidden field people don't fill`]] };
}

const visibleText = (b) => b.evaluate("document.body ? document.body.innerText : ''");
const fresh = (before, after) => { const old = new Set(before.split("\n").map((l) => l.trim())); return after.split("\n").map((l) => l.trim()).filter((l) => l.length > 1 && !old.has(l)); };

/** Every check against a running site. @returns {{results: [string, string, string][], shots: string[], sent: number}} */
export async function check(url, { out, bin = browserPath(), burst = 40 } = {}) {
  if (!isLocal(url)) throw new Error(`${url} is not a local address: this check sends test submissions, so it only runs against a site on this machine`);
  if (!bin) throw new Error("no Edge or Chrome found: install one or set CHROME_PATH");
  mkdirSync(out, { recursive: true });
  const b = await launch(bin);
  const results = [], shots = [];
  let sent = 0;
  try {
    // 41: the page as the reader sees it, on a phone and on a desktop.
    await b.size(1280, 900); await b.goto(url); await b.shot(path.join(out, "desktop.png")); shots.push(path.join(out, "desktop.png"));
    await b.size(375, 812, true); await b.goto(url); await b.shot(path.join(out, "phone.png")); shots.push(path.join(out, "phone.png"));
    const wide = await b.evaluate("document.documentElement.scrollWidth");
    results.push(wide > 376 ? ["✕", "41", `on a 375 px phone the page is ${wide} px wide: it scrolls sideways. Look at phone.png`] : ["✓", "41", "no sideways scroll on a 375 px phone; look at phone.png and desktop.png anyway"]);
    await b.size(1280, 900);
    await b.goto(url);
    const form = await b.evaluate(FORM_JS);
    if (!form) return { results: [...results, ["–", "WEB-3", "not checked: no form on this page"]], shots, sent };
    const values = Object.fromEntries(form.fields.map((f) => [f.name, valueFor(f)]));
    const limit = await limitCheck(form);
    sent += limit.sent;
    results.push(...limit.results);
    // WEB-3: JavaScript off, a real click, and what the person sees next.
    await b.send("Emulation.setScriptExecutionDisabled", { value: true });
    await b.goto(url);
    const before = await visibleText(b);
    const at = await b.evaluate(fillJs(values));
    if (!at) results.push(["✕", "WEB-3", "the form has no submit button"]);
    else {
      const loaded = b.once("Page.loadEventFired", 6000);
      await b.click(at); sent++;
      await loaded; await sleep(400);
      const after = await visibleText(b), shown = fresh(before, after);
      await b.shot(path.join(out, "after-submit-without-javascript.png")); shots.push(path.join(out, "after-submit-without-javascript.png"));
      results.push(/^\s*[[{]/.test(after) ? ["✕", "WEB-3", `with JavaScript off, submitting shows raw data: ${after.trim().slice(0, 80)}`]
        : !shown.length ? ["✕", "WEB-3", "with JavaScript off, submitting shows nothing new: the person can't tell whether it was sent. Answer the normal submission with a page, or don't declare a fallback the form doesn't have"]
        : ["✓", "WEB-3", `with JavaScript off, submitting shows: ${shown.join(" / ").slice(0, 100)}`]);
    }
    await b.send("Emulation.setScriptExecutionDisabled", { value: false });
    // WEB-4: keyboard only, once accepted and once with an email the browser takes and most servers refuse.
    const email = form.fields.find((f) => f.type === "email" || /mail|correo/i.test(f.name));
    for (const [label, v] of [["accepted", values], ...(email ? [["rejected", { ...values, [email.name]: "ritual@check" }]] : [])]) {
      await b.goto(url);
      const href = await b.evaluate("location.href");
      if (!(await b.evaluate(fillJs(v)))) break;
      await b.evaluate(`document.querySelector("form[data-ritual-check] button:not([type=button]):not([type=reset]), form[data-ritual-check] input[type=submit]")?.focus()`);
      const loaded = b.once("Page.loadEventFired", 3000);
      await b.enter(); sent++;
      const navigated = await loaded; await sleep(navigated ? 300 : 0);
      if (navigated || (await b.evaluate("location.href")) !== href) { results.push(["–", "WEB-4", `${label}: the page reloads after submitting, so focus starts at the top`]); continue; }
      const active = await b.evaluate(ACTIVE_JS);
      results.push(active === "BODY" ? ["✕", "WEB-4", `${label} by keyboard: focus ends on the bare document, so the next Tab starts over from the top. Move it to the notice or to the field to fix`] : ["✓", "WEB-4", `${label} by keyboard: focus ends on ${active}`]);
    }
    // WEB-2 last: the burst may leave the limit used up.
    const flood = await burstCheck(form, burst);
    sent += flood.sent;
    results.push(...flood.results);
  } finally { await b.close(); }
  return { results, shots, sent };
}

/** Two small sites for the selftest: one that does each thing right, one that makes each mistake. */
function testServer() {
  const counts = { good: [], bad: [], quiet: [] };
  const page = (site, notice = "") => `<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>${site}</title></head><body>
    <h1>Bike shop</h1>${site === "bad" ? '<div style="width:640px">A wide banner</div>' : ""}<p id="estado" tabindex="-1">${notice}</p>
    <form method="post" action="/${site}/send"><label>Name <input name="nombre" required></label><label>Email <input type="email" name="correo" required></label>
    <label>Message <textarea name="mensaje"></textarea></label><div style="position:absolute;left:-9999px"><input name="web" tabindex="-1"></div><button>Send</button></form>
    <script>const f = document.forms[0], s = document.getElementById("estado"), b = f.querySelector("button");
    f.addEventListener("submit", async (e) => { e.preventDefault(); ${site === "bad" ? "b.disabled = true;" : ""}
      const r = await fetch(f.action, { method: "POST", body: new URLSearchParams(new FormData(f)), headers: { accept: "application/json" } });
      const j = await r.json(); s.textContent = j.error || "Thanks, we got your message."; ${site === "bad" ? "b.disabled = false;" : "(j.field ? f.elements[j.field] : s).focus();"} });</script></body></html>`;
  return http.createServer((req, res) => {
    const [, site, action] = req.url.split("?")[0].split("/");
    if (!["good", "bad", "quiet"].includes(site)) { res.writeHead(404).end(); return; }
    if (req.method === "GET") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page(site, req.url.includes("sent=1") ? "Thanks, we got your message." : "")); return; }
    if (action !== "send") { res.writeHead(404).end(); return; }
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      const form = new URLSearchParams(raw), json = (req.headers.accept ?? "").includes("json");
      const now = Date.now(), recent = (counts[site] = counts[site].filter((t) => now - t < 60000));
      const answer = (status, error, field) => {
        if (site === "bad" || json) res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(error ? { error, field } : { ok: true }));
        else if (error) res.writeHead(status, { "content-type": "text/html; charset=utf-8" }).end(page(site, error));
        // The quiet site saves the message and sends the person back to the same page, with nothing to say so (WEB-3).
        else res.writeHead(303, { location: site === "quiet" ? `/${site}` : `/${site}?sent=1` }).end();
      };
      // The bad site counts every attempt, rejected ones too, before it validates; the good one counts only what it accepts.
      if (site === "bad") { recent.push(now); if (recent.length > 3) return answer(429, "Too many messages"); }
      if (form.get("web")) return answer(400, "Spam.");
      if (!form.get("nombre")) return answer(400, "Write your name.", "nombre");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.get("correo") ?? "")) return answer(400, "Write a valid email.", "correo");
      if (site === "good") { if (recent.length >= 5) return answer(429, "Too many messages, try in a minute."); recent.push(now); }
      answer(200);
    });
  });
}

export async function selftest() {
  const bad = [];
  for (const [u, want] of [["http://localhost:3000", true], ["http://127.0.0.1:8080/x", true], ["http://[::1]:3000", true], ["http://shop.localhost", true], ["http://shop.test", true], ["https://example.com", false], ["http://localhost.example.com", false], ["http://10.0.0.5", false], ["not a url", false]])
    if (isLocal(u) !== want) bad.push(`isLocal(${u}) should be ${want}`);
  if (browserPath({ CHROME_PATH: "/x/chrome" }) !== "/x/chrome") bad.push("CHROME_PATH must win");
  if (browserPath({ ProgramFiles: "C:\\PF" }, "win32", (p) => p.endsWith("chrome.exe")) !== path.join("C:\\PF", "Google", "Chrome", "Application", "chrome.exe")) bad.push("on Windows it should find Chrome under Program Files");
  if (valueFor({ type: "text", name: "correo" }) !== EMAIL || valueFor({ type: "text", name: "nombre" }) !== NAME || !valueFor({ tag: "textarea", type: "textarea", name: "m" }).startsWith(NAME)) bad.push("valueFor should fill an email field by its name and a name with the check's name");
  const body = formBody({ hidden: [{ name: "csrf", value: "t1" }], fields: [{ name: "nombre", type: "text" }, { name: "ok", type: "checkbox", value: "si" }] }, { nombre: "" }).toString();
  if (body !== "csrf=t1&nombre=&ok=si") bad.push(`formBody: ${body}`);
  const server = testServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = mkdtempSync(path.join(os.tmpdir(), "ritual-web-check-out-"));
  try {
    const bin = browserPath();
    if (!bin) bad.push("no Edge or Chrome found: the browser checks can't be tried (set CHROME_PATH)");
    else {
      const verdicts = async (site) => Object.fromEntries((await check(`${base}/${site}`, { out: path.join(out, site), bin, burst: 12 })).results.filter(([, id]) => id !== "45").map(([mark, id, text]) => [`${id}${text.startsWith("rejected") ? " rejected" : ""}`, mark]));
      const good = await verdicts("good");
      const want = { "41": "✓", "49": "✓", "WEB-3": "✓", "WEB-4": "✓", "WEB-4 rejected": "✓", "WEB-2": "✓" };
      if (JSON.stringify(good) !== JSON.stringify(want)) bad.push(`the good site should pass every check: ${JSON.stringify(good)}`);
      const worse = await verdicts("bad");
      for (const id of ["41", "49", "WEB-3", "WEB-4"]) if (worse[id] !== "✕") bad.push(`the bad site should fail ${id}: ${JSON.stringify(worse)}`);
      const quiet = await verdicts("quiet");
      if (quiet["WEB-3"] !== "✕") bad.push(`a site that saves the message and shows the same page again should fail WEB-3: ${JSON.stringify(quiet)}`);
      if (!existsSync(path.join(out, "good", "phone.png")) || !existsSync(path.join(out, "good", "after-submit-without-javascript.png"))) bad.push("the screenshots should be saved");
    }
    // WEB-2 failing needs a site with no brake at all: the server checks alone, against a form that takes everything.
    const open = http.createServer((req, res) => { req.resume(); req.on("end", () => res.writeHead(303, { location: "/" }).end()); });
    await new Promise((r) => open.listen(0, "127.0.0.1", r));
    try {
      const form = { action: `http://127.0.0.1:${open.address().port}/send`, method: "post", fields: [{ name: "nombre", type: "text" }], hidden: [] };
      const r = Object.fromEntries([...(await limitCheck(form)).results, ...(await burstCheck(form, 10)).results].map(([mark, id]) => [id, mark]));
      if (r["WEB-2"] !== "✕" || r["45"] !== "✕") bad.push(`a site that takes everything should fail WEB-2 and 45: ${JSON.stringify(r)}`);
    } finally { open.close(); }
    try { await check("https://example.com", { out, bin: "x" }); bad.push("a site on the internet must be refused"); } catch (e) { if (!/not a local address/.test(e.message)) bad.push(`refusing a remote site: ${e.message}`); }
    // A browser that dies at once must say so, with what it printed, not wait out the timeout: on CI "did not start" said nothing.
    const t0 = Date.now();
    try { await check(`${base}/good`, { out, bin: process.execPath }); bad.push("a program that is not a browser must fail to start"); }
    catch (e) { if (!/did not start \(exited /.test(e.message) || !/bad option|--headless/.test(e.message) || Date.now() - t0 > 10000) bad.push(`a browser that exits at once should be reported as exited, with its output, quickly: ${e.message.slice(0, 200)}`); }
  } finally { server.close(); rmSync(out, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const bad = await selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ web check: a good site passes, a bad one fails 41, 49, WEB-3 and WEB-4, an open one WEB-2; remote sites refused");
    process.exit(bad ? 1 : 0);
  }
  const url = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--out");
  if (!url) { console.error("✕ usage: node scripts/web-check.mjs http://localhost:<port>[/page] [--out <folder>]"); process.exit(2); }
  const i = args.indexOf("--out");
  const out = path.resolve(i >= 0 ? args[i + 1] : existsSync(".ritual") ? path.join(".ritual", "local", "web-check") : mkdtempSync(path.join(os.tmpdir(), "ritual-web-check-")));
  try {
    const { results, shots, sent } = await check(url, { out });
    for (const [mark, id, text] of results) console.log(`${mark} ${id} · ${text}`);
    console.log(`\nScreenshots, to look at: ${shots.join(", ")}`);
    if (sent) console.log(`Sent ${sent} test submissions named "${NAME}" (${EMAIL}) to ${url}: delete them from the project's data.`);
    process.exit(results.some(([m]) => m === "✕") ? 1 : 0);
  } catch (e) { console.error(`✕ ${e.message}`); process.exit(2); }
}
