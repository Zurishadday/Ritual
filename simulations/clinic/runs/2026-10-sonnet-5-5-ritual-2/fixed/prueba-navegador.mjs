// Prueba en Chrome/Edge real (si está instalado): con JavaScript desactivado, envía el formulario con errores y
// comprueba lo que ve la persona: que lo escrito siga ahí, que no haya violaciones de CSP, y la portada a 375 px.
// Usa un servidor propio con datos temporales. Uso: node prueba-navegador.mjs
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { arrancar, verificador } from './ayuda-prueba.mjs';
const { ok, fin } = verificador();
const exe = [process.env.NAVEGADOR, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && existsSync(p));
if (!exe) { console.log('No encontré Chrome/Edge: define NAVEGADOR con su ruta.'); process.exit(0); }

const srv = await arrancar();
const perfil = await mkdtemp(path.join(tmpdir(), 'fisio-nav-'));
const nav = spawn(exe, ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${perfil}`, '--no-first-run', '--window-size=375,800', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  await new Promise((r) => setTimeout(r, 200));
  try { const t = await (await fetch('http://127.0.0.1:9333/json')).json(); ws = t.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch { /* aún no */ }
}
const sock = new WebSocket(ws);
await new Promise((r) => (sock.onopen = r));
let n = 0; const esperando = new Map(); const avisos = [];
sock.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && esperando.has(d.id)) { esperando.get(d.id)(d.result ?? d.error); esperando.delete(d.id); }
  if (d.method === 'Log.entryAdded') avisos.push(d.params.entry.text);
  if (d.method === 'Runtime.consoleAPICalled' || d.method === 'Runtime.exceptionThrown') avisos.push(JSON.stringify(d.params).slice(0, 200));
};
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; esperando.set(id, r); sock.send(JSON.stringify({ id, method, params })); });
const evalua = async (js) => (await cdp('Runtime.evaluate', { expression: js, returnByValue: true, awaitPromise: true })).result?.value;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
await cdp('Log.enable'); await cdp('Runtime.enable'); await cdp('Page.enable');

// 1) Portada a 375 px: contraste del texto sobre lo que realmente se ve (se dibuja la página y se lee el pixel de fondo)
await cdp('Emulation.setDeviceMetricsOverride', { width: 375, height: 800, deviceScaleFactor: 1, mobile: true });
await cdp('Page.navigate', { url: srv.base + '/' }); await espera(1000);
const caja = await evalua(`(()=>{const t=document.querySelector('.portada-texto');const r=t.getBoundingClientRect();const img=document.querySelector('.portada img').getBoundingClientRect();return {textoArriba:r.top,imgAbajo:img.bottom,fondo:getComputedStyle(t).backgroundColor,color:getComputedStyle(document.querySelector('.portada p')).color,desborda:document.documentElement.scrollWidth>innerWidth}})()`);
const lum = (c) => { const v = c.match(/[\d.]+/g).slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const [a, b] = [lum(caja.color), lum(caja.fondo)]; const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
ok(caja.textoArriba >= caja.imgAbajo - 1, `a 375 px el texto de la portada va debajo de la foto, no encima (${Math.round(caja.textoArriba)} ≥ ${Math.round(caja.imgAbajo)})`);
ok(cr >= 4.5, `contraste del texto de la portada ${cr.toFixed(1)}:1 (mínimo 4.5)`);
ok(!caja.desborda, 'la página no se desborda horizontalmente a 375 px');

// 2) Sin JavaScript: enviar con errores y revisar la página que ve la persona
await cdp('Emulation.setScriptExecutionDisabled', { value: true });
await cdp('Page.navigate', { url: srv.base + '/' }); await espera(800);
await evalua(`(()=>{const f=document.getElementById('form-cita');const s=(i,v)=>document.getElementById(i).value=v;s('nombre','Ana Prueba');s('telefono','33 2222 3333');s('correo','mal');s('tratamiento','masaje');s('hora','12:00');s('comentario','me duele la espalda');s('fecha','2030-01-05');f.requestSubmit()})()`);
await espera(1500);
const pag = await evalua(`({url:location.href,h1:document.querySelector('h1')?.textContent,nombre:document.getElementById('nombre')?.value,comentario:document.getElementById('comentario')?.value,correo:document.getElementById('correo')?.value,trat:document.getElementById('tratamiento')?.value,errCorreo:document.getElementById('error-correo')?.textContent,errFecha:document.getElementById('error-fecha')?.textContent})`);
ok(pag.h1 === 'No pudimos guardar tu solicitud' && pag.nombre === 'Ana Prueba' && pag.comentario === 'me duele la espalda' && pag.correo === 'mal' && pag.trat === 'masaje', 'sin JS: la página de error sigue mostrando lo que se escribió');
ok(!!pag.errCorreo && !!pag.errFecha, `sin JS: avisos junto a los campos malos (${pag.errCorreo} / ${pag.errFecha})`);
ok(!avisos.some((x) => /Content Security Policy|violates/i.test(x)), `sin JS: Chrome no registró violaciones de CSP (${avisos.length} mensajes)`);
// corregir y reenviar desde esa misma página
await evalua(`(()=>{document.getElementById('correo').value='ana@correo.com';document.getElementById('fecha').value='${new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)}';})()`);
const dow = await evalua(`new Date(document.getElementById('fecha').value+'T12:00').getDay()`);
if (dow === 0 || dow === 6) await evalua(`(()=>{const d=new Date(document.getElementById('fecha').value+'T12:00');d.setDate(d.getDate()+(dow=${dow}===0?1:2));document.getElementById('fecha').value=d.toISOString().slice(0,10)})()`);
await evalua(`document.querySelector('form').requestSubmit()`); await espera(1500);
ok(/gracias\.html$/.test(await evalua('location.pathname')), 'sin JS: corregir y reenviar desde la página de error lleva a «Solicitud recibida»');

nav.kill(); await espera(500); await rm(perfil, { recursive: true, force: true }).catch(() => {}); await srv.parar();
fin();
