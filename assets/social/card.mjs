// A card per lesson, to share one at a time ("lesson of the week"): 1080×1080, which LinkedIn, X, Instagram and
// WhatsApp all show whole. Title, detector question, warning sign, the models it was seen with, and the link. Next to
// each PNG goes a .txt with the post text. Output in .ritual/local/cards/<language>/ (not published).
// Usage: node assets/social/card.mjs <id|all> [language]     renders with Edge (Windows)
//        node assets/social/card.mjs --selftest                builds every card's HTML in every language, no Edge
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isMain } from "../../hooks/common.mjs";
import { ORIGINAL, PARTS, ROOT, anchor, modelsOf, readLessons } from "../../scripts/lessons.mjs";

const SIZE = 1080;
const REPO = "https://github.com/Zurishadday/Ritual";
// Short labels per language; the part names come from PARTS, like everywhere else.
const LABEL = {
  en: { lesson: "Lesson", seen: "Seen with", from: "From Ritual, a Claude Code plugin that turns every mistake into a lesson and every lesson into a check:" },
  es: { lesson: "Lección", seen: "Visto con", from: "De Ritual, un plugin de Claude Code que convierte cada error en una lección y cada lección en un chequeo:" },
  pt: { lesson: "Lição", seen: "Visto com", from: "Do Ritual, um plugin do Claude Code que transforma cada erro em uma lição e cada lição em uma verificação:" },
  fr: { lesson: "Leçon", seen: "Vu avec", from: "De Ritual, un plugin Claude Code qui transforme chaque erreur en leçon et chaque leçon en vérification :" },
  "zh-CN": { lesson: "教训", seen: "出现于", from: "来自 Ritual，一个把每个错误变成教训、把每条教训变成检查的 Claude Code 插件：" },
  ja: { lesson: "教訓", seen: "確認されたモデル", from: "Ritual より。すべてのミスを教訓に、すべての教訓をチェックに変える Claude Code プラグインです：" },
  ko: { lesson: "교훈", seen: "확인된 모델", from: "Ritual에서. 모든 실수를 교훈으로, 모든 교훈을 검사로 바꾸는 Claude Code 플러그인입니다:" },
};

const html = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Inline code keeps its look; everything else is escaped first.
const rich = (s) => html(s.replace(/\s+/g, " ").trim()).replace(/`([^`]+)`/g, "<code>$1</code>");

/** The card's pieces for one lesson in one language. The models come from the original: translations carry no data line. */
export function cardData(id, language = ORIGINAL) {
  const original = readLessons(ORIGINAL).lessons.find((l) => l.id === id);
  if (!original || original.merged) return null;
  const { groups, lessons } = readLessons(language);
  const l = lessons.find((x) => x.id === id) ?? original;
  const lang = l === original ? ORIGINAL : language;
  const [, , question, warning] = PARTS[lang];
  const file = `lessons/${lang}/${l.group}.md`;
  return {
    id, language: lang, title: l.title, group: (lang === ORIGINAL ? readLessons(ORIGINAL).groups : groups)[l.group] ?? l.group,
    questionLabel: question, question: l.parts[question] ?? "", warningLabel: warning, warning: l.parts[warning] ?? "",
    models: modelsOf(original), url: `${REPO}/blob/main/${file}#${anchor(`${l.id}. ${l.title}`)}`,
  };
}

export function cardHtml(c) {
  const L = LABEL[c.language] ?? LABEL.en;
  const asset = (f) => pathToFileURL(path.join(ROOT, "assets", f)).href;
  const models = c.models.map((m) => `<span class="model">${html(m.model)} <i>${html(m.month)}</i></span>`).join("");
  return `<!doctype html>
<html lang="${html(c.language)}"><head><meta charset="utf-8"><link rel="stylesheet" href="${asset("social/common.css")}">
<style>
  html, body { width: ${SIZE}px; height: ${SIZE}px; }
  body { background: radial-gradient(800px 600px at 10% 0%, rgba(248,81,73,.12), transparent 60%), radial-gradient(800px 600px at 100% 100%, rgba(63,185,80,.13), transparent 60%), linear-gradient(160deg, #161b22 0%, #0d1117 70%); }
  .wrap { width: ${SIZE}px; height: ${SIZE}px; padding: 64px 76px 56px; display: flex; flex-direction: column; gap: 34px; }
  .head { display: flex; align-items: center; gap: 18px; font-size: 30px; font-weight: 700; }
  .head img { width: 58px; height: 58px; }
  .head .pill { margin-left: auto; font-size: 22px; font-weight: 600; }
  main { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 1.1em; font-size: 40px; }
  h1 { font-size: 1.55em; line-height: 1.12; font-weight: 700; letter-spacing: -.02em; }
  .label { font-size: .5em; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin-bottom: .55em; }
  .q { padding: .8em .9em; border-radius: 26px; background: rgba(63,185,80,.10); border: 2px solid rgba(63,185,80,.55); }
  .q .label { color: #3FB950; } .q p { font-size: 1em; line-height: 1.3; font-weight: 600; }
  .w .label { color: #F0883E; } .w p { font-size: .78em; line-height: 1.35; color: #c9d1d9; font-style: italic; }
  html:is([lang=zh-CN], [lang=ja], [lang=ko]) .w p { font-style: normal; } /* CJK fonts have no italic: the browser slants them */
  code { font-family: Consolas, "Cascadia Mono", monospace; font-size: .9em; padding: .05em .3em; border-radius: 8px; background: rgba(255,255,255,.09); font-style: normal; }
  footer { display: flex; flex-direction: column; gap: 16px; }
  .models { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 20px; color: #9da7b3; }
  .model { padding: 5px 14px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: #c9d1d9; font-family: Consolas, monospace; }
  .model i { color: #7d8590; font-style: normal; }
  .url { font-size: 22px; }
</style></head>
<body><div class="wrap">
  <div class="head"><img src="${asset("logo.svg")}" alt=""><span>Ritual</span><span class="pill">${html(L.lesson)} ${html(c.id)} · ${html(c.group)}</span></div>
  <main>
    <h1>${rich(c.title)}</h1>
    <div class="q"><div class="label">${html(c.questionLabel)}</div><p>${rich(c.question)}</p></div>
    <div class="w"><div class="label">${html(c.warningLabel)}</div><p>${rich(c.warning)}</p></div>
  </main>
  <footer>
    <div class="models">${models ? `${html(L.seen)} ${models}` : ""}</div>
    <div class="url">github.com/Zurishadday/Ritual</div>
  </footer>
</div>
<script>
  // Shrinks the text until it fits, down to 30px (smaller is unreadable on a phone); if it can't, says so (render() reports it).
  const main = document.querySelector("main");
  let size = 40;
  while (main.scrollHeight > main.clientHeight + 1 && size > 30) main.style.fontSize = (size -= 1) + "px";
  window.fits = main.scrollHeight <= main.clientHeight + 1;
</script>
</body></html>
`;
}

