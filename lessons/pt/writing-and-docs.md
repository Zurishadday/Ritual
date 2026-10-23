# Escrita e documentação

O que vale quando você escreve para outras pessoas: documentação, manuais, textos de tela, conteúdo, prompts.

### 11. Remover um gráfico não remove a afirmação que ele fazia

`from: 36fecfbc` · `by: ai`

**A ideia.** Se você tirou algo porque os dados não eram confiáveis, a mesma afirmação provavelmente ainda está em outros textos, escrita com outras palavras.

**Exemplo.** Um gráfico não confiável foi retirado, mas um cartão de “principais conclusões” e um plano de ação ainda recomendavam o que o gráfico dizia.

**Outro exemplo.** Um plano de capítulos foi renumerado do 7 para o 15. Duas listas em outro documento ainda apontavam para “7.4” e “7.7” do plano antigo, que agora eram outros temas. Quando você substitui um plano, os números antigos também são afirmações.

**Mais um exemplo.** Um projeto mantinha a sua própria lista de lições, e uma biblioteca tinha incorporado essas lições à sua própria lista. As duas numeravam igual até 44 e diferente a partir de 45. As instruções do projeto e os agentes revisores dele continuavam citando “46”, que na biblioteca é outra lição. Isso só apareceu quando o dono pediu uma segunda revisão.

**Pergunta detectora.** Quais outros textos dizem a mesma coisa que acabei de remover? Quando duas numerações coexistem, cada citação diz qual lista usa?

**Sinal de alerta.** “Eu já tirei o gráfico.” · “Os números são os mesmos.”

