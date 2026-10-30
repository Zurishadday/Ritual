# Testes e verificações

O que vale quando você verifica algo: testes automatizados, validadores, revisões, calibração.

### 13. Um verificador que nunca viu o erro não verifica nada

`from: 72635574` · `by: ai`

**A ideia.** Um teste que sempre passa pode estar quebrado. A única forma de saber é vê-lo falhar contra o erro real.

**Exemplo.** Um teste que proibia uma palavra só procurava a versão em minúsculas; com letra maiúscula ou acento, passava.

**Outro exemplo.** Foram semeados 37 registros duplicados para um exercício, e a contagem voltou 92: os dados já tinham correspondências naturais. Uma verificação que comparava a contagem com o que foi semeado, antes de salvar, pegou isso.

**Mais um exemplo.** Uma regra que detectava código indentado sinalizou uma linha que começava com um texto: o caso que deveria passar não tinha essa forma. E um teste de que a comparação de texto funcionava passou mesmo com a comparação quebrada, porque outra revisão rejeitou o erro antes.

**Um quarto exemplo.** Um classificador que sinaliza objeções de venda deu 0 falsos alarmes em 30 frases comuns de clientes, e esse número foi relatado. Ao acrescentar 25 frases sobre os mesmos temas, mas no sentido contrário (sinais de compra como “posso pagar no cartão?”), ele disparou 7 vezes. Em outro projeto, um detector que baixava as respirações numa trilha de voz também baixava o “s” final das palavras: nada no seu teste soava como uma respiração sem ser uma.

**Um quinto exemplo.** Um pipeline de narração transcrevia cada frase gerada e a refazia enquanto a semelhança com o roteiro ficasse abaixo de 90 %. Em um vídeo, 10 de 13 frases foram refeitas quatro rodadas seguidas, minutos cada numa máquina compartilhada (a execução não foi cronometrada). Quem ouviu constatou que elas estavam certas: o transcritor escrevia nomes e teclas como letras e números (“C2”, “Ctrl-D”) onde o roteiro os soletrava, então toda gravação correta falhava. A lição 71 é a mesma verificação falhando no sentido contrário.

**Pergunta detectora.** Testei meu verificador contra o erro nas formas em que ele realmente apareceria? E contra os casos corretos que mais se parecem com o erro: mesmo assunto, mesmas palavras, sentido oposto?

**Sinal de alerta.** “Já passa, então está bem configurado.” · “Zero alarmes falsos, pronto.”

**O que fazer.** Calibre com dois casos: um em que ele precisa encontrar algo e outro em que não pode encontrar nada, e rode de verdade no dia em que nasce. O caso bom importa tanto quanto o ruim: um verificador que rejeita o que está correto também está quebrado, e isso é mais difícil de notar porque parece rigoroso. O caso bom inclui as formas reais do que está certo, inclusive as que você não escreveu: outra ordem, outro nome. Construa os mais difíceis de propósito: para cada coisa que a verificação precisa pegar, a sua gêmea que ela precisa deixar passar, e informe os falsos alarmes nessas separadamente dos casos fáceis; um zero que vem só dos casos fáceis não diz nada. Cada verificação se calibra sozinha: se outra pega o erro antes, a sua nunca foi testada. E uma revisão que repete o que já leu não consegue falhar (uma “segunda passada” que relê o mesmo arquivo): substitua por uma reconciliação que falha se algo estiver errado. Uma verificação que rejeita e tenta de novo sozinha mostra o detalhe da sua primeira rejeição antes de o laço seguir: se a diferença é de forma, e não de conteúdo, normalize as duas formas no verificador, acrescente esse par como caso que precisa passar, e pare o laço depois de duas rejeições que mostrem a mesma diferença, entregando o item a uma pessoa (ver a lição 27).

### 14. A sonda não percorre o canal que investiga

`from: 5c6ecad0` · `by: ai`

**A ideia.** Se a sua verificação passa pelo mesmo caminho que poderia ter causado o dano, o dano afeta a verificação também, e ela responde a mesma coisa quer as coisas estejam certas, quer estejam erradas.

**Exemplo.** Procuravam um problema de acento enviando consultas com acento pela mesma rota que os estava danificando.

