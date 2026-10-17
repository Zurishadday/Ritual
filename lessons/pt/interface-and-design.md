# Interface e design

O que vale quando uma pessoa vai ver ou usar o que você construiu: telas, componentes, estilos, páginas.

### 10. Módulos gêmeos mudam juntos

`from: 39a1c52b` · `by: ai`

**A ideia.** Se o seu produto tem duas versões da mesma tela, para dois tipos de usuário, duas regiões ou dois produtos, uma melhoria numa delas é uma melhoria pendente na outra.

**Exemplo.** A versão de desktop ganhou um filtro de data. A versão para celular, que as pessoas veem como “a mesma tela”, ficou sem ele por um mês.

**Pergunta detectora.** O que estou mexendo tem um gêmeo que os usuários veem como “o mesmo módulo”?

**Sinal de alerta.** “Não me pediram isso na outra.”

**O que fazer.** Não feche a mudança antes de conferir o gêmeo e escrever “igual” ou “não se aplica porque…”.

### 19. Revisar uma dimensão não é revisar

`from: e2d5ae25` · `by: ai`

**A ideia.** “Já estão iguais” exige ter comparado todas as propriedades que dá para ver, e não apenas uma.

**Exemplo.** O design de duas telas foi feito para bater ao longo de quatro rodadas: primeiro o tamanho, depois a tipografia, depois as cores, depois a cor do rótulo. Cada entrega dizia “está pronto”.

**Outro exemplo.** As ilustrações de um material foram revisadas quanto ao conteúdo e ao tamanho, mas não quanto ao contraste: duas cores de texto ficaram abaixo do mínimo legível em quatro imagens.

**Pergunta detectora.** Comparei uma propriedade ou todas as que o usuário vê?

**Sinal de alerta.** “O tamanho bate agora, então o design é o mesmo.”

**O que fazer.** Liste todas as diferenças antes de corrigir a primeira. E nas suas anotações, o verbo denuncia: “está corrigido” e “vai ficar” são intenções; “diz” e “mostra” são medições.

### 31. Nada técnico na tela, a menos que mude uma decisão

`from: 60f4261e` · `by: ai`

**A ideia.** Cada elemento de uma tela de negócio deve ajudar a decidir algo. O que ajuda a auditar vai no código; o que ajuda a decidir vai na tela, em linguagem de negócio.

**Exemplo.** Uma tela de vendas mostrava, na primeira linha, o ID interno de cada pedido e a hora do último cálculo. Ninguém decidia nada com aquilo, e ocupava o espaço dos dados que importavam.

**Pergunta detectora.** Isto muda alguma decisão de quem usa a tela? Se não, por que está aqui?

**Sinal de alerta.** “Caso alguém precise.”

**O que fazer.** Antes de pôr algo na tela, anote qual decisão isso muda. Se não muda nenhuma, vai para o registro técnico ou para o código, e não para a tela.

### 32. Algo que funciona mas não se vê é relatado como quebrado

`from: 62e8051c` · `by: ai`

**A ideia.** Se um botão muda algo fora da vista do usuário, funcionar e não funcionar parecem a mesma coisa.

**Exemplo.** Um filtro filtrava uma tabela, mas a tabela ficava duas telas abaixo. Foi relatado como “não faz nada”.

**Variante.** Esconder um contêiner esconde tudo o que está dentro dele, mesmo o que não tinha nada a ver com ele. Por exemplo, um link útil que morava dentro de um controle aposentado.

**Pergunta detectora.** Logo depois de usar o controle, sem sair de onde está, o usuário vê o que mudou?

**Sinal de alerta.** “Funciona, só não aparece.”

**O que fazer.** Cada controle diz o que mudou e leva o usuário até lá. E antes de esconder algo, confira o que mais vive dentro dele.

### 33. O glifo não é o texto

`from: ba84572f` · `by: ai`

**A ideia.** Em letra pequena, “÷” e “+”, “l” e “1”, “O” e “0” se confundem. Se duas pessoas leem a mesma coisa errada, elas não estão distraídas: é o tamanho da letra.

**Exemplo.** Duas pessoas diferentes leram 98 ÷ 441 como 98 + 441 num cartão em letra pequena, e as duas disseram que a conta estava errada.

**Outro exemplo.** A fonte de código de um material juntava `>=` num símbolo só, ⩾. Quem está aprendendo copia o que vê, e esse símbolo não existe no teclado nem no idioma.

**Pergunta detectora.** No tamanho e na fonte em que será lido, este símbolo pode ser confundido com outro, ou parece algo que não se consegue digitar?

