# Écriture et documentation

Ce qui s'applique quand vous écrivez pour d'autres : documentation, manuels, textes d'interface, contenus, prompts.

### 11. Retirer un graphique ne retire pas l'affirmation qu'il faisait

`from: 36fecfbc` · `by: ai`

**L'idée.** Si vous retirez quelque chose parce que la donnée n'était pas fiable, la même affirmation vit probablement encore dans d'autres textes, écrite avec d'autres mots.

**Exemple.** Un graphique peu fiable a été retiré, mais une carte « principales conclusions » et un plan d'action recommandaient encore ce que le graphique disait.

**Autre exemple.** Un plan de chapitres a été renuméroté de 7 à 15. Deux listes d'un autre document pointaient encore vers « 7.4 » et « 7.7 » de l'ancien plan, qui désignaient maintenant d'autres sujets. Quand vous remplacez un plan, les anciens numéros sont eux aussi des affirmations.

**Encore un exemple.** Un projet tenait sa propre liste de leçons, et une bibliothèque avait repris ces leçons dans sa propre liste. Les deux les numérotaient de la même façon jusqu'à 44, et différemment à partir de 45. Les instructions du projet et ses agents relecteurs continuaient de citer « 46 », qui désigne dans la bibliothèque une autre leçon. Le problème n'est apparu que lorsque le propriétaire a demandé une seconde relecture.

**Question détectrice.** Quels autres textes disent la même chose que ce que je viens de retirer ? Quand deux numérotations coexistent, chaque citation dit-elle quelle liste elle utilise ?

**Signal d'alarme.** « J'ai déjà retiré le graphique. » · « Les numéros sont les mêmes. »

**Que faire.** Cherchez par sujet, pas par identifiant. Les échos n'ont pas de nom de variable. Quand deux numérotations coexistent, citez avec un préfixe qui nomme la liste (« v2 #46 », « bibliothèque #46 »), et cherchez chaque citation de la plage modifiée dans chaque fichier, pas seulement dans celui que vous avez renuméroté (voir la leçon 8).

### 37. Documenter ce qui existe, pas ce que vous aimeriez qu'il existe

`from: 928f7db8` · `by: ai`

**L'idée.** Une relecture de documentation améliore le document ; elle ne redessine pas le système. Si le système a une limite, le document la dit. Il ne la cache pas et ne promet pas de la corriger.

**Exemple.** Un manuel disait que les données se synchronisaient toutes seules. Le système ne synchronisait que lorsque l'application était ouverte. La relecture a « corrigé » le manuel en promettant que ce serait bientôt automatique, au lieu d'énoncer la limite telle qu'elle était.

**Question détectrice.** Ce que je m'apprête à écrire, décrit-il le fonctionnement actuel ou le fonctionnement souhaitable ?

**Signal d'alarme.** « Ça devrait marcher comme ça » · « ils vont le corriger ».

**Que faire.** Séparez les constats sur le document (« il est mal écrit ») des constats sur le système (« il fonctionne autrement que l'idéal »). Le second type se déclare comme une limitation.

### 38. Ce qu'on ne sait pas se marque, il ne s'invente pas

`from: dc2fde6c` · `by: ai`

**L'idée.** Un document officiel affirme tout avec la même autorité. Un détail inventé, comme un responsable, un calendrier ou un délai de réponse, se lit exactement comme un détail réel.

**Exemple.** Une procédure prévoyait un délai de réponse de 24 heures que personne n'avait convenu. Il avait été écrit parce qu'il semblait raisonnable, et une fois publié, il est devenu un engagement.

**Autre exemple.** Un message de commit expliquait pourquoi deux relectures n'avaient rien lancé : le relecteur avait tapé certaines commandes. Personne n'avait vu ces commandes ; le journal disait seulement « denied ». Le message était déjà public, et le commit suivant a dû le corriger.

**Encore un exemple.** Quelqu'un a posé une question sur un outil dont le nom ne disait rien. On l'a pris pour un outil bien connu au nom voisin, qu'on a cherché et expliqué longuement. Il parlait d'un produit nouveau portant ce nom exact ; le chercher tel quel l'aurait trouvé tout de suite.

**Variante.** Le détail peut porter sur l'état actuel d'un outil, ou sur ce qui s'est passé plus tôt. En deux jours, deux affirmations sur des outils venaient de la mémoire et étaient fausses : qu'une commande de mise à jour reconstruisait tout un index (elle ne lit que ce qui a changé), et que les mises à jour automatiques d'un plugin étaient « probablement » désactivées (la commande `doctor` du plugin disait qu'elles étaient activées). Un seul coup d'œil à chaque outil aurait suffi à répondre. Et quand les règles d'un projet ont été transférées dans un nouveau format, plusieurs de leurs exemples ont été reconstruits de mémoire et ne correspondaient pas à ce qui s'était passé ; l'un racontait une erreur qui n'a jamais eu lieu. Ils ont été corrigés en ouvrant l'ancien journal.

