# Translating the lessons

The guide a model (or a person) follows to translate `lessons/en/` into another language. After translating, run `node scripts/lessons.mjs --stamp <language>` and `--index`, then `--check`. See also [TEMPLATE.md](TEMPLATE.md#languages).


Source: `lessons/en/<group>.md` (the original). Output: `lessons/<language>/<group>.md`, same file names.
A checker parses the output: follow the format exactly.

## Format

- First line: `# <group title>` from the table below for your language.
- Each lesson heading: `### <id>. <translated title>`. Keep the id exactly (13, WEB-1) and the same order.
- DROP the data line under each heading (the backtick pairs like `` `origin: field` · `packages: web` ``). Do not write
  any data line at all: a script adds the translation stamp afterwards. The result is heading, blank line, first part.
- The five parts are paragraphs that start with the bold part name, using EXACTLY the names for your language below.
  Latin-script languages and Korean end the name with a period inside the bold: `**A ideia.**`. Chinese and Japanese
  end it with 「。」 inside the bold: `**要点。**`, `**核心。**`.
- Extra parts (`Another example`, `One more example`, `Variant`, `Not to be confused with`) use the names below.
- Inline code, commands, file names, numbers, links and markdown structure stay exactly as they are.
- Cross-references ("see lesson 44", "lesson 44") are translated with the pattern below; never change the number.

## Names per language

| | pt | fr | zh-CN | ja | ko |
|---|---|---|---|---|---|
| The idea | A ideia | L'idée | 核心 | 要点 | 핵심 |
| Example | Exemplo | Exemple | 例子 | 例 | 예시 |
| Detector question | Pergunta detectora | Question détectrice | 检测问题 | 検出の問い | 감지 질문 |
| Warning sign | Sinal de alerta | Signal d'alarme | 警示信号 | 危険信号 | 경고 신호 |
| What to do | O que fazer | Que faire | 怎么做 | どうするか | 해야 할 일 |
| Another example | Outro exemplo | Autre exemple | 另一个例子 | 別の例 | 또 다른 예시 |
| One more example | Mais um exemplo | Encore un exemple | 再一个例子 | もう一つの例 | 예시 하나 더 |
| Variant | Variante | Variante | 变体 | 変形 | 변형 |
| Not to be confused with | Não confundir com | À ne pas confondre avec | 不要混淆 | 混同しないこと | 혼동하지 말 것 |
| see lesson 44 | ver a lição 44 | voir la leçon 44 | 见第 44 条 | 教訓 44 を参照 | 교훈 44 참고 |

## Group titles

| File | pt | fr | zh-CN | ja | ko |
|---|---|---|---|---|---|
| writing-and-docs.md | Escrita e documentação | Écriture et documentation | 写作与文档 | 執筆とドキュメント | 글쓰기와 문서 |
| numbers-and-data.md | Números e dados | Chiffres et données | 数字与数据 | 数値とデータ | 숫자와 데이터 |
| tests-and-checks.md | Testes e verificações | Tests et vérifications | 测试与检查 | テストとチェック | 테스트와 점검 |
| scripts-and-files.md | Scripts e arquivos | Scripts et fichiers | 脚本与文件 | スクリプトとファイル | 스크립트와 파일 |
| interface-and-design.md | Interface e design | Interface et design | 界面与设计 | インターフェースとデザイン | 인터페이스와 디자인 |
| console-and-tools.md | Console e ferramentas | Console et outils | 终端与工具 | コンソールとツール | 콘솔과 도구 |
| git-and-process.md | Git e processo | Git et processus | Git 与流程 | Git とプロセス | Git과 프로세스 |

## Style

- Natural, clear prose a senior engineer who is a native speaker would write. Not word for word: say the same thing the
  way it is said in that language. Technical terms developers in that language normally leave in English (commit,
  push, hook, deploy, test) may stay in English.
- Same meaning, nothing added, nothing omitted, no softening.
- The detector question stays a real question. The warning sign sounds like something a person actually says to
  themselves. Use that language's usual quotation marks (pt “…”, fr « … », zh “…”, ja 「…」, ko ‘…’ or “…”).
- Examples stay anonymous.