**Sinal de alerta.** “Na minha tela está ótimo.”

**O que fazer.** Quando um símbolo se presta a confusão, troque-o por uma palavra: “98 sobre 441” em vez de “98 ÷ 441”.

### 41. Confira no formato que o leitor de fato vê

`from: 10a08b3c` · `by: ai`


**A ideia.** Encontrar uma palavra no texto não prova que ela aparece. O texto pode estar em algum lugar do documento enquanto o formato que deveria exibi-lo sai vazio.

**Exemplo.** Três passos numerados saíram como marcadores vazios. A verificação automática passou porque aquelas palavras apareciam em outro lugar do documento.

**Outro exemplo.** Um aviso de “há mais colunas à direita” foi adicionado e dado como pronto porque o código estava lá. Ele nunca apareceu: um estilo geral de tabela removeu a condição que o ativava. Outra pessoa viu numa captura de tela.

**Mais um exemplo.** Uma opção de resposta dizia “Total: {2 * 78}” no arquivo. Quando a página foi desenhada, o sistema calculou o que estava entre as chaves e mostrou “Total: 156”: duas opções idênticas. Só quem olhou a tela viu.

**Variante.** As capturas de tela que um revisor julga podem mostrar uma tela que ninguém alcança. A ferramenta de captura de um curso respondia cada exercício de código com uma linha de preenchimento só para seguir em frente, então a captura “depois” mostrava essa linha e a mensagem “resultado não esperado”: os revisores nunca viram o que o estudante vê ao acertar. No desktop, as capturas também pegavam o cabeçalho e o menu lateral, e a lição saía como uma faixa ilegível. Ao capturar para revisão, responda cada passo como um usuário bem-sucedido responderia, e capture apenas a parte em revisão.

**Pergunta detectora.** Eu vi o elemento exato como o leitor o vê, ou só encontrei a palavra (ou o código) na fonte?

**Sinal de alerta.** “A palavra está no arquivo” · “é uma correção de uma linha”.

**O que fazer.** Confira o elemento exato, como “estes três passos, como marcadores”, e veja a página como o leitor vai vê-la pelo menos uma vez. Uma correção pequena também é conferida: é onde outra regra menos se espera que a sobrescreva. E na primeira vez que usar um recurso novo na página (um bloco de código, um cabeçalho fixo), veja também no celular.

### 45. Alguém também percorre o caminho do erro

`from: 93409a9c` · `by: ai`

**A ideia.** Se você testa só o que acontece quando tudo dá certo, quem comete um erro encontra a falha. E, ao aprender, cometer erros é a coisa mais comum.

**Exemplo.** Uma célula de consulta contava uma tentativa só quando a consulta rodava. Com um erro de digitação, o botão para avançar nunca era ativado, e a pessoa ficava presa. Os testes passavam, porque sempre rodavam a consulta inicial, que não tinha erros.

**Pergunta detectora.** Se o usuário faz o erro mais provável (um erro de digitação, uma resposta vazia, dois cliques), o que ele vê, e consegue continuar?

**Sinal de alerta.** “Funciona com a resposta certa.”

**O que fazer.** Para cada controle, teste três caminhos: o bom, o erro mais comum e o vazio. Os três dizem o que aconteceu e deixam o usuário continuar.

### 46. O que roda a cada requisição não pode crescer com o conteúdo

`from: b7ad7ec2` · `by: ai`

**A ideia.** Algo feito em toda página, como ler todo o conteúdo ou recalcular um índice, custa pouco com dez páginas e muito com cem. Cresce aos poucos e ninguém percebe, até que algo comece a falhar “de vez em quando”.

**Exemplo.** Toda página de um site lia e processava todo o conteúdo para montar o sumário. Sozinha, uma página levava 0.4 s. Mas a barra lateral pedia cerca de 40 de uma vez, e juntas levavam 16 s. Meses depois, os testes começaram a falhar ao trocar de página, e a falha parecia um problema do próprio teste.

**Pergunta detectora.** Este código que roda em toda requisição percorre todo o conteúdo? Quanto tempo leva hoje, quanto leva com o dobro, e quanto leva com muitas requisições ao mesmo tempo?

**Sinal de alerta.** “Carrega rápido localmente” · “é uma falha intermitente”.

**O que fazer.** Meça no servidor compilado e no jeito como as pessoas o usam, com todas as requisições juntas, e não uma página isolada. Guarde em cache o que não muda enquanto o servidor roda, e deixe um teste que meça isso com o caso que de fato deixou tudo lento.

### 49. Uma regra geral não pode vencer em silêncio as específicas

`from: 4a81cf45` · `by: ai`

