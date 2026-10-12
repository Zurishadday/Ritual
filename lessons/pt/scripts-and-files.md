# Scripts e arquivos

O que vale quando um programa escreve, gera, transforma ou move arquivos e dados.

### 6. A definição de negócio fica em um único lugar

`from: 5286faa8` · `by: ai`

**A ideia.** Se a regra de “o que conta como ativo” se repete em toda consulta, as cópias vão divergir. Não é questão de se, e sim de quando.

**Exemplo.** Um validador tinha a contagem de itens de referência digitada à mão como 43. Quando o documento cresceu para 47, ele rejeitou os quatro novos como inexistentes. Agora conta os itens do próprio documento.

**Pergunta detectora.** Se eu mudar esta definição, em quantos arquivos preciso mexer? Se for mais de um, a regra não está configurada em um só lugar.

**Sinal de alerta.** “Eu coloco aqui também, é só uma linha” · “esse número não vai mudar”.

**O que fazer.** Coloque a definição num único ponto por onde passa toda consulta, e faça todas lerem dali. Um número digitado à mão que copia um valor de outro lugar também é uma definição repetida.

**Não confundir com.** Repetir uma explicação de propósito, em material didático, não é copiar uma definição. O que não se deve copiar é a regra que calcula o valor.

### 7. Leia o que foi publicado, não a intenção

`from: d542c959` · `by: ai`

**A ideia.** Um processo declara o que planeja fazer, mas publica o que de fato fez, e os dois nem sempre batem. Quem consome a saída deve ler o resultado.

**Exemplo.** Uma tela montava seus controles a partir da lista de variáveis que o modelo *iria* usar. O treinamento descartou uma delas, e durante dias houve um controle que não fazia nada.

**Pergunta detectora.** Isto é montado a partir da configuração de um processo ou do seu resultado publicado?

**Sinal de alerta.** “A lista declarada e o modelo são a mesma coisa.”

**O que fazer.** Derive a partir do resultado publicado. E o que não puder ser derivado deve falhar em voz alta, em vez de sumir em silêncio.

### 20. Idempotente não é o mesmo que atualizável

`from: 8ddac922` · `by: ai`

**A ideia.** “Insira se não existir” evita duplicatas, mas congela as coisas: o que já está lá nunca mais é escrito.

**Exemplo.** Uma legenda com as faixas de uma classificação foi inserida uma vez. As faixas mudaram, e a legenda continuou mostrando as antigas.

**Pergunta detectora.** Se eu mudar o que este código injeta, a próxima execução vai atualizá-lo?

**Sinal de alerta.** “Já está lá, não mexo de novo.”

**O que fazer.** Substitua: remova a versão antiga, injete de novo e confira que sobrou só uma cópia.

### 21. Sua marca tem que ser sua

`from: e8ae4ba7` · `by: ai`

**A ideia.** Se você localiza a sua mudança procurando um texto que o usuário lê, como um título ou um rótulo, outra melhoria vai colar algo em cima dele, e a sua mudança deixa de encontrá-lo.

**Exemplo.** Um ícone de ajuda foi adicionado ao lado de vários títulos, e as atualizações que se localizavam pelos títulos pararam de funcionar.

