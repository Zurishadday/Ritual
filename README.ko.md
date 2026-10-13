<div align="center">

<img src="assets/banner.png" width="100%" alt="Ritual. Claude makes a mistake once. Ritual makes sure it's the last time. Mistake, lesson, rule, check.">

**Claude는 실수를 한 번 합니다. Ritual은 그것이 마지막이 되도록 합니다.**

모든 실수를 교훈으로, 모든 교훈을 규칙으로, 그리고 가능하다면 모든 규칙을 테스트나 가드로 바꿔 주는 Claude Code 플러그인입니다.

[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-E8743B)](#install)
[![Tests](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml/badge.svg)](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml)
[![Library](https://img.shields.io/badge/library-browse_the_lessons-3FB950)](https://zurishadday.github.io/Ritual/ko/)
[![License: MIT](https://img.shields.io/github/license/Zurishadday/Ritual)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Zurishadday/Ritual)](https://github.com/Zurishadday/Ritual/commits/main)

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · **한국어**

</div>

다른 도구들은 배운 것을 적어 둡니다. Ritual은 한 걸음 더 나아가 그것을 실제로 검사합니다. 텍스트로만 존재하는 규칙은 긴 세션에서 잊히지만, 스스로를 검사하는 규칙은 그렇지 않기 때문입니다.

**49개의 현장 교훈**이 들어 있으며, 각 교훈은 실제 실수에서 태어났습니다. **프로젝트 종류별 패키지**도 있는데, 그 교훈들은 모델이 무언가를 만들고 망가뜨리는 것을 지켜보며 얻은 것입니다. 그리고 **명령 하나**, `/ritual`이 있어서 세션의 실수를 여러분 자신의 교훈으로, 그 교훈을 스스로 적용되는 규칙으로 바꿔 줍니다.

<a name="install"></a>

## 설치

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

그다음 프로젝트에서 `/ritual`을 입력하세요. 처음 실행하면 의존성을 보고 무엇을 만들고 있는지 알아낸 뒤, 질문을 하나만 합니다(어떤 교훈 패키지를 켤지, 그리고 어떤 언어로 할지). 그리고 `.ritual/` 폴더를 만듭니다. 설정은 이것이 전부입니다.

Node 20.17 이상이 필요해요 (`node --version`). 문제가 생기면 `/ritual doctor`를 입력해 보세요. Node, 설정, 훅이 실제로 실행되고 있는지 확인하고 무엇을 고쳐야 하는지 알려 줘요.

**업데이트.** Ritual은 커밋할 때마다 나아집니다. `claude plugin update ritual@ritual`을 실행하고 새 세션을 시작하거나, `/plugin` → Marketplaces에서 `ritual` 마켓플레이스의 자동 업데이트를 켜세요.

**`claude`를 찾을 수 없나요?** Claude 데스크톱 앱만 있을 때 생기는 문제인데, 이 앱에는 자체 사본이 들어 있기 때문입니다. 명령줄 도구를 설치하세요([방법](https://code.claude.com/docs/en/setup)). 그러면 앱과 플러그인을 공유합니다. 그다음 앱을 다시 시작하세요.

## 실제 동작 모습

Ritual 자체 테스트에서 나온 실제 출력이며, 웹 프로젝트에서 얻은 것입니다.

**가드는 프로젝트에서 이미 실패한 것을 확인한 명령을 막고,** 대신 무엇을 해야 하는지 알려 줍니다:

```console
$ git push --force origin main
Ritual guard (force-push-to-main): A forced push to main rewrites shared history. Push to a branch and open a pull request.
```

**Claude가 컴포넌트를 처음 편집할 때,** 그 그룹의 감지 질문을 세션당 한 번, 줄여서 받습니다:

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

**`/ritual`은 기억이 아니라 실제로 일어난 일에서 시작합니다** (발췌):

```text
Log: 1 failed command(s), 1 correction(s)
  10-12 20:05 cmd  npm run build  →  Exit code 1 Type error: Property 'email' does not exist on type 'FormData'
  10-12 20:05 fix  «that is wrong, the form still loses the message»  while Edit src/components/ContactForm.tsx

Guard: 2 block(s) · force-push-to-main ×1, python-c ×1 (details: hooks/guard.mjs --log)

Groups touched in 1 session(s): interface-and-design (1)
```

## 작동 방식

세 개의 hook이 여러분이 아무것도 하지 않아도 동작합니다:

| Hook | 하는 일 | 비용 |
|---|---|---|
| 🛡️ **가드** | 프로젝트에서 이미 실패한 것을 확인한 명령을 막고, 대신 무엇을 써야 하는지 알려 줍니다. 규칙은 `.ritual/guard.json`에 있으며, 규칙마다 막는 사례 하나와 통과시키는 사례 하나가 붙어 있습니다. | 막기 전까지는 없음. |
| 📝 **로그** | 실패한 모든 명령과 여러분의 모든 정정(“틀렸어”, “다시 해”)을 일어나는 순간 기록하고, 그때 Claude가 무엇을 건드리고 있었는지 함께 남깁니다. | 없음. |
| ❓ **질문** | 세션에서 처음으로 Claude가 테스트, 컴포넌트, 스크립트, 문서, 쿼리를 편집하려 하거나, 명령을 실행하거나 커밋을 만들려 할 때, 그 그룹의 감지 질문을 Claude에게 보여 줍니다. 그룹당, 세션당 한 번입니다. | 그룹의 교훈 하나당 한 줄. 그룹과 패키지에 따라 3줄에서 13줄. |

이 중 어느 것도 Claude가 하는 일을 바꾸지 않습니다. 적절한 순간에, 프로젝트가 이미 배운 것을 Claude 앞에 보여 줄 뿐입니다.

세션을 닫을 때, 또는 아팠던 실수 뒤에 `/ritual`을 입력하세요. 이 명령은 로그를 읽고, 각 실수를 막았어야 했던 교훈이 무엇인지, 그리고 왜 막지 못했는지 찾은 다음 사다리를 오릅니다. 가능하면 교훈은 가드 규칙이나 테스트가 됩니다.

<details>
<summary><b><code>/ritual</code>의 여덟 단계</b></summary>

0. 지난 리추얼이 열어 둔 **후보**를 검토합니다. 테스트가 될 수 있었지만 되지 않은 것들입니다.
1. **실수를 나열하고**, 로그에서 시작해 각 실수의 원인을 확인합니다.
2. **어떤 교훈이 그것을 다뤘고 왜 작동하지 않았는지** 찾습니다. 먼저 실수가 속한 그룹에서 찾습니다. 다뤘던 교훈이 있다면, 그 감지 질문이나 경고 신호를 날카롭게 다듬거나 예시를 추가합니다.
3. **잘못된 경고**를 찾습니다. 이유 없이 Claude를 멈춰 세운 질문과 잘못된 가드 차단이 대상입니다. 잘못된 차단은 규칙이 반드시 통과시켜야 할 사례가 됩니다.
4. 다루는 교훈이 전혀 없을 때만 **새 교훈**을 씁니다. 다섯 부분을 모두 갖춥니다.
5. 가능한 곳마다 **사다리를 오릅니다**. 명령 패턴은 가드 규칙이 됩니다. 코드의 속성이나 교훈 이름을 딴 테스트는, 실제 실수 앞에서 실패하는 것을 직접 본 뒤에야 신뢰합니다. 자동화할 수 없고 이미 두 번 망가뜨린 것은 `CLAUDE.md`의 한 줄이 됩니다. 나머지는 날짜가 붙은 후보로 남습니다.
6. 모든 것을 같은 커밋에 함께 저장하고, 검사기를 실행합니다.
7. 사례는 익명으로 유지합니다. 어떤 교훈이 어느 프로젝트에서든 성립하면, 여기에 공유할 수 있는 텍스트를 제안합니다. 혼자서 무엇인가를 공개하는 일은 없습니다.

</details>

그리고 `/ritual close`는 무엇인가를 끝났다고 부르기 전에, 여러분이 건드린 그룹들의 질문을 변경 사항에 하나씩 대입해 무엇이 빠졌는지 알려 줍니다.

## 라이브러리

교훈은 [`lessons/ko/`](lessons/ko/README.md)에 있으며, 실수가 일어났을 때 **무엇을 하고 있었는지**에 따라 일곱 그룹으로 나뉩니다. 원본은 영어이며 [`lessons/en/`](lessons/en/README.md)에 있습니다:

| 그룹 | 다루는 내용 |
|---|---|
| 글쓰기와 문서 | 문서, 매뉴얼, 화면 문구, 콘텐츠, 프롬프트. |
| 숫자와 데이터 | 대시보드, 보고서, 모델, 표시되는 모든 숫자. |
| 테스트와 점검 | 자동화된 테스트, 검증기, 리뷰, 보정. |
| 스크립트와 파일 | 파일과 데이터를 쓰고, 생성하고, 변환하는 프로그램. |
| 인터페이스와 디자인 | 화면, 컴포넌트, 스타일, 페이지. |
| 콘솔과 도구 | 명령, 서버, 캡처, 그리고 방해가 되는 도구. |
| Git과 프로세스 | 커밋, 상태, 대기 중인 항목, 병렬 작업. |

그룹 위에는 프로젝트 종류별 **패키지**가 있습니다. 패키지 교훈은 여러분이 그런 것을 만들 때에만 적용됩니다. 각 패키지 교훈은 그룹 파일 안에 접두사(`WEB-1`)와 함께 있으며, 패키지를 켰을 때에만 질문이 나타납니다. 설정할 때 켜고, `.ritual/config.json`에서 바꿀 수 있습니다.

| 패키지 | 교훈 |
|---|---|
| `web` | 4개: 끊긴 쓰기 뒤에 무엇이 사라지는지, 공개 양식에 몰려드는 봇, 자바스크립트가 없을 때의 대체 동작, 제출 시의 포커스. |
| `apps`, `crm`, `ai` | 준비 중이며, 같은 방식으로 만들어집니다. |
| 여러분의 것 | 빠진 프로젝트 종류(모바일, 데이터, 게임 등)는 첫 교훈부터 시작합니다: [교훈이 들어갈 곳](lessons/TEMPLATE.md#where-a-lesson-goes)을 보세요. |

모든 교훈은 다섯 부분을 가지며, 언제나 다섯 부분이 모두 있습니다. **핵심**, 실제이고 익명인 **예시**, 해당되는 경우와 아닌 경우를 가르는 **감지 질문**, **경고 신호**(같은 실수를 다시 하기 직전에 자신에게 하게 되는 말), 그리고 **해야 할 일**입니다. 또 바뀌지 않는 번호가 있습니다. 중복된 교훈은 다른 교훈에 병합되었다고 표시하며, 절대 삭제하지 않습니다. 전체 형식은 [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md)에 있습니다.

> **오류를 본 적 없는 검사기는 아무것도 검증하지 않는다.** 항상 통과하는 테스트는 고장 났을 수 있다. 그것을 알 수 있는 유일한 방법은 실제 오류에 대해 실패하는 모습을 직접 보는 것이다. *감지 질문:* 내 검사기를 실제로 나타날 형태의 오류에 대해 테스트했는가? 그리고 올바른 경우에 대해서도 테스트했는가? *경고 신호:* “이미 통과하니까 제대로 설정된 거예요.”
>
> — 교훈 13

Ritual은 이 교훈을 자기 자신에게도 적용합니다. 이 저장소의 모든 가드 규칙, 모든 검사기, 모든 hook은 자신의 사례를 가지고 있으며, 들어가기 전에 실패하는 모습을 먼저 확인했습니다.

각 교훈에는 출처와 함께, 어떤 모델과 어느 달에 일어났는지도 적혀 있습니다(`field · ~opus · 2026-08`; `~`는 기록이 아니라 기억에서 나왔다는 뜻입니다):

- `field`: 실제 프로젝트에서 일어난 실수이며, 그 사례가 함께 있습니다.
- `lab`: [시뮬레이션](simulations/README.ko.md)에서 깨졌으며, 어떤 모델과 언제인지 적혀 있습니다. 누군가 자신의 프로젝트에서 확인하면 `field`가 됩니다.
- `proposal`: 눈에 띄게 깨지지 않는 것(보안)에만 쓰며, 공개 출처가 있습니다.

> [!NOTE]
> Ritual은 Claude 위에서 돌아가며, 한 모델이 저지른 실수를 다른 모델은 저지르지 않을 수 있습니다. 그래서 모든 교훈은 자신이 일어난 모델을 기록합니다. 다른 모델에서만 일어난 교훈은 누군가에게 질문이 전달되기 전에 Claude로 먼저 확인하며, 더 새로운 Claude가 더 이상 실수하지 않으면 데이터가 그것을 보여 줍니다. [어떤 모델이 어떤 실수를 했는지](lessons/BY-MODEL.md)를 참고하세요.

## 패키지 교훈은 시뮬레이션에서 나옵니다

패키지별 교훈은 지어낸 것이 아닙니다. 한 모델이 Ritual 없이 현실적인 과제를 만들고, 다른 세션의 다른 모델이 만들어진 것을 실행하며 무엇이 깨졌는지 증거와 함께 기록합니다. 모든 과제는 두 번 실행합니다. 두 번 다 깨진 것은 교훈이 되고, 한 번만 깨진 것은 후보로 남습니다. 새 모델이 나오면 과제를 다시 실행하며, 더 이상 깨지지 않는 교훈은 데이터와 함께 강등됩니다. 방법은 [`simulations/`](simulations/README.ko.md)에 있습니다.

첫 번째 시뮬레이션은 자전거 수리점의 웹사이트였습니다. 문의 양식과 관리자 페이지가 있었습니다. Sonnet이 두 번 만들었는데, 두 버전 모두 HTML을 제대로 이스케이프했고, 요청을 공개 폴더 안에 가두었으며, 300개의 메시지가 동시에 몰려도 버텼습니다. 그럼에도 둘 다 끊긴 쓰기 뒤에 도착한 메시지를 조용히 잃어버렸고, 둘 다 봇이 보낸 수백 개의 메시지를 정리할 방법 없이 받아들였으며, 한 버전은 열 번에 한 번 실패하는데도 테스트가 통과했다고 말했습니다. 모든 발견 사항은 증거와 함께 [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md)에 있으며, 남겨진 그대로의 코드와 나란히 있습니다.

Ritual도 자기 교훈으로 검사합니다. WEB-1은 Ritual 자신의 로그에서 같은 버그를 찾아냈고, 먼저 실패하는 것을 확인한 테스트와 함께 고쳐졌습니다.

## 기여하기

가장 쉬운 방법은 **교훈을 확인해 주는 것**입니다. 어떤 교훈이 여러분에게도 실제로 일어난 적이 있다면, 익명의 사례와 사용하던 모델을 적어 [확인을 신청](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml)해 주세요. 확인할 때마다 그 모델이 교훈의 `seen:` 목록에 추가되므로, 라이브러리는 어떤 모델에 그 실수가 해당하는지, 그리고 어떤 새 모델에서는 더 이상 일어나지 않는지 알게 됩니다. 실제 사례가 있는 `lab`이나 `proposal` 교훈은 `field`가 되며, 원하시면 이름도 함께 올릴 수 있습니다.

다음과 같이도 기여할 수 있습니다:

- 여러분의 교훈을 **공유하세요**: `/ritual share`를 입력하세요. 이 명령은 교훈 라이브러리와 비교하고(이미 다루는 실수는 중복이 아니라 확인이 됩니다), 다른 것을 만드는 사람에게도 도움이 되도록 다시 쓰고, 여러분의 프로젝트에서 나온 이름이 없는지 확인하고, 어디에 들어갈지 정한 뒤 이미 채워진 [양식](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml)을 엽니다. 읽어 보고 제출하세요. 다른 모델에서만 일어난 교훈은 [먼저 Claude로 확인합니다](simulations/README.ko.md#기여된-교훈-확인하기).
- **빠진 프로젝트 종류를 위해 새 패키지를 여세요**: 어떤 교훈이 기존 패키지 중 어디에도 맞지 않으면 `/ritual share`가 하나를 제안합니다. 또는 그것을 위한 **시뮬레이션 과제를 제안하세요**.
- **번역을 검토하세요**: 교훈은 모델이 번역했으며, 각 교훈에 그렇다고 적혀 있습니다(`by: ai`). 원어민이라면 고치고 여러분의 GitHub 사용자명으로 서명해 주세요. 절차는 [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md)에 있습니다.
- **가드 규칙을 추가하거나**, 통과시켰어야 할 사례를 추가하세요.

pull request를 열기 전에 `npm test`를 실행하세요. 모든 검사기와 hook의 보정을 돌리고, 모든 교훈에 다섯 부분이 모두 있는지, 색인이 최신인지 확인합니다(`node scripts/lessons.mjs --index`로 색인을 다시 만듭니다).

## 언어

영어가 원본입니다. 교훈은 일곱 개 언어로 제공됩니다: [English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md). 각 번역에는 어떤 버전의 원본에서 왔는지가 적혀 있습니다. 원본이 바뀌면 검사기가 번역이 오래되었다고 경고합니다.

## 라이선스

MIT © 2026 Zurishadday
