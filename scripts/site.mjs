#!/usr/bin/env node
// The library as a website (GitHub Pages): one static page per language with every lesson already in the HTML (so
// search engines read it), and a small script to search and filter by group, package and model. Built by the `site`
// workflow on every push to main; nothing generated is committed.
// Usage: node scripts/site.mjs <out-dir>    builds the site
//        node scripts/site.mjs --selftest
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMain } from "../hooks/common.mjs";
import { ORIGINAL, PARTS, ROOT, TAXONOMY, anchor, compareIds, modelsOf, readLessons } from "./lessons.mjs";

const REPO = "https://github.com/Zurishadday/Ritual";
const SITE = "https://zurishadday.github.io/Ritual";
const NAMES = { en: "English", es: "Español", pt: "Português", fr: "Français", "zh-CN": "中文", ja: "日本語", ko: "한국어" };
const UI = {
  en: { title: "Lessons that stop Claude from repeating a mistake", search: "Search lessons", group: "Group", package: "Package", model: "Seen with", all: "All", core: "Every project", count: "{n} of {total} lessons", none: "No lesson matches. Try fewer filters.", seen: "Seen with", source: "View on GitHub", install: "Install in Claude Code", more: "Example and what to do", ai: "Translated by AI, waiting for a native speaker's review.", share: "Saw one of these mistakes? Share it with /ritual share." },
  es: { title: "Lecciones para que Claude no repita un error", search: "Buscar lecciones", group: "Grupo", package: "Paquete", model: "Visto con", all: "Todos", core: "Todo proyecto", count: "{n} de {total} lecciones", none: "Ninguna lección coincide. Prueba con menos filtros.", seen: "Visto con", source: "Ver en GitHub", install: "Instalar en Claude Code", more: "Ejemplo y qué hacer", ai: "Traducida por IA, espera la revisión de alguien nativo.", share: "¿Viste uno de estos errores? Compártelo con /ritual share." },
  pt: { title: "Lições que impedem o Claude de repetir um erro", search: "Pesquisar lições", group: "Grupo", package: "Pacote", model: "Visto com", all: "Todos", core: "Todos os projetos", count: "{n} de {total} lições", none: "Nenhuma lição corresponde. Tente menos filtros.", seen: "Visto com", source: "Ver no GitHub", install: "Instalar no Claude Code", more: "Exemplo e o que fazer", ai: "Traduzido por IA, aguardando revisão de um falante nativo.", share: "Viu um destes erros? Compartilhe com /ritual share." },
  fr: { title: "Leçons qui empêchent Claude de répéter une erreur", search: "Rechercher des leçons", group: "Groupe", package: "Paquet", model: "Vu avec", all: "Tous", core: "Tous les projets", count: "{n} leçons sur {total}", none: "Aucune leçon ne correspond. Essayez moins de filtres.", seen: "Vu avec", source: "Voir sur GitHub", install: "Installer dans Claude Code", more: "Exemple et quoi faire", ai: "Traduit par IA, en attente de relecture par un locuteur natif.", share: "Vous avez vu l'une de ces erreurs ? Partagez-la avec /ritual share." },
  "zh-CN": { title: "让 Claude 不再重复犯错的经验课", search: "搜索课程", group: "分组", package: "软件包", model: "见于模型", all: "全部", core: "所有项目", count: "{n} / {total} 条课程", none: "没有匹配的课程，请减少筛选条件。", seen: "见于模型", source: "在 GitHub 上查看", install: "在 Claude Code 中安装", more: "示例与应对方法", ai: "由 AI 翻译，等待母语者审阅。", share: "遇到过这些错误？用 /ritual share 分享。" },
  ja: { title: "Claude が同じ失敗を繰り返さないためのレッスン", search: "レッスンを検索", group: "グループ", package: "パッケージ", model: "確認されたモデル", all: "すべて", core: "すべてのプロジェクト", count: "{n} / {total} 件のレッスン", none: "一致するレッスンがありません。絞り込みを減らしてください。", seen: "確認されたモデル", source: "GitHub で見る", install: "Claude Code にインストール", more: "例と対処法", ai: "AI により翻訳済み。ネイティブスピーカーによるレビュー待ちです。", share: "同じ失敗を見かけましたか？ /ritual share で共有してください。" },
  ko: { title: "Claude가 같은 실수를 반복하지 않도록 돕는 교훈", search: "교훈 검색", group: "그룹", package: "패키지", model: "확인된 모델", all: "전체", core: "모든 프로젝트", count: "전체 {total}개 중 {n}개", none: "일치하는 교훈이 없습니다. 필터를 줄여 보세요.", seen: "확인된 모델", source: "GitHub에서 보기", install: "Claude Code에 설치", more: "예시와 해결 방법", ai: "AI가 번역함. 원어민의 검토를 기다리는 중입니다.", share: "같은 실수를 본 적이 있나요? /ritual share로 공유하세요." },
};