**Question détectrice.** Est-ce que je connais ce détail, ou est-ce que je le suppose parce qu'il semble raisonnable ? Une cause, un nom, un chiffre, ce que fait un outil, comment il est configuré : est-ce que je l'ai vu, ou est-ce ma meilleure supposition ? D'après quel relevé ai-je copié cet exemple ?

**Signal d'alarme.** « Forcément, c'est comme ça. » · « C'est sûrement pour ça. » · « Ils doivent vouloir dire… » · « C'est à peu près comme ça que ça s'est passé. »

**Que faire.** Marquez ce qui manque de façon visible, par exemple « En attente » en rouge, et demandez à qui le sait. Une formulation neutre vaut mieux qu'une formulation fausse. Dans un message de commit, une cause que personne n'a vue dans une sortie s'écrit comme une supposition (« probablement »). Un nom que vous ne reconnaissez pas se cherche exactement tel quel ; si rien ne correspond, demandez de quel nom il s'agit. Avant de dire ce que fait un outil ou comment il est configuré, lancez le contrôle le moins coûteux (son `doctor`, son `--help`, sa configuration, une recherche) et dites ce qu'il a montré, ou marquez l'affirmation comme non vérifiée (voir la leçon 29 et la leçon 52). Le « correct » d'un relecteur est aussi une supposition, sauf s'il a regardé (voir la leçon 28). Un exemple de ce qui s'est passé se copie depuis son relevé (le journal, le commit), il ne se reconstruit jamais.

**À ne pas confondre avec.** La marque est destinée à la personne qui décide, pas au lecteur final. Un « confirmation en attente » dans un texte publié est une autre donnée qui ne devrait pas s'y trouver. Si le document sort avant d'être confirmé, utilisez une formulation neutre qui n'affirme pas ce qui manque, et gardez l'élément en attente dans le rapport ou le dossier du projet.

### 39. Versionner à la vue de tous

`from: 778c3988` · `by: ai`

**L'idée.** Chaque modification porte un nouveau numéro de version sur la couverture et une ligne dans l'historique, avec la date, ce qui a changé et qui l'a modifié. Quand deux exemplaires circulent, la version est la seule chose qui dit lequel est le bon.

**Exemple.** Deux exemplaires d'un manuel circulaient par e-mail. L'ancien disait que l'outil « s'ouvre par un double-clic », ce qui n'était plus vrai, et personne ne pouvait dire lequel des deux était le bon.

**Question détectrice.** Si quelqu'un a la copie de la semaine dernière, comment sait-il qu'elle n'est plus la bonne ?

**Signal d'alarme.** « C'est une petite modification, elle n'a pas besoin de version. »

**Que faire.** Incrémentez le numéro de version et écrivez la ligne d'historique dans la même modification que celle du document.

### 42. Travailler sur la version actuelle

`from: 2618ac78` · `by: ai`

**L'idée.** Une relecture faite sur une ancienne copie fait réapparaître des erreurs déjà corrigées.

**Exemple.** Une réorganisation du manuel a été faite sur une version datant de plusieurs semaines. Elle redisait que l'outil « s'ouvre par un double-clic », ce qui n'était plus vrai.

**Question détectrice.** La version que je modifie, est-ce la plus récente ou celle que j'avais ouverte ?

**Signal d'alarme.** « J'ai cette version ouverte depuis hier. »

**Que faire.** Prenez la structure proposée par la relecture et versez-y le contenu le plus récent, et non l'inverse.

### 43. Relire du début à la fin après de nombreuses corrections

`from: b956a885` · `by: ai`

**L'idée.** Après plusieurs séries de corrections ponctuelles, un document peut se contredire lui-même. Chaque correction était vraie dans sa propre section, mais personne n'a relu les autres.

