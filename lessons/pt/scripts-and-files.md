# Scripts e arquivos

O que vale quando um programa escreve, gera, transforma ou move arquivos e dados.

### 6. A definição de negócio fica em um único lugar

`from: 4a309d46` · `by: ai`

**A ideia.** Se a regra de “o que conta como ativo” se repete em toda consulta, as cópias vão divergir. Não é questão de se, e sim de quando.

**Exemplo.** Um validador tinha a contagem de itens de referência digitada à mão como 43. Quando o documento cresceu para 47, ele rejeitou os quatro novos como inexistentes. Agora conta os itens do próprio documento.

**Outro exemplo.** Um simulador de conversas de atendimento a clientes deixava, em segredo, um em cada três clientes como “fora do perfil”, com uma lista de motivos escrita no código; depois, um avaliador julgava a pessoa que treinava segundo o manual de vendas. Um dos motivos no código não estava na regra do manual. O cliente simulado se recusava a comprar por causa dele, e o avaliador culpava a pessoa por não ter descartado o cliente. O veredito media a diferença entre duas cópias da regra, e a pessoa concluiu que o simulador tinha sido feito para que ninguém conseguisse vender.

**Pergunta detectora.** Se eu mudar esta definição, em quantos arquivos preciso mexer? Se for mais de um, a regra não está configurada em um só lugar. O código que monta um caso e o código que o julga leem a regra do mesmo lugar?

**Sinal de alerta.** “Eu coloco aqui também, é só uma linha” · “esse número não vai mudar” · “esta lista é só para gerar casos”.

**O que fazer.** Coloque a definição num único ponto por onde passa toda consulta, e faça todas lerem dali. Um número digitado à mão que copia um valor de outro lugar também é uma definição repetida. Um gerador de casos e o juiz dele leem o mesmo arquivo de regras, e um teste falha se o gerador produzir uma condição que esse arquivo não conhece. Antes de culpar quem foi avaliado, confira o caso contra a regra oficial.

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

### 63. Antes de limpar em lote algo que ninguém salvou, salve do jeito que está

`from: 8f7e7662` · `by: ai`

**A ideia.** Arquivos recém-gerados (dados, relatórios, a saída de um agente) muitas vezes ainda não estão sob controle de versão. Se a etapa seguinte os reescreve em lote (deduplicar, renomear rótulos, remover linhas) e remove demais, não há como voltar ao original. A lição 24 protege uma escrita que falha no meio; esta protege contra uma limpeza que funciona e está errada.

**Exemplo.** Sete agentes escreveram 3,780 frases de treinamento em arquivos novos. A etapa seguinte era limpá-las: descartar as muito parecidas com o conjunto de teste e as duplicatas entre arquivos. Os arquivos ainda não estavam no git. Antes de a reescrita rodar, o sistema de permissões a bloqueou como irreversível, e fez bem. As 3,780 frases foram commitadas primeiro, e a limpeza (73 linhas removidas, 1 com rótulo alterado) foi para um commit próprio, que pode ser revisado e revertido.

**Pergunta detectora.** O que estou prestes a reescrever está salvo em algum lugar no estado atual? Se minha limpeza remover demais, de onde recupero isso?

**Sinal de alerta.** “São arquivos novos, limpo tudo de uma vez.”

**O que fazer.** Primeiro, um commit (ou uma cópia) do estado original. Depois, a limpeza em commit próprio, com a contagem do que foi removido e o motivo (ver a lição 56), para que a mudança possa ser revisada linha por linha e desfeita.

### 66. Um script novo herda a configuração que o projeto já usa

`from: 6a79105c` · `by: ai`

**A ideia.** Se o projeto já carrega uma biblioteca em outro script com uma configuração especial (caminhos de bibliotecas nativas, variáveis de ambiente, dispositivo, versão do modelo), um script novo que a usa precisa da mesma configuração. Escrevê-lo do zero repete um problema que o projeto já resolveu.