// Search ignores case and accents ("cache" finds "caché"); the page's script folds the query the same way.
export const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const html = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** The little markdown lessons use: paragraphs, inline code and *italics*. Everything is escaped first. */
export function inline(text) {
  return String(text ?? "").trim().split(/\n\s*\n/).map((p) => `<p>${html(p.replace(/\s*\n\s*/g, " "))
    .replace(/`([^`]+)`/g, "<code>$1</code>").replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>")}</p>`).join("");
}

/** The description each README already has under its banner, so the site says what the README says. Translations put
 * the slogan in bold first (the banner is in English): it is skipped. */
function tagline(language) {
  const file = path.join(ROOT, language === ORIGINAL ? "README.md" : `README.${language}.md`);
  const lines = readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  const at = lines.findIndex((l) => l.startsWith("<img"));
  return lines.slice(at + 1).find((l) => l.trim() && !l.startsWith("**")) ?? "";
}

export function page(language) {
  const t = UI[language] ?? UI.en;
  const original = readLessons(ORIGINAL);
  const translated = language === ORIGINAL ? original : readLessons(language);
  const byId = new Map(translated.lessons.map((l) => [l.id, l]));
  const lessons = original.lessons.filter((l) => !l.merged).sort(compareIds);
  const groups = TAXONOMY.groups.map((g) => g.slug);
  const title = (g) => translated.groups[g] ?? original.groups[g] ?? g;
  const models = [...new Set(lessons.flatMap((l) => modelsOf(l).map((m) => m.model)))].sort();
  const prefix = language === ORIGINAL ? "" : "../";
  const parts = PARTS[language] ?? PARTS.en;
  const cards = lessons.map((o) => {
    const l = byId.get(o.id) ?? o;
    const own = l === o ? PARTS.en : parts;
    const lang = l === o ? ORIGINAL : language;
    const pkgs = (o.data.packages ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const seen = modelsOf(o);
    const rest = Object.entries(l.parts).filter(([p]) => p !== own[0] && p !== own[2] && p !== own[3]);
    const text = fold([l.title, ...Object.values(l.parts)].join(" ")).replace(/\s+/g, " ");
    return `<article id="l-${html(o.id)}" data-group="${html(o.group)}" data-packages="${html(pkgs.join(" "))}" data-models="${html(seen.map((m) => m.model).join(" "))}" data-text="${html(text)}"${lang !== language ? ` lang="${ORIGINAL}"` : ""}>
<header><a class="id" href="#l-${html(o.id)}">${html(o.id)}</a><h2>${html(l.title)}</h2></header>
<div class="tags"><span class="tag">${html(title(o.group))}</span>${pkgs.map((p) => `<span class="tag pkg">${html(p)}</span>`).join("")}</div>
${inline(l.parts[own[0]])}
<div class="q"><b>${html(own[2])}</b>${inline(l.parts[own[2]])}</div>
<div class="w"><b>${html(own[3])}</b>${inline(l.parts[own[3]])}</div>
<details><summary>${html(t.more)}</summary>${rest.map(([p, v]) => `<h3>${html(p)}</h3>${inline(v)}`).join("")}</details>
<footer>${seen.length ? `<span>${html(t.seen)}</span>${seen.map((m) => `<span class="model">${html(m.model)} <i>${html(m.month)}</i></span>`).join("")}` : ""}${l.data.by === "ai" ? `<span class="ai">${html(t.ai)}</span>` : ""}<a href="${REPO}/blob/main/lessons/${lang}/${o.group}.md#${anchor(`${l.id}. ${l.title}`)}">${html(t.source)}</a></footer>
</article>`;
  }).join("\n");
  const option = (value, label) => `<option value="${html(value)}">${html(label)}</option>`;
  const url = (lang) => `${SITE}/${lang === ORIGINAL ? "" : `${lang}/`}`;
  return `<!doctype html>
<html lang="${html(language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ritual · ${html(t.title)}</title>
<meta name="description" content="${html(tagline(language))}">
<link rel="canonical" href="${url(language)}">
${Object.keys(NAMES).map((l) => `<link rel="alternate" hreflang="${l}" href="${url(l)}">`).join("\n")}
<meta property="og:title" content="Ritual · ${html(t.title)}"><meta property="og:description" content="${html(tagline(language))}"><meta property="og:image" content="${SITE}/social-preview.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${prefix}logo.svg" type="image/svg+xml">
<style>
:root { --bg: #f6f8fa; --card: #fff; --text: #1f2328; --muted: #59636e; --line: #d1d9e0; --green: #1a7f37; --green-bg: #dafbe1; --orange: #bc4c00; --code: #eff1f3; --chip: #eaeef2; --link: #0969da; }
@media (prefers-color-scheme: dark) { :root { --bg: #0d1117; --card: #151b23; --text: #f0f6fc; --muted: #9198a1; --line: #3d444d; --green: #3fb950; --green-bg: #12261e; --orange: #f0883e; --code: #262c36; --chip: #212830; --link: #4493f8; } }
a { color: var(--link); }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { max-width: 860px; margin: 0 auto; padding: 0 16px 64px; }
.top { padding: 32px 0 8px; display: grid; gap: 10px; }
.brand { display: flex; align-items: center; gap: 12px; } .brand img { width: 44px; height: 44px; } .brand b { font-size: 26px; }
.top h1 { font-size: 30px; line-height: 1.2; margin: 6px 0 0; } .top p { margin: 0; color: var(--muted); }
nav { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 14px; } nav a { color: var(--muted); } nav a[aria-current] { color: var(--text); font-weight: 600; text-decoration: none; }
pre { margin: 6px 0 0; padding: 12px 14px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow-x: auto; font-size: 13px; }
.controls { position: sticky; top: 0; z-index: 1; background: var(--bg); padding: 14px 0 10px; display: grid; grid-template-columns: 1fr repeat(3, auto); gap: 8px; border-bottom: 1px solid var(--line); }
input, select { font: inherit; font-size: 15px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--text); min-width: 0; }
@media (max-width: 640px) { .controls { position: static; grid-template-columns: 1fr 1fr 1fr; } .controls input { grid-column: 1 / -1; } article { scroll-margin-top: 12px; } }
#count { color: var(--muted); font-size: 14px; margin: 12px 0; }
article { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; margin: 0 0 14px; scroll-margin-top: 80px; }
article:target { outline: 2px solid var(--green); }
article header { display: flex; gap: 12px; align-items: baseline; } article h2 { font-size: 20px; line-height: 1.3; margin: 0; }
.id { font: 600 14px ui-monospace, Consolas, monospace; color: var(--muted); text-decoration: none; white-space: nowrap; }
.tags { margin: 8px 0 4px; display: flex; flex-wrap: wrap; gap: 6px; } .tag { font-size: 12px; padding: 2px 9px; border-radius: 999px; background: var(--chip); color: var(--muted); } .tag.pkg { color: var(--green); }
.q { background: var(--green-bg); border-left: 4px solid var(--green); border-radius: 8px; padding: 10px 14px; margin: 12px 0; } .q b, .w b { display: block; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--green); } .q p { margin: 4px 0 0; font-weight: 600; }
.w b { color: var(--orange); } .w p { margin: 4px 0 0; font-style: italic; } :is(:lang(zh-CN), :lang(ja), :lang(ko)) .w p { font-style: normal; }
details { margin-top: 10px; } summary { cursor: pointer; color: var(--muted); font-size: 14px; } details h3 { font-size: 14px; margin: 14px 0 0; }
code { font: 13px ui-monospace, Consolas, monospace; background: var(--code); padding: 1px 5px; border-radius: 5px; }
article footer { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin-top: 12px; font-size: 13px; color: var(--muted); }
.model { font-family: ui-monospace, Consolas, monospace; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line); } .model i { font-style: normal; opacity: .7; }
.ai { font-style: italic; } article footer a { margin-left: auto; }
.share { margin-top: 28px; color: var(--muted); text-align: center; } [hidden] { display: none !important; }
</style></head>
<body><div class="wrap">
<div class="top">
<div class="brand"><img src="${prefix}logo.svg" alt=""><b>Ritual</b></div>
<nav>${Object.entries(NAMES).map(([l, n]) => `<a href="${prefix}${l === ORIGINAL ? "" : `${l}/`}"${l === language ? ' aria-current="page"' : ""}>${html(n)}</a>`).join("")}<a href="${REPO}">GitHub</a></nav>
<h1>${html(t.title)}</h1>
<p>${html(tagline(language))}</p>
<pre><code>claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual</code></pre>
</div>
<div class="controls">
<input id="q" type="search" placeholder="${html(t.search)}" aria-label="${html(t.search)}">
<select id="group" aria-label="${html(t.group)}">${option("", t.group)}${groups.map((g) => option(g, title(g))).join("")}</select>
<select id="package" aria-label="${html(t.package)}">${option("", t.package)}${option("-", t.core)}${Object.keys(TAXONOMY.packages).map((p) => option(p, p)).join("")}</select>
<select id="model" aria-label="${html(t.model)}">${option("", t.model)}${models.map((m) => option(m, m)).join("")}</select>
</div>
<p id="count" aria-live="polite">${html(t.count.replace("{n}", lessons.length).replace("{total}", lessons.length))}</p>
<main>
${cards}
</main>
<p id="none" hidden>${html(t.none)}</p>
<p class="share">${html(t.share)}</p>
</div>
<script>
const count = ${JSON.stringify(t.count)}, all = [...document.querySelectorAll("article")];
const q = document.getElementById("q"), g = document.getElementById("group"), p = document.getElementById("package"), m = document.getElementById("model");
function apply() {
  const words = q.value.normalize("NFD").replace(/\\p{M}/gu, "").toLowerCase().split(/\\s+/).filter(Boolean);
  let n = 0;
  for (const a of all) {
    const pk = a.dataset.packages.split(" ").filter(Boolean);
    const show = words.every((w) => a.dataset.text.includes(w) || a.id === "l-" + w)
      && (!g.value || a.dataset.group === g.value)
      && (!p.value || (p.value === "-" ? !pk.length : pk.includes(p.value)))
      && (!m.value || a.dataset.models.split(" ").includes(m.value));
    a.hidden = !show; if (show) n++;
  }
  document.getElementById("count").textContent = count.replace("{n}", n).replace("{total}", all.length);
  document.getElementById("none").hidden = n > 0;
}
for (const el of [q, g, p, m]) el.addEventListener("input", apply);
function open() { const a = document.getElementById(location.hash.slice(1)); if (a && a.tagName === "ARTICLE") { a.hidden = false; a.querySelector("details").open = true; } }
addEventListener("hashchange", open); open();
</script>
</body></html>
`;
}

export function build(out) {
  mkdirSync(out, { recursive: true });
  for (const language of Object.keys(NAMES)) {
    const dir = language === ORIGINAL ? out : path.join(out, language);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), page(language));
  }
  copyFileSync(path.join(ROOT, "assets", "logo.svg"), path.join(out, "logo.svg"));
  copyFileSync(path.join(ROOT, "assets", "social-preview.png"), path.join(out, "social-preview.png"));
}

export function selftest() {
  const bad = [];
  if (inline("a `<b>` and *this*\n\nnext") !== "<p>a <code>&lt;b&gt;</code> and <em>this</em></p><p>next</p>") bad.push(`inline: ${inline("a `<b>` and *this*\n\nnext")}`);
  if (inline("a glob `**/*.md` stays") !== "<p>a glob <code>**/*.md</code> stays</p>") bad.push(`a glob inside code must not become italics: ${inline("a glob `**/*.md` stays")}`);
  for (const l of Object.keys(PARTS)) if (!NAMES[l]) bad.push(`no name for language ${l}`);
  const out = mkdtempSync(path.join(os.tmpdir(), "ritual-site-"));
  try {
    build(out);
    const ids = readLessons().lessons.filter((l) => !l.merged).map((l) => l.id);
    for (const language of Object.keys(NAMES)) {
      const file = path.join(out, language === ORIGINAL ? "" : language, "index.html");
      if (!existsSync(file)) { bad.push(`missing ${language}/index.html`); continue; }
      const text = readFileSync(file, "utf8");
      const missing = ids.filter((id) => !text.includes(`<article id="l-${id}"`));
      if (missing.length) bad.push(`${language}: lessons missing: ${missing.join(", ")}`);
      if (/undefined|\bnull\b|NaN/.test(text.replace(/<script>[\s\S]*<\/script>/, ""))) bad.push(`${language}: "undefined" or "null" on the page`);
      if ((text.match(/hreflang=/g) ?? []).length !== Object.keys(NAMES).length) bad.push(`${language}: needs one hreflang per language`);
      if (!/<meta name="description" content="[^"]{15,}">/.test(text)) bad.push(`${language}: the description (README tagline) is missing`);
      if (!UI[language]) bad.push(`${language}: no interface strings`);
      if (/\*\*|\]\(/.test(tagline(language))) bad.push(`${language}: the tagline still has markdown: ${tagline(language).slice(0, 60)}`);
    }
    if (!readFileSync(path.join(out, "es", "index.html"), "utf8").includes("Pregunta detectora")) bad.push("the Spanish page should use the Spanish part names");
    if (!/<article id="l-27"[^>]*data-text="[^"]*\bcache\b/.test(readFileSync(path.join(out, "es", "index.html"), "utf8"))) bad.push("searching «cache» must find «caché» on the Spanish page (accents folded)");
    if (!readFileSync(path.join(out, "index.html"), "utf8").includes('data-models="~opus claude-opus-5-5"')) bad.push("lesson 27 should be filterable by both its models");
  } finally { rmSync(out, { recursive: true, force: true }); }
  for (const m of bad) console.error(`✕ ${m}`);
  return bad.length;
}

if (isMain(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === "--selftest") {
    const bad = selftest();
    console.log(bad ? `${bad} case(s) wrong` : "✓ site: every lesson on every language's page, escaped, filterable, with its links");
    process.exit(bad ? 1 : 0);
  }
  if (!arg) { console.error("✕ usage: node scripts/site.mjs <out-dir> | --selftest"); process.exit(1); }
  build(path.resolve(arg));
  console.log(`✓ site built in ${arg}`);
}