**Exemple.** Une section disait que rien n'est enregistré sans connexion. La FAQ affirmait encore que tout ce qui est capturé est conservé sur l'appareil.

**Autre exemple.** Un projet final pour un module de statistiques comportait trois parties. La deuxième acceptait comme juste « le second paiement est resté le même » avec une p-value de 0.875 ; la troisième enseignait qu'une p-value élevée ne prouve pas l'absence d'effet. Une fois cela corrigé, la même affirmation est revenue à trois autres endroits : une phrase de transition (« une fois lancé, il n'a rien changé »), un titre d'étape, et ce que disait un personnage dans une réunion simulée.

**Question détectrice.** Combien de corrections ce document a-t-il reçues depuis la dernière fois que quelqu'un l'a relu en entier ? Une phrase, titres et dialogues compris, enfreint-elle une règle que ce document enseigne ?

**Signal d'alarme.** « J'ai vérifié chaque correction à son emplacement. »

**Que faire.** À la fin de chaque série, cherchez par sujet tout ce que le document dit sur ce que vous avez corrigé. Puis listez les règles que le document enseigne, et cherchez chacune par sujet, y compris dans les parties qui n'en parlent pas : titres, transitions, exemples et dialogues.

### 51. Ce qui vous paraît évident est la première chose à enseigner

`from: c970d3ec` · `by: ai`

**L'idée.** Quelqu'un qui sait déjà ne voit pas les étapes qu'il franchit sans y penser. Son premier exemple apporte donc plusieurs notions nouvelles à la fois, et un débutant se perd dès la première ligne.

**Exemple.** Un cours de programmation pour débutants s'ouvrait sur une cellule qui introduisait six notions nouvelles à la fois, et le plan n'enseignait jamais ce qu'est un type de donnée, ni que `=` stocke et lit de droite à gauche. Le responsable du cours l'a formulé en une phrase : « vous supposez beaucoup de choses sur les apprenants ». Plus tard, trois leçons disaient « comme en faisant glisser une formule » ; aucune leçon n'avait enseigné le glisser-déposer, seulement « recopier la formule vers le bas ».

**Autre exemple.** Dans un module pour débutants, le même petit mot désignait une cellule du tableur à une étape, et le petit carré dans son coin à une autre. Les messages propres à un exercice utilisaient une référence de cellule et le nom d'un outil de capture d'écran avant que le texte ait présenté l'un ou l'autre.

**Question détectrice.** Dans mon premier exemple, combien de notions sont nouvelles pour quelqu'un qui ne sait rien ? Chaque symbole, chaque mot, chaque nom de bouton et chaque action que je demande a-t-il déjà été enseigné ? Un mot désigne-t-il deux choses ? Un message nomme-t-il quelque chose qui n'a pas encore été enseigné ?

**Signal d'alarme.** « N'importe qui comprend ça » · « ce n'est qu'une ligne » · « c'est le mot habituel » · « le message l'explique ».

**Que faire.** Avant d'écrire, listez ce que votre exemple tient pour acquis (symboles, mots, clics, choses que l'apprenant aurait déjà dû construire) et enseignez-les d'abord : une idée nouvelle à la fois, chaque symbole expliqué à sa première apparition. Cherchez chaque mot qui correspond au nom d'un bouton, et chaque action demandée, de la même façon que vous cherchez un symbole. Si c'est possible, laissez une vérification automatique comparer ce que chaque exemple utilise avec ce qui a déjà été enseigné. Lisez les messages et les indications de l'interface dans l'ordre où l'apprenant les rencontre, et cherchez chaque nom qu'ils emploient comme vous cherchez un symbole. Donnez un seul nom à chaque chose et gardez-le (voir la leçon 2).

### 52. Écrire sur un outil qui évolue vite à partir de la pratique d'aujourd'hui, pas de mémoire

`from: 15098a47` · `by: ai`

**L'idée.** Une leçon ou un guide sur un outil qui change tous les quelques mois devient périmé pendant qu'on l'écrit s'il repose sur ce que l'auteur se rappelle. Sa prémisse peut être fausse avant même que le premier lecteur la lise.

**Exemple.** Un plan de module « analyse avec l'IA » commençait par « l'IA ne peut pas voir vos données, décrivez donc votre tableau au lieu de le coller ». Le responsable du cours a fait remarquer que les agents se connectent désormais à la base de données, exécutent eux-mêmes les requêtes et renvoient le chiffre. Une recherche avec sources et dates l'a confirmé : copier du code depuis un chat était la façon de faire deux ans plus tôt. Plusieurs leçons ont été réécrites autour de ce qui tient encore : définir la question, superviser l'agent et vérifier le chiffre.

