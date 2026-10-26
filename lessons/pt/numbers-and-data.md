# Números e dados

O que vale quando você calcula, mede ou mostra um número: painéis, relatórios, modelos, métricas.

### 1. “Não consegui ler” não é “não há nada”

`from: fe96d871` · `by: ai`

**A ideia.** Todo dado tem três estados: eu tenho, realmente não havia nada, e eu não sei. Os dois últimos são desenhados do mesmo jeito num gráfico, como zero, e significam o oposto.

**Exemplo.** Uma consulta falha por causa de uma permissão expirada, e o painel mostra “0 vendas” para a região. Ninguém questiona: um zero parece um dado.

**Pergunta detectora.** O número que estou prestes a mostrar, ou o “está tudo bem” em que estou prestes a acreditar, pode vir de uma consulta que falhou, de uma tabela vazia, de uma permissão negada ou de uma saída que não li por completo (ver a lição 44)?

**Sinal de alerta.** “Se falhar, eu coloco zero e sigo em frente.”

**O que fazer.** Se a leitura falhar, mostre o erro no próprio cartão, e não uma lacuna nem um zero. E um contador que diz “0 problemas” só é confiável se antes encontrou um problema que você plantou de propósito.

### 2. Duas coisas com o mesmo nome não são a mesma coisa

`from: de984b04` · `by: ai`

**A ideia.** “Cliente ativo”, “data”, “o chefe”, “o limite”: a mesma palavra muitas vezes esconde duas definições. Quando dois relatórios não batem, quase sempre é isso.

**Exemplo.** “Data” pode ser a data do evento, a data de carga ou a data da partição. Ou “o chefe”: o chefe atual da pessoa, ou o chefe que ela tinha na época em que aconteceu o que você está medindo.

**Outro exemplo.** Uma tabela de campanhas tinha o gasto da empresa inteira, mas a receita vinha de uma amostra de uma compra em cada cem. As duas colunas estavam rotuladas como “reais”, e o retorno saiu negativo para todas as campanhas.

**Mais um exemplo.** O custo de alguns subagentes foi tirado de uma contagem de tokens no resumo de cada um, e saiu muito baixo: essa contagem deixava de fora parte do uso. Somar o uso de cada resposta nas transcrições deu o custo real. E um log dizia que uma proteção tinha deixado “23 linhas”, quando tinha deixado 19 blocos.

**Um quarto exemplo.** Um script que publica uma nota primeiro procurava outra já publicada com o mesmo título e, se encontrasse uma, marcava a nota como enviada e apagava o rascunho. Duas pessoas podem escrever o mesmo título: a nota de outra pessoa tomaria o lugar desta, e o rascunho se perderia. É o autor, e não o título, que diz de quem é a nota.

**Pergunta detectora.** Existe uma regra verdadeira para uma das duas coisas e falsa para a outra? E, se eu combino dois números num mesmo cálculo, eles vêm do mesmo universo, da mesma escala e do mesmo período?

**Sinal de alerta.** “É a mesma data” · “a visão já filtra isso” · “as duas estão em reais”.

**O que fazer.** Dê um nome diferente para cada variante no código e na tela, mesmo que fique feio. E antes de dividir ou subtrair dois números de fontes diferentes, anote de onde vem cada um: se um resultado sai igual em todos os casos (todos perdem, todos ganham), suspeite da escala antes do negócio. Quando um número vem de um campo ou de uma contagem, leia como ele é calculado (a documentação ou o código dele) e escreva a unidade ao lado do número: “19 blocos”, não “23 linhas”. Quando é um nome que casa com dois registros (um título, um rótulo), acrescente uma chave que só o registro certo pode ter, como o autor ou o id, antes de agir sobre a correspondência. Para obter o número de outra forma, ver a lição 12.

### 3. O período atual está sempre incompleto

`from: 23269694` · `by: ai`

**A ideia.** Um mês que ainda não terminou sempre parece pior que um mês fechado. Não é tendência: é o calendário.

**Exemplo.** A curva de vendas “cai” no último ponto, que é o mês que só está na metade.

