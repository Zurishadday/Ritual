# Testes e verificações

O que vale quando você verifica algo: testes automatizados, validadores, revisões, calibração.

### 13. Um verificador que nunca viu o erro não verifica nada

`from: eb6c6b31` · `by: ai`

**A ideia.** Um teste que sempre passa pode estar quebrado. A única forma de saber é vê-lo falhar contra o erro real.

**Exemplo.** Um teste que proibia uma palavra só procurava a versão em minúsculas; com letra maiúscula ou acento, passava.

**Outro exemplo.** Foram semeados 37 registros duplicados para um exercício, e a contagem voltou 92: os dados já tinham correspondências naturais. Uma verificação que comparava a contagem com o que foi semeado, antes de salvar, pegou isso.

**Mais um exemplo.** Uma regra que detectava código indentado sinalizou uma linha que começava com um texto: o caso que deveria passar não tinha essa forma. E um teste de que a comparação de texto funcionava passou mesmo com a comparação quebrada, porque outra revisão rejeitou o erro antes.

**Pergunta detectora.** Testei meu verificador contra o erro nas formas em que ele realmente apareceria? E contra o caso correto?

**Sinal de alerta.** “Já passa, então está bem configurado.”

**O que fazer.** Calibre com dois casos: um em que ele precisa encontrar algo e outro em que não pode encontrar nada, e rode de verdade no dia em que nasce. O caso bom importa tanto quanto o ruim: um verificador que rejeita o que está correto também está quebrado, e isso é mais difícil de notar porque parece rigoroso. O caso bom inclui as formas reais do que está certo, inclusive as que você não escreveu: outra ordem, outro nome. Cada verificação se calibra sozinha: se outra pega o erro antes, a sua nunca foi testada. E uma revisão que repete o que já leu não consegue falhar (uma “segunda passada” que relê o mesmo arquivo): substitua por uma reconciliação que falha se algo estiver errado.

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

`from: 5301da23` · `by: ai`

**A ideia.** Toda revisão automática filtra pelo que é “relevante”, e esse filtro pode deixá-la cega justamente onde está o problema.

**Exemplo.** Um auditor de design revisava só elementos sem filhos. Os rótulos que precisavam de revisão tinham um ícone de ajuda dentro, então ele nunca os viu.

**Outro exemplo.** Um teste percorria todas as páginas marcando sempre a primeira opção e executando cada consulta conforme aparecia. Sempre passava, e nunca verificava se a resposta correta era aceita.

**Mais um exemplo.** Para decidir se alguém alterou um texto, os espaços eram ignorados. Isso deixava de fora exatamente o caso da página que explicava como dispor aquele texto com espaços e quebras de linha. Normalizar também é filtrar.

**Pergunta detectora.** O que meu filtro deixa de fora? Escreva antes de acreditar no resultado.

**Sinal de alerta.** “Encontrou 48 diferenças, já tenho a lista” · “o teste percorre todas elas”.

**O que fazer.** Anote o que o filtro deixa de fora e confira à mão uma amostra dos itens excluídos. E quando descobrir que um filtro te deixou cego, procure os outros filtros parecidos que você já escreveu: uma revisão que tirava todos os espaços do código juntava duas palavras numa só e rejeitava código correto, logo depois de a mesma lição ter sido aprendida com outra normalização.

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

`from: ed079f80` · `by: ai`

**A ideia.** Se a mesma pessoa roda e confirma, um erro de execução se confirma sozinho.

**Exemplo.** Quem escreveu cada página também tirou as capturas de tela da revisão, e só das etapas que achava arriscadas. O revisor leu o arquivo-fonte. As etapas sem captura não foram vistas por ninguém.

**Pergunta detectora.** Além de quem fez, quem revisou o resultado como o usuário o recebe?

**Sinal de alerta.** “Eu mesmo já revisei.”

**O que fazer.** Um roda e o outro verifica lendo o resultado. “Eu já fiz” é o sinal de que agora pode ser verificado, não a verificação. E quem verifica não olha pelo mesmo canal que quem fez (ver a lição 14): se os dois leem só a fonte, nenhum dos dois vê a tela.

