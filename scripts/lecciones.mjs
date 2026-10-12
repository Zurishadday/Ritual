#!/usr/bin/env node
// Lee, verifica e indexa las lecciones de lecciones/<idioma>/<grupo>.md.
// Una lección es un bloque `### <id>. <título>` con cinco partes en negritas (en español: La idea, Ejemplo, Pregunta
// detectora, Señal de alarma, Qué hacer) y, solo en el original en español, una línea de datos entre acentos graves:
// `origen: campo` (o `laboratorio · modelo · AAAA-MM`, o `propuesta` con `fuente: ...`), y opcionalmente
// `grupos: otro-grupo` y `paquetes: web`. Los ids del núcleo son números del 1 en adelante, sin huecos; los de un
// paquete llevan prefijo (WEB-1). Nunca se renumeran ni se borran: la que sobra dice solo «Fusionada en la N.».
// El índice (README.md de cada idioma) se genera desde los archivos: no se edita a mano.
// Uso: node scripts/lecciones.mjs --verificar   revisa todos los idiomas y que cada índice esté al día
//      node scripts/lecciones.mjs --indice      vuelve a generar los índices
//      node scripts/lecciones.mjs --probar      calibra el verificador: casos que deben fallar y uno que debe pasar
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const RAIZ = path.resolve(import.meta.dirname, "..");
export const ORIGINAL = "es";
export const ORIGENES = ["campo", "laboratorio", "propuesta"];
// Orden fijo de los grupos del núcleo en el índice; los paquetes van después, por nombre.
export const GRUPOS = ["escribir-y-documentar", "cifras-y-datos", "practicas-y-pruebas", "scripts-y-archivos", "interfaz-y-diseno", "consola-y-herramientas", "git-y-proceso"];
export const PARTES = {
  es: ["La idea", "Ejemplo", "Pregunta detectora", "Señal de alarma", "Qué hacer"],
  en: ["The idea", "Example", "Detector question", "Warning sign", "What to do"],
};
const FUSIONADA = /^Fusionada en la (\S+?)\.?$/m;
const REFERENCIA = /\b(?:ver(?: también)? la|lecci[oó]n) (\d+)\b/gi;

