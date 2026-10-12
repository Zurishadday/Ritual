#!/usr/bin/env node
// Guardia de la consola: hook PreToolUse para Bash que bloquea los comandos que este proyecto ya vio fallar, y dice
// qué usar en su lugar. Una regla que hay que recordar se olvida en una sesión larga; esta la revisa sola.
// Revisa solo el comando: el cuerpo de un heredoc (el mensaje de un commit) no cuenta, ni el código entre comillas
// de otro comando de la misma línea. Cada bloqueo queda en .ritual/local/guardia.jsonl, para que el ritual vea con
// datos si fue con razón. Una falsa alarma se agrega como caso que debe dejar pasar.
// Configuración por proyecto en .ritual/guardia.json: { "integradas": [...nombres], "reglas": [{ nombre, patron,
// mensaje, bloquea: [...], deja: [...] }] }. Una regla sin casos es un error: --probar la rechaza.
// Uso: node hooks/guardia.mjs --probar [proyecto]    calibra cada regla sola, con sus casos
//      node hooks/guardia.mjs --bitacora [proyecto]  resume los bloqueos, para el ritual
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { anotarLinea, carpetaRitual, leerEntrada, leerJson } from "./comun.mjs";

const CODIGO = /\.(ts|tsx|js|mjs|cjs|py|mdx|css|json)\b/;

