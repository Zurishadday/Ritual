# Ritual

[English](README.md) · [Español](README.es.md) · **Português** · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**O Claude erra uma vez. O Ritual garante que seja a última.**

Ritual é um plugin do Claude Code para qualquer projeto. Tem uma ideia só: **cada erro vira lição, cada lição vira regra, e cada regra, quando possível, vira um teste ou uma guarda.** Outras ferramentas anotam o que foi aprendido; esta vai até o fim e confere, porque uma regra que existe só em texto é esquecida numa sessão longa, e uma que se confere sozinha não.

Ele traz 49 lições de campo, cada uma nascida de um erro real; pacotes por tipo de projeto, cujas lições vêm de observar um modelo construir algo e quebrá-lo; e um comando, `/ritual`, que transforma os erros da sua sessão em lições suas, e suas lições em regras que se aplicam sozinhas.

## Instalação

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

Depois, no seu projeto, digite `/ritual`. Na primeira vez, ele detecta o que você está construindo pelas suas dependências, faz uma única pergunta (quais pacotes de lições ativar e em qual idioma) e cria a pasta `.ritual/`. A partir daí, três hooks funcionam sem que você precise fazer nada:

| Hook | O que faz | O que custa |
|---|---|---|
| **Guarda** | Bloqueia os comandos que o seu projeto já viu falhar e diz o que usar no lugar. Suas regras ficam em `.ritual/guard.json`, cada uma com um caso que ela bloqueia e outro que deixa passar. | Nada, até bloquear. |
| **Registro** | Grava, enquanto acontece, cada comando que falha e cada correção sua (“isso está errado”, “faça de novo”), com aquilo que o Claude estava mexendo. | Nada. |
| **Perguntas** | Na primeira vez em uma sessão em que o Claude está prestes a editar um teste, um componente, um script, um documento ou uma consulta, ou a rodar um comando ou fazer um commit, mostra ao Claude as perguntas detectoras daquele grupo. Uma vez por grupo e por sessão. | Uma linha por lição do grupo, de três a treze, conforme o grupo e os pacotes. |

Nada disso muda o que o Claude faz: apenas coloca diante dele, no momento certo, o que o seu projeto já aprendeu.

## O ritual

Ao fechar uma sessão, ou depois de um erro que doeu, digite `/ritual`. Ele lê o registro e faz, nesta ordem:

0. Revisa os **candidatos** que o ritual anterior deixou em aberto: o que poderia ter virado teste e não virou.
1. **Lista os erros**, começando pelo registro, e confirma a causa de cada um.
2. Procura **qual lição cobriu e por que não disparou**, primeiro no grupo do erro. Se alguma cobriu, afina a pergunta detectora ou o sinal de alerta, ou acrescenta o exemplo.
3. Procura **falsos positivos**: perguntas que fizeram o Claude parar à toa e bloqueios da Guarda que estavam errados. Um bloqueio errado vira um caso que a regra precisa deixar passar.
4. Escreve uma **lição nova** só se nenhuma cobre, com suas cinco partes.
5. **Sobe a escada** sempre que possível: um padrão de comando vira uma regra da Guarda; uma propriedade do código, ou um teste com o nome da lição, visto falhando contra o erro real antes de ser confiado; o que não pode ser automatizado e já quebrou duas vezes, uma linha no `CLAUDE.md`. O resto fica como candidato datado.
6. Salva tudo junto, no mesmo commit, e roda o verificador.
7. Mantém os exemplos anônimos e, se uma lição vale para qualquer projeto, oferece o texto para você compartilhar aqui. Nunca publica nada por conta própria.

E `/ritual close`, antes de dar algo por terminado, percorre as perguntas dos grupos que você tocou contra a mudança e diz o que falta.

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
| `web` | 4: o que se perde depois de uma gravação interrompida, robôs num formulário público, o recurso de contingência sem JavaScript, e o foco no botão de envio. |
| `apps`, `crm`, `ai` | A caminho, com o mesmo método. |

Toda lição tem cinco partes, sempre as cinco: **a ideia**, um **exemplo** real e anônimo, a **pergunta detectora** que separa o caso que se aplica do que não se aplica, o **sinal de alerta** (a frase que você diz a si mesmo logo antes de cometer o erro de novo) e **o que fazer**. E um número que nunca muda: uma lição redundante é marcada como fundida em outra, nunca apagada. O formato completo está em [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md).