**Pergunta detectora.** A transformação que estou investigando também transforma o meu teste?

**Sinal de alerta.** “Eu verifico mandando outra consulta igualzinha.”

**O que fazer.** Monte o teste numa forma que o dano não consiga tocar.

### 15. Um teste que se desliga sozinho não avisa que se desligou

`from: 86581aad` · `by: ai`

**A ideia.** Os ramos que dizem “se eu não encontrar o dado, pulo o teste” são ativados justamente quando o mundo muda, e deixam de vigiar sem que ninguém perceba.

**Exemplo.** Um teste localizava uma tabela pelo título e, se não a encontrava, pulava. O título mudou, e o teste passou por semanas sem verificar nada.

**Variante.** Uma verificação que cai no primeiro arquivo quebrado deixa sem vigilância todos os arquivos seguintes. Um validador que quebra, em vez de informar “esta página não pode ser lida, linha 12”, desliga a revisão inteira.

**Pergunta detectora.** Meu teste tem uma saída silenciosa que se ativa com uma mudança legítima?

**Sinal de alerta.** “Se eu não achar a âncora, pulo o teste.”

**O que fazer.** Se o que falta é uma ferramenta, pular é honesto. Se o que falta é o dado que está sendo vigiado, o teste precisa falhar. E um arquivo que não pode ser lido é um achado com a sua linha, não o fim da revisão.

### 16. O filtro do seu verificador costuma deixar de fora exatamente o que importa

`from: ef7dcfa7` · `by: ai`

**A ideia.** Toda revisão automática filtra pelo que é “relevante”, e esse filtro pode deixá-la cega justamente onde está o problema.

**Exemplo.** Um auditor de design revisava só elementos sem filhos. Os rótulos que precisavam de revisão tinham um ícone de ajuda dentro, então ele nunca os viu.

**Outro exemplo.** Um teste percorria todas as páginas marcando sempre a primeira opção e executando cada consulta conforme aparecia. Sempre passava, e nunca verificava se a resposta correta era aceita.

**Mais um exemplo.** Para decidir se alguém alterou um texto, os espaços eram ignorados. Isso deixava de fora exatamente o caso da página que explicava como dispor aquele texto com espaços e quebras de linha. Normalizar também é filtrar. E uma execução de testes de uma página “passou” sem testar nada: o filtro era uma expressão regular sobre os nomes dos testes, o título da página tinha parênteses, que são caracteres especiais numa expressão regular, então o filtro não casou com nenhum teste e nenhum rodou.

**Pergunta detectora.** O que meu filtro deixa de fora? Escreva antes de acreditar no resultado. E quantos ele selecionou? Zero não é aprovação.

**Sinal de alerta.** “Encontrou 48 diferenças, já tenho a lista” · “o teste percorre todas elas” · “a execução filtrada passou”.

**O que fazer.** Anote o que o filtro deixa de fora e confira à mão uma amostra dos itens excluídos. E quando descobrir que um filtro te deixou cego, procure os outros filtros parecidos que você já escreveu: uma revisão que tirava todos os espaços do código juntava duas palavras numa só e rejeitava código correto, logo depois de a mesma lição ter sido aprendida com outra normalização. Antes de ler o veredito de uma execução filtrada, conte o que o filtro selecionou (`--list`, ou a contagem de testes rodados pelo executor), e filtre por um id, e não por um nome: uma execução que não selecionou nada não tem veredito, e sem veredito significa “não sei” (ver a lição 44).

### 17. Código que compila não é código que roda

`from: 2a71a25d` · `by: ai`

**A ideia.** Um verificador de sintaxe aprova código que quebra quando roda. Uma tela em branco com tudo “verde” é a pior falha possível.

**Exemplo.** Uma página passou na verificação de sintaxe e na de tipos. Ao ser aberta, ficou em branco: usava uma variável que só existe no servidor.

**Pergunta detectora.** Meu teste roda o código ou só o lê?

**Sinal de alerta.** “A verificação de sintaxe passa, o código está bom.”

**O que fazer.** Tenha pelo menos um teste que rode a página ou o programa completo.

### 18. Verificar a fonte não é verificar o que chega