**Pergunta detectora.** Este cálculo inclui um período que ainda não terminou?

**Sinal de alerta.** “Já dá para ver a tendência.”

**O que fazer.** Corte os indicadores no último período fechado, ou marque na tela o período parcial. E mantenha os dois relógios separados: números de grupo usam meses fechados; pessoas nomeadas usam o dia atual.

### 4. Um campo que a origem sobrescreve não é histórico

`from: 89a9e01d` · `by: ai`

**A ideia.** Muitos sistemas guardam só o valor de hoje. Se você constrói uma variável “histórica” em cima desse campo, está medindo o presente e vestindo-o como passado.

**Exemplo.** O sistema guarda apenas o chefe atual de cada pessoa. Para quem já saiu, esse chefe fica congelado, então “rotatividade da equipe de cada chefe” acaba medindo “esta equipe não existe mais”.

**Pergunta detectora.** Este campo guarda o valor anterior quando muda, ou substitui?

**Sinal de alerta.** “A coluna está ali, eu só uso ela.”

**O que fazer.** Pergunte à origem se os dados são uma foto do momento ou um histórico antes de usá-los para olhar para trás.

### 5. Resultado perfeito é um alerta, não uma vitória

`from: 44986978` · `by: ai`

**A ideia.** Se uma única variável separa quem saiu de quem ficou quase sem erros, muito provavelmente ela tem o próprio desfecho escondido dentro dela.

**Exemplo.** Um modelo de repente fica muito melhor. Descobre-se que uma variável vale 1 para todos que saíram e 0 para todos que ficaram, porque a origem preenche cada grupo de um jeito. Outra variante: o modelo aprende em que ano algo aconteceu, e não com quem aconteceu.

**Pergunta detectora.** Pode ser que minha medida de qualidade esteja subindo porque o modelo está adivinhando quando algo aconteceu, em vez de com quem aconteceu?

**Sinal de alerta.** “Ficou quase perfeito!” · “vamos só ajustar pelo ano e seguir”.

**O que fazer.** Teste para frente: treine com o passado e avalie num período posterior. E antes de ajustar por algo, pergunte se esse algo é o que decide o resultado que você quer prever.

### 12. Rodar a consulta não prova que o número está certo

`from: b2232042` · `by: ai`

**A ideia.** “Não deu erro” não é “está correto”. Compare com algo independente do seu próprio cálculo.

**Exemplo.** Uma questão de múltipla escolha afirmava que comparar um número com um texto entre aspas gera erro. Em alguns outros motores gera; no que as pessoas de fato usavam, a consulta rodou e devolveu linhas.

**Outro exemplo.** Um texto explicava corretamente que um bloco nomeado só vive dentro da própria consulta, mas o próprio exemplo supunha que três consultas separadas o compartilhavam. Ao rodar, a segunda consulta gerou erro: a tabela não existia.

**Mais um exemplo.** Todos os exemplos de uma página foram executados, e ainda assim três frases se revelaram falsas: a explicação de uma opção, escrita no fim, descrevia o que uma linha faz sem que ninguém tivesse executado; uma regra para ler erros (“se disser isto, então falta aquilo”) era contradita por outro passo da mesma página; e a introdução dizia que uma função “devolve um resultado” quando não devolve.

**Pergunta detectora.** Contra o que, fora do meu próprio código, vou verificar este resultado? E, em tudo o que o texto diz que o sistema faz, seja num exemplo, numa regra ou na explicação de uma opção, eu executei no motor real?

**Sinal de alerta.** “Na minha máquina funciona” · “não deu erro” · “é assim que funciona, só expliquei”.