**Outro exemplo.** Uma revisão procurava o texto “int(” para ver se alguém converteu um número, e ele casava dentro de “print(”: qualquer linha que imprimisse algo parecia passar. O que você procura tem que ser uma palavra inteira, e não um pedaço de outra.

**Mais um exemplo.** Uma revisão tomava a última linha impressa pelo código como resposta. Com uma função que imprime o número lá dentro e não o devolve, aquela linha existia por outro motivo: a resposta aparecia na tela, mesmo que o código nunca a entregasse.

**Pergunta detectora.** O texto que uso como âncora pode existir por outro motivo, ou pode crescer dentro dele?

**Sinal de alerta.** “Vou ancorar no título, ele é único.”

**O que fazer.** Use marcas próprias, como um ID ou um comentário de seção. E quando uma mudança toca muitos blocos de uma vez, confira todos, e não só o primeiro.

### 22. A segunda execução é a que encontra o bug

`from: 56b0053e` · `by: ai`

**A ideia.** Uma mudança que se repete sem quebrar nada precisa ser verificada rodando duas vezes, e não uma.

**Exemplo.** Para verificar que um script não mudou nada na segunda execução, comparou-se o checksum da mesma execução duas vezes, e depois dois checksums tirados de listas de arquivos diferentes. As duas comparações diziam “igual” ou “diferente” sem provar nada. A comparação que funciona tira o checksum, roda o script e tira o checksum de novo, dos mesmos arquivos e num único comando.

**Pergunta detectora.** Rodei minha mudança sobre algo que já tinha essa mudança aplicada? Que outro processo mexe neste mesmo texto depois de mim?

**Sinal de alerta.** “Rodou bem, então está pronto.”

**O que fazer.** Rode duas vezes a partir do mesmo ponto de partida e compare os arquivos: a segunda execução não pode mudar nada.

### 23. Endereços por posição expiram

`from: d94e6ad5` · `by: ai`

**A ideia.** Se você insere algo antes da “célula 9”, a célula 9 agora é outra célula.

**Exemplo.** Um script inseriu uma célula de título antes da célula 9 de um notebook, e depois editou a “célula 9”: editou justamente a célula que tinha acabado de inserir.

**Pergunta detectora.** Esta ferramenta localiza as coisas por posição, e eu acabei de inserir ou apagar algo antes dela?

**Sinal de alerta.** “A célula 9 é a que eu acabei de olhar.”

**O que fazer.** Localize o ponto de novo depois de cada inserção, e confira o resultado revisando a estrutura completa.

### 24. Escreva com rede de segurança

`from: f7402634` · `by: ai`

**A ideia.** Abrir um arquivo para escrita o esvazia na hora. Se algo falha no meio da escrita, sobra um arquivo vazio.

**Exemplo.** Um script abriu o arquivo de configuração para reescrevê-lo, falhou ao calcular um dos valores e deixou o arquivo vazio. O servidor nunca mais subiu.

**Pergunta detectora.** Algo pode falhar entre abrir o arquivo e terminar a escrita?

**Sinal de alerta.** “É uma substituição simples, escrevo direto.”

**O que fazer.** Prepare tudo na memória, escreva num arquivo temporário e, no fim, substitua o original num único passo.

### 25. Uma configuração não é um status, e um alerta não é uma garantia

`from: c5f24f3e` · `by: ai`

**A ideia.** “A tarefa agendada está habilitada” não quer dizer “ela rodou neste mês”. E esperar que um alerta avise quando algo falha significa confiar que o alerta nunca falha.

**Exemplo.** Uma tarefa agendada aparecia como “ativa”, mas não rodava havia dois meses por causa de uma credencial expirada. O painel mostrava o último dado como se fosse de hoje.

**Pergunta detectora.** Estou contando com algo que “dispara sozinho”?

**Sinal de alerta.** “Está agendado, então está rodando.”

**O que fazer.** Mostre na tela quando os dados foram atualizados pela última vez. Confira quais períodos estão faltando. E faça os processos poderem ser rodados de novo sem duplicar linhas.

### 48. Se um arquivo vem de um gerador, a correção vai no gerador

`from: 17fcef8c` · `by: ai`

**A ideia.** Quando um arquivo é montado por um script ou a partir de outras peças, o arquivo é uma saída, não o original. Qualquer coisa corrigida diretamente nele se perde na próxima geração, sem aviso.

**Exemplo.** Uma nota foi montada a partir das seções que cada pessoa entregou. Três linhas foram corrigidas direto na nota, e quando ela foi reconstruída a partir das entregas, as três linhas antigas voltaram. Em outra peça, um revisor corrigiu à mão o texto alternativo de uma página que vinha de um template; o autor regenerou a página, e a correção desapareceu.

**Pergunta detectora.** Este arquivo é escrito por outra coisa (um script, um template, uma montagem de partes)? Se eu regenerar, minha mudança continua lá?

**Sinal de alerta.** “Corrigi direto no arquivo” · “acabei de regenerar”.

**O que fazer.** Antes de corrigir um arquivo, descubra de onde ele vem. Corrija a fonte (o template, o script, a entrega) e regenere; se for preciso corrigir a saída, corrija a fonte também no mesmo passo. Quem revisa uma saída gerada diz o que mudou para que a mudança seja levada para a fonte. E antes de reconstruir um arquivo a partir das suas fontes, compare-o com o que vai sair: tudo o que for diferente é uma correção que se perderia.

### WEB-1. Em um arquivo que só cresce, uma linha quebrada leva a seguinte junto

`from: 67b63f0b` · `by: ai`

**A ideia.** Salvar cada registro como uma linha no fim de um arquivo é simples e lida bem com muitos registros. Mas se uma escrita é interrompida, a linha fica sem a quebra de linha, e o registro seguinte fica grudado nela. Pular “linhas danificadas” na leitura descarta os dois, em silêncio. É o outro lado da lição 24: lá o arquivo é esvaziado; aqui, o que vem depois é perdido.

**Exemplo.** Nas duas execuções da simulação Web, o formulário salvava cada mensagem como uma linha JSON, e o painel administrativo pulava qualquer linha que não conseguia ler. Com uma linha cortada no fim do arquivo, a mensagem seguinte recebeu a resposta “Obrigado!”, foi salva e nunca apareceu no painel. Uma das duas versões tinha um comentário que dizia “linha danificada: pulada”.

**Pergunta detectora.** Se a última escrita ficou pela metade, o que acontece com a próxima? O que o meu leitor pula alerta alguém?

**Sinal de alerta.** “Linhas danificadas são puladas” · “é só acrescentar no fim”.

**O que fazer.** Antes de acrescentar, se o arquivo não termina com quebra de linha, comece o registro com uma; ou salve cada registro num arquivo próprio. Na leitura, conte as linhas que não puderam ser lidas e mostre essa contagem onde o dono vai vê-la. Teste deixando manualmente uma linha cortada e depois escrevendo um registro depois dela.