**Exemplo.** Um script descartável para transcrever na GPU falhou com uma DLL do CUDA ausente. O script de dataset do projeto já resolvia isso acrescentando a pasta de bibliotecas do framework de aprendizado profundo ao caminho de busca de DLLs antes de importar a biblioteca de fala; o script novo não copiou essa linha.

**Pergunta detectora.** Esta biblioteca já é carregada em outro script do projeto? O que esse script faz logo antes de importá-la ou criá-la?

**Sinal de alerta.** “É um script de cinco linhas, não preciso ver como o outro faz.”

**O que fazer.** Antes de escrever um script que usa uma biblioteca do projeto, procure onde ela já é carregada e copie a configuração, ou, melhor ainda, importe o carregador do projeto, para que a configuração fique em um só lugar (ver a lição 6). Se aparecer um erro de carregamento, procure-o no código do projeto antes de pesquisar fora.

### 67. Um valor ajustado em uma amostra não serve para todas as amostras

`from: c4c22bc2` · `by: ai`

**A ideia.** Um ajuste escolhido testando-o numa amostra (um limiar, um corte, um ganho) fica ajustado a essa amostra. Quando chega uma mais alta, mais longa ou mais rara, o mesmo número já não dá o resultado que foi aprovado.

**Exemplo.** As respirações de uma voz gerada foram reduzidas em 18 dB; numa amostra de 15 s elas ficaram inaudíveis, e o usuário aprovou. Na lição completa, o modelo respirava mais alto, e quatro respirações continuaram audíveis. Antes de cortar mais forte, cada uma foi inspecionada: três não eram respirações, e sim o “s” final de palavras, que o detector tinha confundido (ver a lição 13), e cortar até −35 dB fez a transcrição perder o “s”.

**Pergunta detectora.** Em quantas amostras, e quais casos extremos, este número foi escolhido? Ele descreve o resultado que eu quero, ou uma etapa que só deu esse resultado na amostra?

**Sinal de alerta.** “Ficou perfeito na amostra, aplique o mesmo a tudo” · “sobraram alguns, corte mais forte”.

**O que fazer.** Escolha o valor pelos extremos, e não por uma amostra só: o mais alto, o mais longo, o caso mais raro. Quando for possível, escreva-o como o resultado que você quer, com limites (“terminar em −61 dBFS, cortando entre 18 e 35 dB”), e não como um passo fixo. Quando algo sobrevive à configuração, olhe cada caso antes de apertá-la: pode não ser para isso que ela serve.

### 68. Uma etapa que lê além de uma borda vai antes da etapa que a corta

`from: 1e65549b` · `by: ai`

**A ideia.** Algumas etapas precisam de material além da borda do que trabalham: uma reverberação ou um eco estende um som além do seu fim, e um filtro de suavização ou uma média móvel lê os vizinhos de cada ponto. Colocadas depois de um corte, de um fade ou de um filtro, não encontram mais o que ler, e o resultado sai igual, ou errado nas bordas.

**Exemplo.** Para que as frases de narração desaparecessem com um fade mais natural, testou-se uma reverberação leve. Ela foi aplicada a frases já cortadas e com fade: a cauda da reverberação ficou 8 a 30 dB abaixo do fundo, inaudível, e o teste não mudou nada.

**Pergunta detectora.** Esta etapa precisa de material que fica além do ponto onde eu já cortei, desvaneci ou filtrei? Em que ponto da cadeia estou colocando-a?

**Sinal de alerta.** “Acrescento o efeito no fim, sobre o que já está pronto.”

**O que fazer.** Antes de acrescentar uma etapa a uma cadeia de processamento, anote o que ela precisa como entrada e o que deixa como saída, e coloque-a onde a entrada ainda existe. Depois confira se ela mudou a saída (ver a lição 50) antes de pedir que alguém olhe ou ouça.

### VIDEO-3. Colar clipes sobre silêncio digital expõe o ruído de fundo de cada um

`from: 1bd2ffe3` · `by: ai`

