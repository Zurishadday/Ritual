// Renders HTML pages to PNG through Edge's DevTools protocol, with a transparent page background (so banner.png keeps
// its rounded corners). Windows, Edge installed. One Edge for many pages. A page may set `window.fits = false` when its
// text did not fit; render() returns those. Usage:
//   node assets/social/render.mjs file:///<repo>/assets/social/banner.html <repo>/assets/banner.png
//   node assets/social/render.mjs file:///<repo>/assets/social/social-preview.html <repo>/assets/social-preview.png
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMain } from "../../hooks/common.mjs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @param {{url: string, out: string}[]} jobs @returns {Promise<string[]>} the outputs whose page said it did not fit */
export async function render(jobs, { width = 1280, height = 640, port = 9333 } = {}) {
  const profile = mkdtempSync(path.join(os.tmpdir(), "edge-cdp-"));
  const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  const overflow = [];
  try {
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
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    await send("Page.enable");
    for (const { url, out } of jobs) {
      await send("Page.navigate", { url });
      await sleep(900);
      const fits = await send("Runtime.evaluate", { expression: "window.fits !== false", returnByValue: true });
      if (fits.result?.result?.value === false) overflow.push(out);
      const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
      writeFileSync(out, Buffer.from(shot.result.data, "base64"));
    }
    ws.close();
  } finally {
    edge.kill();
    await sleep(500);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Edge may still hold it */ }
  }
  return overflow;
}

if (isMain(import.meta.url)) {
  const [url, out] = process.argv.slice(2);
  await render([{ url, out }]);
  console.log(`wrote ${out}`);
}