**Question détectrice.** Lesquelles des prémisses de ce texte dépendent de ce que l'outil sait faire aujourd'hui ? Quand les ai-je vérifiées pour la dernière fois, et d'après quelle source ?

**Signal d'alarme.** « C'est comme ça que ça marche » · « tout le monde fait comme ça ».

**Que faire.** Avant d'écrire sur un outil qui évolue vite, cherchez la pratique actuelle avec des sources et des dates : ce que l'outil fait maintenant, ce qui est gratuit, ce que les gens utilisent réellement. Construisez le texte autour de la compétence qui survivra à la prochaine version (cadrer, superviser, vérifier), et gardez les étapes propres à l'outil à un seul endroit, facile à mettre à jour. Signalez ce que vous n'avez pas pu vérifier, et essayez vous-même avant de publier.

### 54. « Le X au début et à la fin » : tous les traducteurs choisissent la même mauvaise lecture

`from: 96bbb4cc` · `by: ai`

**L'idée.** Un qualificatif placé devant deux éléments reliés par « et » peut s'appliquer aux deux, ou au premier seulement. L'auteur sait laquelle des deux lectures il vise ; le lecteur doit deviner, et les traducteurs devinent tous de la même façon.

**Exemple.** Une page de résultats disait « ce qui l'a changé, ce sont les leçons du début et de la clôture », en parlant de deux parties d'un outil : les leçons affichées au début, et une étape de vérification finale. Les six traductions ont lu la phrase comme une seule chose : les leçons affichées au début et à la fin. Deux jours plus tard, la même construction s'est retrouvée dans un nouveau paragraphe, et les traductions l'ont de nouveau mal lue.

**Autre exemple.** Un paragraphe désignait un type d'erreur comme « (le chemin d'erreur, le focus clavier, un fichier de données endommagé, un découpage écrit avant les exécutions) », ce qui voulait dire que le type lui-même avait été fixé avant les exécutions. Les six traductions l'ont listé comme une quatrième erreur. La question de cette leçon avait été montrée à l'auteur le jour même.

**Question détectrice.** Dans cette phrase, une construction « le X au A et B » a-t-elle deux lectures ? Traduite mot à mot, l'autre lecture ressortirait-elle ? Dans une liste, une note sur la liste se trouve-t-elle là où elle se lit comme un élément de plus ?

**Signal d'alarme.** Une liste de deux éléments dont l'un est une chose et l'autre un moment ou un lieu. Une note sur une liste, écrite à l'intérieur de celle-ci, comme son dernier élément.

**Que faire.** Rendez la coupure visible. Comptez-la (« deux morceaux : … »), donnez à chaque élément son propre article (« les leçons du début, et la clôture »), ou placez d'abord l'élément court (« la clôture, et les leçons du début »). Une note sur une liste se place hors de celle-ci, dans sa propre proposition. Relisez ensuite la traduction de cette phrase pour vérifier qu'elle porte la lecture voulue.

### 58. Une consigne faite de plusieurs morceaux se voit avant d'être assemblée

`from: 2875c4ef` · `by: ai`

**L'idée.** Quand ce que vous enseignez s'assemble à partir de plusieurs morceaux (une formule à cinq arguments, une commande avec plusieurs options), les dicter l'un après l'autre pendant qu'ils sont tapés fait perdre l'apprenant : il doit comprendre chaque morceau et l'assemblage en même temps. D'abord chaque morceau est montré en train de faire son travail dans les données, avec son nom et son sens bien visibles ; ensuite, il est assemblé.

**Exemple.** Une vidéo de tutoriel pour une formule à deux conditions dictait chaque plage et chaque condition au moment où elle était tapée. Le responsable : chaque paramètre n'était pas compris, et avec beaucoup de paramètres on se perd. Refaite avec la question énoncée en mots, chaque morceau peint dans les données avec sa couleur, le comptage fait à la main, la formule construite par morceaux avec les mêmes couleurs, et la seule nouveauté à la fin, elle a bien mieux fonctionné.