**A ideia.** Uma regra que vale para tudo (um estilo global, um valor padrão) pode sobrescrever o que cada peça decidiu para si mesma, sem que nada avise.

**Exemplo.** O estilo de foco do teclado, escrito para o site inteiro, vinha com seu próprio raio de borda. Como ficava acima dos estilos de cada componente, um botão em formato de pílula mudava de forma ao receber foco pelo teclado. Ninguém notou, porque com o mouse o foco não aparece.

**Pergunta detectora.** Esta regra geral mexe em algo que cada peça já decide para si? Se elas entram em conflito, qual vence?

**Sinal de alerta.** “Deixei global para não ter que repetir.”

**O que fazer.** Deixe a regra geral mexer só no que é dela (o contorno do foco, e não a forma). Se ela deve vencer de propósito, escreva isso ao lado. E teste na peça mais diferente, e não só na comum.

### VIDEO-1. Em um vídeo, cada ação cai quando a narração a nomeia

`from: 93ac042f` · `by: ai`

**A ideia.** Quando a tela faz algo antes ou depois de a voz dizer, o espectador olha para o que não está ouvindo e ouve o que não está vendo. Um clique que acontece antes da palavra que o nomeia ensina o clique sem o nome.

**Exemplo.** Em uma série de vídeos narrados de planilhas, feitos com código, cada clique era posicionado como uma fração da sua cena. Um revisor pedagógico encontrou cliques que aconteciam antes de a voz nomear a opção (uma cor no painel lateral), e uma frase que abria com contexto enquanto o cursor já fazia o primeiro clique. A regra que saiu disso: se uma frase abre com contexto, esse trecho não tem cliques, e cada clique cai sobre a palavra que o nomeia.

**Outro exemplo.** Na mesma série, o dono do curso disse que um vídeo passava de uma ideia para a outra depressa demais. Uma pausa parada de 1 a 1,5 segundos no fim de cada ideia nova resolveu.

**Pergunta detectora.** Para cada clique e cada tecla pressionada nesta cena, em qual palavra da narração ele cai? Essa palavra o nomeia? Cada ideia nova termina com um momento parado antes de começar a próxima?

**Sinal de alerta.** “Diz isso mais ou menos aí” · “é uma fração da cena, encaixa”.

**O que fazer.** Se a voz não dá a marcação de tempo de cada palavra, posicione cada ação pelo lugar que a palavra dela ocupa na frase (os caracteres antes dela), e confira no vídeo completo, na velocidade real, e não em quadros parados. Se o motor de voz dá marcações de tempo por palavra, posicione as ações nelas. Trocar a voz ou reescrever uma frase desloca todas as palavras: confira a cena de novo. Feche cada ideia nova com uma pausa parada curta, de cerca de um segundo, e julgue também na velocidade real.

### VIDEO-2. Em um vídeo, o que muda sem aparecer é marcado

`from: c7d1a08d` · `by: ai`

**A ideia.** Quando o efeito de um passo não aparece na tela (tirar um espaço extra no fim do texto, transformar uma fórmula no seu valor), um vídeo que mostra esse passo parece não fazer nada. O espectador não pode clicar à vontade para descobrir, então o vídeo precisa marcar o que mudou e ficar parado tempo suficiente para a marca ser vista.

**Exemplo.** Um vídeo gerado ensinava a remover espaços extras de uma coluna de planilha e depois colar o resultado só como valores. A coluna limpa parecia exatamente igual à suja, e colar valores não mudava nada visível. O dono do curso assistiu e disse que a mudança não era perceptível e que não ficava claro por que colar só valores importava. Foi corrigido com um ponto laranja em cada espaço extra, uma cena lado a lado com as duas colunas e uma seta da célula de origem até a fórmula que a lê, cada uma mantida parada por um momento.

**Pergunta detectora.** Com o som desligado, a tela mostra o que este passo mudou, e fica nisso tempo suficiente para ser visto?

**Sinal de alerta.** “A narração explica” · “a mudança é sutil, mas está lá”.

**O que fazer.** Para cada passo do roteiro, anote o que muda na tela. Se nada visível muda, acrescente uma marca (um ponto, a barra de fórmulas, uma seta, um antes e depois lado a lado), mantenha o quadro nela por um momento e diga na narração que aquela é a marca do vídeo, e não a do programa.

### WEB-2. Um formulário público recebe robôs desde o primeiro dia

`from: 6a05ed7d` · `by: ai`

**A ideia.** Um formulário aberto na internet não é preenchido só por pessoas. Se nada impede envios automáticos e quem lê as mensagens não consegue limpá-las, a primeira onda de lixo enterra os clientes de verdade.