/** Lee un archivo de grupo y devuelve sus lecciones. */
export function leerArchivo(ruta, grupo) {
  const texto = readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");
  const titulo = texto.match(/^# (.+)$/m)?.[1] ?? null;
  const lecciones = [];
  const bloques = texto.split(/^(?=### )/m);
  let linea = 1;
  for (const bloque of bloques) {
    const cabeza = bloque.match(/^### (\S+)\. (.+)$/m);
    if (cabeza) {
      const cuerpo = bloque.slice(cabeza[0].length);
      const datos = {};
      for (const m of cuerpo.matchAll(/`(\w+): ([^`]+)`/g)) datos[m[1]] = m[2].trim();
      const partes = {};
      let actual = null;
      for (const l of cuerpo.split("\n")) {
        const p = l.match(/^\*\*(.+?)\.\*\*\s*(.*)$/);
        if (p) { actual = p[1]; partes[actual] = p[2]; }
        else if (actual && !/^`\w+: /.test(l)) partes[actual] += "\n" + l;
      }
      for (const k in partes) partes[k] = partes[k].trim();
      lecciones.push({ id: cabeza[1], titulo: cabeza[2].trim(), grupo, datos, partes, fusionada: cuerpo.match(FUSIONADA)?.[1] ?? null, texto: cuerpo, linea });
    }
    linea += bloque.split("\n").length - 1;
  }
  return { titulo, lecciones };
}

/** Todas las lecciones de un idioma, con el nombre de cada grupo. @returns {{grupos: Record<string,string>, lecciones: object[]}} */
export function leer(idioma = ORIGINAL, raiz = RAIZ) {
  const dir = path.join(raiz, "lecciones", idioma);
  const grupos = {};
  const lecciones = [];
  for (const archivo of readdirSync(dir).filter((a) => a.endsWith(".md") && a !== "README.md").sort()) {
    const grupo = archivo.slice(0, -3);
    const { titulo, lecciones: ls } = leerArchivo(path.join(dir, archivo), grupo);
    grupos[grupo] = titulo;
    lecciones.push(...ls.map((l) => ({ ...l, archivo: path.join("lecciones", idioma, archivo) })));
  }
  return { grupos, lecciones };
}

function leerConfigIdioma(proyecto) {
  try { return JSON.parse(readFileSync(path.join(proyecto, ".ritual", "config.json"), "utf8")).idioma ?? ORIGINAL; } catch { return ORIGINAL; }
}

const idiomasDe = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

const ordenGrupo = (g) => (GRUPOS.includes(g) ? String(GRUPOS.indexOf(g)).padStart(2, "0") : "9" + g);
const ordenId = (id) => (/^\d+$/.test(id) ? Number(id) : id);

export function generarIndice(idioma, raiz = RAIZ) {
  const { grupos, lecciones } = leer(idioma, raiz);
  const lineas = [idioma === "es" ? "# Índice de lecciones" : "# Index of lessons", "", "<!-- Generado por scripts/lecciones.mjs --indice: no editar a mano. -->", ""];
  for (const g of Object.keys(grupos).sort((a, b) => ordenGrupo(a).localeCompare(ordenGrupo(b)))) {
    lineas.push(`## ${grupos[g] ?? g}`, "");
    for (const l of lecciones.filter((l) => l.grupo === g).sort((a, b) => (ordenId(a.id) > ordenId(b.id) ? 1 : -1)))
      lineas.push(`- **${l.id}.** [${l.titulo}](${g}.md#${l.id.toLowerCase()}-${slug(l.titulo)})${l.fusionada ? ` (fusionada en la ${l.fusionada})` : ""}`);
    lineas.push("");
  }
  return lineas.join("\n");
}

const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** @returns {{archivo: string, linea: number, mensaje: string}[]} */
export function verificar(raiz = RAIZ) {
  const hallazgos = [];
  const dir = path.join(raiz, "lecciones");
  const idiomas = idiomasDe(dir);
  if (!idiomas.includes(ORIGINAL)) return [{ archivo: "lecciones", linea: 0, mensaje: `falta el original lecciones/${ORIGINAL}/` }];
  const original = leer(ORIGINAL, raiz);
  const idsOriginal = new Set(original.lecciones.map((l) => l.id));

  for (const idioma of idiomas) {
    const partes = PARTES[idioma];
    if (!partes) { hallazgos.push({ archivo: `lecciones/${idioma}`, linea: 0, mensaje: `no sé los nombres de las cinco partes en «${idioma}»: agrégalos a PARTES` }); continue; }
    const { grupos, lecciones } = idioma === ORIGINAL ? original : leer(idioma, raiz);
    const mal = (l, mensaje) => hallazgos.push({ archivo: l.archivo, linea: l.linea, mensaje: `${l.id}: ${mensaje}` });
    for (const [g, titulo] of Object.entries(grupos)) if (!titulo) hallazgos.push({ archivo: `lecciones/${idioma}/${g}.md`, linea: 1, mensaje: "el archivo no tiene título (# ...)" });

    const vistos = new Map();
    for (const l of lecciones) {
      if (!/^(\d+|[A-Z]+-\d+)$/.test(l.id)) mal(l, "el id debe ser un número (núcleo) o PREFIJO-número (paquete)");
      if (vistos.has(l.id)) mal(l, `id repetido, ya está en ${vistos.get(l.id)}`);
      vistos.set(l.id, l.archivo);
      if (l.fusionada) {
        if (!idsOriginal.has(l.fusionada)) mal(l, `dice fusionada en la ${l.fusionada}, que no existe`);
        if (Object.keys(l.partes).length) mal(l, "una lección fusionada no lleva partes, solo «Fusionada en la N.»");
        continue;
      }
      for (const p of partes) if (!l.partes[p]) mal(l, `falta la parte «${p}»`);
      if (idioma === ORIGINAL) {
        const [origen, modelo, fecha] = (l.datos.origen ?? "").split("·").map((s) => s.trim());
        if (!ORIGENES.includes(origen)) mal(l, `origen «${l.datos.origen ?? ""}» no es uno de: ${ORIGENES.join(", ")}`);
        if (origen === "laboratorio" && !(modelo && /^\d{4}-\d{2}$/.test(fecha ?? ""))) mal(l, "una lección de laboratorio dice modelo y fecha: `origen: laboratorio · sonnet · 2026-10`");
        if (origen === "propuesta" && !l.datos.fuente) mal(l, "una propuesta lleva `fuente: ...`");
        for (const g of (l.datos.grupos ?? "").split(",").map((s) => s.trim()).filter(Boolean)) if (!(g in grupos)) mal(l, `grupo «${g}» no existe`);
        for (const m of `${l.titulo}\n${l.texto}`.matchAll(REFERENCIA)) if (!idsOriginal.has(m[1])) mal(l, `cita la ${m[1]}, que no existe`);
      } else if (!idsOriginal.has(l.id)) mal(l, `no existe en el original (${ORIGINAL})`);
    }
    if (idioma === ORIGINAL) {
      const numeros = lecciones.map((l) => Number(l.id)).filter(Number.isInteger).sort((a, b) => a - b);
      for (let n = 1; n <= (numeros.at(-1) ?? 0); n++) if (!numeros.includes(n)) hallazgos.push({ archivo: `lecciones/${idioma}`, linea: 0, mensaje: `falta la lección ${n}: los números no tienen huecos` });
    } else {
      for (const id of idsOriginal) if (!vistos.has(id)) hallazgos.push({ archivo: `lecciones/${idioma}`, linea: 0, mensaje: `falta traducir la ${id}` });
    }
    const indice = path.join(dir, idioma, "README.md");
    const actual = existsSync(indice) ? readFileSync(indice, "utf8").replace(/\r\n/g, "\n") : "";
    if (actual.trim() !== generarIndice(idioma, raiz).trim()) hallazgos.push({ archivo: `lecciones/${idioma}/README.md`, linea: 0, mensaje: "el índice no está al día: corre `node scripts/lecciones.mjs --indice`" });
  }
  return hallazgos;
}

/** Las lecciones propias de un proyecto (.ritual/lecciones/<grupo>.md): mismo formato, ids con prefijo, sin índice. */
export function verificarProyecto(proyecto, idioma = ORIGINAL) {
  const hallazgos = [];
  const dir = path.join(proyecto, ".ritual", "lecciones");
  if (!existsSync(dir)) return [{ archivo: ".ritual/lecciones", linea: 0, mensaje: "no existe: corre /ritual para arrancar" }];
  const partes = PARTES[idioma] ?? PARTES[ORIGINAL];
  const vistos = new Set();
  for (const archivo of readdirSync(dir).filter((a) => a.endsWith(".md")).sort()) {
    const grupo = archivo.slice(0, -3);
    const rel = `.ritual/lecciones/${archivo}`;
    if (!GRUPOS.includes(grupo)) { hallazgos.push({ archivo: rel, linea: 1, mensaje: `el archivo debe llamarse como un grupo: ${GRUPOS.join(", ")}` }); continue; }
    for (const l of leerArchivo(path.join(dir, archivo), grupo).lecciones) {
      const mal = (m) => hallazgos.push({ archivo: rel, linea: l.linea, mensaje: `${l.id}: ${m}` });
      if (!/^[A-Z]+-\d+$/.test(l.id)) mal("una lección propia lleva prefijo y número (P-1)");
      if (vistos.has(l.id)) mal("id repetido");
      vistos.add(l.id);
      if (l.fusionada) continue;
      for (const p of partes) if (!l.partes[p]) mal(`falta la parte «${p}»`);
      const origen = (l.datos.origen ?? "").split("·")[0].trim();
      if (!ORIGENES.includes(origen)) mal(`origen «${l.datos.origen ?? ""}» no es uno de: ${ORIGENES.join(", ")}`);
      for (const g of (l.datos.grupos ?? "").split(",").map((s) => s.trim()).filter(Boolean)) if (!GRUPOS.includes(g)) mal(`grupo «${g}» no existe`);
    }
  }
  return hallazgos;
}

// Calibración: un caso que debe pasar y, a partir de él, casos que deben fallar con un mensaje concreto.
const LECCION = (id, titulo, extra = "`origen: campo`") => `### ${id}. ${titulo}\n\n${extra}\n\n**La idea.** Algo.\n\n**Ejemplo.** Pasó esto.\n\n**Pregunta detectora.** ¿Y si no?\n\n**Señal de alarma.** «Seguro».\n\n**Qué hacer.** Medir.\n`;
const BASE = {
  "cifras-y-datos.md": `# Cifras y datos\n\n${LECCION(1, "Uno")}\n${LECCION(2, "Dos (ver la 1)", "`origen: campo` · `grupos: git-y-proceso` · `paquetes: web`")}`,
  "git-y-proceso.md": `# Git y proceso\n\n### 3. Tres\n\nFusionada en la 1.\n\n${LECCION("WEB-1", "Uno de web", "`origen: propuesta` · `fuente: https://example.org`")}\n${LECCION(4, "Cuatro", "`origen: laboratorio · sonnet · 2026-10`")}`,
};
const CASOS = [
  ["sin la señal de alarma", (f) => ({ ...f, "cifras-y-datos.md": f["cifras-y-datos.md"].replace("**Señal de alarma.** «Seguro».\n", "") }), "falta la parte «Señal de alarma»"],
  ["id repetido", (f) => ({ ...f, "git-y-proceso.md": f["git-y-proceso.md"] + "\n" + LECCION(1, "Otra uno") }), "id repetido"],
  ["hueco en los números", (f) => ({ ...f, "git-y-proceso.md": f["git-y-proceso.md"].replace("### 4. ", "### 6. ") }), "falta la lección 4"],
  ["cita una que no existe", (f) => ({ ...f, "cifras-y-datos.md": f["cifras-y-datos.md"].replace("(ver la 1)", "(ver la 9)") }), "cita la 9"],
  ["origen inventado", (f) => ({ ...f, "cifras-y-datos.md": f["cifras-y-datos.md"].replace("`origen: campo`\n", "`origen: rumor`\n") }), "origen «rumor»"],
  ["laboratorio sin fecha", (f) => ({ ...f, "git-y-proceso.md": f["git-y-proceso.md"].replace(" · sonnet · 2026-10", "") }), "modelo y fecha"],
  ["propuesta sin fuente", (f) => ({ ...f, "git-y-proceso.md": f["git-y-proceso.md"].replace(" · `fuente: https://example.org`", "") }), "lleva `fuente"],
  ["grupo que no existe", (f) => ({ ...f, "cifras-y-datos.md": f["cifras-y-datos.md"].replace("grupos: git-y-proceso", "grupos: cocina") }), "grupo «cocina» no existe"],
  ["fusionada en una que no existe", (f) => ({ ...f, "git-y-proceso.md": f["git-y-proceso.md"].replace("Fusionada en la 1.", "Fusionada en la 8.") }), "fusionada en la 8"],
  ["índice desfasado", (f) => ({ ...f, "README.md": "# Índice de lecciones\n" }), "índice no está al día"],
  ["traducción incompleta", (f) => ({ ...f, "../en/cifras-y-datos.md": "# Figures and data\n\n" + LECCION(1, "One").replace("La idea", "The idea").replace("Ejemplo", "Example").replace("Pregunta detectora", "Detector question").replace("Señal de alarma", "Warning sign").replace("Qué hacer", "What to do") }), "falta traducir la 2"],
];

function armar(archivos) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "lecciones-"));
  const dir = path.join(tmp, "lecciones", ORIGINAL);
  mkdirSync(dir, { recursive: true });
  for (const [nombre, texto] of Object.entries(archivos)) {
    const ruta = path.join(dir, nombre);
    mkdirSync(path.dirname(ruta), { recursive: true });
    writeFileSync(ruta, texto);
  }
  if (!("README.md" in archivos)) writeFileSync(path.join(dir, "README.md"), generarIndice(ORIGINAL, tmp));
  if (archivos["../en/cifras-y-datos.md"]) writeFileSync(path.join(tmp, "lecciones", "en", "README.md"), generarIndice("en", tmp));
  return tmp;
}

