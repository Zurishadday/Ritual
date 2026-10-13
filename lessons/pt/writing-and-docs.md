# Escrita e documentação

O que vale quando você escreve para outras pessoas: documentação, manuais, textos de tela, conteúdo, prompts.

### 11. Remover um gráfico não remove a afirmação que ele fazia

`from: 36ab089d` · `by: ai`

**A ideia.** Se você tirou algo porque os dados não eram confiáveis, a mesma afirmação provavelmente ainda está em outros textos, escrita com outras palavras.

**Exemplo.** Um gráfico não confiável foi retirado, mas um cartão de “principais conclusões” e um plano de ação ainda recomendavam o que o gráfico dizia.

**Outro exemplo.** Um plano de capítulos foi renumerado do 7 para o 15. Duas listas em outro documento ainda apontavam para “7.4” e “7.7” do plano antigo, que agora eram outros temas. Quando você substitui um plano, os números antigos também são afirmações.

**Pergunta detectora.** Quais outros textos dizem a mesma coisa que acabei de remover?

**Sinal de alerta.** “Eu já tirei o gráfico.”

**O que fazer.** Busque por assunto, não por identificador. Ecos não têm nome de variável.

### 37. Documente o que existe, não o que você gostaria que existisse

`from: 928f7db8` · `by: ai`

**A ideia.** Uma revisão de documentação melhora o documento; ela não redesenha o sistema. Se o sistema tem um limite, o documento o declara. Não o esconde nem promete corrigi-lo.

**Exemplo.** Um manual dizia que os dados sincronizavam sozinhos. O sistema só sincronizava quando o app era aberto. A revisão “corrigiu” o manual para prometer que logo seria automático, em vez de declarar o limite como ele era.

**Pergunta detectora.** O que estou prestes a escrever descreve como funciona hoje ou como deveria funcionar?

**Sinal de alerta.** “Deveria funcionar assim” · “eles vão consertar isso”.

**O que fazer.** Separe os achados sobre o documento (“está mal escrito”) dos achados sobre o sistema (“funciona diferente do ideal”). O segundo tipo é declarado como limitação.

### 38. O que você não sabe fica marcado, não inventado

`from: 052e301a` · `by: ai`

**A ideia.** Um documento oficial afirma tudo com a mesma autoridade. Um detalhe inventado, como um responsável, um prazo ou um tempo de resposta, parece igual a um real.

**Exemplo.** Um procedimento tinha um tempo de resposta de 24 horas que ninguém tinha combinado. Foi escrito porque soava razoável, e depois de publicado virou um compromisso.

**Pergunta detectora.** Eu conheço este detalhe, ou estou assumindo porque soa razoável?

**Sinal de alerta.** “Certamente é assim.”

**O que fazer.** Marque o que falta de forma visível, como “Pendente” em vermelho, e pergunte a quem sabe. Redação neutra é melhor que redação falsa.

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

`from: 781d2fa2` · `by: ai`

**A ideia.** Depois de várias rodadas de correções pontuais, um documento pode se contradizer. Cada correção era verdadeira na sua seção, mas ninguém releu as outras.

**Exemplo.** Uma seção dizia que nada era salvo sem conexão. O FAQ ainda dizia que tudo o que é capturado fica guardado no aparelho.

**Pergunta detectora.** Quantas correções este documento recebeu desde a última vez que alguém o leu inteiro?

**Sinal de alerta.** “Conferi cada correção no seu lugar.”

**O que fazer.** Ao terminar cada rodada, busque por assunto tudo o que o documento diz sobre o que você corrigiu.

### 51. O que parece óbvio para você é a primeira coisa a ensinar

`from: 1fed11d1` · `by: ai`

**A ideia.** Quem já sabe não percebe os passos que dá sem pensar. Por isso o primeiro exemplo traz várias coisas novas de uma vez, e um iniciante se perde na primeira linha.

**Exemplo.** Um curso de programação para iniciantes abriu com uma célula que tinha seis coisas novas ao mesmo tempo, e o plano nunca ensinava o que é um tipo de dado nem que o `=` guarda e lê da direita para a esquerda. O responsável pelo curso resumiu em uma frase: “você presume muito sobre os estudantes”. Depois, três lições diziam “como arrastar uma fórmula”; nenhuma tinha ensinado a arrastar, só “copiar a fórmula para baixo”.