**Exemplo.** Nas duas execuções da simulação Web, o formulário de contato aceitou 650 mensagens de um script em poucos segundos, todas dizendo “obrigado”. O administrador não tinha páginas nem botão de apagar: a página de administração cresceu entre um e seis milhões de pixels de altura, e no celular o texto da mensagem saía da tela. Nas duas vezes, quem construiu anotou como pendência.

**Pergunta detectora.** Se amanhã chegarem mil mensagens falsas, como o dono encontra a única real, e como apaga o resto?

**Sinal de alerta.** “É um site pequeno, ninguém vai atacar” · “a gente põe o limite depois”.

**O que fazer.** Desde o início, um freio barato: um campo oculto que as pessoas não preenchem, e um limite de envios por endereço por minuto. E um administrador com páginas, as mais recentes primeiro, e uma forma de apagar ou marcar como lixo. Teste enviando centenas de mensagens com um script e abrindo a administração no celular.

### WEB-3. Um fallback que ninguém testou não é fallback

`from: c0e4cb66` · `by: ai`

**A ideia.** Um formulário com `method` e `action` promete um plano B que funciona mesmo se o JavaScript falhar. Se o servidor só responde o que o JavaScript espera, a promessa é falsa e a pessoa acaba olhando para código.

**Exemplo.** Nas duas execuções da simulação Web, o formulário enviava com JavaScript e declarava `method="post"`. Sem JavaScript, numa versão o servidor rejeitava o envio com uma linha de JSON e a mensagem se perdia; na outra salvava a mensagem e mostrava só `{"ok":true}` numa página em branco. O resumo desta segunda versão dizia que ela não enviaria sem JavaScript.

**Pergunta detectora.** Se este arquivo de JavaScript não carregar, o que a pessoa vê quando envia?

**Sinal de alerta.** “Todo mundo tem JavaScript mesmo” · “deixo o `action` aí, por precaução”.

**O que fazer.** Decida por uma de duas opções e teste: ou o servidor aceita o envio normal e responde com uma página (ou redireciona para uma página de agradecimento), ou o formulário não declara um fallback que não tem. Envie uma vez com JavaScript desligado.

### WEB-4. Se você desabilita o botão, o foco vai junto

`from: 4dc9e2b6` · `by: ai`

**A ideia.** Desabilitar o botão durante o envio evita o duplo envio, mas o botão perde o foco e o navegador passa o foco para o documento. Quem usa o teclado, depois do aviso, recomeça do início.

**Exemplo.** Nas duas execuções da simulação Web, o envio desabilitava o botão. Com um e-mail que o servidor rejeitou, o aviso apareceu abaixo do botão, o foco caiu no documento, e o próximo Tab levou o usuário ao primeiro link da página, longe do campo que precisava de correção.

**Pergunta detectora.** Depois do envio, dê certo ou não, para onde vai o foco e para onde vai o próximo Tab?

**Sinal de alerta.** “Desabilito para ninguém enviar duas vezes.”

**O que fazer.** Quando o envio terminar, coloque o foco onde a pessoa precisa continuar: no campo com erro (marcado com `aria-invalid` e a mensagem ao lado) ou no aviso de sucesso. Ou evite o duplo envio sem desabilitar, usando `aria-disabled` e uma flag. Percorra o erro usando só o teclado.

### WEB-5. Login com senha sem limite de tentativas só é tão forte quanto a senha mais fraca

`from: 0e974320` · `by: ai`

**A ideia.** Um login que responde a cada senha errada em velocidade máxima permite que qualquer um tente milhares por minuto. Uma senha padrão forte esconde o problema até o dono definir a sua, e nada impede que essa seja curta.

**Exemplo.** Nas duas execuções da repetição da simulação Web, a página administrativa pedia uma senha e nunca limitava as tentativas erradas: 200 senhas erradas seguidas receberam 200 recusas em menos de um segundo, nenhuma bloqueada. A senha padrão era longa e aleatória, mas o resumo de quem construiu o site explicava ao dono como definir uma nova, e nada exigia que ela fosse longa.

**Pergunta detectora.** Quantas senhas erradas alguém consegue testar nesse login em um minuto, e o que acontece depois da quinta?

**Sinal de alerta.** “A senha padrão é forte” · “é só a página administrativa”.

**O que fazer.** Desacelere ou bloqueie as falhas repetidas, por endereço e por conta, com uma espera que cresce a cada falha. Exija um tamanho mínimo quando o dono definir uma senha. Teste: envie vinte senhas erradas seguidas e confira que as últimas são recusadas.