export function probar() {
  const malos = [];
  const correr = (archivos) => { const tmp = armar(archivos); try { return verificar(tmp); } finally { rmSync(tmp, { recursive: true, force: true }); } };
  const base = correr(BASE);
  if (base.length) malos.push(`el caso que debe pasar tiene ${base.length} hallazgo(s):\n` + base.map((h) => `    ${h.archivo}:${h.linea} ${h.mensaje}`).join("\n"));
  for (const [nombre, romper, esperado] of CASOS) {
    const h = correr(romper(BASE));
    if (!h.some((x) => x.mensaje.includes(esperado))) malos.push(`«${nombre}» debía fallar con «${esperado}» y dio: ${h.map((x) => x.mensaje).join(" | ") || "nada"}`);
  }
  // Lecciones propias de un proyecto: el caso bueno pasa; un archivo con nombre de grupo inventado y un id sin prefijo fallan.
  const proyecto = mkdtempSync(path.join(os.tmpdir(), "lecciones-proyecto-"));
  try {
    mkdirSync(path.join(proyecto, ".ritual", "lecciones"), { recursive: true });
    writeFileSync(path.join(proyecto, ".ritual", "lecciones", "consola-y-herramientas.md"), `# Consola\n\n${LECCION("P-1", "Propia", "`origen: campo` · `afina: 27`")}`);
    const bien = verificarProyecto(proyecto);
    if (bien.length) malos.push(`las lecciones propias buenas dieron: ${bien.map((x) => x.mensaje).join(" | ")}`);
    writeFileSync(path.join(proyecto, ".ritual", "lecciones", "cocina.md"), `# Cocina\n\n${LECCION("2", "Sin prefijo")}`);
    const mal = verificarProyecto(proyecto).map((x) => x.mensaje).join(" | ");
    if (!mal.includes("debe llamarse como un grupo")) malos.push(`un archivo con grupo inventado debía fallar y dio: ${mal || "nada"}`);
    writeFileSync(path.join(proyecto, ".ritual", "lecciones", "git-y-proceso.md"), `# Git\n\n${LECCION("2", "Sin prefijo")}`);
    if (!verificarProyecto(proyecto).some((x) => x.mensaje.includes("prefijo"))) malos.push("un id sin prefijo en una lección propia debía fallar");
  } finally { rmSync(proyecto, { recursive: true, force: true }); }
  for (const m of malos) console.error(`✕ ${m}`);
  return malos.length;
}

