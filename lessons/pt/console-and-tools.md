# Console e ferramentas

O que vale quando você roda comandos, servidores, testes ou capturas, e quando a ferramenta fica entre você e o sistema.

### 27. Desconfie do instrumento antes de desconfiar do sistema

`from: 4b9a0956` · `by: ai`

**A ideia.** Se um número não mudou quando devia, ou mudou justo enquanto você olhava, desconfie nesta ordem: o cache, outro processo escrevendo na mesma tabela, a ferramenta pela qual você está olhando, e só no fim o próprio sistema.

**Exemplo.** Uma tabela “perdeu metade das colunas”. Alguns minutos depois estava completa: você a olhava enquanto outro processo a reconstruía.

**Outro exemplo.** Uma imagem nova “não carregava” na página. O arquivo estava bem: o servidor de teste não enxergava pastas criadas depois que ele tinha subido.

**Mais um exemplo.** Um script “calculava errado um padrão de texto”. O script estava bem: o console pelo qual o código era passado transformava cada `\n` numa quebra de linha de verdade antes de o script lê-lo. E num notebook em que as células compartilham memória, um erro que deveria aparecer não apareceu: a variável ainda estava guardada de uma célula anterior.

**Pergunta detectora.** Estou olhando o sistema, ou um cache, uma cópia, ou uma ferramenta que guardou um retrato antigo dele ou o alterou pelo caminho?

**Sinal de alerta.** “Já corrigi e continua igual” · “desta vez eu digitei certo, de verdade”.

**O que fazer.** Tire uma segunda foto alguns minutos depois, antes de declarar um desastre. Se um instrumento já te enganou do mesmo jeito, troque-o em vez de continuar olhando por ele: um erro repetido não é azar, é a ferramenta errada. Um console que transforma `\n` ou `\\` pelo caminho não serve para passar código a ele: o código vai num arquivo, escrito com uma ferramenta que não o toca, e roda a partir dali. E qualquer coisa mecânica (um comando que já falhou três vezes) é bloqueada por uma proteção, e não lembrada.

### 29. Confira o comando antes de entregá-lo a alguém

`from: 0c95aa16` · `by: ai`

**A ideia.** Quem roda um comando de outra pessoa o faz às cegas. Cada comando quebrado gasta a confiança que a pessoa daria ao próximo.

**Exemplo.** Um comando de deploy tinha um nome de branch digitado de memória. A branch tinha outro nome, e quem rodou perdeu meia hora antes de perguntar.

**Pergunta detectora.** Para cada nome neste comando, eu li do sistema hoje, ou digitei de memória?

**Sinal de alerta.** “É o mesmo comando de sempre.”

**O que fazer.** Rode você mesmo antes de passar adiante, e copie cada nome (script, caminho, branch) do sistema, não da memória.

### 44. O que você corta da saída pode ser o veredito

`from: ca6fa003` · `by: ai`

**A ideia.** Olhar só as últimas linhas de um resultado, ou passá-lo por outro comando, pode jogar fora justamente a parte que dizia “falhou”. Uma saída cortada de um teste que falhou parece igual à de um teste que passou.

**Exemplo.** Uma página foi marcada como revisada porque o teste dela “terminou sem erros”. O resultado passou por um comando que mostrava só o fim, e o aviso de que o teste tinha falhado se perdeu no caminho.

**Outro exemplo.** Uma suíte de testes repetia automaticamente cada teste que falhava. Os testes que passavam na segunda tentativa não contavam como falhas, só como “instáveis”, e a causa ficava escondida: cada mudança de etapa pedia ao servidor a página de novo. Sem as novas tentativas, a falha aparecia e podia ser medida.

**Pergunta detectora.** Estou lendo o veredito (quantos passaram, quantos falharam, como terminou), ou só um pedaço da saída?

**Sinal de alerta.** “Não apareceu erro na tela” · “as últimas linhas bastam”.

**O que fazer.** Encontre a linha do veredito antes de mudar um status. Se você encadeia comandos, garanta que a falha do primeiro chegue até o fim. Se a saída não tem veredito, isso significa “não sei”, e não “passou” (ver a lição 1). E salve a saída completa num arquivo e procure o veredito ali: assim você não precisa decidir de antemão quanto ler.

### 53. O código passa pelo editor, não pelo tratamento de texto do shell

`from: 34503dce` · `by: ai`

**A ideia.** Reescrever um arquivo de código com as ferramentas de texto do shell (ler, substituir, gravar de volta) faz o código passar por regras feitas para outra coisa: uma codificação padrão, precedência de operadores, aspas e escapes. A mudança parece certa no comando, e o arquivo sai diferente do que o comando parece dizer.

**Exemplo.** Duas edições numa mesma sessão, ambas no Windows PowerShell 5.1. Um ler-substituir-gravar de um script (`Get-Content`, `-replace`, `Set-Content -Encoding utf8`) leu o arquivo na página de código ANSI do sistema e o gravou de volta em UTF-8: cada ✓ e · nele virou `âœ“` e `Â·`, e a autoverificação do script imprimiu a marca estragada. Depois, uma lista de substituições escrita como ``@('old', 'new' + "`n" + 'more')`` perdeu linhas: no PowerShell a vírgula tem precedência maior que `+`, então cada par virou quatro itens e só o primeiro pedaço do texto novo foi gravado.

**Pergunta detectora.** Esta mudança no código está passando pelo editor, ou pelo ler, substituir e gravar do shell, com as regras de codificação, precedência e aspas dele?

**Sinal de alerta.** “É só um replace rápido, faço num comando só” · “trocar vários de uma vez é mais rápido”.

**O que fazer.** Mude o código com as ferramentas de editar e gravar do próprio editor. Quando a mudança precisar ser feita por script, escreva o script num arquivo e rode-o com um interpretador que lê e grava UTF-8 e tem literais de string simples (`node fix.mjs`, `python -I fix.py`). Depois, olhe o diff: uma mudança que tocou mais linhas do que você queria, ou caracteres que você não tocou, é culpa do shell.