// El cuerpo de un heredoc es contenido, no un comando: se quita antes de buscar.
export function sinHeredocs(c) {
  return c.replace(/<<-?\s*(['"]?)([A-Za-z_]+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, "<<heredoc");
}

// Reglas integradas: las que no se pueden escribir como un patrón, porque miran solo una parte del comando.
export const INTEGRADAS = {
  "python-c": {
    revisar: (c) => (/(^|[\s;&|(])(python3?|py)(\s+-[A-Za-z]+)*?\s+-[A-Za-z]*c\b/.test(c)
      ? "Don't use `python -c`: this console mangles code on the way. Write the script to a file with Write and run `python -I <file>`." : null),
    bloquea: ['python -c "print(1)"', "python -I -c 'import sys'", "cd x && python3 -c 'print(2)'", "py -c 'print(3)'"],
    deja: ["python -I scripts/logo.py", "python --version", "grep -c 'python -c' CLAUDE.md", "git commit -F - <<'EOF'\nThe guard blocks python -c and sed -i on code.\nEOF"],
  },
  "python-sin-archivo": {
    revisar: (c) => (/(^|[\s;&|(])(python3?|py)(\s+-I)?\s+-(\s|$)/.test(c)
      ? "`python -` with no file leaves the console waiting. Write the script with Write and run `python -I <file>`." : null),
    bloquea: ["python - <<'EOF'\nprint(1)\nEOF"],
    deja: ["python --version", "python -I x.py"],
  },
  "node-e-diagonales": {
    // Solo cuenta el código de `node -e` (el texto entre sus comillas): un `grep "\s"` después no es suyo.
    revisar: (c) => {
      const m = c.match(/(^|[\s;&|(])node\s+(-e|--eval|-p|--print)\s+(["'])/);
      if (!m) return null;
      const desde = m.index + m[0].length;
      const hasta = c.indexOf(m[3], desde);
      return c.slice(desde, hasta < 0 ? undefined : hasta).includes("\\")
        ? "`node -e` with backslashes breaks in this console. Write the script to a file with Write and run `node <file>`." : null;
    },
    bloquea: ['node -e "console.log(\'a\\nb\')"'],
    deja: ["node scripts/recorrer.mjs", "node -e \"console.log(require('fs').existsSync('x'))\"", "node -e \"JSON.parse(require('fs').readFileSync('a.json','utf8'))\" && grep -E \"^\\s+[0-9]+\" salida.txt"],
  },
  "heredoc-diagonales": {
    // Solo cuenta el cuerpo del heredoc, hasta la línea que lo cierra. Mira el comando completo, no el recortado.
    revisar: (_c, completo) => {
      const h = completo.match(/<<-?\s*(['"]?)([A-Za-z_]+)\1/);
      if (!h) return null;
      const inicio = completo.indexOf("\n", h.index);
      const cierre = inicio < 0 ? -1 : completo.slice(inicio).search(new RegExp(`\\n\\s*${h[2]}\\s*(\\n|$)`));
      const cuerpo = inicio < 0 ? "" : completo.slice(inicio, cierre < 0 ? undefined : inicio + cierre);
      return cuerpo.includes("\\") ? "A heredoc with backslashes gets changed on the way. Write the file with Write (or Edit) instead." : null;
    },
    bloquea: ["cat > a.mjs <<'EOF'\nconst r = /\\d+/;\nEOF"],
    deja: ["git commit -q -F - <<'EOF'\nStep 6: tables\n\nCo-Authored-By: Claude\nEOF", "git commit -F - <<'EOF'\nStep 7\nEOF\ngrep -E \"^\\s+ok\" salida.txt"],
  },
  "sed-i-codigo": {
    // Solo cuenta el archivo de este `sed -i`, hasta el siguiente && ; o |.
    revisar: (c) => {
      const s = c.match(/(^|[\s;&|(])sed\s+((-[A-Za-z]*i[A-Za-z]*|--in-place)\S*)\s+([^;&|]*)/);
      return s && CODIGO.test(s[4]) ? "`sed -i` on code edits every line if the address ends up empty, and turns \\\\n into newlines. Use Edit or a script of exact replacements." : null;
    },
    bloquea: ["sed -i 's/a/b/' src/components/Quiz.tsx", "sed -i.bak 's/x/y/' scripts/datos.py"],
    deja: ["sed -n 1,20p src/app/globals.css", "sed -i 's/viejo/nuevo/' docs/avance.md", "sed -i 's/a/b/' docs/avance.md && node scripts/x.mjs"],
  },
};

export const POR_DEFECTO = { integradas: Object.keys(INTEGRADAS), reglas: [] };

export function leerConfig(dir) {
  return dir ? leerJson(path.join(dir, "guardia.json"), POR_DEFECTO) : POR_DEFECTO;
}

/** Todas las reglas activas, con la misma forma. */
export function reglasDe(config) {
  const activas = (config.integradas ?? []).filter((n) => INTEGRADAS[n]).map((n) => ({ nombre: n, ...INTEGRADAS[n] }));
  const propias = (config.reglas ?? []).map((r) => ({ ...r, revisar: (c) => (new RegExp(r.patron, "u").test(c) ? r.mensaje : null) }));
  return [...activas, ...propias];
}

/** @returns {{nombre: string, mensaje: string} | null} */
export function revisar(comando, config = POR_DEFECTO) {
  const completo = String(comando ?? "");
  const c = sinHeredocs(completo);
  for (const r of reglasDe(config)) {
    const mensaje = r.revisar(c, completo);
    if (mensaje) return { nombre: r.nombre, mensaje };
  }
  return null;
}

/** Calibra cada regla sola (si otra atrapa el error antes, la tuya nunca se probó) y los casos que deben pasar contra todas. */
export function probar(config = POR_DEFECTO) {
  const malos = [];
  const reglas = reglasDe(config);
  for (const r of reglas) {
    if (!r.bloquea?.length || !r.deja?.length) { malos.push(`${r.nombre}: una regla sin un caso que bloquea y otro que deja pasar es un error`); continue; }
    for (const c of r.bloquea) if (!r.revisar(sinHeredocs(c), c)) malos.push(`${r.nombre} debía bloquear: ${c.replace(/\n/g, "⏎")}`);
    for (const c of r.deja) { const x = revisar(c, config); if (x) malos.push(`${x.nombre} no debía bloquear: ${c.replace(/\n/g, "⏎")}`); }
  }
  for (const m of malos) console.error(`✕ ${m}`);
  return { malos: malos.length, reglas: reglas.length };
}

if (import.meta.main) {
  const proyecto = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const dir = proyecto ? path.join(path.resolve(proyecto), ".ritual") : carpetaRitual(null);
  const config = leerConfig(dir && existsSync(dir) ? dir : null);
  if (process.argv.includes("--probar")) {
    const { malos, reglas } = probar(config);
    console.log(malos ? `${malos} caso(s) mal` : `✓ ${reglas} regla(s) calibradas`);
    process.exit(malos ? 1 : 0);
  }
  if (process.argv.includes("--bitacora")) {
    const ruta = dir && path.join(dir, "local", "guardia.jsonl");
    const lineas = ruta && existsSync(ruta) ? readFileSync(ruta, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    if (!lineas.length) { console.log("Sin bloqueos anotados."); process.exit(0); }
    const porRegla = {};
    for (const l of lineas) (porRegla[l.regla] ??= []).push(l);
    console.log(`${lineas.length} bloqueo(s), del ${lineas[0].fecha.slice(0, 10)} al ${lineas.at(-1).fecha.slice(0, 10)}:`);
    for (const [r, ls] of Object.entries(porRegla)) {
      console.log(`\n${ls.length} · ${r}`);
      for (const l of ls.slice(-5)) console.log(`   ${l.fecha.slice(0, 16)}  ${l.comando.replace(/\n/g, "⏎").slice(0, 140)}`);
    }
    process.exit(0);
  }
  const entrada = await leerEntrada();
  const ritual = carpetaRitual(entrada);
  if (!entrada || !ritual) process.exit(0);
  const x = revisar(entrada.tool_input?.command, leerConfig(ritual));
  if (x) {
    anotarLinea(path.join(ritual, "local", "guardia.jsonl"), { regla: x.nombre, comando: String(entrada.tool_input?.command ?? "").slice(0, 400) });
    console.error(`Ritual guard (${x.nombre}): ${x.mensaje}`);
    process.exit(2);
  }
}