`from: fd2f11f3` · `by: ai`

**A ideia.** Se você verifica X e a pessoa recebe Y, derivado de X, há um código no meio que ninguém está olhando.

**Exemplo.** Verificou-se que cada resultado publicado estava correto, mas uma versão gerada a partir deles chegou à tela, e usava outra regra para dados ausentes.

**Outro exemplo.** Um revisor leu o arquivo-fonte de cada página e aprovou. Uma tabela que se empilhava em cartões no celular, e deixava de poder ser comparada, só apareceu quando a página foi vista.

**Pergunta detectora.** Alguém confere o que chega à tela, ou só o que sai da fonte?

**Sinal de alerta.** “Vem de dados que já foram verificados” · “o arquivo está certo”.

**O que fazer.** Verifique no ponto em que chega à pessoa: a página como é vista, o arquivo que ela baixa, a mensagem que ela recebe (ver também a lição 41).

### 26. O que está em produção também pode estragar

`from: 7b79664a` · `by: ai`

**A ideia.** Filtros de qualidade costumam revisar o que é novo. O que já está no ar fica de fora, e as suas suposições envelhecem sem que ninguém volte a perguntar.

**Exemplo.** Um relatório publicado continuava filtrando por uma coluna que a origem tinha parado de preencher. Mostrava zero, e como estava “já validado”, ninguém perguntou de novo.

**Pergunta detectora.** Esta coisa que roda há meses, alguém voltou a verificar as suas suposições desde a publicação?

**Sinal de alerta.** “Já validamos isso quando foi publicado.”

**O que fazer.** Submeta o que já está em uso aos mesmos testes do candidato novo, em toda revisão.

### 28. Quem roda e quem verifica são pessoas diferentes

`from: 0090f5e0` · `by: ai`

**A ideia.** Se a mesma pessoa roda e confirma, um erro de execução se confirma sozinho.

**Exemplo.** Quem escreveu cada página também tirou as capturas de tela da revisão, e só das etapas que achava arriscadas. O revisor leu o arquivo-fonte. As etapas sem captura não foram vistas por ninguém.

**Pergunta detectora.** Além de quem fez, quem revisou o resultado como o usuário o recebe?

**Sinal de alerta.** “Eu mesmo já revisei.”

**O que fazer.** Um roda e o outro verifica lendo o resultado. “Eu já fiz” é o sinal de que agora pode ser verificado, não a verificação. E quem verifica não olha pelo mesmo canal que quem fez (ver a lição 14): se os dois leem só a fonte, nenhum dos dois vê a tela. Um revisor que aprova uma afirmação sobre uma ferramenta (o que ela faz, o que tem, como está configurada) diz o que olhou hoje: a ajuda dela, a configuração ou uma execução. Se não olhou, diz isso, e o trabalho para até alguém olhar.

### 34. Confie no sintoma de um achado de QA e meça a causa

`from: b3b868fb` · `by: ai`

**A ideia.** Um relatório de QA costuma acertar no sintoma e propor uma causa que é só hipótese.

**Exemplo.** Um relatório pedia para corrigir um gráfico que somava errado, mas esse gráfico não existia na tela: os dados passavam sem nada que os desenhasse.

**Pergunta detectora.** Consigo reproduzir a causa com a minha própria medição, ou aceito porque soa certo?

**Sinal de alerta.** “O relatório já diz qual é a causa.”

**O que fazer.** Meça antes e depois da correção. Uma correção que melhora só em parte o sintoma ainda não está fechada.

### 55. Verde na sua máquina é o veredito de uma máquina só

`from: 4bc0daad` · `by: ai`

**A ideia.** Uma verificação que passou onde eu a rodei diz que o trabalho se sustenta naquela máquina: o sistema, a velocidade, o relógio, o fuso horário, os nomes dos arquivos. Onde o trabalho vai rodar de verdade (outro sistema, um servidor, o CI, o computador do usuário), qualquer um desses pode ser diferente, e a mesma verificação pode falhar lá enquanto ainda passa aqui.