**Question détectrice.** Avant que le premier caractère soit tapé, l'apprenant a-t-il vu dans les données ce que fait chaque morceau ? Chaque morceau porte-t-il son nom et son sens bien visibles, pas seulement sa couleur ?

**Signal d'alarme.** « La voix nomme chaque argument au fur et à mesure qu'il apparaît. »

**Que faire.** D'abord la question en mots. Ensuite chaque morceau montré dans les données, une couleur par morceau, avec son nom et ce qu'il signifie à côté. Puis le résultat calculé à la main. Seulement après, la consigne, construite par parties avec les mêmes couleurs et une pause entre les parties, la nouveauté en dernier. Ce n'est pas la même chose que la leçon 51 : ici chaque morceau peut déjà être connu, ce qui échoue, c'est l'ordre.

### 64. Ancrer un concept dans ce que le lecteur a déjà vécu, pas dans la façon dont il se calcule

`from: 8ff766c9` · `by: ai`

**L'idée.** Pour présenter un concept difficile à quelqu'un qui le découvre (un apprenant, un responsable qui lit un rapport, un utilisateur qui lit une info-bulle), ancrez l'intuition dans quelque chose que la personne a déjà vécu, en utilisant les vraies données du cas. La procédure qui le calcule (une simulation, un tirage au sort, la formule) vient après, ou jamais. La procédure est exacte pour quelqu'un qui comprend déjà le concept ; un débutant la vit comme un tour de passe-passe et cesse de faire confiance au résultat.

**Exemple.** Une leçon enseignait la p-value avec un test par permutation : mélanger les étiquettes des groupes des mêmes données 300 fois et compter combien de fois l'écart apparaît. Elle utilisait aussi un test bilatéral pour une question unilatérale (« est-ce que ça vend davantage ? »). Trois relecteurs l'ont approuvée au fil de plusieurs tours : elle était correcte et bien construite. Le responsable du cours l'a refusée, parce que personne ne fait de mélanges imaginaires. La version qui a fonctionné s'ouvrait sur les vraies journées de vente (une journée aussi forte était déjà arrivée ; une aussi forte n'était jamais arrivée), ajoutait une comparaison que tout le monde a vécue (croiser votre mère est normal si elle habite à un pâté de maisons), tirait le seuil des mêmes données, et utilisait une seule queue, parce que la vraie question ne regardait que vers le haut.

**Question détectrice.** Sur quoi repose l'intuition de ce concept : sur quelque chose que le lecteur a déjà vécu, avec de vraies données, ou sur la procédure qui le calcule ? La question que pose l'exemple est-elle celle qu'une personne poserait dans la vie réelle (son sens, son ampleur, ses mots), ou celle qui arrange la méthode ?

**Signal d'alarme.** « C'est la façon la plus honnête de le calculer » · « les relecteurs disent que c'est correct » · « imaginez que vous répétez l'expérience mille fois ».

**Que faire.** Avant le script ou le texte, écrivez en une ligne l'expérience quotidienne qui a la même forme que le concept. Si aucune ne vient, demandez à quelqu'un qui connaît le public. Construisez l'ouverture à partir de cette expérience et des données du cas, et laissez la méthode comme « comment cela se calcule », à la fin. Demandez à un relecteur « sur quoi repose l'intuition ? » en plus de « est-ce correct ? ». Ce que le lecteur doit déjà savoir relève de la leçon 51.

### AI-1. Si vous restreignez l'endroit où le modèle peut écrire, il écrit là où vous le laissez

`from: abeb61b2` · `by: ai`

**L'idée.** Quand le prompt ou le code interdit un champ de sortie dans lequel le modèle a pourtant quelque chose à dire, le modèle ne reste pas silencieux : il le met dans le champ que vous avez autorisé, même si cela n'y a pas sa place. Chaque champ doit dire ce qu'il peut contenir, et que le laisser vide est acceptable (voir la leçon 38).

**Exemple.** Un assistant en direct avait trois zones : les avertissements, les faits sur le client, et la phrase à dire ensuite. Le prompt disait « pendant les 2 premières minutes, utilise seulement les avertissements », et le code supprimait tout le reste. Le modèle voulait suggérer une question et l'a mise dans la zone des avertissements (« N'en dis pas plus : demande "Qu'est-ce que vous voulez en tirer ?" »). Quand il a envoyé la phrase dans sa propre zone, le code l'a supprimée et le panneau est resté vide. La personne l'a signalé avec une capture d'écran.

