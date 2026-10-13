# Simulações

[English](README.md) · [Español](README.es.md) · **Português** · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

As lições dos pacotes (`web`, `apps`, `crm`, `ai`) não são inventadas. Vêm de ver um modelo construir algo e quebrá-lo. Cada simulação é uma tarefa realista, escrita como a pediria um cliente, que um modelo constrói sem o Ritual. Depois, outro modelo, em outra sessão, roda o que foi construído e anota o que quebrou, com evidências. O que quebra vira lição com `origin: lab · <modelo> · <ano-mês>`. O que não quebra, não entra.

## Método

1. **Construir** com um modelo mecânico (Sonnet), em uma pasta limpa, usando o texto de `TASK.md` exatamente como está e nada mais. Ele não vê lições, hooks nem esta pasta.
2. **Revisar** com um modelo de julgamento (Opus), em outra sessão, usando `REVIEW.md`. Ele roda o que foi construído e percorre os caminhos que as pessoas realmente seguem (entrada vazia, erros, clique duplo, celular, teclado), e procura o que não explode mas continua errado (uma senha, um texto sem escape). Cada achado vem com sua evidência: o comando e a saída, ou o que foi visto na tela. O revisor não corrige nada.
3. **Escrever as lições** com o mesmo modelo de julgamento, em cinco partes. O revisor humano do repositório as integra depois: confere que nenhuma já esteja coberta pelo núcleo, e roda o verificador.
4. **Cada tarefa roda duas vezes.** O que quebra nas duas vezes é lição. O que quebra uma vez só continua como candidato.

Cada rodada é salva em `<tarefa>/runs/<ano-mês>-<modelo>-<n>/` (`2026-10-sonnet-1`, `2026-10-sonnet-2`): o código como ficou (é o projeto de exemplo com bugs reais, e o caso de calibração das suas lições) e o `FINDINGS.md`.

## Como repetir uma simulação

Quando sai um modelo novo, a tarefa é rodada de novo. Uma lição que deixa de quebrar não é apagada: é rebaixada (`demoted`, na configuração do projeto que a usa), e a rodada registra isso. Assim a biblioteca encolhe sozinha quando os modelos melhoram, com base em dados.

O script faz isso: `node scripts/simulate.mjs <task>` (por exemplo `web`). Sonnet constrói e Opus revisa, duas vezes, cada uma na sua própria sessão isolada do Claude Code, e o script compara as execuções: uma lição cujo erro aconteceu em todas as execuções é confirmada com esse modelo, e uma cujo erro não aconteceu em nenhuma é candidata a ser rebaixada. Verifique primeiro o isolamento com `node scripts/simulate.mjs --probe`: o modelo que constrói não pode ver o seu CLAUDE.md, a memória nem os plugins. Nada na biblioteca muda até que o mantenedor o aplique com `/maintain`.

Para propor uma tarefa nova, abra uma issue com o texto da tarefa e o tipo de projeto que ela representa.

## Como verificar uma lição contribuída

O Ritual roda dentro do Claude Code, então uma lição só ganha uma pergunta na sessão de alguém se o erro acontecer com o Claude. Toda lição contribuída e toda confirmação diz com qual modelo e em que mês aconteceu.

1. **Aconteceu com o Claude, em um projeto real, com o exemplo dele:** entra como `field`, com esse modelo, depois da revisão habitual (cinco partes, anônimo, ainda não coberto).
2. **Aconteceu com outro modelo, ou o exemplo é duvidoso:** o mantenedor transforma a situação em uma tarefa pequena, escrita como um pedido de cliente, e a roda com os modelos atuais do Claude, como no método acima.
   - Quebra com o Claude: entra como `lab` com esse modelo do Claude, e o modelo de quem contribuiu vai para `seen:`.
   - Quebrou só com o outro modelo: continua como candidato na issue, com o modelo anotado. Ninguém recebe a pergunta dela até alguém ver isso acontecer com o Claude.
3. **Uma confirmação** de uma lição que já existe acrescenta `<modelo> <AAAA-MM>` ao `seen:` dela. Uma lição vista com vários modelos é um erro geral; uma que só foi vista com um modelo antigo é a primeira que uma nova rodada verifica antes de rebaixá-la.