**Exemplo.** O teste de um resumo passou na máquina Windows do desenvolvedor e foi enviado, seis commits seguidos. Nos runners Linux do CI falhou sempre: as máquinas eram rápidas o bastante para registrar uma entrada no mesmo milissegundo da marca que o teste acabara de escrever, então “depois da marca” a deixava de fora. O veredito local foi lido todas as vezes; o veredito das outras máquinas ficou num e-mail até o usuário encontrá-lo.

**Pergunta detectora.** Onde isto vai rodar de verdade, e minha verificação rodou ali, ou só aqui? Se existe um veredito de lá (CI, um servidor de homologação, o dispositivo do usuário), eu o li antes de dizer que funciona?

**Sinal de alerta.** “Funciona na minha máquina”, ou um push seguido da tarefa seguinte enquanto o CI ainda roda ou está vermelho. Qualquer coisa que dependa de tempo, ordem, velocidade, maiúsculas em nomes de arquivo, separadores de caminho, quebras de linha, idioma ou fuso horário.

**O que fazer.** Nomeie as máquinas em que o trabalho roda e obtenha um veredito de cada uma: leia o CI até o fim depois de cada push (cada job, não só o primeiro verde), rode no servidor ou numa cópia dele, ou peça o resultado do usuário. Uma falha em uma dessas máquinas é real mesmo que nunca apareça aqui: reproduza-a aqui forçando a diferença (uma data fixa, um relógio rápido, um caminho sensível a maiúsculas) antes de corrigir, e corrija a suposição, não a máquina.

### 71. Uma nota média deixa passar o único erro que importa

`from: 2cddfa4e` · `by: ai`

**A ideia.** Uma verificação que dá uma nota média à saída inteira (percentual de semelhança, proporção de palavras certas, proporção de linhas que batem) pode aprovar uma saída errada justamente no item que importava. Quando quase tudo está certo, a média continua alta mesmo que a parte principal esteja errada.

**Exemplo.** Cada frase de uma narração com voz sintética era aceita se, ao transcrever o áudio, a semelhança com o roteiro fosse de pelo menos 90 %. Uma frase de teste continha, em maiúsculas, o nome de uma função de planilha. A voz o pronunciou errado nas duas gravações, e as duas passaram com 93 %, porque as outras catorze palavras estavam certas. O usuário percebeu ouvindo. Pela mesma conta, uma frase com a última palavra cortada também passaria; esse caso não foi testado.

**Pergunta detectora.** Minha verificação reduz tudo a um número? Eu a testei numa saída em que só o item-chave está errado (um termo, a última palavra, um número) e vi que ela foi rejeitada?

**Sinal de alerta.** “Passou com 93 %, está bom.” · “Um limite de 90 % já deixa espaço para pequenos erros.”

**O que fazer.** Antes de confiar no limite, monte o caso de um único erro no lugar que importa e veja se ele é rejeitado (ver a lição 13). Se não for, confira separadamente o que não pode falhar: termos raros, números, o final. E se a entrada contiver algo que a ferramenta não consegue tratar (siglas, fórmulas, símbolos), converta-o ou rejeite-o antes de gerar.

### 72. Um juiz que já viu os próprios veredictos anteriores deixa de ser independente

`from: 851656dd` · `by: ai`

**A ideia.** Para comparar duas versões de algo, um avaliador julga a nova. Se é o mesmo avaliador que julgou a anterior e ainda a tem em mente (uma pessoa com suas anotações, um agente retomado com o histórico dele), o veredito pode se ancorar no que ele já disse: confirmar as próprias notas, ou ver “melhorias” onde esperava encontrá-las. Retomá-lo também carrega todo o histórico, o que custa caro.

**Exemplo.** Para cada versão de um assistente, o mesmo agente juiz era retomado com “avalie a nova como avaliou a anterior”. O contexto dele cresceu para cerca de 450 mil tokens, e cada novo veredito era lido contra os próprios vereditos anteriores. Um revisor independente apontou: a rubrica e os critérios precisam ser os mesmos, mas o juiz, não.

**Pergunta detectora.** Quem avalia esta versão já conhece as próprias notas da anterior? A comparação depende da memória dele, ou de uma rubrica escrita que qualquer juiz novo pode aplicar?

**Sinal de alerta.** “Vou retomar o mesmo juiz para manter a consistência”.