**Question détectrice.** Si le modèle a quelque chose à dire et que le bon champ est interdit en ce moment, où le mettra-t-il ? Chaque champ dit-il ce qui y va et ce qui n'y va pas, et qu'il peut rester vide ? Le code supprime-t-il des choses que le prompt ne sait pas être supprimées ?

**Signal d'alarme.** « Dans cette phase, qu'il utilise seulement le champ X. »

**Que faire.** Définissez chaque champ par son contenu (« avertissements uniquement ; jamais une phrase à dire »), pas par le moment. Si une phase ne doit pas montrer quelque chose, le prompt et le code doivent dire la même chose (voir la leçon 9). Testez avec un cas où le modèle a bien quelque chose à dire dans le champ interdit.

### AI-2. Une règle écrite en liste de contrôle s'exécute comme une liste, même après que l'autre personne a répondu

`from: 23040433` · `by: ai`

**L'idée.** Si le prompt énumère ce qui doit être couvert (les points d'une ouverture, les champs d'un formulaire), le modèle les demande un par un même quand la personne les a déjà donnés autrement, et cesse de répondre à ce qu'elle vient de dire.

**Exemple.** Un assistant commercial devait couvrir quatre points d'ouverture dans la première minute ; l'un était « ce qu'ils veulent tirer de l'appel ». Le client venait de dire « je suis en comptabilité et je voulais voir ce que c'est que ce truc de données ». L'assistant a suggéré « Si ce n'est pas pour vous, dites-le-moi. Qu'est-ce que vous aimeriez tirer d'aujourd'hui ? » : il a ignoré ce que le client disait et a demandé quelque chose déjà répondu. La personne l'a remarqué (« ça ne correspond pas à ce que le client me demande en ce moment »).

**Question détectrice.** Si la personne a déjà donné ce point autrement, le prompt dit-il au modèle de le compter comme couvert ? La réponse s'appuie-t-elle sur la dernière chose que la personne a dite, ou passe-t-elle au point suivant de la liste ?

**Signal d'alarme.** « Qu'il couvre les quatre points. »

**Que faire.** À côté de chaque liste, écrivez : « un point dit autrement est déjà couvert », « ce qui manque entre comme une transition dans la réponse qui suit le fil » et « ne jamais ignorer la dernière chose qu'elle a dite ». Testez avec une vraie conversation où la personne répond à un point avant qu'on le lui demande.

### EDU-2. Ce que l'apprenant voit avant de répondre ne peut pas contenir la réponse

`from: 2ffd5c1e` · `by: ai`

**L'idée.** Une question cesse de mesurer dès que sa réponse est déjà apparue : dans une image, dans l'idée clé, dans l'explication d'un autre exercice, dans le titre d'une étape ou dans une leçon précédente. Celui qui répond juste vient peut-être de la lire.

**Exemple.** Une illustration avec le bon chiffre était placée au-dessus de l'exercice qui le demandait. Une leçon demandait ce qui se passe quand on stocke une nouvelle valeur dans une variable, dans une étape intitulée « Stocker à nouveau la remplace ». Un résumé placé sous le quiz final était lu avant d'y répondre. Une boîte de retour qui apparaît après la première tentative, même ratée, donnait la direction de la réponse.

**Autre exemple.** Un exercice demandait aux apprenants de taper une formule signe par signe, avec la formule affichée juste au-dessus de la case et le collage autorisé : il mesurait le copier-coller.

**Encore un exemple.** Dans un cours avec des interfaces dessinées, quatre composants portaient dans leur code source les chiffres qu'un exercice ultérieur demandait. La vérification automatique des réponses qui fuient ne les cherchait jamais là ; des relecteurs les ont trouvés. Dans cinq des sept étapes d'un module, la question était placée juste sous le texte qui y répondait : un titre « Double-clic : ouvrir » au-dessus de la question « qu'est-ce qui ouvre un dossier ? ».

**Question détectrice.** L'apprenant voit-il ce chiffre, cette image ou cette formulation avant de répondre, ici ou dans une leçon précédente ? Pas seulement le nombre exact : aussi une approximation (« environ 25 »), la conclusion écrite dans une légende, un titre, un « vous venez de voir que… », ou ce que montre à l'écran la mauvaise réponse la plus probable d'un exercice précédent.

**Signal d'alarme.** « C'est juste du contexte » · « ce n'est que le titre » · « c'est la légende ».

