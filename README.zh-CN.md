<div align="center">

<img src="assets/banner.png" width="100%" alt="Ritual. Claude makes a mistake once. Ritual makes sure it's the last time. Mistake, lesson, rule, check.">

**Claude 犯错只会一次。Ritual 确保那是最后一次。**

Ritual 是一个 Claude Code 插件，它把每个错误变成一条教训，把每条教训变成一条规则，并在可能的时候，把每条规则变成一项测试或一道守卫。

[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-E8743B)](#install)
[![Tests](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml/badge.svg)](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml)
[![Library](https://img.shields.io/badge/library-browse_the_lessons-3FB950)](https://zurishadday.github.io/Ritual/zh-CN/)
[![License: MIT](https://img.shields.io/github/license/Zurishadday/Ritual)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Zurishadday/Ritual)](https://github.com/Zurishadday/Ritual/commits/main)

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · **中文** · [日本語](README.ja.md) · [한국어](README.ko.md)

</div>

其他工具只是把学到的内容记下来；Ritual 则更进一步，会去检验它。因为只存在于文字中的规则，在漫长的会话里会被遗忘，而会自我检验的规则则不会。

它附带 **55 条实战教训**，每条都源于一次真实的错误；还有 **按项目类型划分的课程包**，其中的教训来自观察模型构建某个东西并把它弄坏的过程；以及 **一条命令** `/ritual`，它把你会话中的错误变成你自己的教训，再把你的教训变成会自我执行的规则。

**实测：**在一个 Ritual 从未学习过的网页任务上，有 Ritual 构建了四次，没有 Ritual 也构建了四次，每次构建都经过盲审。在编写过程中就决定的错误（错误处理路径、键盘焦点、损坏的数据文件；这一类别在运行前就已定下），没有 Ritual 时出现了 11 次，而按发布时的原样、从一开始就带有课程时只出现了 1 次（同时开启收尾时为 5 次）。运行后才能看到的错误没有减少，新错误和错误总数也没有减少，这是按运行前设定的规则判定的：Ritual 会在编写代码时阻止它有教训对应的错误。一次有 Ritual 但没有任何审查的构建，其课程包错误数并不比一次没有 Ritual、但经过审查和修复的构建更多（平均 3.5 对 4.5，处于波动范围之内），成本为 $0.61 对 $2.64。一项任务，每组四次构建，一个模型：数据和方法见 [模拟](simulations/clinic/RESULTS.md)。

<p align="center"><a href="simulations/clinic/RESULTS.md"><img src="assets/ab-chart.png" alt="使用 Ritual 后，在编写过程中决定的错误从 11 个降到 1 个，而一次没有任何审查的构建，其错误数与经过审查和修复的无 Ritual 构建相当，成本仅为四分之一" width="540"></a></p>

<a name="install"></a>

## 安装

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

然后，在你的项目中输入 `/ritual`。第一次运行时，它会根据你的依赖和 README 判断你在构建什么，并只问你一件事：项目是什么、启用哪些课程包及原因，以及使用哪种语言。然后它会创建 `.ritual/` 文件夹。设置就只有这些。

需要 Node 20.17 或更高版本（`node --version`）。如果有什么不能用，输入 `/ritual doctor`：它会检查 Node、你的设置以及 hooks 是否真的在运行，并告诉你需要修什么。

**只需开启一次自动更新。** 新的课程会经常推出，而 Claude Code 对非 Anthropic 的 Marketplaces 默认关闭自动更新。输入 `/plugin`，打开 Marketplaces，选择 `ritual`，然后点击 Enable auto-update。在桌面应用中，你可以让 Claude「为 ritual marketplace 开启自动更新」，它会在你的 Claude Code `settings.json` 的 `ritual` 条目里添加 `"autoUpdate": true`。在你这样做之前，Ritual 每周提醒你一次。手动更新：运行 `claude plugin update ritual@ritual`，然后开始一个新会话。

**找不到 `claude`？** 只安装了 Claude 桌面应用时会出现这种情况，因为桌面应用自带一份副本。请安装命令行工具（[方法](https://code.claude.com/docs/en/setup)）：它与应用共享插件。然后重启应用。

## 实际运行的样子

以下是 Ritual 自己的测试在一个网页项目中的真实输出。

**守卫会拦下你的项目已经见过失败的命令，**并告诉你应该改做什么：

```console
$ git push --force origin main
Ritual guard (force-push-to-main): A forced push to main rewrites shared history. Push to a branch and open a pull request.
```

**Claude 第一次编辑组件时，**它会收到该组的检测问题，每个会话一次（已删节）：

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

**`/ritual` 从实际发生的事情出发，**而不是靠记忆（节选）：

```text
Log: 1 failed command(s), 1 correction(s), 0 agent report(s)
  10-12 20:05 cmd  npm run build  →  Exit code 1 Type error: Property 'email' does not exist on type 'FormData'
  10-12 20:05 fix  «that is wrong, the form still loses the message»  while Edit src/components/ContactForm.tsx

Guard: 2 block(s) · force-push-to-main ×1, python-c ×1 (details: hooks/guard.mjs --log)

Groups touched in 1 session(s): interface-and-design (1)
```

## 工作原理

五项功能通过 Claude Code 的钩子无需你做任何操作即可工作，第六项在你需要时可用：

| 钩子 | 作用 | 代价 |
|---|---|---|
| 📚 **课程包教训** | 会话开始时，在任何计划之前，它把你项目的课程包（web、education……）的教训交给 Claude：这类项目通常会在哪里出错，此时设计仍可以吸收。 | 每条课程包教训一行（web 为十条），仅在启用课程包时。 |
| 🛡️ **守卫** | 阻止你的项目已经见过失败的命令，并告诉你该改用什么。规则保存在 `.ritual/guard.json` 中，每条规则都附有一个它会阻止的案例和一个它会放行的案例。 | 没有，直到它拦截为止。 |
| 📝 **日志** | 即时记录每一条失败的命令，以及你的每一次纠正（“那是错的”、“再做一次”），并附上 Claude 当时正在处理的内容；每个在后台运行的代理的报告也会记下。 | 没有。 |
| ❓ **提问** | 会话中，Claude 第一次准备编辑测试、组件、脚本、文档或查询，或者准备运行命令或提交时，它会把该组的检测问题展示给 Claude。每个组、每个会话只显示一次。 | 组中每条教训占一行：今天为四到十六行，取决于所在的组和课程包，最多二十行，确认最多的排在最前（在 `.ritual/config.json` 中的 `"budget"` 可以改变这个上限）。 |
| 🔎 **适用的教训** | 在后台，Haiku 阅读每个请求以及每个文件的首次写入，从每个组中挑出现在适用的教训，并排除 Claude 已经见过的那些；没有任何变化时，它不做挑选。请求的教训会在 Claude 的第一步之前送达：该步骤会等待它们；若它们带来新内容，Claude 会先读过再行动。文件的教训会在它的下一步送达。Haiku 从不读取你的 `.env`、密钥、证书或凭据，也不读取项目之外的文件；任何看起来像密钥或密码的内容在发出前都会被遮盖，你的请求和文件内容都不会被保存。而且 Ritual 会给自己打分：`/ritual` 会告诉你教训送达太晚的频率，以及被跳过的挑选漏掉教训的频率。 | 每次挑选约 $0.001，通过你自己的 Claude Code 进行：无需 API 密钥，也无需额外账户。请求之后的第一步会等待，中位数约 3 秒，44% 的请求无需等待，最多 25 秒。`"picker": false` 可将其关闭。 |
| ✅ **收尾**（可选） | 在 `.ritual/config.json` 中设置 `"close": true` 后，会话中第一次在改动文件后准备结束时，它会把 Claude 送回一次，让它通过运行来检查工作：你的课程包的教训及其自动检查，每项检查一行，说明它运行了什么。默认关闭；输入 `/ritual close` 可随时执行。 | 每个改动过文件的会话多一轮，仅在开启时。 |

它们只是在恰当的时刻，把你的项目已经学到的东西摆到 Claude 面前。
在 **web** 课程包且开启收尾时，它会针对你机器上运行的网站执行 `scripts/web-check.mjs`：在关闭 JavaScript 的情况下并用键盘提交表单，发送一阵突发请求和几次被拒绝的尝试，并保存手机和桌面的截图。它仅限本地地址，并会说明发送了多少条测试消息。

会话结束时，或在一次造成伤害的错误之后，输入 `/ritual`。它读取日志，找出每个错误本应被哪条教训拦住、又为何没有拦住，并沿着阶梯向上攀升：只要能做到，教训就变成守卫规则或测试。

<details>
<summary><b>The eight steps of <code>/ritual</code></b></summary>

0. 检视上一次仪式留下的**候选项**：可以成为测试却没有成为测试的内容。
1. **列出错误**，从日志开始，并确认每一个错误的原因。
2. 查找**哪条教训涵盖了它，以及它为何没有触发**，首先在该错误所属的组中查找。如果有一条涵盖了它，就修改其检测问题或警示信号，或者补充例子。
3. 查找**误报**：让 Claude 无故停下来的问题，以及错误的守卫拦截。错误的拦截会变成规则必须放行的一个案例。
4. 只有在没有任何教训涵盖它时，才写一条**新教训**，包含其五个部分。
5. **逐级向上**，凡能做到的地方都如此：命令模式变成守卫规则；代码的某个属性，或以教训命名、在对着真实错误时先看到它失败才被信任的测试；无法自动化、却已经出过两次问题的，变成 `CLAUDE.md` 中的一行。其余一切都保留为带日期的候选项。
6. 把所有内容一起保存在同一次提交中，并运行检查器。
7. 保持例子匿名；如果某条教训适用于任何项目，就为你提供可在这里分享的文字。它会提醒你尚未分享的教训；教训库收录其中一条后，它会标记你的那条，使其不会重复显示。它从不自行发布任何内容。

</details>

另外，`/ritual close` 随时都可以运行，它会把你所涉及的各组的问题对照这次改动逐一检查，并告诉你还缺什么。

## 教训库

教训存放在 [`lessons/zh-CN/`](lessons/zh-CN/README.md) 中（原文为英文，见 [`lessons/en/README.md`](lessons/en/README.md)），按你**做事时的情境**分为七组：

| 组 | 涵盖内容 |
|---|---|
| 写作与文档 | 文档、手册、屏幕文字、内容、提示词。 |
| 数字与数据 | 仪表盘、报告、模型，以及任何被展示出来的数字。 |
| 测试与检查 | 自动化测试、验证器、审查、校准。 |
| 脚本与文件 | 写入、生成或转换文件和数据的程序。 |
| 界面与设计 | 屏幕、组件、样式、页面。 |
| 终端与工具 | 命令、服务器、捕获，以及挡路的工具。 |
| Git 与流程 | 提交、状态、待办事项、并行工作。 |

在这些组之上，还有按项目类型划分的**课程包**：只有当你正在做那种项目时才适用的教训。它们位于所属组的文件中，并带有前缀（如 `WEB-1`），而它们的问题只在课程包开启时才会出现。它们在安装时开启，也可以在 `.ritual/config.json` 中修改。

| 课程包 | 教训 |
|---|---|
| `web` | 5 条：保存数据损坏后的丢失、公开表单上的机器人、没有 JavaScript 时的后备方案、提交时的焦点，以及无尝试次数限制的登录。 |
| `education` | 5 条：不靠技能也能通过的练习、题目前就能看到答案、两个都说得通的答案、靠位置或长度猜测，以及直接泄露答案的提示。 |
| `apps`、`crm`、`ai` | 正在制作中，采用同样的方法。 |
| 你的 | 缺少的某类项目（移动端、数据、游戏……）从它的第一条教训开始：参见[一条教训放在哪里](lessons/TEMPLATE.md#where-a-lesson-goes)。 |

每条教训都有五个部分，且总是齐全：**核心**、一个真实且匿名的**例子**、把适用与不适用的情况区分开的**检测问题**、**警示信号**（你在再次犯同样错误之前对自己说的那句话），以及**怎么做**。每条教训还有一个永不改变的编号：多余的教训会被标记为已并入另一条，而绝不删除。完整格式见 [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md)。

> **从未见过错误的检查器什么也验证不了。** 一个永远通过的测试可能是坏的。要知道它是否有效，唯一的办法是让它对着真实的错误失败一次。*检测问题：* 我有没有用错误在真实会出现的各种形式去测试我的检查？有没有用正确的情况去测试？*警示信号：* “它已经通过了，所以设置是对的。”
>
> — 第 13 条

Ritual 也把这条教训用在它自己身上：本仓库中的每条守卫规则、每个检查器和每个钩子都附有它的案例，并且在加入之前都曾被看到失败过。

每条教训都注明了来源，以及它发生时所用的模型和月份（`field · ~opus · 2026-08`；`~` 表示来自记忆，而非记录）：

- `field`：某个项目中的一次真实错误，附带那个例子。
- `lab`：它在[模拟](simulations/README.zh-CN.md)中被打破，并注明了模型和时间。当有人在自己的项目中确认它时，它就变为 `field`。
- `proposal`：仅用于不会明显被打破的内容（安全），附公开来源。

> [!NOTE]
> Ritual 运行在 Claude 上，而一个模型犯的错误，另一个模型不一定会犯。因此每条教训都记录其模型：只在另一个模型下发生过的教训，在任何人收到它的问题之前，会先由 Claude 检查；当较新的 Claude 不再犯某个错误时，数据会显示出来。参见 [各模型犯过哪些错误](lessons/BY-MODEL.md)。

## 课程包的教训来自模拟

每类项目的教训并非凭空编造。一个模型在没有 Ritual 的情况下构建一个真实的任务；另一个模型在另一个会话中运行所构建的东西，并记录哪里出了问题，附上证据。每个任务都运行两次：两次都出问题的是教训；只出问题一次的，仍是候选项。当新模型发布时，任务会再次运行，而不再出问题的教训会被降级，并附上数据。方法与任务见 [`simulations/`](simulations/README.zh-CN.md)。

第一个模拟是一家自行车修理店的网站，带有联系表单和管理页面。Sonnet 构建了它两次。两个版本都正确地转义了 HTML，把请求限制在公开目录之内，并且在同时收到 300 条消息时依然稳定。即便如此，两个版本都会悄悄丢失在写入被中断之后到达的那条消息；两个版本都接受了来自机器人的数百条消息，却没有办法把它们清理掉；其中一个版本还声称它的测试通过了，而实际上它每十次就失败一次。所有发现连同证据，都记录在 [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md) 中，与留下的代码放在一起。

第二次由脚本运行（[`scripts/simulate.mjs`](scripts/simulate.mjs)）：Sonnet 5.5 在隔离的会话中构建，Opus 5.5 进行审查。九个网页课程中有七个所描述的错误在两次运行中再次发生。WEB-1 的具体错误没有再次出现，但其机制出现了：数据文件一旦损坏，之后每条新消息都会失败，因此该课程被加强，而不是被降级。另外，两次运行中都出现了一个新错误：管理员登录没有尝试次数限制，该错误成为 WEB-5。对比见 [摘要](simulations/web/runs/2026-10-sonnet-5-5-summary.md)。

Ritual 也用它自己的教训来检验。WEB-1 在 Ritual 自己的日志中发现了同样的 bug，并通过一个先被看到失败的测试修复了它。

## 参与贡献

最简单的方式：**确认一条教训**。如果某条教训也确实在你身上发生过，请[提交一份确认](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml)，附上你匿名的例子和你当时使用的模型。每次确认都会把该模型加入这条教训的 `seen:` 列表，让教训库知道某个错误适用于哪些模型，以及哪些较新的模型已经不再犯它。`lab` 或 `proposal` 教训若有真实的例子，就会变成 `field`；如果你愿意，也可以署上你的名字。

你还可以：

- **分享一条你的教训**：输入 `/ritual share`。它会将其与现有教训比较（已被覆盖的错误会变成确认，而不是重复条目），改写成对正在构建其他东西的人也有帮助的样子，检查它没有提及你项目中的任何内容，决定它应放在哪里，并打开已填好的[表单](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml)。由你阅读并提交。只在另一个模型下发生过的教训，会先[由 Claude 检查](simulations/README.zh-CN.md#检查贡献的教训)。
- **为缺少的某类项目开一个新课程包**：当一条教训不属于任何现有课程包时，`/ritual share` 会提议新建一个。或者为它**提议一个模拟任务**。
- **审校译文**：教训由模型翻译，每条都会注明（`by: ai`）。如果你是母语者，请修正它，并用你的 GitHub 用户名署名。流程见 [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md)。
- **添加一条守卫规则**，或一个它本应放行的案例。

提交 pull request 之前，运行 `npm test`。它会校准每个检查器和钩子，并检查每条教训是否都有五个部分、索引是否为最新（`node scripts/lessons.mjs --index` 可以重新生成索引）。

## 语言

英文为原文。教训共有七种语言：[English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md)。每个译文都会注明它译自原文的哪个版本：原文一旦改动，检查器便会警告译文已过时。

## 许可证

MIT © 2026 Zurishadday