**A ideia.** Quando trechos de áudio são colocados numa linha do tempo de zeros, cada trecho carrega o próprio ruído de fundo, e as lacunas são silêncio absoluto. O ouvido percebe o fundo ligando e desligando a cada corte. Um fundo colocado sob as lacunas só esconde isso se combinar com os trechos em nível e em som, e mesmo um fundo que combine pode ser ouvido como um chiado constante.

**Exemplo.** A narração de uma lição foi montada colocando cada frase gerada sobre zeros. Com uma voz limpa (piso de ruído −83 dB) nada era audível; com uma voz clonada que trazia ruído de ambiente (−48 dB), o usuário ouviu um silêncio súbito nos 17 cortes. Depois, um fundo de −63 dB sob uma voz com piso de −58 dB deixou degraus, e um de −58 dB foi ouvido como um chiado constante e fraco.

**Pergunta detectora.** Qual é o piso de ruído dentro de cada trecho, e entre os trechos? Eles combinam em nível e em som, ou o corte muda um dos dois?

**Sinal de alerta.** “A lacuna está em silêncio, não pode ficar mais limpa” · “é só pôr um fundo embaixo”.

**O que fazer.** Meça o piso dos trechos antes de uni-los. Se ele for tão baixo quanto o das lacunas (aqui, a voz limpa, em −83 dB, não mostrou emendas), deixe as lacunas em silêncio. Caso contrário, reduza o ruído dos trechos até perto desse nível antes de uni-los; se em vez disso você puser um fundo sob as lacunas, tire-o dos próprios trechos, no nível deles, e ouça o conjunto inteiro em fones de ouvido antes de mantê-lo. Confira a saída em busca de degraus de nível em cada corte. De onde veio o ruído é tratado na lição AI-3.

### WEB-1. Um armazenamento danificado não pode levar o próximo registro junto

`from: e896b1e3` · `by: ai`

**A ideia.** Qualquer que seja a forma como um site salva seus registros, uma escrita danificada pode levar consigo o que vem depois. Com registros acrescentados como linhas, uma linha cortada gruda o registro seguinte nela, e um leitor que pula “linhas danificadas” descarta as duas, em silêncio. Com todos os registros num só arquivo que é lido, alterado e gravado por inteiro, quando esse arquivo não pode mais ser lido, todo registro novo falha, e só um console que ninguém olha avisa. É o outro lado da lição 24: lá o arquivo é esvaziado; aqui, o que vem depois é perdido.

**Exemplo.** Nas duas execuções da primeira simulação Web, o formulário salvava cada mensagem como uma linha JSON, e o painel administrativo pulava qualquer linha que não conseguia ler. Com uma linha cortada no fim do arquivo, a mensagem seguinte recebeu a resposta “Obrigado!”, foi salva e nunca apareceu no painel. Uma das duas versões tinha um comentário que dizia “linha danificada: pulada”.

**Outro exemplo.** Nas duas execuções da repetição, cada mensagem ficava num único arquivo JSON, gravado num arquivo temporário e depois renomeado, então uma queda no meio da escrita já não atrapalhava. Mas com o arquivo danificado de outra forma (uma edição feita à mão, um disco cheio, uma restauração malfeita), todo visitante novo recebia “Erro interno”, a página administrativa não mostrava nada, e o único sinal era um rastro de erro no console do servidor.

**Pergunta detectora.** Se o armazenamento for danificado amanhã, o que acontece com o registro do próximo visitante, e quem percebe?

**Sinal de alerta.** “Linhas danificadas são puladas” · “é só acrescentar no fim” · “a escrita é atômica, então o arquivo não pode quebrar”.

**O que fazer.** Faça um registro novo não depender dos antigos: acrescente a um arquivo que termina com quebra de linha (comece o registro com uma, se ele não terminar), ou salve cada registro num arquivo próprio, em vez de reescrever um arquivo que contém todos. Na leitura, conte o que não pôde ser lido e mostre essa contagem onde o dono vai vê-la. Teste danificando o armazenamento à mão (corte a última linha, trunque o arquivo) e depois envie um registro.