### 34. Confie no sintoma de um achado de QA e meça a causa

`from: b3b868fb` · `by: ai`

**A ideia.** Um relatório de QA costuma acertar no sintoma e propor uma causa que é só hipótese.

**Exemplo.** Um relatório pedia para corrigir um gráfico que somava errado, mas esse gráfico não existia na tela: os dados passavam sem nada que os desenhasse.

**Pergunta detectora.** Consigo reproduzir a causa com a minha própria medição, ou aceito porque soa certo?

**Sinal de alerta.** “O relatório já diz qual é a causa.”

**O que fazer.** Meça antes e depois da correção. Uma correção que melhora só em parte o sintoma ainda não está fechada.

### EDU-1. Se a resposta sai igual sem a habilidade, o exercício não a mede

`from: 4a591edc` · `by: ai`

**A ideia.** Um exercício só verifica uma habilidade se quem pula essa habilidade obtém um resultado diferente. Se o ponto de partida, um exemplo ou um atalho já produz a resposta certa, o exercício aprova todo mundo. É a lição 13 aplicada a exercícios: uma verificação só vale alguma coisa depois que você a viu rejeitar o erro.

**Exemplo.** Um exercício pedia a maior compra do verão, usando um filtro de datas. A maior compra de toda a tabela também tinha sido no verão: sem o filtro, o número era o mesmo, e o exercício aceitou. Outro exigia que o código tivesse um `=`; passou com o resultado digitado à mão, `total = 1945`. A verificação olhava a letra, não a habilidade.

**Pergunta detectora.** Que resultado obtém quem pula exatamente o que eu ensino, ou quem entrega o exercício sem mexer? Ele é diferente do certo? Escolhi um caso em que os dois cálculos por acaso coincidem (o primeiro grupo, o primeiro passo, o total)?

**Sinal de alerta.** “Com a resposta certa ele dá o número, então funciona.”

**O que fazer.** Resolva cada exercício três vezes: sem mexer, com o erro mais provável, e corretamente. Só a terceira pode passar. Depois, rode a mesma lista de atalhos em todos os exercícios: o número digitado à mão, o código inicial com a resposta acrescentada no fim, o sintoma corrigido à mão em vez da causa, a palavra exigida usada vazia, e uma execução com estado deixado por uma tentativa anterior. Mantenha qualquer margem de tolerância menor que a distância entre a resposta e o erro mais provável, e escreva três formas corretas que um estudante usaria, para que a verificação não rejeite o que está certo.

### EDU-4. Se dá para adivinhar a opção certa pela posição ou pelo tamanho, o quiz mede adivinhação

`from: dcfa5304` · `by: ai`

**A ideia.** Cada pergunta pode estar boa isoladamente e, ainda assim, o conjunto entregar a resposta: a opção certa é sempre a segunda, sempre a mais longa, ou sempre a de tamanho intermediário. Os estudantes percebem padrões mais rápido que os autores.

**Exemplo.** No quiz final de um módulo, a resposta certa era a segunda opção em seis de sete perguntas. Em um curso inteiro, a opção certa era a mais longa em 55 % das perguntas, quando o acaso, com três opções, dá uma em três. Depois que o tamanho foi equilibrado à mão, a opção certa acabou sendo a mais curta em seis de sete perguntas de uma lição, e a do meio em todas as perguntas de três lições seguidas.

**Pergunta detectora.** Se eu ler só a posição e o tamanho das opções, sem o texto, acerto a certa mais de uma vez em três?

**Sinal de alerta.** “Eu revisei cada pergunta, todas estão certas.”

**O que fazer.** Embaralhe as opções na hora de mostrá-las, com uma ordem que não venha de onde a certa foi escrita. Meça a mais longa, a mais curta e a do meio em cada arquivo, e agrupe arquivos pequenos por módulo, para que poucas perguntas não escondam o padrão. Compare a contagem com o que você pediu: uma passagem de balanceamento pode deslocar a pista em vez de eliminá-la.
