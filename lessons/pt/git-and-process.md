# Git e processo

O que vale quando você salva, fecha, passa adiante ou coordena: commits, estados, pendências, trabalho em paralelo.

### 8. Liste os consumidores, não os lembre

`from: 74a3645f` · `by: ai`

**A ideia.** Quando você muda um dado que outros leem pelo nome, a lista de quem o lê precisa estar escrita. A memória sempre deixa um de fora.

**Exemplo.** Os rótulos de três telas foram atualizados depois que um modelo mudou. A quarta, que ninguém lembrou, continuou oferecendo opções do modelo anterior.

**Outro exemplo.** Ao escrever um capítulo, afirmou-se de memória que o leitor já conhecia três funções de um capítulo anterior. Uma busca mostrou que o capítulo ensinava só uma, e que outro capítulo já tinha explicado o tema apresentado como novo.

**Mais um exemplo.** Uma mudança foi salva com a lista de arquivos escrita de memória, e um ficou de fora: justamente o que fazia a coisa nova funcionar. A lista de mudanças pendentes, revisada depois, mostrou isso. Outra vez, um commit dizia que uma cópia de alguns arquivos estava “atualizada” enquanto três deles faltavam; outro revisor encontrou.

**Pergunta detectora.** De onde tirei a lista de quem usa isto: de uma busca ou da memória?

**Sinal de alerta.** “Já cobri os três lugares onde é usado” · “eles já viram isso” · “já adicionei tudo”.

**O que fazer.** Mantenha um mapa escrito de impactos por tipo de mudança. Percorra-o inteiro, dizendo “muda” ou “não se aplica porque…”, e se a mudança cria um novo consumidor, adicione-o na mesma mudança. Antes de citar uma fonte, copie a frase que você está afirmando dela: o que alguém diz que outra pessoa fez ou viu também precisa ser conferido. Antes de escrever que uma cópia está “completa” ou “atualizada”, compare a lista do que ela deveria ter com a lista do que ela tem.

### 9. Um estado vive em vários registros: mova-os juntos

`from: d7a99bc7` · `by: ai`

**A ideia.** Fechar uma pendência costuma envolver três lugares: a lista de pendências, o teste que a vigia e o documento que a descreve. Se você mexe em um, os outros contradizem.

**Exemplo.** Uma pendência foi marcada como fechada na lista, mas o teste que a vigiava ainda estava marcado como “esperado que falhe”, e o documento ainda a descrevia como aberta. Três lugares, três versões.

**Outro exemplo.** Uma caixa de texto era preenchida por ditado por voz, que mantinha o texto numa variável separada, e o botão de enviar mandava essa variável. A pessoa apagou a primeira metade à mão enquanto ainda ditava, e o texto inteiro foi enviado, com a parte apagada. Depois, enviar limpava a caixa, mas não a variável, então o ditado seguinte começava com a mensagem anterior.

**Pergunta detectora.** Que outros lugares afirmam este estado? Nomeie-os antes de salvar. E o que eu envio ou salvo: vem da cópia que a pessoa vê, ou de uma guardada à parte?

**Sinal de alerta.** “Atualizo o outro lado depois.” · “A variável já tem o texto, vou enviar essa.”

**O que fazer.** A unidade de trabalho é o conjunto completo, na mesma mudança. O que é enviado ou salvo vem do que a pessoa vê, e todo envio ou reset limpa todas as cópias de uma vez, numa só linha de código.

### 30. Explique antes de agir, e espere o sim

`from: a2c8ffe9` · `by: ai`

**A ideia.** Andar rápido na direção errada não é progresso.

**Exemplo.** A estrutura de pastas de um projeto inteiro foi reorganizada sem aviso. A mudança estava correta em si, e foi desfeita por completo, porque outra pessoa já tinha decidido aquela estrutura por motivos que não estavam no código.

**Outro exemplo.** Pediram a uma pessoa que escolhesse entre desligar uma verificação automática por padrão ou mantê-la ligada. A pergunta mostrava só os ganhos e chamava a verificação pelo nome que ela tem no código. A pessoa disse sim; a mudança foi feita e publicada. Depois ela perguntou o que isso poderia prejudicar, e passaram mais quatro explicações até ela conseguir dizer o que tinha sido desligado.

**Pergunta detectora.** Este bloco é grande, difícil de desfazer, ou muda algo que outra pessoa já decidiu? Se sim, explique e espere. Se não, diga o que vai fazer e siga em frente: pedir permissão para cada passo também tem custo. Ao pedir um sim: eu disse, com as palavras da pessoa, o que poderia dar errado?

**Sinal de alerta.** “Já sei o que eles querem.” · “Opção 1 (recomendada)” só com as vantagens.

**O que fazer.** Antes de cada bloco grande de trabalho, explique em linguagem simples o que vai fazer e por quê, e espere a confirmação. Ao oferecer opções, dê a cada uma uma linha sobre o que pode dar errado e o quão fácil é desfazer, e nomeie as coisas pelo que fazem, e não pelo nome que têm no código. Se a resposta for uma pergunta, a decisão ainda não foi tomada.

### 35. Uma lista de pendências escrita de passagem fica velha

`from: 6deec922` · `by: ai`

**A ideia.** O que você anotou como “para depois” enquanto fazia outra coisa pode não existir mais, ou pode ter sido uma decisão deliberada.