**O que fazer.** Escreva a rubrica e os critérios em um arquivo, e para cada versão use um juiz novo com um briefing curto que aponte para esse arquivo. A consistência vem da rubrica, não da memória do juiz. Quando uma versão importa muito, peça que dois juízes novos a avaliem e compare onde eles divergem. Manter separados quem fez o trabalho e quem o verifica é a lição 28.

### 74. Se a nota vem dos mesmos casos com que você ajustou, ela mede o quanto você decorou esses casos

`from: 33f0d9bf` · `by: ai`

**A ideia.** Quando você ajusta algo (um prompt, regras, limiares) olhando os erros de alguns casos e depois mede nesses mesmos casos, a nota sobe mesmo que nada de geral tenha sido aprendido. Se você ainda cola trechos desses casos nas instruções como exemplos, a prova já traz as respostas.

**Exemplo.** Um assistente de LLM foi ajustado ao longo de seis versões olhando apenas duas conversas de prática, e chegou a 92.5%. As instruções dele traziam, como exemplos, quatro linhas tiradas dessas mesmas conversas. Em uma conversa que nunca tinha visto, ele fez 64%. Com um conjunto de dez conversas, quatro reservadas só para medir, a versão seguinte subiu nos casos de ajuste (de 62% para 67%) e não subiu nos reservados (de 64.8% para 60.2%, em quatro conversas).

**Pergunta detectora.** Esta nota vem de casos que também usei para decidir a mudança, ou que estão dentro das instruções como exemplos? Há casos reservados que ninguém olhou durante o ajuste?

**Sinal de alerta.** “Chegou a 92%”, medido nos casos de sempre · “Vou pôr este caso como exemplo para ele acertar”.

**O que fazer.** Desde o início, separe casos para ajustar e casos só para medir, com variedade. As mudanças saem só do primeiro conjunto e ficam apenas se a nota do segundo subir. Nenhum exemplo das instruções vem de um caso do conjunto; os exemplos são inventados. Cada olhada nos casos reservados os gasta um pouco: depois de várias olhadas, monte novos. Escolher um ajuste com base nas amostras extremas é a lição 67; um exercício que traz a própria resposta: EDU-2.

### EDU-1. Se a resposta sai igual sem a habilidade, o exercício não a mede

`from: 164808ab` · `by: ai`

**A ideia.** Um exercício só verifica uma habilidade se quem pula essa habilidade obtém um resultado diferente. Se o ponto de partida, um exemplo ou um atalho já produz a resposta certa, o exercício aprova todo mundo. É a lição 13 aplicada a exercícios: uma verificação só vale alguma coisa depois que você a viu rejeitar o erro.

**Exemplo.** Um exercício pedia a maior compra do verão, usando um filtro de datas. A maior compra de toda a tabela também tinha sido no verão: sem o filtro, o número era o mesmo, e o exercício aceitou. Outro exigia que o código tivesse um `=`; passou com o resultado digitado à mão, `total = 1945`. A verificação olhava a letra, não a habilidade.

**Outro exemplo.** Um exercício feito em uma planilha pedia que o estudante definisse a região, importasse um CSV e digitasse de volta quantas unidades de um produto havia. A contagem era um número inteiro guardado no arquivo: um editor de texto simples o mostrava sem nenhuma importação e sem região definida. Ele foi trocado por unidades vezes um preço com ponto decimal, que só dá o número esperado quando a planilha lê esse decimal corretamente. No mesmo curso, um exercício para ordenar arquivos pela extensão podia ser resolvido só pelos nomes dos arquivos.

**Mais um exemplo.** Num curso com interfaces desenhadas (um navegador, uma caixa de e-mail, uma planilha), os exercícios conferiam só o estado final, e outros caminhos chegavam nele. Fechar a lição e ficar na outra aba passava em “trocar de aba”; reabrir outra aba qualquer passava em “reabrir a lição”; apagar a célula e arrastar a alça de preenchimento passava em “copiar a fórmula”. E um contador contava duas vezes um e-mail falso quando ele foi denunciado e depois apagado.