**O que fazer.** Busque por assunto, não por identificador. Ecos não têm nome de variável. Quando duas numerações coexistem, cite com um prefixo que nomeie a lista (“v2 #46”, “biblioteca #46”), e busque toda citação da faixa alterada em todos os arquivos, e não só no que você renumerou (ver a lição 8).

### 37. Documente o que existe, não o que você gostaria que existisse

`from: 928f7db8` · `by: ai`

**A ideia.** Uma revisão de documentação melhora o documento; ela não redesenha o sistema. Se o sistema tem um limite, o documento o declara. Não o esconde nem promete corrigi-lo.

**Exemplo.** Um manual dizia que os dados sincronizavam sozinhos. O sistema só sincronizava quando o app era aberto. A revisão “corrigiu” o manual para prometer que logo seria automático, em vez de declarar o limite como ele era.

**Pergunta detectora.** O que estou prestes a escrever descreve como funciona hoje ou como deveria funcionar?

**Sinal de alerta.** “Deveria funcionar assim” · “eles vão consertar isso”.

**O que fazer.** Separe os achados sobre o documento (“está mal escrito”) dos achados sobre o sistema (“funciona diferente do ideal”). O segundo tipo é declarado como limitação.

### 38. O que você não sabe fica marcado, não inventado

`from: dc2fde6c` · `by: ai`

**A ideia.** Um documento oficial afirma tudo com a mesma autoridade. Um detalhe inventado, como um responsável, um prazo ou um tempo de resposta, parece igual a um real.

**Exemplo.** Um procedimento tinha um tempo de resposta de 24 horas que ninguém tinha combinado. Foi escrito porque soava razoável, e depois de publicado virou um compromisso.

**Outro exemplo.** Uma mensagem de commit explicava por que duas revisões não tinham executado nada: o revisor tinha digitado certos comandos. Ninguém tinha visto esses comandos; o registro só dizia “denied”. A mensagem já era pública, e o commit seguinte precisou corrigi-la.

**Mais um exemplo.** Alguém perguntou sobre uma ferramenta por um nome que não lhe era familiar. Esse nome foi confundido com outro, bem conhecido e parecido, que foi pesquisado e explicado longamente. A pessoa queria dizer um produto novo com aquele nome exato; pesquisá-lo como estava escrito teria achado de imediato.

**Variante.** O detalhe pode ser o estado atual de uma ferramenta, ou o que aconteceu antes. Em dois dias, duas afirmações sobre ferramentas vieram de memória e estavam erradas: que um comando de atualização reconstruía um índice inteiro (ele lê só o que mudou), e que as atualizações automáticas de um plugin estavam “provavelmente” desligadas (o próprio comando `doctor` do plugin dizia que estavam ligadas). Uma olhada em cada ferramenta teria respondido. E quando as regras de um projeto foram passadas para um formato novo, vários de seus exemplos foram refeitos de memória e não batiam com o que tinha acontecido; um deles contava um erro que nunca ocorreu. Foram corrigidos abrindo o registro antigo.

**Pergunta detectora.** Eu conheço este detalhe, ou estou assumindo porque soa razoável? Uma causa, um nome, um número, o que uma ferramenta faz, como ela está configurada: eu vi, ou é o meu melhor palpite? De qual registro copiei este exemplo?

**Sinal de alerta.** “Certamente é assim.” · “Deve ser por isso.” · “Devem querer dizer…” · “Foi mais ou menos assim que aconteceu.”

**O que fazer.** Marque o que falta de forma visível, como “Pendente” em vermelho, e pergunte a quem sabe. Redação neutra é melhor que redação falsa. Numa mensagem de commit, uma causa que ninguém viu numa saída é escrita como palpite (“provavelmente”). Um nome que você não reconhece é pesquisado exatamente como foi escrito; se nada aparecer, pergunte qual deles a pessoa quis dizer. Antes de dizer o que uma ferramenta faz ou como ela está configurada, rode a verificação mais barata (o `doctor` dela, o `--help`, a configuração, uma busca) e diga o que ela mostrou, ou marque a afirmação como não verificada (ver a lição 29 e a lição 52). O “correto” de um revisor também é palpite, a menos que ele tenha olhado (ver a lição 28). Um exemplo do que aconteceu é copiado do seu registro (o log, o commit), nunca refeito de memória.

**Não confundir com.** A marca serve para quem decide, não para o leitor final. Um “aguardando confirmação” dentro de um texto publicado é mais um dado que não deveria estar lá. Se o documento sair antes de ser confirmado, use uma redação neutra que não afirme o que falta, e deixe o item pendente no relatório ou no registro do projeto.

### 39. Versione à vista de todos

`from: 778c3988` · `by: ai`

**A ideia.** Toda mudança traz um novo número de versão na capa e uma linha no histórico, com a data, o que mudou e quem mudou. Quando duas cópias circulam ao mesmo tempo, a versão é a única coisa que diz qual é a boa.

**Exemplo.** Duas cópias de um manual circulavam por e-mail. A antiga dizia que a ferramenta “abre com um duplo clique”, o que já não era verdade, e ninguém conseguia saber qual das duas era a boa.

**Pergunta detectora.** Se alguém tem a cópia da semana passada, como vai saber que ela já não é a boa?

**Sinal de alerta.** “É uma mudança pequena, não precisa de versão.”

**O que fazer.** Atualize o número da versão e escreva a linha do histórico na mesma mudança que altera o documento.

### 42. Trabalhe na versão atual

`from: 2618ac78` · `by: ai`

**A ideia.** Uma revisão feita sobre uma cópia antiga traz de volta erros que já tinham sido corrigidos.

**Exemplo.** Uma reorganização do manual foi feita sobre uma versão de semanas antes. Ela voltou a dizer que a ferramenta “abre com um duplo clique”, o que já não era verdade.

**Pergunta detectora.** A versão que estou editando é a mais recente ou a que eu tinha aberto?

**Sinal de alerta.** “Estou com a versão aberta desde ontem.”

**O que fazer.** Pegue a estrutura que a revisão propõe e despeje nela o conteúdo mais recente, e não o contrário.

### 43. Releia do início ao fim depois de muitas correções

`from: b956a885` · `by: ai`

**A ideia.** Depois de várias rodadas de correções pontuais, um documento pode se contradizer. Cada correção era verdadeira na sua seção, mas ninguém releu as outras.

**Exemplo.** Uma seção dizia que nada era salvo sem conexão. O FAQ ainda dizia que tudo o que é capturado fica guardado no aparelho.

**Outro exemplo.** Um projeto final de uma disciplina de estatística chegou em três partes. A segunda parte aceitou como correta “a segunda parcela continuou igual” com um valor-p de 0.875; a terceira ensinava que um valor-p alto não prova que não há efeito. Depois que isso foi corrigido, a mesma afirmação voltou em três outros lugares: uma frase de transição (“ao ser lançado, não mudou nada”), um título de passo e o que uma personagem dizia numa reunião simulada.

**Pergunta detectora.** Quantas correções este documento recebeu desde a última vez que alguém o leu inteiro? Alguma frase, títulos e diálogos incluídos, quebra uma regra que este documento ensina?

**Sinal de alerta.** “Conferi cada correção no seu lugar.”

**O que fazer.** Ao terminar cada rodada, busque por assunto tudo o que o documento diz sobre o que você corrigiu. Depois, liste as regras que o documento ensina e busque cada uma por assunto, também nas partes que não são sobre ela: títulos, transições, exemplos e diálogos.

### 51. O que parece óbvio para você é a primeira coisa a ensinar

`from: c970d3ec` · `by: ai`

**A ideia.** Quem já sabe não percebe os passos que dá sem pensar. Por isso o primeiro exemplo traz várias coisas novas de uma vez, e um iniciante se perde na primeira linha.

**Exemplo.** Um curso de programação para iniciantes abriu com uma célula que tinha seis coisas novas ao mesmo tempo, e o plano nunca ensinava o que é um tipo de dado nem que o `=` guarda e lê da direita para a esquerda. O responsável pelo curso resumiu em uma frase: “você presume muito sobre os estudantes”. Depois, três lições diziam “como arrastar uma fórmula”; nenhuma tinha ensinado a arrastar, só “copiar a fórmula para baixo”.

**Outro exemplo.** Em um módulo para iniciantes, a mesma palavra curta nomeava uma célula da planilha num passo e o quadradinho no canto dela em outro. Os avisos de uma prática usavam uma referência de célula e o nome de uma ferramenta de captura de tela antes de o texto ter apresentado qualquer uma delas.

**Pergunta detectora.** No meu primeiro exemplo, quantas coisas são novas para quem não sabe nada? Cada símbolo, cada palavra, cada nome de botão e cada ação que eu peço já foi ensinado? Uma palavra nomeia duas coisas? Um aviso nomeia algo ainda não ensinado?

**Sinal de alerta.** “Qualquer um entende” · “é só uma linha” · “é a palavra de sempre.” · “O aviso explica.”

**O que fazer.** Antes de escrever, liste o que o seu exemplo dá por certo (símbolos, palavras, cliques, coisas que o estudante já deveria ter construído) e ensine essas coisas primeiro: uma ideia nova por vez, cada símbolo explicado na primeira vez em que aparece. Procure cada palavra igual ao nome de um botão, e cada ação que você pede, do mesmo jeito que procura um símbolo. Se possível, deixe uma verificação automática comparar o que cada exemplo usa com o que já foi ensinado. Leia os avisos e as dicas da interface na ordem em que o estudante os encontra, e busque cada nome que eles usam do mesmo jeito que busca um símbolo. Dê a cada coisa um nome só e mantenha-o (ver a lição 2).

### 52. Escreva sobre uma ferramenta que muda rápido a partir da prática de hoje, não da memória

`from: 15098a47` · `by: ai`

**A ideia.** Uma lição ou um guia sobre uma ferramenta que muda a cada poucos meses fica desatualizado enquanto é escrito, se vier do que o autor lembra. A premissa pode estar errada antes de o primeiro leitor chegar a ela.

**Exemplo.** Um plano para um módulo de “análise com IA” começou com “a IA não consegue ver seus dados, então descreva sua tabela em vez de colá-la”. O responsável pelo curso observou que agentes agora se conectam ao banco de dados, executam as consultas sozinhos e devolvem o número. Uma pesquisa com fontes e datas confirmou: copiar código de um chat era a forma de fazer dois anos antes. Várias lições foram reescritas em torno do que ainda vale: definir a pergunta, supervisionar o agente e conferir o número.

**Pergunta detectora.** Quais premissas deste texto dependem do que a ferramenta faz hoje? Quando eu as verifiquei pela última vez, e em qual fonte?

**Sinal de alerta.** “É assim que funciona” · “todo mundo faz assim.”

**O que fazer.** Antes de escrever sobre uma ferramenta que muda rápido, pesquise a prática atual com fontes e datas: o que a ferramenta faz agora, o que é gratuito, o que as pessoas de fato usam. Construa o texto em torno da habilidade que sobrevive à próxima versão (enquadrar, supervisionar, verificar) e mantenha os passos específicos da ferramenta em um só lugar, que possa ser atualizado. Marque o que você não conseguiu verificar e teste à mão antes de publicar.

### 54. “O X no início e no fechamento”: todo tradutor escolhe a mesma leitura errada

`from: 96bbb4cc` · `by: ai`

**A ideia.** Um qualificador antes de dois itens ligados por “e” pode se aplicar aos dois ou só ao primeiro. O autor sabe qual é o sentido pretendido; quem lê precisa adivinhar, e os tradutores adivinham igual.

**Exemplo.** Uma página de resultados dizia “o que mudou isso são as lições do início e do fechamento”, referindo-se a duas partes de uma ferramenta: as lições mostradas no início, e uma etapa final de verificação. As seis traduções leram como uma coisa só, lições mostradas no início e no fim. Dois dias depois, a mesma construção entrou em um parágrafo novo, e as traduções a leram errado de novo.

**Outro exemplo.** Um parágrafo nomeou um tipo de erro como “(o caminho de erro, o foco do teclado, um arquivo de dados danificado, uma divisão anotada antes das execuções)”, querendo dizer que o próprio tipo já tinha sido definido antes das execuções. As seis traduções o listaram como um quarto erro. A pergunta desta lição tinha sido mostrada ao autor naquele mesmo dia.

**Pergunta detectora.** Nesta frase, algum “o X no A e B” tem duas leituras? Traduzida palavra por palavra, a outra leitura aparece? Numa lista, uma nota sobre a lista fica onde se lê como mais um item?

**Sinal de alerta.** Uma lista de dois itens em que um é uma coisa e o outro é um momento ou um lugar. Uma nota sobre a lista escrita dentro dela, como seu último item.

**O que fazer.** Deixe a divisão visível. Conte-a (“duas partes: …”), dê a cada item o seu próprio artigo (“as lições do início, e o fechamento”), ou ponha o item curto primeiro (“o fechamento, e as lições do início”). Uma nota sobre uma lista fica fora dela, em oração própria. Depois, leia a tradução dessa frase e confira se ela tem o sentido que você pretendia.

### 58. Uma instrução feita de várias peças é vista antes de ser montada

`from: 2875c4ef` · `by: ai`

**A ideia.** Quando o que você ensina é montado a partir de várias peças (uma fórmula com cinco argumentos, um comando com várias opções), ditá-las uma após a outra enquanto são digitadas faz o aluno se perder: ele precisa entender cada peça e a montagem ao mesmo tempo. Primeiro cada peça é mostrada fazendo o seu trabalho nos dados, com o nome e o significado à vista; depois ela é montada.

**Exemplo.** Um vídeo tutorial de uma fórmula com duas condições ditava cada intervalo e cada condição enquanto eram digitados. O responsável: cada parâmetro não era entendido, e com muitos parâmetros a pessoa se perde. Refeito com a pergunta em palavras, cada peça pintada nos dados com sua cor, a contagem feita à mão, a fórmula montada em peças com as mesmas cores e a única coisa nova por último, funcionou muito melhor.

**Pergunta detectora.** Antes do primeiro caractere ser digitado, o aluno já viu nos dados o que cada peça faz? Cada peça traz o seu nome e o que significa à vista, e não só a sua cor?

**Sinal de alerta.** “A voz nomeia cada argumento à medida que ele aparece.”

**O que fazer.** Primeiro a pergunta em palavras. Depois cada peça mostrada nos dados, uma cor para cada, com o nome e o significado ao lado. Depois o resultado calculado à mão. Só então a instrução, montada em partes com as mesmas cores e uma pausa entre elas, com a novidade por último. Não é o mesmo que a lição 51: aqui cada peça pode já ser conhecida, e o que falha é a ordem.

### AI-1. Se você restringe onde o modelo pode escrever, ele escreve onde você deixar

`from: abeb61b2` · `by: ai`

**A ideia.** Quando o prompt ou o código proíbe um campo de saída em que o modelo tem algo a dizer, o modelo não fica calado: ele coloca isso no campo que você permitiu, mesmo que não pertença ali. Cada campo precisa dizer o que pode conter e que deixá-lo vazio é aceitável (ver a lição 38).

**Exemplo.** Um assistente ao vivo tinha três zonas: alertas, fatos sobre o cliente e a fala seguinte. O prompt dizia “nos primeiros 2 minutos, use só alertas”, e o código descartava todo o resto. O modelo queria sugerir uma pergunta e a pôs na zona de alertas (“Não explique mais: pergunte ‘o que você gostaria de tirar disto?’”). Quando enviou a fala na zona própria, o código a descartou e o painel ficou vazio. A pessoa relatou com uma captura de tela.

**Pergunta detectora.** Se o modelo tem algo a dizer e o campo certo está proibido neste momento, onde ele vai pôr isso? Cada campo diz o que cabe e o que não cabe, e que pode ficar vazio? O código descarta algo sem que o prompt saiba que isso será descartado?

**Sinal de alerta.** “Nessa fase, faça ele usar só o campo X”.

**O que fazer.** Defina cada campo pelo conteúdo (“só alertas; nunca uma fala”), e não pelo momento. Se uma fase não deve mostrar algo, o prompt e o código precisam dizer a mesma coisa (ver a lição 9). Teste com um caso em que o modelo tenha algo a dizer no campo proibido.

### AI-2. Uma regra escrita como lista de verificação é executada como lista de verificação, mesmo depois de a outra pessoa ter respondido

`from: 23040433` · `by: ai`

**A ideia.** Se o prompt lista o que precisa ser coberto (os pontos de uma abertura, os campos de um formulário), o modelo os pede um a um mesmo quando a pessoa já os deu com outras palavras, e deixa de responder ao que ela acabou de dizer.

**Exemplo.** Um assistente de vendas tinha de cobrir quatro pontos de abertura no primeiro minuto; um deles era “o que eles querem tirar da ligação”. O cliente tinha acabado de dizer “trabalho com contabilidade e queria ver do que se trata essa coisa de dados”. O assistente sugeriu “Se não for para você, é só me dizer. O que você gostaria de tirar de hoje?”: ignorou o que o cliente disse e perguntou algo já respondido. A pessoa percebeu (“não encaixa com o que o cliente está me perguntando agora”).

**Pergunta detectora.** Se a pessoa já deu este ponto com outras palavras, o prompt diz ao modelo para contá-lo como coberto? A resposta parte do último que a pessoa disse, ou pula para o próximo item da lista?

**Sinal de alerta.** “Faça ele cobrir os quatro pontos”.

**O que fazer.** Ao lado de cada lista, escreva: “um ponto dito com outras palavras já está coberto”, “o que faltar entra como ponte dentro da resposta que segue o fio da conversa” e “nunca ignore a última coisa que a pessoa disse”. Teste com uma conversa real em que a pessoa responde a um ponto antes de ser perguntada.

### EDU-2. O que o estudante vê antes de responder não pode conter a resposta

`from: 2ffd5c1e` · `by: ai`

**A ideia.** Uma pergunta deixa de medir alguma coisa quando a resposta já apareceu: em uma imagem, na ideia principal, na explicação de outro exercício, no título de um passo ou em uma lição anterior. Quem acerta pode ter acabado de ler a resposta.

**Exemplo.** Uma ilustração com a figura certa ficou acima da prática que pedia essa figura. Uma lição perguntava o que acontece quando você guarda um novo valor em uma variável, em um passo intitulado “Guardar de novo substitui”. Um resumo colocado abaixo do questionário final era lido antes de responder ao questionário. Uma caixa de feedback que aparece depois da primeira tentativa, mesmo quando errada, já dava a direção da resposta.

**Outro exemplo.** Um exercício pedia que o estudante digitasse uma fórmula caractere por caractere, com a fórmula mostrada logo acima da caixa e com colagem permitida: ele media copiar e colar.

**Mais um exemplo.** Num curso com interfaces desenhadas, quatro componentes carregavam no código-fonte os números que um exercício posterior pedia. A verificação automática de respostas vazadas nunca procurava ali; revisores encontraram. Em cinco de sete passos de um módulo, a pergunta ficava logo abaixo do texto que a respondia: um título “Clique duplo: abrir” em cima da pergunta “o que abre uma pasta?”.

**Pergunta detectora.** O estudante vê esta figura, imagem ou frase antes de responder, aqui ou em uma lição anterior? Não só o número exato: também uma aproximação (“cerca de 25”), a conclusão escrita em uma legenda, um título, um “você acabou de ver que…”, ou o que a resposta errada mais provável de um exercício anterior mostra na tela.

**Sinal de alerta.** “É só contexto” · “é só o título” · “é a legenda.”

**O que fazer.** Procure cada resposta em tudo que é mostrado antes da pergunta, inclusive o que aparece depois de uma primeira tentativa errada, o que o código inicial imprime ao rodar, os arquivos para baixar e o que pode ser contado em um desenho. Escreva por último o título do passo e os objetivos de aprendizagem, e leia-os ao lado do resultado de cada previsão. Uma verificação automática encontra números exatos; aproximações e paráfrases só são encontradas por alguém que leia com a resposta em mente. Quando um exercício pedir que o estudante digite o que está na tela, bloqueie a colagem e explique o motivo. Estenda a verificação a todo arquivo que desenha a tela do estudante, inclusive o código dos componentes (ver a lição 16). Em um passo que explica e depois pergunta, a explicação que dá a resposta vem depois da pergunta, ou a pergunta pergunta sobre um caso que a explicação não cobre.

### EDU-3. Uma pergunta com duas respostas defensáveis não mede nada

`from: 3f95b2da` · `by: ai`

**A ideia.** Se, com o que o enunciado diz, outra opção também pode ser defendida, quem escolhe a “errada” por um bom motivo é marcado como errado, e quem acerta pode ter tido sorte. A pergunta mede a frase que faltou, não a ideia.

**Exemplo.** Uma questão perguntava o que fazer com um desconto vazio “quando a venda não teve desconto”. A lição tinha ensinado que um campo em branco que é um fato continua em branco, então “deixar como está” era defensável; a resposta esperada, preencher com zero, dependia de algo que o enunciado nunca disse: que o objetivo era a média de todas as vendas. Em outra, “a métrica principal é a proporção que paga o segundo mês” não dizia proporção de quem, e as duas versões empatavam ou davam resultados diferentes, conforme a leitura.

**Pergunta detectora.** Com o que o enunciado diz e o que a lição ensinou, consigo defender outra opção? Que fato eu precisaria para descartá-la, e ele está escrito?

**Sinal de alerta.** “Isso está subentendido” · “obviamente quer dizer…”

**O que fazer.** Para cada opção errada, escreva uma linha dizendo por que ela está errada, usando apenas o enunciado e a lição. Se descartá-la exige um fato que não está escrito, acrescente-o ao enunciado: a finalidade do cálculo, a regra do sistema, o denominador de uma proporção, o que se sabe sobre os dados. Em um exercício de classificação, teste cada item contra todas as categorias, e não só contra a sua.

### EDU-5. Uma dica aponta para a causa do erro, não para a resposta

`from: 2fa4365d` · `by: ai`

**A ideia.** A dica aparece depois de uma tentativa errada. Se ela dá a resposta, a linha que resolve o exercício, ou o que separa a solução do erro mais provável, a segunda tentativa mede cópia.

**Exemplo.** Uma revisão das 277 práticas verificadas de um curso mudou 82 dicas em 49 arquivos. Algumas davam a linha que resolve (“o segundo é o…”). Algumas ditavam a ordem que separa a solução do erro comum. Em exercícios de “confira com um resultado anterior”, a dica dizia “deve bater com o que você obteve na lição 2.2”: quem lembrasse o número anterior podia digitá-lo sem fazer o passo.

**Pergunta detectora.** Alguém que lê esta dica consegue passar na próxima tentativa sem a habilidade? Ela nomeia a resposta, a linha que resolve, os passos que o exercício mede, ou o número anterior com o qual deveria bater?

**Sinal de alerta.** “É só um empurrãozinho” · “eles já tentaram uma vez.”

**O que fazer.** Escreva a dica sobre a causa do erro provável (“as posições começam em 0, não em 1”), e cite apenas o que já foi ensinado. Guarde o “deve bater com o número anterior” para a explicação mostrada depois de responder, onde ensina que dois métodos que dão o mesmo número são uma verificação. Revise as dicas contra o erro mais provável do exercício, e não isoladamente.
