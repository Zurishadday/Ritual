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

O script faz isso: `node scripts/simulate.mjs <task>` (por exemplo `web`). Sonnet constrói e Opus revisa, duas vezes, cada uma na sua própria sessão isolada do Claude Code, e o script compara as execuções: uma lição cujo erro aconteceu em todas as execuções é confirmada com esse modelo, e uma cujo erro não aconteceu em nenhuma é candidata a ser rebaixada. Verifique primeiro o isolamento com `node scripts/simulate.mjs --probe`: o modelo que constrói não pode ver o seu CLAUDE.md, a memória nem os plugins, e deve conseguir iniciar um site e acessá-lo. Nada na biblioteca muda até que o mantenedor o aplique com `/maintain`.

Para propor uma tarefa nova, abra uma issue com o texto da tarefa e o tipo de projeto que ela representa.

<a name="ab"></a>

## O Ritual ajuda? Um A/B na tarefa web

A mesma tarefa (o pedido web em espanhol), o mesmo construtor (`claude-sonnet-5-5`) e o mesmo revisor (`claude-opus-5-5`), 2026-10, com o Claude Code 2.1.295–2.1.296. Sem o Ritual, depois com os hooks do Ritual carregados e o projeto configurado com o pacote `web` (`--with-ritual`). Depois, o retrabalho: o mesmo construtor, sem o Ritual, recebe os achados do revisor sobre uma construção e os corrige (`--fix`), para que o custo de construir e o de corrigir o que ficou sejam comparados por inteiro.

| | Lições cujo erro apareceu (de 9) | Erros novos | Construir | Corrigir o que foi encontrado | Construir + corrigir |
|---|---|---|---|---|---|
| Sem o Ritual ([1](web/runs/2026-10-sonnet-5-5-1), [2](web/runs/2026-10-sonnet-5-5-2)) | 7, 8 | 6, 7 | $0.28, $0.27 | $0.53, $0.45 | **$0.82, $0.72** |
| Só as perguntas ([1](web/runs/2026-10-sonnet-5-5-ritual-1), [2](web/runs/2026-10-sonnet-5-5-ritual-2), [3](web/runs/2026-10-sonnet-5-5-ritual-3)) | 6, 9, 8 | 4, 4, 7 | $0.26, $0.27, $0.27 | | |
| Com o Ritual hoje ([1](web/runs/2026-10-sonnet-5-5-ritual-v2-1), [2](web/runs/2026-10-sonnet-5-5-ritual-v2-2), [3](web/runs/2026-10-sonnet-5-5-ritual-v2-3)) | **1, 2, 2** | 4, 5, 4 | $0.38, $0.53, $0.60 | $0.24, $0.17, $0.29 | **$0.63, $0.70, $0.90** |

O que diz:

- **Erros:** o erro dessas nove lições apareceu 7,5 vezes por construção, em média, sem o Ritual, e 1,7 vez com ele: cerca de três quartos a menos. Erros novos, fora das lições, passaram de 6,5 para 4,3.
- **Custo:** construir com o Ritual custa mais (cerca de $0.23 a mais por construção: ele é desenhado para as lições e volta uma vez para conferir). Corrigir o que ficou custa cerca da metade (−52% em dinheiro, −53% em tokens de saída: 24.300 contra 11.300 em média). Construir mais corrigir sai praticamente igual: $0.77 contra $0.74 em média, uma diferença menor que a variação entre as rodadas. O resultado final parte de muito menos erros pelo mesmo dinheiro.
- **As perguntas sozinhas não fizeram nada.** A versão que só mostrava as perguntas de cada grupo durante a escrita terminou onde a construção sem o Ritual terminou. O que mudou isso foram duas peças: as lições de pacote no início e o fechamento, que faz o construtor voltar uma vez antes de terminar.

O que não diz: é uma tarefa, duas ou três rodadas por grupo e um só modelo. Achar os erros não entra na conta: a revisão custou $1.30–$2.40 por construção, igual nos dois grupos. Toda construção e correção que a menciona diz que o shell foi negado para os comandos que tentou, nos dois grupos, então nenhuma delas rodou o site: a verificação automática da web do fechamento nunca rodou, e as correções não foram revisadas de novo. Os construtores agora recebem as mesmas regras de shell que o revisor, e `--probe` verifica que eles conseguem iniciar um site.

Também não é um teste cego sobre uma tarefa nova:

- **O mesmo exame.** Quatro das nove lições que ele conta (WEB-1 a WEB-4) nasceram da primeira simulação desta mesma tarefa, e duas peças do Ritual, as lições de pacote do início e o fechamento, foram acrescentadas depois que essas construções foram vistas falhando. Ele mede o Ritual na tarefa com que aprendeu.
- **O revisor conhecia o grupo.** Ele recebe a última mensagem do construtor, e com o Ritual essa mensagem nomeia as lições pelos ids.
- **Não é o mesmo prompt de revisão.** As duas construções sem o Ritual foram revisadas em 2026-10-12, antes de o prompt de revisão dizer quais comandos o seu shell executa; todas as outras revisões tinham isso.

## Como verificar uma lição contribuída

O Ritual roda dentro do Claude Code, então uma lição só ganha uma pergunta na sessão de alguém se o erro acontecer com o Claude. Toda lição contribuída e toda confirmação diz com qual modelo e em que mês aconteceu.

1. **Aconteceu com o Claude, em um projeto real, com o exemplo dele:** entra como `field`, com esse modelo, depois da revisão habitual (cinco partes, anônimo, ainda não coberto).
2. **Aconteceu com outro modelo, ou o exemplo é duvidoso:** o mantenedor transforma a situação em uma tarefa pequena, escrita como um pedido de cliente, e a roda com os modelos atuais do Claude, como no método acima.
   - Quebra com o Claude: entra como `lab` com esse modelo do Claude, e o modelo de quem contribuiu vai para `seen:`.
   - Quebrou só com o outro modelo: continua como candidato na issue, com o modelo anotado. Ninguém recebe a pergunta dela até alguém ver isso acontecer com o Claude.
3. **Uma confirmação** de uma lição que já existe acrescenta `<modelo> <AAAA-MM>` ao `seen:` dela. Uma lição vista com vários modelos é um erro geral; uma que só foi vista com um modelo antigo é a primeira que uma nova rodada verifica antes de rebaixá-la.