if (import.meta.main) {
  if (process.argv.includes("--probar")) {
    const malos = probar();
    console.log(malos ? `${malos} caso(s) mal` : `✓ calibrado: pasa el caso bueno y atrapa los ${CASOS.length} casos malos`);
    process.exit(malos ? 1 : 0);
  }
  if (process.argv.includes("--indice")) {
    for (const idioma of idiomasDe(path.join(RAIZ, "lecciones"))) {
      writeFileSync(path.join(RAIZ, "lecciones", idioma, "README.md"), generarIndice(idioma));
      console.log(`✓ lecciones/${idioma}/README.md`);
    }
    process.exit(0);
  }
  const i = process.argv.indexOf("--proyecto");
  if (i >= 0) {
    const proyecto = path.resolve(process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
    const idioma = leerConfigIdioma(proyecto);
    const h = verificarProyecto(proyecto, idioma);
    for (const x of h) console.log(`${x.archivo}:${x.linea}  ${x.mensaje}`);
    console.log(h.length ? `✕ ${h.length} problema(s) en las lecciones del proyecto` : "✓ lecciones del proyecto bien formadas");
    process.exit(h.length ? 1 : 0);
  }
  const h = verificar();
  for (const x of h) console.log(`${x.archivo}:${x.linea}  ${x.mensaje}`);
  console.log(h.length ? `✕ ${h.length} problema(s) en las lecciones` : `✓ ${leer().lecciones.length} lecciones bien formadas, índices al día`);
  process.exit(h.length ? 1 : 0);
}
