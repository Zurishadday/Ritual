#!/usr/bin/env node
// Bitácora de errores: anota en el momento, sin gastar tokens, lo que el ritual revisa después.
// - PostToolUseFailure (Bash): un comando que salió con error, con su código de salida y qué dijo.
// - UserPromptSubmit: una corrección del usuario («eso está mal», «hazlo de nuevo»). El hook ve la frase, no la
//   causa: la causa la escribe el ritual al revisar. El patrón se calibra con frases que deben y no deben disparar.
// Va a .ritual/local/bitacora.jsonl (fuera de git), una línea por anotación, con lo último que se tocó en la sesión.
// Uso: node hooks/bitacora.mjs --probar
import path from "node:path";
import { anotarLinea, carpetaRitual, leerEntrada, sesion } from "./comun.mjs";

// Precisión antes que cobertura: una frase que no se anota se pierde; una que se anota de más ensucia el ritual.
const CORRECCION = [
  /(?<!no )\b(está|esta|queda|salió|salio|quedó|quedo) mal\b/i, /\beso no (es|era)\b/i, /\bno (es|era) eso\b/i, /\bhazlo (de nuevo|otra vez)\b/i,
  /\bte equivocaste\b/i, /\b(sigue|siguen) (igual|roto|rota|fallando)\b/i, /\bno funciona\b/i, /\bno era lo que (pedí|pedi)\b/i, /\botra vez (lo mismo|mal)\b/i,
  /\b(that's|thats|this is|it's|its) (wrong|broken|not right)\b/i, /\b(redo|do it again|try again)\b/i, /\bnot what i asked\b/i,
  /\bstill (broken|failing|wrong|the same)\b/i, /\bdoesn't work\b/i, /\byou (broke|missed)\b/i, /\bwrong (file|answer|again)\b/i,
];

export function esCorreccion(prompt) {
  const p = String(prompt ?? "");
  return CORRECCION.some((r) => r.test(p));
}

const CASOS = [
  ["eso está mal, el total no cuadra", true], ["No, hazlo de nuevo", true], ["sigue igual", true], ["te equivocaste de archivo", true],
  ["that's wrong, the test still fails", true], ["redo the last step", true], ["still broken", true],
  ["no está mal, sigue así", false], ["¿qué es un test?", false], ["crea el componente de login", false], ["the design is not bad", false],
  ["explain how hooks work", false], ["está bien, continúa", false],
];

export function probar() {
  const malos = CASOS.filter(([f, esperado]) => esCorreccion(f) !== esperado);
  for (const [f, esperado] of malos) console.error(`✕ ${esperado ? "debía anotar" : "no debía anotar"}: ${f}`);
  return malos.length;
}

if (import.meta.main) {
  if (process.argv.includes("--probar")) {
    const malos = probar();
    console.log(malos ? `${malos} caso(s) mal` : `✓ ${CASOS.length} frases calibradas`);
    process.exit(malos ? 1 : 0);
  }
  const entrada = await leerEntrada();
  const ritual = carpetaRitual(entrada);
  if (!entrada || !ritual) process.exit(0);
  const { datos } = sesion(ritual, entrada.session_id);
  const bitacora = path.join(ritual, "local", "bitacora.jsonl");
  if (entrada.hook_event_name === "PostToolUseFailure") {
    // ponytail: anota todo exit≠0, incluido un grep sin resultados; el ritual lo filtra con juicio. Si ensucia, filtrar aquí por código y comando.
    const error = String(entrada.error ?? "");
    anotarLinea(bitacora, { tipo: "comando", sesion: entrada.session_id, comando: String(entrada.tool_input?.command ?? "").slice(0, 400), error: error.slice(0, 400) });
  } else if (entrada.hook_event_name === "UserPromptSubmit" && esCorreccion(entrada.prompt)) {
    anotarLinea(bitacora, { tipo: "correccion", sesion: entrada.session_id, frase: String(entrada.prompt).slice(0, 300), ultimo: datos.ultimo ?? null });
  }
}