**O que fazer.** Reconcilie com um número conhecido, com o sistema de origem ou com o período anterior. Teste no ambiente real: com as suas permissões, as suas bibliotecas e a cópia do código que de fato roda. Toda afirmação sobre como o sistema se comporta é executada uma vez antes de ser escrita, inclusive a que aparece de passagem num exemplo ou é escrita por último. Se a afirmação é uma regra geral (“só”, “sempre”, “nunca”), encontre o caso que a quebraria e execute também: “converter para inteiro só lê inteiros” foi checado com um texto que tinha decimais, e se revelou falso para um número com decimais. Ao afirmar uma fração (“cinco em seis”), diga de qual todo ela é fração; e um cenário inventado também é checado: o tamanho, a diferença e o valor-p precisam ser coerentes entre si.

### 36. Meça antes de escrever

`from: 086f1f80` · `by: ai`

**A ideia.** Todo número num documento vem de uma medição com data e fonte, não da memória nem de uma versão anterior do documento.

**Exemplo.** Uma explicação dizia que um bug fazia perder “quase um em cada cinco” chamados. Medido, eram mais de um em cada cinco: a frase veio de conta de cabeça, e não dos dados.

**Outro exemplo.** Um texto dizia que um grupo de coortes “estava acima de 50 %”; cinco das doze estavam abaixo. Em outro, a ilustração mostrava um cálculo feito à mão que não batia: a porcentagem vezes o total não dava o número desenhado.

**Um terceiro exemplo: o alcance, não o número.** Num curso escrito a partir de um arquivo de pesquisa com fontes citadas, todo número estava certo, e as frases ao redor deles não estavam: “a documentação de dois sistemas descreve três mecanismos” quando documentava um; “nenhum artigo proíbe” depois de ler dois; uma enquete que perguntou “o que você faz para aumentar suas chances quando se candidata?” foi recontada como “adapta o currículo a cada vaga”; “ninguém mediu” e “não há estudo” quando a pesquisa só não tinha encontrado um; “os guias concordam” sem nenhum guia entre as fontes. Cada uma foi escrita ao lado da sua fonte; os revisores as pegaram uma a uma.

**Um quarto exemplo: o que a fonte diz contra ele.** Um parágrafo do README deu o resultado favorável de um teste, com todos os números certos, enquanto o arquivo de resultados ao qual ele linkava dizia que, nos totais, não havia diferença. No mesmo dia, o parágrafo foi levado para o topo da página e seus números foram para imagens de uma publicação, em cada vez sem reler o arquivo. Um revisor de fora abriu o arquivo e chamou a manchete de exagero do próprio resultado nulo.

**Um quinto exemplo: um número de outro lugar.** Num curso, “a soma está na casa dos milhares” foi copiada de uma lição gêmea que usava outra tabela; na tabela desta lição, era falso. Um custo de geração de voz foi dado como o número de créditos vezes um preço por crédito, quando cada geração tinha sido cobrada pela sua própria tarifa. E num curso, uma estudante fictícia recontou seu projeto final com números que não vinham dos dados daquele projeto: quem fez o projeto veria números que não são seus.

**Pergunta detectora.** De quais dados e de que data veio este número, ou esta comparação (“mais de mil”, “mais da metade”, “quase todos”)? A frase ao redor de um número com fonte diz mais do que a fonte: mais ampla (“todos”, “nenhum”, “só”, “a lei”), mais certa, ou sobre evidências que eu não procurei (“ninguém mediu”, “os guias concordam”)? Ela deixa de fora o que a fonte diz contra ela?

**Sinal de alerta.** “É o número que a gente já tinha” · “dá mais ou menos isso” · “dá para ver que todos passam” · “é o que a fonte diz, mais ou menos” · Uma afirmação levada a um lugar mais visível (o topo de uma página, um gráfico, uma publicação) sem ser relida contra a fonte.

**O que fazer.** Antes de escrever um número, meça de novo e anote ao lado de que dados e de que data ele veio. Palavras de quantidade (“quase”, “mais de”, “a maioria”) são números disfarçados: meça-as do mesmo jeito. E se uma imagem tem contas dentro, faça o mesmo script que a desenha fazer a conta. Ao lado de uma afirmação com fonte, copie também o alcance da fonte: quem mediu, em que população, quando e, para uma enquete, a pergunta que foi feita; uma palavra absoluta que a fonte não tem é tirada. O que você não encontrou é dito como seu (“não encontramos nenhum estudo”), e uma recomendação sem fonte é assinada (“recomendamos”). Um número copiado de um texto gêmeo, ou contado por uma personagem inventada, é medido de novo nos dados deste próprio texto; um custo é somado a partir do registro de cada item, e não de uma tarifa única para todos.

