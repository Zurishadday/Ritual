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

`from: b201fbb7` · `by: ai`

**A ideia.** Se você localiza a sua mudança procurando um texto que o usuário lê, como um título ou um rótulo, outra melhoria vai colar algo em cima dele, e a sua mudança deixa de encontrá-lo.

**Exemplo.** Um ícone de ajuda foi adicionado ao lado de vários títulos, e as atualizações que se localizavam pelos títulos pararam de funcionar.

**Outro exemplo.** Uma revisão procurava o texto “int(” para ver se alguém converteu um número, e ele casava dentro de “print(”: qualquer linha que imprimisse algo parecia passar. Uma contagem de atalhos de teclado procurava “Ctrl+” seguido de uma letra, sem diferenciar maiúsculas, e contou Ctrl+Shift+V como “Ctrl+S”: o S era a primeira letra de “Shift”. O que você procura tem que ser uma palavra inteira, e não um pedaço de outra.

**Mais um exemplo.** Uma revisão tomava a última linha impressa pelo código como resposta. Com uma função que imprime o número lá dentro e não o devolve, aquela linha existia por outro motivo: a resposta aparecia na tela, mesmo que o código nunca a entregasse.

**Pergunta detectora.** O texto que uso como âncora pode existir por outro motivo, ou pode crescer dentro dele?

**Sinal de alerta.** “Vou ancorar no título, ele é único.”

**O que fazer.** Use marcas próprias, como um ID ou um comentário de seção. E quando uma mudança toca muitos blocos de uma vez, confira todos, e não só o primeiro. Uma contagem que vem de uma busca é conferida nos seus achados, e não só no total: abra três dos achados.

### 22. A segunda execução é a que encontra o bug

`from: 8a1c8a92` · `by: ai`

**A ideia.** Uma mudança que se repete sem quebrar nada precisa ser verificada rodando duas vezes, e não uma.

**Exemplo.** Para verificar que um script não mudou nada na segunda execução, comparou-se o checksum da mesma execução duas vezes, e depois dois checksums tirados de listas de arquivos diferentes. As duas comparações diziam “igual” ou “diferente” sem provar nada. A comparação que funciona tira o checksum, roda o script e tira o checksum de novo, dos mesmos arquivos e num único comando.

**Outro exemplo.** Um lançador de duplo clique abria dois servidores locais em portas fixas e abria o navegador. Foi testado uma vez, com tudo fechado, e funcionou. Foi rodado de novo para obter uma versão nova enquanto a antiga ainda estava rodando: os dois servidores novos falharam com “porta já em uso”, e o navegador ficou na versão antiga sem nenhum aviso (ver a lição 27). Aqui a segunda execução colidiu com processos e portas, não com arquivos.

**Pergunta detectora.** Rodei minha mudança sobre algo que já tinha essa mudança aplicada? Que outro processo mexe neste mesmo texto depois de mim? O que acontece se eu iniciá-lo de novo enquanto a primeira execução ainda está viva?

**Sinal de alerta.** “Rodou bem, então está pronto.”

**O que fazer.** Rode duas vezes a partir do mesmo ponto de partida e compare os arquivos: a segunda execução não pode mudar nada. Teste um lançador iniciando-o de novo sem fechar a execução anterior. Antes de iniciar qualquer coisa, o lançador para só os próprios processos (achados pelo nome do processo ou pelo título da janela, nunca por “o que estiver na porta”), e avisa se outro programa ocupa a porta.

### 23. Endereços por posição expiram

`from: 9c3d3e62` · `by: ai`

**A ideia.** Se você insere algo antes da “célula 9”, a célula 9 agora é outra célula.

**Exemplo.** Um script inseriu uma célula de título antes da célula 9 de um notebook, e depois editou a “célula 9”: editou justamente a célula que tinha acabado de inserir.

**Outro exemplo.** Uma marca que aponta para algo desenhado (uma caixa, uma seta, um destaque) também é um endereço por posição. Um vídeo feito com código redesenhou uma célula de código com um novo desenho, mais largo. A caixa em volta do resultado tinha `x = 150` digitado à mão, da célula antiga, e ficou atravessando duas colunas da tabela de resultado. Quem assistiu ao vídeo completo viu; um revisor de quadros parados tinha aprovado.

**Pergunta detectora.** Esta ferramenta localiza as coisas por posição, e eu acabei de inserir ou apagar algo antes dela? Uma marca vem do que ela marca, ou de coordenadas digitadas à mão?

**Sinal de alerta.** “A célula 9 é a que eu acabei de olhar.” · “Só o estilo mudou, as marcas são as mesmas.”

**O que fazer.** Localize o ponto de novo depois de cada inserção, e confira o resultado revisando a estrutura completa. Tenha uma função que devolva a caixa de cada coisa desenhada, e peça a ela cada marca. Depois de um redesenho, busque no código números de posição soltos.

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

### 56. Uma atualização incremental não é uma reconstrução: leia o que ela descarta

`from: 9ffb2735` · `by: ai`

**A ideia.** Uma atualização que processa só o que mudou não dá o mesmo resultado de uma reconstrução completa. Quando ela substitui tudo o que veio de um arquivo relido, também remove o que outros arquivos contribuíram para as mesmas entradas. Antes de aceitar que algo desapareceu, liste o que se perdeu e de onde veio.

**Exemplo.** Um grafo de conhecimento de um repositório foi atualizado só com os arquivos alterados. Uma trava contra encolhimento a parou duas vezes. Primeiro, nós que só tinham um rótulo em comum foram fundidos num só (ver a lição 2). Depois, ao substituir os nós de um arquivo relido, também foram removidos os nós para os quais outros arquivos apontavam: dez entradas que deveriam mostrar o próprio título passaram a mostrar o rótulo genérico de um nó antigo.

**Pergunta detectora.** O que existia antes e hoje não existe mais, e de qual arquivo veio cada coisa perdida?

**Sinal de alerta.** “É a mesma execução, só que com os arquivos novos.”

**O que fazer.** Compare antes e depois pelo identificador e salve a lista do que se perdeu, com o arquivo de origem de cada item. Force a gravação só se cada perda for explicada por uma mudança no próprio arquivo de origem, e ponha a correção no script que faz a fusão, não na saída. Uma reconstrução completa faz a mesma comparação (ver a lição 48).

### 61. Um auxiliar que adivinha a intenção pela forma dos argumentos

`from: 4248a8c5` · `by: ai`

**A ideia.** Uma função que decide o que fazer conforme um argumento foi passado ou não (com corpo é POST, sem corpo é GET; com um id atualiza, sem ele insere) transforma uma omissão numa operação diferente, sem erro.

**Exemplo.** Um auxiliar do front-end para chamar o servidor enviava POST quando recebia dados e GET quando não recebia. Um novo endpoint era POST mas não precisava de dados; ele foi chamado sem nenhum, saiu como GET, e o servidor respondeu “method not allowed”. A tela mostrava só uma linha curta de erro, e o problema só foi notado ao testar no navegador.

**Pergunta detectora.** Esta função muda de operação conforme um argumento opcional? Se eu deixo esse argumento de fora por não precisar dele, ela faz silenciosamente outra coisa?

**Sinal de alerta.** “Este não recebe dados, eu chamo sem nada”.

**O que fazer.** Torne a operação explícita (`api.post(path)`, `save(x, create=True)`), ou faça do padrão o caso seguro. Enquanto o auxiliar ambíguo existir, revise cada chamada que omite esse argumento.

### WEB-1. Um armazenamento danificado não pode levar o próximo registro junto

`from: e896b1e3` · `by: ai`

**A ideia.** Qualquer que seja a forma como um site salva seus registros, uma escrita danificada pode levar consigo o que vem depois. Com registros acrescentados como linhas, uma linha cortada gruda o registro seguinte nela, e um leitor que pula “linhas danificadas” descarta as duas, em silêncio. Com todos os registros num só arquivo que é lido, alterado e gravado por inteiro, quando esse arquivo não pode mais ser lido, todo registro novo falha, e só um console que ninguém olha avisa. É o outro lado da lição 24: lá o arquivo é esvaziado; aqui, o que vem depois é perdido.

**Exemplo.** Nas duas execuções da primeira simulação Web, o formulário salvava cada mensagem como uma linha JSON, e o painel administrativo pulava qualquer linha que não conseguia ler. Com uma linha cortada no fim do arquivo, a mensagem seguinte recebeu a resposta “Obrigado!”, foi salva e nunca apareceu no painel. Uma das duas versões tinha um comentário que dizia “linha danificada: pulada”.

**Outro exemplo.** Nas duas execuções da repetição, cada mensagem ficava num único arquivo JSON, gravado num arquivo temporário e depois renomeado, então uma queda no meio da escrita já não atrapalhava. Mas com o arquivo danificado de outra forma (uma edição feita à mão, um disco cheio, uma restauração malfeita), todo visitante novo recebia “Erro interno”, a página administrativa não mostrava nada, e o único sinal era um rastro de erro no console do servidor.

**Pergunta detectora.** Se o armazenamento for danificado amanhã, o que acontece com o registro do próximo visitante, e quem percebe?

**Sinal de alerta.** “Linhas danificadas são puladas” · “é só acrescentar no fim” · “a escrita é atômica, então o arquivo não pode quebrar”.

**O que fazer.** Faça um registro novo não depender dos antigos: acrescente a um arquivo que termina com quebra de linha (comece o registro com uma, se ele não terminar), ou salve cada registro num arquivo próprio, em vez de reescrever um arquivo que contém todos. Na leitura, conte o que não pôde ser lido e mostre essa contagem onde o dono vai vê-la. Teste danificando o armazenamento à mão (corte a última linha, trunque o arquivo) e depois envie um registro.
