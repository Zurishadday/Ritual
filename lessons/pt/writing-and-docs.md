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