### 50. Se duas explicações preveem a mesma coisa, seu exemplo não escolhe entre elas

`from: 9148c81d` · `by: ai`

**A ideia.** Um exemplo só confirma a sua explicação se a explicação rival daria um resultado diferente. Se as duas preveem o mesmo, o exemplo faz você acreditar na que lhe ocorreu primeiro.

**Exemplo.** Uma lição comparou subir em cinco pontos o primeiro passo de um funil com subir o último. O primeiro venceu, e o texto dizia: “eles valem mais onde há mais visitas”. Mas o primeiro passo também era o que menos convertia, e essa era a causa: em um funil em que o primeiro passo converte melhor, o último vence apesar de ter menos visitas. Em outro projeto, uma página foi culpada por carregar em 2.7 s; um teste que requisitava as páginas uma por uma passava mesmo sem a correção, porque a causa real eram quarenta requisições ao mesmo tempo.

**Outro exemplo.** Um vídeo de demonstração gerado dizia “funcionou porque você removeu os espaços antes”, mas nenhuma das células da sua planilha de exemplo tinha espaços extras: sem remover, a substituição dava o mesmo resultado. Um revisor apontou isso. Uma célula com espaço no fim, que só bate depois de remover os espaços, fez os dados mostrarem a causa, e um assert no script que monta a demonstração agora falha se ela deixar de mostrá-la.

**Pergunta detectora.** Que outra explicação daria este mesmo resultado? Meu exemplo a descarta? Se o passo que considero responsável for pulado, o resultado muda?

**Sinal de alerta.** “Os números confirmam.”

**O que fazer.** Antes de ensinar ou reportar por que algo acontece, escreva a explicação rival e monte um caso em que as duas prevejam coisas diferentes. Compare partes de mesmo tamanho, teste outro tamanho de exemplo e meça uma afirmação geral em dados simulados antes de escrevê-la. Se você não consegue separá-las, diga que o exemplo é compatível com as duas. Quando o código monta o exemplo (uma demonstração, um conjunto de dados de amostra), deixe nele um assert que falhe se a explicação rival der o mesmo resultado.

### AI-3. Um modelo ajustado também aprende as bordas e o fundo de seus exemplos

`from: 381ee3d8` · `by: ai`

**A ideia.** Um modelo treinado com exemplos copia tudo o que esses exemplos têm em comum, e não só o que você quis ensinar. Se todo clipe termina de repente ou traz o mesmo ruído de fundo, o modelo gera finais abruptos e esse mesmo ruído.

**Exemplo.** Para clonar uma voz, os clipes de treinamento foram cortados 0.1 s depois da última palavra, e as gravações de origem tinham ruído de ambiente em torno de −48 dB. O modelo ajustado terminava cada frase na última sílaba (−23 dB na última amostra) e punha esse ruído em todas as frases, mesmo com uma voz de referência limpa. O usuário ouviu (“termina seco”); a verificação automática de transcrição disse que o texto estava completo, e por isso não pegou (uma revisão de uma só dimensão, ver a lição 19).

**Pergunta detectora.** Além do que quero ensinar, o que quase todos os meus exemplos têm em comum: como começam e terminam, o fundo deles, o formato? Eu quero que o modelo produza isso também?

**Sinal de alerta.** “O texto confere, então o conjunto de dados está bom” · “o ruído é fraco, o modelo aprende a voz, não o ambiente”.

**O que fazer.** Meça no conjunto de dados as mesmas propriedades que você vai exigir da saída (no áudio: o nível no fim de cada clipe, o piso de ruído, o comprimento da cauda) e imponha-as como filtros antes do treinamento. Se a saída tem um defeito que não está no código, procure-o primeiro nos dados.
