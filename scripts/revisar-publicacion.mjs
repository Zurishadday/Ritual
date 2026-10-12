#!/usr/bin/env node
// Revisa que nada de lo que git va a subir nombre el proyecto de origen.
// La lista de palabras vive fuera de git (fuentes/no-publicar/prohibidas.txt, una por línea, # comenta): si viviera
// aquí, publicaríamos justo lo que queremos esconder. Sin lista no hay revisión: falla en voz alta, no da por limpio.
// Busca sin distinguir mayúsculas y al inicio de palabra (así «gato» encuentra «gatos»), y antes quita las palabras
// permitidas (el autor), para que un apodo no se encuentre dentro del nombre completo.
// Uso: node scripts/revisar-publicacion.mjs           revisa lo que git subiría (lo rastreado y lo nuevo no ignorado)
//      node scripts/revisar-publicacion.mjs --probar  calibra: un caso que debe fallar y otro que debe pasar
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const LISTA = path.join(RAIZ, "fuentes", "no-publicar", "prohibidas.txt");
const PERMITIDAS = ["Zurishadday"];
const MAXIMO = 2 * 1024 * 1024; // los archivos más grandes no son texto que se lea

export function leerLista(archivo = LISTA) {
  if (!existsSync(archivo)) throw new Error(`No existe la lista ${archivo}. Sin lista no hay revisión.`);
  const palabras = readFileSync(archivo, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!palabras.length) throw new Error(`La lista ${archivo} está vacía.`);
  return palabras;
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** @returns {{linea: number, palabra: string, texto: string}[]} */
export function buscar(texto, palabras) {
  const limpio = PERMITIDAS.reduce((t, p) => t.replace(new RegExp(escapar(p), "gi"), ""), texto);
  const patron = new RegExp(`(?<![\\p{L}\\p{N}])(${palabras.map(escapar).join("|")})`, "giu");
  const hallazgos = [];
  limpio.split("\n").forEach((l, i) => {
    for (const m of l.matchAll(patron)) hallazgos.push({ linea: i + 1, palabra: m[1], texto: l.trim().slice(0, 120) });
  });
  return hallazgos;
}

export function probar(palabras) {
  const falla = palabras.flatMap((p) => [`Hola ${p}.`, p.toUpperCase(), `${p.toLowerCase()}s en plural`]).join("\n");
  const pasa = [
    "Copyright (c) 2026 Zurishadday",
    "Texto normal sin nada que esconder.",
    ...PERMITIDAS.map((p) => `El autor es ${p.toLowerCase()} y ${p.toUpperCase()}.`),
  ].join("\n");
  const malos = [];
  const encontradas = new Set(buscar(falla, palabras).map((h) => h.palabra.toLowerCase()));
  for (const p of palabras) if (!encontradas.has(p.toLowerCase())) malos.push(`debía encontrar «${p}» y no lo encontró`);
  for (const h of buscar(pasa, palabras)) malos.push(`no debía encontrar «${h.palabra}» en: ${h.texto}`);
  for (const m of malos) console.error(`✕ ${m}`);
  return malos.length;
}

if (import.meta.main) {
  const palabras = leerLista();
  if (process.argv.includes("--probar")) {
    const malos = probar(palabras);
    console.log(malos ? `${malos} caso(s) mal` : `✓ calibrado: encuentra las ${palabras.length} palabras y deja pasar al autor`);
    process.exit(malos ? 1 : 0);
  }
  const archivos = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: RAIZ, encoding: "utf8" })
    .split("\n").filter(Boolean);
  let total = 0;
  for (const a of archivos) {
    const ruta = path.join(RAIZ, a);
    if (!existsSync(ruta) || statSync(ruta).size > MAXIMO) continue;
    for (const h of buscar(readFileSync(ruta, "utf8"), palabras)) {
      console.log(`${a}:${h.linea}  «${h.palabra}»  ${h.texto}`);
      total++;
    }
  }
  console.log(total ? `✕ ${total} mención(es) de lo que nunca se publica. No subas nada.` : `✓ ${archivos.length} archivo(s) limpios`);
  process.exit(total ? 1 : 0);
}