**Que faire.** Cherchez chaque réponse dans tout ce qui est montré avant sa question, y compris ce qui apparaît après une première tentative ratée, ce que le code de départ affiche à l'exécution, les fichiers téléchargeables et ce qui peut être compté dans un dessin. Rédigez en dernier le titre de l'étape et les objectifs d'apprentissage, et relisez-les à côté du résultat de chaque prédiction. Une vérification automatique trouve les chiffres exacts ; les approximations et les paraphrases ne sont repérées que par quelqu'un qui lit en ayant la réponse à l'esprit. Quand un exercice demande de taper ce qui est affiché à l'écran, bloquez le collage et dites pourquoi. Étendez la vérification à chaque fichier qui dessine l'écran de l'apprenant, code des composants compris (voir la leçon 16). Dans une étape qui explique puis demande, l'explication qui donne la réponse vient après la question, ou la question porte sur un cas que l'explication ne couvre pas.

### EDU-3. Une question à deux réponses défendables ne mesure rien

`from: 3f95b2da` · `by: ai`

**L'idée.** Si, avec ce que dit l'énoncé, une autre option peut aussi se défendre, celui qui choisit la « mauvaise » pour une bonne raison est pénalisé, et celui qui tombe juste a peut-être eu de la chance. La question mesure la phrase manquante, pas l'idée.

**Exemple.** Une question demandait quoi faire d'une remise vide « quand la vente n'avait pas de remise ». La leçon avait enseigné qu'un vide qui est un fait reste vide, donc « la laisser telle quelle » était défendable ; la réponse attendue, le remplacer par zéro, dépendait de quelque chose que l'énoncé ne disait jamais : que le but était la moyenne sur toutes les ventes. Dans une autre, « la mesure principale est la part de clients qui paient le deuxième mois » ne disait pas la part de qui, et les deux lectures donnaient des résultats tantôt égaux, tantôt différents.

**Question détectrice.** Avec ce que dit l'énoncé et ce que la leçon a enseigné, puis-je défendre une autre option ? Quel fait faudrait-il pour l'écarter, et est-il écrit ?

**Signal d'alarme.** « Ça va de soi » · « évidemment, ça veut dire… ».

**Que faire.** Pour chaque mauvaise option, écrivez une ligne qui explique pourquoi elle est fausse, en utilisant seulement l'énoncé et la leçon. Si l'exclure demande un fait qui n'est pas écrit, ajoutez-le à l'énoncé : le but du calcul, la règle du système, le dénominateur d'une proportion, ce qu'on sait des données. Dans un exercice de tri, testez chaque élément dans chaque catégorie, et pas seulement dans la sienne.

### EDU-5. Un indice pointe vers la cause de l'erreur, pas vers la réponse

`from: 2fa4365d` · `by: ai`

**L'idée.** Un indice apparaît après une mauvaise tentative. S'il donne la réponse, la ligne qui résout l'exercice, ou ce qui sépare la solution de l'erreur la plus probable, la deuxième tentative mesure la capacité à recopier.

**Exemple.** La révision de 277 exercices vérifiés d'un cours a modifié 82 indices dans 49 fichiers. Certains donnaient la ligne qui résout l'exercice (« la deuxième est la… »). D'autres imposaient l'ordre qui sépare la solution de son erreur courante. Dans les exercices « vérifier par rapport à un résultat précédent », l'indice disait « cela doit correspondre à ce que vous avez obtenu dans la leçon 2.2 » : celui qui se souvenait du nombre précédent pouvait le taper sans faire l'étape.

**Question détectrice.** Quelqu'un qui lit cet indice pourrait-il réussir la tentative suivante sans la compétence ? Nomme-t-il la réponse, la ligne de solution, les étapes que l'exercice mesure, ou le nombre précédent auquel il doit correspondre ?

**Signal d'alarme.** « Ce n'est qu'un petit coup de pouce » · « ils ont déjà essayé une fois ».

**Que faire.** Rédigez l'indice sur la cause de l'erreur probable (« les positions commencent à 0, pas à 1 »), et ne citez que ce qui a déjà été enseigné. Gardez « cela doit correspondre au nombre précédent » pour l'explication affichée après la réponse, où l'on apprend que deux méthodes qui donnent le même nombre constituent une vérification. Relisez les indices au regard de l'erreur la plus probable de l'exercice, et non isolément.
