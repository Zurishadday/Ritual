<div align="center">

<img src="assets/banner.png" width="100%" alt="Ritual. Claude makes a mistake once. Ritual makes sure it's the last time. Mistake, lesson, rule, check.">

**O Claude erra uma vez. O Ritual garante que seja a última.**

Um plugin do Claude Code que transforma cada erro em lição, cada lição em regra e cada regra, quando possível, em um teste ou uma guarda.

[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-E8743B)](#install)
[![Tests](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml/badge.svg)](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml)
[![Library](https://img.shields.io/badge/library-browse_the_lessons-3FB950)](https://zurishadday.github.io/Ritual/pt/)
[![License: MIT](https://img.shields.io/github/license/Zurishadday/Ritual)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Zurishadday/Ritual)](https://github.com/Zurishadday/Ritual/commits/main)

[English](README.md) · [Español](README.es.md) · **Português** · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

</div>

Outras ferramentas anotam o que foi aprendido; esta vai até o fim e confere, porque uma regra que existe só em texto é esquecida numa sessão longa, e uma que se confere sozinha não.

Ele traz **61 lições de campo**, cada uma nascida de um erro real; **pacotes por tipo de projeto**, cujas lições vêm de observar um modelo construir algo e quebrá-lo; e **um comando**, `/ritual`, que transforma os erros da sua sessão em lições suas, e suas lições em regras que se aplicam sozinhas.

**Medido:** uma tarefa web que o Ritual nunca aprendeu, construída quatro vezes sem o Ritual e quatro com ele, com cada construção revisada às cegas. Os erros decididos durante a escrita (o caminho de erro, o foco do teclado, um arquivo de dados danificado), um grupo definido antes das execuções, apareceram 11 vezes sem o Ritual e uma vez com suas lições desde o início, como ele é distribuído (5 vezes com o fechamento também ativo). Os erros que só aparecem ao executar não diminuíram, nem os erros novos, nem o total, pela regra definida antes das execuções: o Ritual evita os erros para os quais tem uma lição, enquanto o código é escrito. Uma construção com o Ritual e sem nenhuma revisão terminou com não mais erros do pacote do que uma construção sem o Ritual depois de revisão e correção (3,5 contra 4,5 em média, dentro da variação), por $0.61 contra $2.64. Uma tarefa, quatro construções por grupo, um modelo: os dados e o método estão em [simulações](simulations/clinic/RESULTS.md).

<p align="center"><a href="simulations/clinic/RESULTS.md"><img src="assets/ab-chart.png" alt="Com o Ritual, os erros decididos durante a escrita caíram de 11 para 1, e uma construção sem nenhuma revisão igualou uma construção sem o Ritual que foi revisada e corrigida, a um quarto do custo" width="540"></a></p>

<a name="install"></a>

## Instalação

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

Depois, no seu projeto, digite `/ritual`. Na primeira vez, ele descobre o que você está construindo a partir das suas dependências e do seu README, e faz uma única pergunta: o que é o projeto, quais pacotes de lições ativar e por quê, e em que idioma. Em seguida, cria a pasta `.ritual/`. Não há mais nenhuma configuração.

Ele precisa do Node 20.17 ou mais recente (`node --version`). Se algo não funcionar, digite `/ritual doctor`: ele verifica o Node, a sua configuração e se os hooks estão realmente rodando, e diz o que corrigir.

**Ative a atualização automática uma vez.** Novas lições chegam com frequência, e o Claude Code deixa a atualização automática desligada para marketplaces que não são da Anthropic. Digite `/plugin`, abra Marketplaces, escolha `ritual` e clique em Enable auto-update. No aplicativo de desktop, peça ao Claude para "ativar a atualização automática para o marketplace ritual": ele adiciona `"autoUpdate": true` à entrada `ritual` do seu `settings.json` do Claude Code. Até você fazer isso, o Ritual lembra você uma vez por semana. Para atualizar manualmente: `claude plugin update ritual@ritual`, depois inicie uma nova sessão.

**`claude` não encontrado?** Isso acontece quando você só tem o aplicativo de desktop do Claude, que traz a própria cópia. Instale a linha de comando ([como](https://code.claude.com/docs/en/setup)): ela compartilha os plugins com o aplicativo. Depois, reinicie o aplicativo.

## Veja em ação

Saída real dos testes do próprio Ritual, em um projeto web.

**A Guarda bloqueia um comando que o seu projeto já viu falhar,** e diz o que fazer no lugar:

```console
$ git push --force origin main
Ritual guard (force-push-to-main): A forced push to main rewrites shared history. Push to a branch and open a pull request.
```

**Na primeira vez em que o Claude edita um componente,** ele recebe as perguntas detectoras desse grupo, uma vez por sessão (resumidas):

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

**`/ritual` parte do que de fato aconteceu,** e não da memória (trecho):

```text
Log: 1 failed command(s), 1 correction(s), 0 agent report(s)
  10-12 20:05 cmd  npm run build  →  Exit code 1 Type error: Property 'email' does not exist on type 'FormData'
  10-12 20:05 fix  «that is wrong, the form still loses the message»  while Edit src/components/ContactForm.tsx

Guard: 2 block(s) · force-push-to-main ×1, python-c ×1 (details: hooks/guard.mjs --log)

Groups touched in 1 session(s): interface-and-design (1)
```

## Como funciona

Cinco coisas funcionam sem que você faça nada, por meio dos hooks do Claude Code, e uma sexta fica disponível quando você quiser:

| Hook | O que faz | O que custa |
|---|---|---|
| 📚 **Lições de pacote** | No início de uma sessão, antes de qualquer plano, entrega ao Claude as lições dos pacotes do seu projeto (web, educação…): o que esse tipo de projeto costuma errar, enquanto o desenho ainda pode absorver. | Uma linha por lição do pacote (dez para web), só com um pacote ligado. |
| 🛡️ **Guarda** | Bloqueia os comandos que o seu projeto já viu falhar e diz o que usar no lugar. Suas regras ficam em `.ritual/guard.json`, cada uma com um caso que ela bloqueia e outro que deixa passar. | Nada, até bloquear. |
| 📝 **Registro** | Grava, enquanto acontece, cada comando que falha e cada correção sua (“isso está errado”, “faça de novo”), com aquilo que o Claude estava mexendo, e o relatório de cada agente que rodou em segundo plano. | Nada. |
| ❓ **Perguntas** | Na primeira vez em uma sessão em que o Claude está prestes a editar um teste, um componente, um script, um documento ou uma consulta, ou a rodar um comando ou fazer um commit, mostra ao Claude as perguntas detectoras daquele grupo. Uma vez por grupo e por sessão. | Uma linha por lição do grupo: hoje, de quatro a dezesseis, conforme o grupo e os pacotes, e nunca mais de vinte, primeiro as mais confirmadas (`"budget"` em `.ritual/config.json` muda esse limite). |
| 🔎 **Lições certas** | Em segundo plano, o Haiku lê cada pedido seu e a primeira escrita de cada arquivo e escolhe, entre todos os grupos, as lições que se aplicam agora, deixando de fora as que o Claude já viu; quando nada mudou, ele não escolhe. As lições de um pedido chegam ao Claude antes do primeiro passo: esse passo espera por elas e, quando trazem algo novo, o Claude as lê antes de dar o passo. As de um arquivo chegam no próximo passo. O Haiku nunca lê o seu `.env`, suas chaves, certificados ou credenciais, nem arquivos fora do projeto; tudo o que parece uma chave ou senha é ocultado antes de sair, e os seus pedidos e o conteúdo dos arquivos não são guardados. E o Ritual se avalia: `/ritual` diz com que frequência uma lição chegou atrasada, e com que frequência uma escolha pulada deixou passar uma lição. | Cerca de $0.001 por escolha, pelo seu próprio Claude Code: sem chave de API, sem conta extra. O primeiro passo depois de um pedido espera cerca de 3 segundos na mediana, muitas vezes nada (44% dos pedidos), com teto de 25 segundos. `"picker": false` desliga. |
| ✅ **Fechamento** (opcional) | Com `"close": true` em `.ritual/config.json`, na primeira vez em que o Claude está prestes a terminar depois de mudar arquivos, ele o manda de volta uma vez para conferir o trabalho rodando: as lições dos seus pacotes e as verificações automáticas delas, uma linha por verificação sobre o que rodou. Desligado por padrão; `/ritual close` faz isso sempre que você pedir. | Uma rodada extra por sessão que mudou arquivos, quando ligado. |

Elas apenas colocam diante do Claude, no momento certo, o que o seu projeto já aprendeu.
Com o pacote **web** e o fechamento ligado, ele roda `scripts/web-check.mjs` contra o site que está rodando na sua máquina: envia o formulário com o JavaScript desligado e com o teclado, manda uma rajada e algumas tentativas recusadas, e salva capturas de tela do celular e do computador. Somente endereços locais; ele diz quantas mensagens de teste enviou.

Ao fechar uma sessão, ou depois de um erro que doeu, digite `/ritual`. Ele lê o registro, encontra qual lição deveria ter pegado cada erro e por que não pegou, e sobe a escada: uma lição vira regra da Guarda ou teste sempre que puder.

<details>
<summary><b>Os oito passos do <code>/ritual</code></b></summary>

0. Revisa os **candidatos** que o ritual anterior deixou em aberto: o que poderia ter virado teste e não virou.
1. **Lista os erros**, começando pelo registro, e confirma a causa de cada um.
2. Procura **qual lição cobriu e por que não disparou**, primeiro no grupo do erro. Se alguma cobriu, afina a pergunta detectora ou o sinal de alerta, ou acrescenta o exemplo.
3. Procura **falsos positivos**: perguntas que fizeram o Claude parar à toa e bloqueios da Guarda que estavam errados. Um bloqueio errado vira um caso que a regra precisa deixar passar.
4. Escreve uma **lição nova** só se nenhuma cobre, com suas cinco partes.
5. **Sobe a escada** sempre que possível: um padrão de comando vira uma regra da Guarda; uma propriedade do código, ou um teste com o nome da lição, visto falhando contra o erro real antes de ser confiado; o que não pode ser automatizado e já quebrou duas vezes, uma linha no `CLAUDE.md`. O resto fica como candidato datado.
6. Salva tudo junto, no mesmo commit, e roda o verificador.
7. Mantém os exemplos anônimos e, se uma lição vale para qualquer projeto, oferece o texto para você compartilhar aqui. Ele lembra você das lições que ainda não compartilhou e, quando a biblioteca aceita uma, marca a sua para que não seja mostrada duas vezes. Nunca publica nada por conta própria.

</details>

E `/ritual close`, sempre que você quiser, percorre as perguntas dos grupos que você tocou contra a mudança e diz o que falta.

## A biblioteca

As lições estão em [`lessons/pt/`](lessons/pt/README.md), em sete grupos pelo **que você estava fazendo** quando aconteceu. O original está em inglês, em [`lessons/en/`](lessons/en/README.md).

| Grupo | O que cobre |
|---|---|
| Escrita e documentação | Documentação, manuais, textos de tela, conteúdo, prompts. |
| Números e dados | Painéis, relatórios, modelos, qualquer número que é exibido. |
| Testes e verificações | Testes automatizados, validadores, revisões, calibração. |
| Scripts e arquivos | Programas que escrevem, geram ou transformam arquivos e dados. |
| Interface e design | Telas, componentes, estilos, páginas. |
| Console e ferramentas | Comandos, servidores, capturas, e a ferramenta que atrapalha. |
| Git e processo | Commits, estados, pendências, trabalho em paralelo. |

Sobre os grupos ficam os **pacotes** por tipo de projeto: lições que só valem se você construir aquele tipo. Elas ficam no arquivo do seu grupo com um prefixo (`WEB-1`), e suas perguntas só aparecem quando o pacote está ligado. Os pacotes são ativados na configuração inicial e podem ser alterados em `.ritual/config.json`.

| Pacote | Lições |
|---|---|
| `web` | 5: perda de dados salvos quando são danificados, robôs num formulário público, o recurso de contingência sem JavaScript, o foco no envio e login sem limite de tentativas. |
| `education` | 5: exercício aprovado sem a habilidade, resposta visível antes da pergunta, duas respostas defensáveis, adivinhar pela posição ou pelo tamanho, e dica que entrega a resposta. |
| `video` | 2: cada ação cai quando a narração a nomeia, e o que muda sem aparecer é marcado. |
| `ai` | 2: o que um prompt proíbe em um campo acaba escrito em outro, e uma checklist dentro de um prompt é perguntada item por item mesmo depois de a pessoa já ter respondido. |
| `apps`, `crm` | A caminho, com o mesmo método. |
| O seu | Um tipo de projeto que ainda não tem (móvel, dados, jogos…) começa com a sua primeira lição: veja [onde vai uma lição](lessons/TEMPLATE.md#where-a-lesson-goes). |

Toda lição tem cinco partes, sempre as cinco: **a ideia**, um **exemplo** real e anônimo, a **pergunta detectora** que separa o caso que se aplica do que não se aplica, o **sinal de alerta** (a frase que você diz a si mesmo logo antes de cometer o erro de novo) e **o que fazer**. E um número que nunca muda: uma lição redundante é marcada como fundida em outra, nunca apagada. O formato completo está em [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md).

> **Um verificador que nunca viu o erro não verifica nada.** Um teste que sempre passa pode estar quebrado. A única forma de saber é vê-lo falhar contra o erro real. *Pergunta detectora:* testei meu verificador contra o erro nas formas em que ele realmente apareceria? E contra o caso correto? *Sinal de alerta:* “Já passa, então está bem configurado.”
>
> — lição 13

O Ritual aplica essa lição a si mesmo: toda regra da Guarda, todo verificador e todo hook deste repositório traz seus casos, e foi visto falhando antes de entrar.

Cada uma indica de onde veio, com qual modelo e em que mês aconteceu (`field · ~opus · 2026-08`; o `~` quer dizer que vem da memória, não de um registro):

- `field`: um erro real em um projeto, com esse exemplo.
- `lab`: quebrou numa [simulação](simulations/README.pt.md), e indica qual modelo e quando. Vira `field` quando alguém confirma no próprio projeto.
- `proposal`: só para o que não quebra à vista (segurança), com uma fonte pública.

> [!NOTE]
> O Ritual roda com Claude, e um erro que um modelo comete pode não ser cometido por outro. Por isso cada lição registra o seu modelo: uma lição que só aconteceu com outro modelo é verificada com Claude antes que alguém receba a sua pergunta, e quando um Claude mais novo deixa de cometer o erro, os dados mostram isso. Veja [quais modelos cometeram quais erros](lessons/BY-MODEL.md).

## As lições de pacote vêm de simulações

As lições por tipo de projeto não são inventadas. Um modelo constrói uma tarefa realista sem o Ritual; outro modelo, em outra sessão, roda o que foi construído e registra o que quebrou, com evidências. O que quebra entra como lição; o que não quebra, não entra. Cada tarefa roda duas vezes: o que quebra nas duas vezes é lição; o que quebra uma vez fica como candidato. Quando sai um modelo novo, as tarefas rodam de novo, e uma lição que deixa de quebrar é rebaixada, com dados. O método e as tarefas estão em [`simulations/`](simulations/README.pt.md).

A primeira foi um site para uma oficina de bicicletas, com formulário de contato e uma página de administração. O Sonnet a construiu duas vezes, e as duas versões escaparam corretamente o HTML, mantiveram as requisições dentro da pasta pública e aguentaram 300 mensagens ao mesmo tempo. Mesmo assim, as duas perderam em silêncio a mensagem que chegou depois de uma gravação interrompida, as duas aceitaram centenas de mensagens de um bot sem nenhuma forma de limpá-las, e uma delas disse que o teste passava quando, uma em cada dez vezes, falhava. Cada achado está em [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md) com suas evidências, ao lado do código como ficou.

Na segunda vez, um script executou a simulação ([`scripts/simulate.mjs`](scripts/simulate.mjs)): o Sonnet 5.5 construiu em sessões isoladas e o Opus 5.5 revisou. O erro de sete das nove lições da web voltou a acontecer nas duas execuções. O erro exato da WEB-1 não voltou, mas o seu mecanismo sim: depois que o arquivo de dados ficou danificado, todas as novas mensagens falhavam, por isso a lição foi reforçada, não rebaixada. E apareceu um erro novo nas duas execuções, um login de administrador sem limite de tentativas, que passou a ser a WEB-5. A comparação está [no resumo](simulations/web/runs/2026-10-sonnet-5-5-summary.md).

O Ritual também é verificado com as próprias lições. A WEB-1 encontrou o mesmo bug no próprio registro do Ritual, e foi corrigido com um teste que antes foi visto falhar.

## Contribuindo

O jeito mais fácil: **confirme uma lição**. Se uma lição também aconteceu de verdade com você, [abra uma confirmação](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml) com o seu exemplo anônimo e o modelo que você estava usando. Cada confirmação acrescenta esse modelo à lista `seen:` da lição, assim a biblioteca passa a saber a quais modelos um erro se aplica e quais modelos novos já não o cometem. Uma lição `lab` ou `proposal` com um exemplo real vira `field`, com o seu nome, se você quiser.

Você também pode:

- **Compartilhe uma lição** sua: escreva `/ritual share`. O comando compara a lição com a biblioteca (um erro que já está coberto vira uma confirmação, não uma duplicata), a reescreve para servir a quem constrói outra coisa, verifica que ela não cita nada do seu projeto, decide onde ela vai e abre o [formulário](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml) já preenchido. Você lê e envia. Uma lição que só aconteceu com outro modelo é [verificada com Claude antes](simulations/README.pt.md#como-verificar-uma-lição-contribuída).
- **Abra um pacote novo** para um tipo de projeto que ainda não tem: `/ritual share` propõe um quando uma lição não cabe em nenhum dos que existem. Ou **proponha uma tarefa de simulação** para ele.
- **Revise uma tradução**: as lições são traduzidas por um modelo, e cada uma indica isso (`by: ai`). Se você é falante nativo, corrija e assine com o seu usuário do GitHub. O fluxo está em [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md).
- **Adicione uma regra à Guarda**, ou um caso que ela deveria ter deixado passar.

Antes de abrir um pull request, rode `npm test`. Ele roda a calibração de cada verificador e hook, e confere se cada lição tem suas cinco partes e se os índices estão atualizados (`node scripts/lessons.mjs --index` os regenera).

## Idiomas

O inglês é o original. As lições estão em sete idiomas: [English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md). Cada tradução indica de qual versão do original ela veio: quando o original muda, o verificador avisa que a tradução está desatualizada.

## Licença

MIT © 2026 Zurishadday