Cada uma indica de onde veio, com qual modelo e em que mês aconteceu (`field · ~opus · 2026-08`; o `~` quer dizer que vem da memória, não de um registro):

- `field`: um erro real em um projeto, com esse exemplo.
- `lab`: quebrou numa [simulação](simulations/README.md), e indica qual modelo e quando. Vira `field` quando alguém confirma no próprio projeto.
- `proposal`: só para o que não quebra à vista (segurança), com uma fonte pública.

Um exemplo, a lição 13:

> **Um verificador que nunca viu o erro não verifica nada.** Um teste que sempre passa pode estar quebrado. A única forma de saber é vê-lo falhar contra o erro real. *Pergunta detectora:* testei meu verificador contra o erro nas formas em que ele realmente apareceria? E contra o caso correto? *Sinal de alerta:* “Já passa, então está bem configurado.”

O Ritual aplica essa lição a si mesmo: toda regra da Guarda, todo verificador e todo hook deste repositório traz seus casos, e foi visto falhando antes de entrar.

## As lições de pacote vêm de simulações

As lições por tipo de projeto não são inventadas. Um modelo constrói uma tarefa realista sem o Ritual; outro modelo, em outra sessão, roda o que foi construído e registra o que quebrou, com evidências. O que quebra entra como lição; o que não quebra, não entra. Cada tarefa roda duas vezes: o que quebra nas duas vezes é lição; o que quebra uma vez fica como candidato. Quando sai um modelo novo, as tarefas rodam de novo, e uma lição que deixa de quebrar é rebaixada, com dados. O método e as tarefas estão em [`simulations/`](simulations/README.md).

A primeira foi um site para uma oficina de bicicletas, com formulário de contato e uma página de administração. O Sonnet a construiu duas vezes, e as duas versões escaparam corretamente o HTML, mantiveram as requisições dentro da pasta pública e aguentaram 300 mensagens ao mesmo tempo. Mesmo assim, as duas perderam em silêncio a mensagem que chegou depois de uma gravação interrompida, as duas aceitaram centenas de mensagens de um bot sem nenhuma forma de limpá-las, e uma delas disse que o teste passava quando, uma em cada dez vezes, falhava. Cada achado está em [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md) com suas evidências, ao lado do código como ficou.

O Ritual também é verificado com as próprias lições. A WEB-1 encontrou o mesmo bug no próprio registro do Ritual, e foi corrigido com um teste que antes foi visto falhar.

## Contribuindo

O jeito mais fácil: **confirme uma lição**. Se uma lição também aconteceu de verdade com você, [abra uma confirmação](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml) com o seu exemplo anônimo e o modelo que você estava usando. Cada confirmação acrescenta esse modelo à lista `seen:` da lição, assim a biblioteca passa a saber a quais modelos um erro se aplica e quais modelos novos já não o cometem. Uma lição `lab` ou `proposal` com um exemplo real vira `field`, com o seu nome, se você quiser.

O Ritual roda com Claude, então uma lição que só aconteceu com outro modelo é verificada com Claude antes que alguém receba a sua pergunta ([como](simulations/README.md#checking-a-contributed-lesson)).

Você também pode:

- **[Compartilhe uma lição](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml)** sua: cinco partes, um exemplo anônimo, o grupo a que pertence e o modelo com que aconteceu. O `/ritual` escreve o texto para você.
- **Proponha uma tarefa de simulação** para um tipo de projeto que ainda não tem.
- **Revise uma tradução**: as lições são traduzidas por um modelo, e cada uma indica isso (`by: ai`). Se você é falante nativo, corrija e assine com o seu usuário do GitHub. O fluxo está em [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md).
- **Adicione uma regra à Guarda**, ou um caso que ela deveria ter deixado passar.

Antes de abrir um pull request: `npm test`. Ele roda a calibração de cada verificador e hook, e confere se cada lição tem suas cinco partes e se os índices estão atualizados (`node scripts/lessons.mjs --index` os regenera).

## Idiomas

O inglês é o original. As lições estão em sete idiomas: [English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md). Cada tradução indica de qual versão do original ela veio: quando o original muda, o verificador avisa que a tradução está desatualizada.

## Licença

MIT © 2026 Zurishadday
