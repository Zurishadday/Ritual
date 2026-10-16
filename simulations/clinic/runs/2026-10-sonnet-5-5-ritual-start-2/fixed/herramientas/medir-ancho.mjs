// Abre ancho.html en Chrome sin pantalla a 375 px y comprueba que nada desborda. Uso: node herramientas/medir-ancho.mjs
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pagina = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ancho.html');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const salida = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--window-size=375,800', '--virtual-time-budget=2000', '--dump-dom', pathToFileURL(pagina).href], { encoding: 'utf8' });
const m = /RESULT sw=(\d+) iw=(\d+)/.exec(salida);
console.log(m ? m[0] : 'sin resultado');
process.exit(m && Number(m[1]) <= Number(m[2]) ? 0 : 1);