**Exemplo.** Uma nota dizia “remover o filtro de data”. Quando finalmente foi trabalhada, o filtro já era uma decisão escrita da equipe, e removê-lo quebrou um relatório.

**Pergunta detectora.** Eu verifiquei este item hoje, ou vou trabalhar nele só porque está escrito?

**Sinal de alerta.** “Estava na lista.”

**O que fazer.** Antes de trabalhar numa pendência, verifique-a hoje e procure uma decisão escrita dizendo que ela foi deixada assim de propósito.

### 40. O registro diz o que ficou e por quê, não uma crônica de erros

`from: 8309d6b7` · `by: ai`

**A ideia.** Um histórico de mudanças serve para entender o produto, não para narrar os erros já resolvidos de quem fez a mudança.

**Exemplo.** Um histórico dizia “A foi tentado e falhou; B foi tentado e falhou; C ficou”. Quem lesse meses depois só precisava de C e do motivo, e tinha de ler três parágrafos para achá-lo.

**Pergunta detectora.** Esta linha ajuda a entender o produto ou a não repetir um erro, ou só registra o que aconteceu comigo?

**Sinal de alerta.** “Vamos guardar registro de tudo o que aconteceu.”

**O que fazer.** Escreva o estado final e o motivo. O que foi tentado e falhou só entra se ensina algo que alguém precisa para não repetir.

### 47. O que se trabalha em paralelo colide no que é compartilhado

`from: 83287f40` · `by: ai`

**A ideia.** Quando várias pessoas trabalham ao mesmo tempo, cada uma vê bem a sua parte. O que elas compartilham (os testes, os dados, os documentos do projeto inteiro) combina as mudanças de todas: nomes que colidem, cópias que ficam para trás, testes que leem um trabalho de outra pessoa ainda incompleto. Integrar é trabalho, não é colar.

**Exemplo.** Quatro pessoas escreviam cada uma uma peça ao mesmo tempo e deixavam as partes compartilhadas como entrega. Na integração, duas entregas usaram um nome que já existia no teste compartilhado, e o teste parou de rodar. Outro teste guardava uma cópia do que verificava; a peça mudou e a cópia não. Uma rodada de testes falhou por causa de uma imagem que outra pessoa ainda estava desenhando. E no fim, cada peça não podia ser salva separadamente: os arquivos compartilhados já carregavam mudanças de todos.

**Outro exemplo.** Duas conversas trabalhavam na mesma pasta, que compartilha mais do que arquivos: uma branch ativa, uma saída de build, uma porta de servidor de testes. Uma conversa trocou a pasta para outra branch; o próximo commit da outra caiu nessa branch, e o push para main disse “everything up to date” sem enviar nada. Voltar a pasta para main então levou junto as mudanças não commitadas da primeira conversa.

**Pergunta detectora.** Qual arquivo duas peças estão tocando ao mesmo tempo, e quem o integra? Meu teste está lendo um trabalho de outra pessoa ainda incompleto? Em qual branch esta pasta está logo antes do commit, e quem mais a usa?

**Sinal de alerta.** “Cada um testou a sua” · “a falha está na outra peça” · “cada um mexe em arquivos diferentes, não colidem.”

**O que fazer.** Tenha uma pessoa integrando o que é compartilhado, com uma etapa que pare se um nome colidir. Faça os testes lerem o original, e não uma cópia. Rode a suíte de testes completa uma vez, quando todos terminarem, ou sem as peças que ainda estão mudando, e diga quais ficaram de fora. E salve juntas as peças que compartilham arquivos, para que cada versão salva funcione por inteiro. Dê a cada sessão a sua própria pasta (`git worktree`), leia `git status -sb` antes de cada commit, e depois de um push confira se a branch remota tem o commit.

### 65. Uma regra sobre como trabalhar não tem exceção para passos pequenos

`from: 1f76d0cd` · `by: ai`

**A ideia.** Uma instrução permanente sobre como trabalhar (quem faz o quê, onde roda, com qual ferramenta) não tem exceção de tamanho. “É só uma verificação rápida” é justamente o caso que a regra pretendia cobrir.

**Exemplo.** O usuário tinha pedido, e isso estava salvo na memória, que todo trabalho mecânico (instalações, rodar scripts, transcrever) fosse para um subagente de modelo mais barato, ficando o modelo principal só com o raciocínio. Diante de três arquivos de áudio longos, o modelo principal escreveu e rodou ele mesmo uma transcrição de amostra “para ver o que eles continham”; falhou por causa de uma biblioteca ausente, tentou de novo, e o usuário o interrompeu para lembrar a regra.

**Pergunta detectora.** Antes do primeiro comando de um pedido: existe uma regra permanente (memória, instruções do projeto, o que o usuário disse) sobre quem faz este tipo de passo, ou como? Estou pulando-a porque o passo é “pequeno”?

**Sinal de alerta.** “Primeiro dou uma olhada rápida e delego depois” · “isto é curto demais para valer a pena delegar”.

**O que fazer.** Classifique o passo pelo tipo, e não pelo tamanho: se for mecânico, ele segue o caminho que a regra diz desde o primeiro comando. Se uma exceção fizer sentido de fato, diga isso antes de fazê-la e deixe o usuário decidir.
