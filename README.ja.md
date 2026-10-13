<div align="center">

<img src="assets/banner.png" width="100%" alt="Ritual. Claude makes a mistake once. Ritual makes sure it's the last time. Mistake, lesson, rule, check.">

**Claude が間違えるのは一度だけ。Ritual は、それが最後になるようにします。**

あらゆるミスをレッスンに、あらゆるレッスンをルールに、そしてできる場合にはあらゆるルールをテストかガードに変える Claude Code プラグインです。

[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-E8743B)](#install)
[![Tests](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml/badge.svg)](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml)
[![Library](https://img.shields.io/badge/library-browse_the_lessons-3FB950)](https://zurishadday.github.io/Ritual/ja/)
[![License: MIT](https://img.shields.io/github/license/Zurishadday/Ritual)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Zurishadday/Ritual)](https://github.com/Zurishadday/Ritual/commits/main)

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · **日本語** · [한국어](README.ko.md)

</div>

他のツールは学んだことを書き留めるだけです。Ritual はそこから一歩進んで、それを検証します。テキストの中にしか存在しないルールは長いセッションの中で忘れられてしまいますが、自分で検証するルールは、そうはなりません。

Ritual には、実際のミスからそれぞれ生まれた **49 件のフィールドレッスン**が含まれています。また、**プロジェクトの種類ごとのパッケージ**があり、そこのレッスンは、モデルが何かを作って壊すのを観察した結果から来ています。そして、**一つのコマンド** `/ritual` があります。これは、セッションのミスをあなた自身のレッスンに変え、そのレッスンを、自分で強制されるルールに変えます。

<a name="install"></a>

## インストール

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

その後、プロジェクトで `/ritual` と入力します。初回は、依存関係から何を作っているかを検出し、質問を一つだけします（どのレッスンパッケージを有効にするか、そしてどの言語にするか）。そして `.ritual/` フォルダを作ります。セットアップはそれだけです。

Node 20.17 以降が必要です（`node --version`）。うまく動かないときは `/ritual doctor` と入力してください。Node、設定、フックが実際に動いているかを確認し、直すべき点を教えてくれます。

**アップデート。** Ritual はコミットのたびに良くなっています。`claude plugin update ritual@ritual` を実行して新しいセッションを開始するか、`/plugin` → Marketplaces で `ritual` マーケットプレイスの自動アップデートをオンにしてください。

**`claude` が見つからない？** Claude デスクトップアプリだけを入れている場合に起こります。アプリには独自のコピーが含まれています。コマンドラインをインストールしてください（[方法](https://code.claude.com/docs/en/setup)）。プラグインはアプリと共有されます。その後、アプリを再起動してください。

## 動作の例

Ritual 自身のテストから得た実際の出力です（Web プロジェクトの場合）。

**ガードは、プロジェクトがすでに失敗を見たコマンドをブロックし、代わりに何をすべきかを伝えます：**

```console
$ git push --force origin main
Ritual guard (force-push-to-main): A forced push to main rewrites shared history. Push to a branch and open a pull request.
```

**Claude が初めてコンポーネントを編集するとき、** そのグループの検出の問いが、セッションごとに一度だけ示されます（抜粋）：

```text
Ritual · Interface and design. Before you continue, run through these detector questions for what you
are about to do. If one applies, act on it and say so in one line; if none applies, just continue.
- 32 · Right after using the control, without moving from where it is, does the user see what changed?
- 45 · If the user does the most likely wrong thing (a typo, an empty answer, two clicks), what do they
       see, and can they keep going?
- WEB-2 · If a thousand fake messages arrive tomorrow, how does the owner find the one real one, and how
          do they delete the rest?
- WEB-4 · After submitting, whether it succeeded or failed, where does focus end up and where does the
          next Tab go?
```

**`/ritual` は、記憶ではなく、実際に起きたことから始まります**（抜粋）：

```text
Log: 1 failed command(s), 1 correction(s)
  10-12 20:05 cmd  npm run build  →  Exit code 1 Type error: Property 'email' does not exist on type 'FormData'
  10-12 20:05 fix  «that is wrong, the form still loses the message»  while Edit src/components/ContactForm.tsx

Guard: 2 block(s) · force-push-to-main ×1, python-c ×1 (details: hooks/guard.mjs --log)

Groups touched in 1 session(s): interface-and-design (1)
```

## 仕組み

あなたが何もしなくても、三つのフックが動きます：

| フック | 何をするか | かかるコスト |
|---|---|---|
| 🛡️ **ガード** | プロジェクトがすでに失敗を見たコマンドをブロックし、代わりに何を使うべきかを示します。ルールは `.ritual/guard.json` にあり、それぞれにブロックするケースと、通すケースが一つずつ付いています。 | ブロックするまでは何もかかりません。 |
| 📝 **ログ** | 失敗したすべてのコマンドと、あなたの訂正（「それは違う」「もう一度やって」）を、Claude が何に触れていたかとともに、その場で記録します。 | 何もかかりません。 |
| ❓ **質問** | セッションで初めて Claude がテスト、コンポーネント、スクリプト、ドキュメント、クエリを編集しようとするとき、またはコマンドを実行したりコミットしたりしようとするとき、そのグループの検出の問いを Claude に示します。グループごと、セッションごとに一度です。 | グループとパッケージによって、グループ内のレッスン一つにつき一行。三行から十三行です。 |

これらは Claude の動作を変えるものではありません。適切なタイミングで、プロジェクトがすでに学んだことを Claude の前に示すだけです。

セッションを閉じるとき、あるいは痛い目に遭ったミスの後には、`/ritual` と入力します。それはログを読み、各ミスをどのレッスンが防げたはずか、そしてなぜ防げなかったかを見つけ、はしごを登ります。レッスンは、できる場合にはガードルールかテストになります。

<details>
<summary><b><code>/ritual</code> の八つのステップ</b></summary>

0. 前回のリチュアルが残した**候補**を見直します：テストになれたのに、ならなかったもの。
1. **ミスを一覧にします。** まずログから始め、それぞれの原因を確認します。
2. **どのレッスンがそのミスをカバーしていたか、そしてなぜ発動しなかったかを探します。** まずミスのグループの中から探します。カバーしていたレッスンがあれば、その検出の問いや危険信号を研ぎ澄ませるか、例を加えます。
3. **誤検出を探します。** 何もないのに Claude を止めた質問や、誤ったガードのブロックです。誤ったブロックは、ルールが必ず通すべきケースになります。
4. カバーするレッスンがない場合にだけ、**新しいレッスン**を、五つの部分とともに書きます。
5. **可能な限りはしごを登ります。** コマンドのパターンはガードルールになります。コードの性質や、レッスン名を付けたテスト（本物のミスに対して失敗するところを見てから信頼します）もそうです。自動化できず、すでに二回壊れたものは、`CLAUDE.md` の一行になります。それ以外は、日付付きの候補のまま残ります。
6. すべてを同じコミットでまとめて保存し、チェッカーを実行します。
7. 例は匿名のまま残します。あるレッスンがどのプロジェクトにも当てはまるなら、ここで共有するための文面を提案します。自分から何かを公開することはありません。

</details>

そして `/ritual close` は、完了と言う前に、変更したグループの質問を変更内容と照らし合わせ、何が足りないかを伝えます。

## ライブラリ

レッスンは [`lessons/ja/`](lessons/ja/README.md) にあります（原文は英語で、[`lessons/en/`](lessons/en/README.md) にあります）。ミスが起きたときに何をしていたかによって、七つのグループに分かれています。

| グループ | 対象 |
|---|---|
| 執筆とドキュメント | ドキュメント、マニュアル、画面の文言、コンテンツ、プロンプト。 |
| 数値とデータ | ダッシュボード、レポート、モデル、表示されるあらゆる数値。 |
| テストとチェック | 自動テスト、バリデータ、レビュー、キャリブレーション。 |
| スクリプトとファイル | ファイルやデータを書き出す、生成する、変換するプログラム。 |
| インターフェースとデザイン | 画面、コンポーネント、スタイル、ページ。 |
| コンソールとツール | コマンド、サーバー、キャプチャ、そして邪魔をするツール。 |
| Git とプロセス | コミット、状態、保留中の作業、並行作業。 |

グループの上に、プロジェクトの種類ごとの**パッケージ**があります。パッケージのレッスンは、そのプロジェクトを作る場合にだけ当てはまるものです。グループのファイルの中に接頭辞付き（`WEB-1`）で置かれ、そのパッケージが有効なときにだけ質問が表示されます。セットアップ時に有効になり、`.ritual/config.json` で変更できます。

| パッケージ | レッスン |
|---|---|
| `web` | 5件：保存データが破損したときに失われるもの、公開フォームのボット、JavaScript を使わない場合のフォールバック、送信時のフォーカス、試行回数に制限のないログイン。 |
| `apps`, `crm`, `ai` | 順次追加されます。同じ方法で作られます。 |
| あなたの | 足りないプロジェクトの種類（モバイル、データ、ゲームなど）は、最初のレッスンから始まります：[レッスンの置き場所](lessons/TEMPLATE.md#where-a-lesson-goes)を参照してください。 |

すべてのレッスンには五つの部分があり、必ず五つすべてがそろっています：**要点**、実際にあって匿名の**例**、該当するケースと該当しないケースを分ける**検出の問い**、**危険信号**（同じミスを再び犯す直前に自分に言う言葉）、そして**どうするか**。番号は決して変わりません。重複するレッスンは、削除するのではなく「別のものに統合済み」と印が付けられます。完全な形式は [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md) にあります。

> **誤りを一度も見ていないチェッカーは、何も検証していない。** いつも通るテストは、壊れているかもしれない。それを知る唯一の方法は、本物の誤りに対して失敗するところを見ることである。 *検出の問い：* このチェックを、実際にエラーが現れる形で、そして正しいケースに対して、テストしたか？ *危険信号：* 「もう通っているから、正しく設定されている」
>
> — レッスン 13

Ritual は、このレッスンを自分自身にも当てはめています。このリポジトリのすべてのガードルール、すべてのチェッカー、すべてのフックには、そのケースが付いていて、組み込まれる前に失敗するところを確かめています。

各レッスンには、その出典と、どのモデルで・どの月に起きたかが書かれています（`field · ~opus · 2026-08`。`~` は記録ではなく記憶から来たものであることを表します）：

- `field`：プロジェクトで実際に起きたミスで、その実例があります。
- `lab`：[シミュレーション](simulations/README.ja.md)の中で壊れたもので、どのモデルでいつ起きたかが書かれています。誰かが自分のプロジェクトでそれを確認すると、`field` になります。
- `proposal`：目に見えて壊れることのないもの（セキュリティなど）だけで、公開された出典があります。

> [!NOTE]
> Ritual は Claude の上で動きます。あるモデルが犯すミスは、別のモデルでは起きないかもしれません。だからこそ、すべてのレッスンはそのモデルを記録しています。別のモデルでしか起きなかったレッスンは、誰かにその質問が届く前に Claude で確認されます。そして、新しい Claude がもうそのミスをしなくなったときには、データがそれを示します。[どのモデルがどんなミスをしたか](lessons/BY-MODEL.md)を参照してください。

## パッケージのレッスンは、シミュレーションから生まれる

プロジェクトの種類ごとのレッスンは、作り話ではありません。あるモデルが、Ritual を使わずに現実的な課題を作ります。別のセッションの別のモデルが、作られたものを実行し、何が壊れたかを証拠とともに記録します。二回とも壊れたものはレッスンになり、一回だけ壊れたものは候補のままです。どの課題も二回実行されます。新しいモデルが出ると課題は再び実行され、もう壊れなくなったレッスンは、データとともに格下げされます。方法と課題は [`simulations/`](simulations/README.ja.md) にあります。

最初のシミュレーションは、問い合わせフォームと管理ページを備えた、自転車修理店のウェブサイトでした。Sonnet が二回作りました。どちらの版も HTML を正しくエスケープし、リクエストを公開フォルダの中に保ち、同時に 300 件のメッセージにも耐えました。それでも、両方とも切断された書き込みの後に届いたメッセージを黙って失い、両方とも、後から片付ける手段のないまま、ボットから数百件のメッセージを受け付けていました。さらに一つは、テストが十回に一回失敗するにもかかわらず、通ったと報告していました。すべての発見は、残されたままのコードのそばに、証拠とともに [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md) にあります。

Ritual も、自分のレッスンで検査されています。WEB-1 は、Ritual 自身のログにあった同じバグを見つけ、先に失敗するところを見たテストとともに修正されました。

## 貢献する

一番かんたんな方法は、**レッスンを確認すること**です。そのレッスンのミスが実際にあなたの身にも起きたなら、匿名の例と、そのとき使っていたモデルを添えて、[確認を依頼して](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml)ください。確認のたびに、そのモデルがレッスンの `seen:` の一覧に加わるので、レッスン集は、どのモデルでそのミスが起きるか、そしてどの新しいモデルではもう起きないかを知ることができます。実際の例を伴う `lab` または `proposal` のレッスンは `field` になり、希望すれば、あなたの名前とともに記載されます。

ほかにも次のことができます：

- **自分のレッスンを共有する。** `/ritual share` と入力します。既存のレッスンと比べ（すでに扱われている間違いは重複ではなく確認になります）、別のものを作っている人の役に立つように書き直し、あなたのプロジェクトの名前を含んでいないかを確認し、どこに入れるかを決め、記入済みの[フォーム](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml)を開きます。内容を読んで送信してください。別のモデルでしか起きなかったレッスンは、[先に Claude で確認されます](simulations/README.ja.md#寄稿されたレッスンの確認)。
- **足りないプロジェクトの種類のために、新しいパッケージを開く。** `/ritual share` は、どの既存のパッケージにも当てはまらないレッスンがあるとき、それを提案します。または、それに対して**シミュレーションの課題を提案する**。
- **翻訳をレビューする。** レッスンはモデルによって翻訳されており、各レッスンにその旨が書かれています（`by: ai`）。あなたがネイティブスピーカーなら、直して、GitHub のユーザー名で署名してください。手順は [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md) にあります。
- **ガードルールを追加する。** あるいは、それが通すべきだったケースを追加する。

プルリクエストを開く前に `npm test` を実行してください。これは、すべてのチェッカーとフックのキャリブレーションを実行し、すべてのレッスンが五つの部分を持つこと、そしてインデックスが最新であることを確認します（`node scripts/lessons.mjs --index` で再生成できます）。

## 言語

英語が原文です。レッスンは七つの言語で用意されています：[English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md)。各翻訳には、どの版の原文から作られたかが書かれています。原文が変わると、チェッカーが翻訳の古さを警告します。

## ライセンス

MIT © 2026 Zurishadday