**Pergunta detectora.** No meu primeiro exemplo, quantas coisas são novas para quem não sabe nada? Cada símbolo, cada palavra, cada nome de botão e cada ação que eu peço já foi ensinado?

**Sinal de alerta.** “Qualquer um entende” · “é só uma linha” · “é a palavra de sempre.”

**O que fazer.** Antes de escrever, liste o que o seu exemplo dá por certo (símbolos, palavras, cliques, coisas que o estudante já deveria ter construído) e ensine essas coisas primeiro: uma ideia nova por vez, cada símbolo explicado na primeira vez em que aparece. Procure cada palavra igual ao nome de um botão, e cada ação que você pede, do mesmo jeito que procura um símbolo. Se possível, deixe uma verificação automática comparar o que cada exemplo usa com o que já foi ensinado.

### 52. Escreva sobre uma ferramenta que muda rápido a partir da prática de hoje, não da memória

`from: 15098a47` · `by: ai`

**A ideia.** Uma lição ou um guia sobre uma ferramenta que muda a cada poucos meses fica desatualizado enquanto é escrito, se vier do que o autor lembra. A premissa pode estar errada antes de o primeiro leitor chegar a ela.

**Exemplo.** Um plano para um módulo de “análise com IA” começou com “a IA não consegue ver seus dados, então descreva sua tabela em vez de colá-la”. O responsável pelo curso observou que agentes agora se conectam ao banco de dados, executam as consultas sozinhos e devolvem o número. Uma pesquisa com fontes e datas confirmou: copiar código de um chat era a forma de fazer dois anos antes. Várias lições foram reescritas em torno do que ainda vale: definir a pergunta, supervisionar o agente e conferir o número.

**Pergunta detectora.** Quais premissas deste texto dependem do que a ferramenta faz hoje? Quando eu as verifiquei pela última vez, e em qual fonte?

**Sinal de alerta.** “É assim que funciona” · “todo mundo faz assim.”

**O que fazer.** Antes de escrever sobre uma ferramenta que muda rápido, pesquise a prática atual com fontes e datas: o que a ferramenta faz agora, o que é gratuito, o que as pessoas de fato usam. Construa o texto em torno da habilidade que sobrevive à próxima versão (enquadrar, supervisionar, verificar) e mantenha os passos específicos da ferramenta em um só lugar, que possa ser atualizado. Marque o que você não conseguiu verificar e teste à mão antes de publicar.

### EDU-2. O que o estudante vê antes de responder não pode conter a resposta

`from: a7bc9d8b` · `by: ai`

**A ideia.** Uma pergunta deixa de medir alguma coisa quando a resposta já apareceu: em uma imagem, na ideia principal, na explicação de outro exercício, no título de um passo ou em uma lição anterior. Quem acerta pode ter acabado de ler a resposta.

**Exemplo.** Uma ilustração com a figura certa ficou acima da prática que pedia essa figura. Uma lição perguntava o que acontece quando você guarda um novo valor em uma variável, em um passo intitulado “Guardar de novo substitui”. Um resumo colocado abaixo do questionário final era lido antes de responder ao questionário. Uma caixa de feedback que aparece depois da primeira tentativa, mesmo quando errada, já dava a direção da resposta.

**Pergunta detectora.** O estudante vê esta figura, imagem ou frase antes de responder, aqui ou em uma lição anterior? Não só o número exato: também uma aproximação (“cerca de 25”), a conclusão escrita em uma legenda, um título, um “você acabou de ver que…”, ou o que a resposta errada mais provável de um exercício anterior mostra na tela.

**Sinal de alerta.** “É só contexto” · “é só o título” · “é a legenda.”

**O que fazer.** Procure cada resposta em tudo que é mostrado antes da pergunta, inclusive o que aparece depois de uma primeira tentativa errada, o que o código inicial imprime ao rodar, os arquivos para baixar e o que pode ser contado em um desenho. Escreva por último o título do passo e os objetivos de aprendizagem, e leia-os ao lado do resultado de cada previsão. Uma verificação automática encontra números exatos; aproximações e paráfrases só são encontradas por alguém que leia com a resposta em mente.

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