**Pergunta detectora.** Que resultado obtém quem pula exatamente o que eu ensino, ou quem entrega o exercício sem mexer? Ele é diferente do certo? Escolhi um caso em que os dois cálculos por acaso coincidem (o primeiro grupo, o primeiro passo, o total)?

**Sinal de alerta.** “Com a resposta certa ele dá o número, então funciona.” · “Eles vão fazer a configuração de qualquer forma.”

**O que fazer.** Resolva cada exercício três vezes: sem mexer, com o erro mais provável, e corretamente. Só a terceira pode passar. Depois, rode a mesma lista de atalhos em todos os exercícios: o número digitado à mão, o código inicial com a resposta acrescentada no fim, o sintoma corrigido à mão em vez da causa, a palavra exigida usada vazia, e uma execução com estado deixado por uma tentativa anterior. Mantenha qualquer margem de tolerância menor que a distância entre a resposta e o erro mais provável, e escreva três formas corretas que um estudante usaria, para que a verificação não rejeite o que está certo. Quando o exercício acontece em outra ferramenta e só volta um número digitado, peça um número que só apareça depois do passo ensinado (um cálculo que a configuração afeta), e não um valor guardado no arquivo, e acrescente “a configuração pulada” à lista de atalhos. Em um exercício de ordenação, mantenha tudo igual, exceto o recurso que está sendo ensinado. Em interface desenhada, confira o caminho, e não só o estado final: a ação ensinada precisa acontecer, então fechar a aba da lição não pode contar como trocar de aba. E conte cada item uma vez, aconteça o que acontecer com ele depois.

### EDU-4. Se dá para adivinhar a opção certa pela posição, pelo tamanho ou pela aparência, o quiz mede adivinhação

`from: 538c38d7` · `by: ai`

**A ideia.** Cada pergunta pode estar boa isoladamente e, ainda assim, o conjunto entregar a resposta: a opção certa é sempre a segunda, sempre a mais longa, sempre a de tamanho intermediário, ou a única com um botão. Os estudantes percebem padrões mais rápido que os autores.

**Exemplo.** No quiz final de um módulo, a resposta certa era a segunda opção em seis de sete perguntas. Em um curso inteiro, a opção certa era a mais longa em 55 % das perguntas, quando o acaso, com três opções, dá uma em três. Depois que o tamanho foi equilibrado à mão, a opção certa acabou sendo a mais curta em seis de sete perguntas de uma lição, e a do meio em todas as perguntas de três lições seguidas.

**Outro exemplo.** Em uma caixa de e-mail desenhada, só os e-mails falsos tinham um botão de denunciar, então os estudantes denunciavam sem ler o remetente. Numa pergunta de “toque na captura de tela certa”, a captura certa era a única com conteúdo: as outras duas eram blocos de cor.

**Mais um exemplo.** Em uma lição de idioma para iniciantes, os estudantes colocavam as peças em ordem: `Thank you,` · `Name.` · `You're` · `in.`. A única maiúscula ficava na primeira peça e o único ponto na última, então a ordem podia ser montada sem ler uma palavra; a mesma frase também tinha aparecido palavra por palavra antes, na própria lição (lição EDU-2). As peças passaram a ser minúsculas e sem pontuação, em torno do nome do próprio estudante.

**Pergunta detectora.** Se eu ler só a posição, o tamanho e a aparência das opções, sem o texto, acerto a certa mais de uma vez em três? Em um exercício de ordenação, maiúsculas ou pontuação entregam a ordem?

**Sinal de alerta.** “Eu revisei cada pergunta, todas estão certas.”

**O que fazer.** Embaralhe as opções na hora de mostrá-las, com uma ordem que não venha de onde a certa foi escrita. Meça a mais longa, a mais curta e a do meio em cada arquivo, e agrupe arquivos pequenos por módulo, para que poucas perguntas não escondam o padrão. Compare a contagem com o que você pediu: uma passagem de balanceamento pode deslocar a pista em vez de eliminá-la. Dê a todas as opções os mesmos controles (todo e-mail tem um link e um botão), e desenhe as opções erradas tão verossímeis quanto a certa. As peças de um exercício de ordenação vão em minúsculas e sem pontuação, numa combinação que não foi escrita antes na lição.