export function postText(c) {
  const L = LABEL[c.language] ?? LABEL.en;
  return `${L.lesson} ${c.id} · ${c.title}\n\n${c.questionLabel}: ${c.question.replace(/\s+/g, " ")}\n\n${c.warningLabel}: ${c.warning.replace(/\s+/g, " ")}\n\n${L.from}\n${c.url}\n`;
}

// A missing field printed as text, as a whole word: French «nulle» is a word, not a leak.
const leaks = (page) => /\b(undefined|null)\b/.test(page.replace(/<script>[\s\S]*<\/script>/, ""));

export function selftest() {
  const bad = [];
  if (leaks(cardHtml({ ...cardData("27"), title: "presque nulle" })) || !leaks("<p>undefined</p>") || !leaks("<p>by null</p>")) bad.push("a card with a missing field is caught, a word that contains «null» is not");
  const ids = readLessons(ORIGINAL).lessons.filter((l) => !l.merged).map((l) => l.id);
  for (const language of Object.keys(PARTS)) {
    if (!LABEL[language]) bad.push(`no card labels for ${language}`);
    for (const id of ids) {
      const c = cardData(id, language);
      if (!c?.title || !c.question || !c.warning) { bad.push(`${language} ${id}: card without title, question or warning`); continue; }
      const page = cardHtml(c);
      if (leaks(page)) bad.push(`${language} ${id}: "undefined" on the card`);
      if (!postText(c).includes(c.url)) bad.push(`${language} ${id}: the post text lacks the link`);
    }
  }
  const one = cardHtml({ ...cardData("27"), title: "a <b> & `x < y`" });
  if (!one.includes("a &lt;b&gt; &amp; <code>x &lt; y</code>")) bad.push("the title is not escaped, or inline code is lost");
  if (!cardData("27").models.some((m) => m.model === "claude-opus-5-5")) bad.push("lesson 27 should show claude-opus-5-5 from its seen:");
  if (!cardData("27").warning.startsWith('"I already fixed it')) bad.push(`lesson 27's warning sign is the wrong part: ${cardData("27").warning.slice(0, 60)}`);
  if (cardData("27", "es").models.length !== 2) bad.push("a translated card should show the original's models (translations have no data line)");
  if (cardData("9999")) bad.push("a lesson that does not exist should give no card");
  for (const m of bad.slice(0, 20)) console.error(`✕ ${m}`);
  return { bad: bad.length, cards: ids.length * Object.keys(PARTS).length };
}

if (isMain(import.meta.url)) {
  const [what, language = ORIGINAL] = process.argv.slice(2);
  if (what === "--selftest") {
    const { bad, cards } = selftest();
    console.log(bad ? `${bad} card(s) wrong` : `✓ cards: ${cards} cards build in every language, escaped, with their link`);
    process.exit(bad ? 1 : 0);
  }
  if (!what || !PARTS[language]) { console.error(`✕ usage: node assets/social/card.mjs <id|all> [${Object.keys(PARTS).join("|")}]`); process.exit(1); }
  const ids = what === "all" ? readLessons(ORIGINAL).lessons.filter((l) => !l.merged).map((l) => l.id) : [what];
  const dir = path.join(ROOT, ".ritual", "local", "cards", language);
  mkdirSync(dir, { recursive: true });
  const jobs = [];
  for (const id of ids) {
    const c = cardData(id, language);
    if (!c) { console.error(`✕ lesson ${id} does not exist`); process.exit(1); }
    const page = path.join(dir, `${id}.html`);
    writeFileSync(page, cardHtml(c));
    writeFileSync(path.join(dir, `${id}.txt`), postText(c));
    jobs.push({ url: pathToFileURL(page).href, out: path.join(dir, `${id}.png`) });
  }
  const { render } = await import("./render.mjs");
  const overflow = await render(jobs, { width: SIZE, height: SIZE });
  for (const o of overflow) console.log(`✕ the text did not fit: ${path.relative(ROOT, o)}`);
  console.log(`${overflow.length ? "✕" : "✓"} ${jobs.length - overflow.length} of ${jobs.length} card(s) in ${path.relative(ROOT, dir)}`);
  process.exit(overflow.length ? 1 : 0);
}
