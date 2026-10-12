// Renders assets/social/*.html to PNG at 1280x640 through Edge's DevTools protocol, with a transparent page background
// (so banner.png keeps its rounded corners). Windows, Edge installed. Usage:
//   node assets/social/render.mjs file:///<repo>/assets/social/banner.html <repo>/assets/banner.png
//   node assets/social/render.mjs file:///<repo>/assets/social/social-preview.html <repo>/assets/social-preview.png
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const [url, out] = process.argv.slice(2);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const profile = mkdtempSync(path.join(os.tmpdir(), "edge-cdp-"));
const port = 9333;
const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* not up yet */ }
}
if (!target) throw new Error("Edge did not start");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 640, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
await send("Page.enable");
await send("Page.navigate", { url });
await sleep(1500);
const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1280, height: 640, scale: 1 } });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
ws.close();
edge.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* Edge may still hold it */ }
console.log(`wrote ${out}`);
