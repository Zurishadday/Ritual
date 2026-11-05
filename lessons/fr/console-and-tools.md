# Console et outils

Ce qui s'applique quand vous lancez des commandes, des serveurs, des tests ou des captures, et quand l'outil s'interpose entre vous et le système.

### 27. Douter de l'instrument avant de douter du système

`from: 82624501` · `by: ai`

**L'idée.** Si un chiffre n'a pas changé alors qu'il aurait dû, ou a changé juste au moment où vous le regardiez, soupçonnez dans cet ordre : le cache, un autre processus qui écrit dans la même table, l'outil à travers lequel vous regardez, et seulement en dernier lieu le système lui-même.

**Exemple.** Une table « avait perdu la moitié de ses colonnes ». Quelques minutes plus tard, elle était complète : vous la regardiez pendant qu'un autre processus la reconstruisait.

**Autre exemple.** Une nouvelle image « ne se chargeait pas » sur la page. Le fichier était bon : le serveur de test ne voyait pas les dossiers créés après son démarrage. Un serveur mesuré continuait de répondre avec l'ancien code : arrêter sa tâche avait laissé vivant le processus précédent, sur le même port. Et un `git log` entre deux versions d'un plugin installé échouait avec « unknown revision » : la copie locale était superficielle, avec un seul commit, et l'historique n'existait que sur le dépôt distant.

**Encore un exemple.** Un script « calculait mal un motif de texte ». Le script était bon : la console par laquelle on lui passait le code transformait chaque `\n` en un vrai saut de ligne avant que le script ne le lise. Et dans un carnet où les cellules partagent la mémoire, une erreur qui aurait dû apparaître n'est pas apparue : la variable était encore stockée depuis une cellule précédente.

**Un quatrième exemple.** Juste après le déploiement d'une page sur un serveur de préproduction, une vérification automatique a signalé 528 px de débordement horizontal et des avertissements d'accessibilité ; quelques secondes plus tard, tout passait. Le site renvoyait encore la feuille de style précédente. Cela s'est produit deux fois avant que la vérification n'attende le nouveau fichier.

**Question détectrice.** Est-ce que je regarde le système, ou un cache, une copie, ou un outil qui a gardé un ancien instantané de celui-ci ou l'a modifié en cours de route ?

**Signal d'alarme.** « Je l'ai déjà corrigé et c'est toujours pareil » · « cette fois, je l'ai vraiment bien tapé » · « je viens de déployer, je peux vérifier maintenant ».

**Que faire.** Prenez un second instantané quelques minutes plus tard avant de déclarer un désastre. Si un instrument vous a déjà trompé de la même façon, remplacez-le au lieu de continuer à le surveiller : un raté qui se répète n'est pas de la malchance, c'est le mauvais outil. Une console qui transforme `\n` ou `\\` en cours de route ne convient pas pour lui passer du code : le code va dans un fichier, écrit avec un outil qui n'y touche pas, et s'exécute depuis là. Et tout ce qui est mécanique (une commande qui a déjà échoué trois fois) se bloque par un garde-fou, il ne se retient pas de mémoire. Avant de mesurer un serveur, vérifiez quel processus occupe son port. Avant de lire l'historique d'une copie, vérifiez si elle est superficielle (`git rev-parse --is-shallow-repository`), et si c'est le cas, interrogez le dépôt distant. Après un déploiement, attendez que le site renvoie un marqueur que cette seule version possède (une classe, un texte, un paramètre `?v=`), dans une boucle avec un nombre maximal de tentatives, avant de mesurer.

### 29. Vérifier la commande avant de la transmettre à quelqu'un d'autre

`from: 730b276c` · `by: ai`

**L'idée.** Celui qui exécute la commande de quelqu'un d'autre le fait à l'aveugle. Chaque commande cassée entame la confiance qu'il aurait accordée à la suivante.

**Exemple.** Une commande de déploiement contenait un nom de branche tapé de mémoire. La branche avait un autre nom, et celui qui l'a lancée a perdu une demi-heure avant de demander.

**Autre exemple.** Pour voir une modification, une personne a reçu `cd folder && npx next dev -p 3001`. Son terminal était Windows PowerShell 5.1, qui refuse `&&`. Corrigée et lancée depuis son propre terminal, le serveur a répondu « not found » : les pages à examiner ne s'affichent qu'avec une variable d'environnement que la commande ne définissait pas.

**Question détectrice.** Pour chaque nom de cette commande, l'ai-je lu aujourd'hui dans le système, ou l'ai-je tapé de mémoire ? Dans quel shell et dans quel dossier vont-ils l'exécuter, et l'ai-je exécutée ainsi ?

**Signal d'alarme.** « C'est la même commande que d'habitude. » · `&&`, `export` ou `$VAR` dans une commande destinée à Windows PowerShell 5.1.

**Que faire.** Exécutez-la vous-même avant de la transmettre, et recopiez chaque nom (script, chemin, branche) depuis le système, pas depuis la mémoire. Écrivez-la dans leur shell (dans PowerShell 5.1 : `;` et `$env:NAME = 'value'`), et avant de transmettre un lien, demandez cette adresse exacte et vérifiez la réponse attendue. Si vous la lancez pour eux, lancez-la dans leur propre terminal, pas comme enfant de votre appel d'outil (voir la leçon 69).

### 44. Ce que vous retirez de la sortie peut être le verdict

`from: c24ec5bb` · `by: ai`

**L'idée.** Ne regarder que les dernières lignes d'un résultat, ou le faire passer par une autre commande, peut jeter justement la partie qui disait « échec ». Une sortie tronquée d'un test raté ressemble exactement à celle d'un test réussi.

**Exemple.** Une page a été marquée comme relue parce que son test « s'était terminé sans erreur ». Le résultat est passé par une commande qui n'affichait que la fin, et l'avis disant que le test avait échoué s'est perdu en chemin.

**Autre exemple.** Une suite de tests relançait automatiquement chaque test en échec. Les tests réussis au second essai ne comptaient pas comme échecs, seulement comme « instables », et la cause restait cachée : chaque changement d'étape demandait à nouveau la page au serveur. Sans relance, l'échec apparaissait et pouvait être mesuré. Dans une autre suite, un test a échoué une fois et a réussi en étant relancé : la relance a écrasé la trace du premier échec, et sa cause a été perdue. Et une suite s'est terminée avec le code de sortie 0 et sans aucun décompte de réussites ni d'échecs : sa sortie complète avait été enregistrée dans le dossier que l'outil de tests vide à son démarrage, si bien que l'outil qui écrit le verdict l'avait effacée.

**Encore un exemple.** `npm test 2>&1 | tail -4 && git commit …` : un script n'a pas pu se charger, le test s'est terminé avec une erreur, et le commit est passé quand même, parce que le `&&` regardait le code de sortie de `tail`, qui vaut toujours zéro. Dans un autre cas, `Select-Object -First 1` a coupé un script dès qu'il avait sa première ligne : il n'a jamais atteint son propre nettoyage, et une copie modifiée d'un fichier est restée en place.

**Question détectrice.** Est-ce que je lis le verdict (combien ont réussi, combien ont échoué, comment cela s'est terminé), ou seulement un morceau de la sortie ? Et qu'est-ce qui décide de l'étape suivante : le code de sortie du test, ou celui de la commande qui tronque ?

**Signal d'alarme.** « Aucune erreur n'est apparue à l'écran » · « les dernières lignes suffisent » · « je l'enchaîne pour que ce ne soit qu'une seule commande ».

**Que faire.** Trouvez la ligne du verdict avant de changer un statut. Si vous enchaînez des commandes, assurez-vous que l'échec de la première parvient jusqu'à la fin. Si la sortie n'a pas de verdict, cela signifie « je ne sais pas », pas « c'est passé » (voir la leçon 1). Et enregistrez la sortie complète dans un fichier et cherchez le verdict là : ainsi, vous n'avez pas à décider à l'avance combien lire. Dans un shell, `set -o pipefail` fait échouer un tube lorsque le test échoue ; n'interrompez jamais un script qui nettoie après lui-même. Gardez le fichier de la sortie complète hors de tout dossier que l'outil vide au démarrage. Avant de relancer un test échoué, copiez la trace et la capture d'écran du premier échec vers un endroit que la relance suivante ne touche pas.

### 53. Le code passe par l'éditeur, pas par le traitement de texte du shell

`from: 34503dce` · `by: ai`

**L'idée.** Réécrire un fichier source avec les outils de chaînes du shell (le lire, remplacer, le réécrire) fait passer le code par des règles conçues pour autre chose : un encodage par défaut, la priorité des opérateurs, le guillemetage et l'échappement. La modification semble juste dans la commande, et le fichier qui en sort est différent de ce que la commande semble dire.

**Exemple.** Deux modifications dans une même session, toutes deux dans Windows PowerShell 5.1. Une lecture-remplacement-écriture d'un script (`Get-Content`, `-replace`, `Set-Content -Encoding utf8`) a lu le fichier dans la page de codes ANSI du système et l'a réécrit en UTF-8 : chaque ✓ et · est devenu `âœ“` et `Â·`, et son auto-contrôle a affiché la marque déformée. Puis une liste de remplacements écrite comme ``@('old', 'new' + "`n" + 'more')`` a perdu des lignes : dans PowerShell, la virgule lie plus fort que `+`, donc chaque paire est devenue quatre éléments, et seul le premier morceau du nouveau texte a été écrit.

**Question détectrice.** Cette modification de code passe-t-elle par l'éditeur, ou par la lecture, le remplacement et l'écriture du shell, avec ses règles d'encodage, de priorité et de guillemets ?

**Signal d'alarme.** « C'est un simple remplacement, je le fais en une seule commande » · « plusieurs remplacements d'un coup, c'est plus rapide ».

**Que faire.** Modifiez le code avec les outils d'édition et d'écriture de l'éditeur. Quand une modification doit être scriptée, écrivez le script dans un fichier et lancez-le avec un interpréteur qui lit et écrit en UTF-8 et dont les littéraux de chaînes sont simples (`node fix.mjs`, `python -I fix.py`). Puis regardez le diff : une modification qui a touché plus de lignes que prévu, ou des caractères que vous n'aviez pas touchés, vient du shell.

### 60. Ce qui passe en argument d'un processus a un plafond qu'on ne voit qu'en grandissant

`from: c0be3e59` · `by: ai`

**L'idée.** Une bibliothèque qui lance un autre programme peut lui transmettre votre texte sous forme d'arguments de ligne de commande. Le système d'exploitation plafonne cette ligne (sous Windows, environ 32 000 caractères), et l'erreur que vous obtenez en dépassant ce plafond ne le dit presque jamais.

**Exemple.** Un serveur appelait un modèle de langage à travers une bibliothèque qui lance un outil en ligne de commande et lui transmet un long texte de configuration sous forme d'option. Avec de courts textes, cela marchait. Le texte de configuration d'un rôle incluait un fichier de règles de plusieurs pages : sous Windows, cela échouait avec « le nom de fichier ou l'extension est trop long », et la bibliothèque l'a signalé comme « outil introuvable ». Cela a été corrigé en passant ce texte par un fichier temporaire.

**Question détectrice.** Ce texte qui grandit avec le contenu (un texte de configuration, une liste, une requête) : comment atteint-il l'autre processus — ligne de commande, variable d'environnement, URL ? Que se passe-t-il s'il est dix fois plus long ?

**Signal d'alarme.** « Ça marchait déjà avec l'exemple court. »

**Que faire.** Tout ce qui peut grandir voyage dans un fichier, par l'entrée standard ou dans le corps d'une requête, jamais en arguments, en variables d'environnement ni dans l'URL. Testez une fois avec le plus long texte que vous attendez, sur le système le plus strict où il tournera.

### 62. Arrêter un travail en arrière-plan, c'est arrêter ce qui le lance, puis prouver qu'il ne reste rien

`from: 9276f71e` · `by: ai`

**L'idée.** Un travail de fond a généralement un lanceur (un script qui enchaîne les étapes une à une) et des processus enfants (chaque étape). Si vous ne tuez que l'enfant, le lanceur passe à l'étape suivante ; le GPU, le disque ou le réseau restent occupés pendant que vous annoncez « c'est arrêté ».

**Exemple.** Un utilisateur a demandé d'arrêter un entraînement de modèle qui tournait pendant la nuit. L'agent qui l'avait lancé a été arrêté, puis le processus Python qui entraînait le modèle. Une vérification a trouvé un autre processus Python en train de s'entraîner sous un nouveau PID : le script lanceur était passé à l'étape suivante. Il a fallu trouver tout l'arbre des processus, fermer le lanceur et un `tail -f` qui suivait encore le journal, puis confirmer avec `nvidia-smi` ce qui utilisait encore le GPU.

**Question détectrice.** Qui a lancé ce processus, et le relancera-t-il si je le ferme ? Après l'avoir arrêté, quelle commande prouve que rien de ce qui est à moi ne tourne encore ?

**Signal d'alarme.** « J'ai tué le processus, il est arrêté. »

**Que faire.** Fermez tout l'arbre depuis le lanceur (`taskkill /t /f` sous Windows, tuez le groupe de processus sous Unix). Puis cherchez dans les processus en cours, par ligne de commande, ce qui reste de ce travail, et vérifiez la ressource (GPU, port, verrou de fichier) jusqu'à ce qu'elle soit libre ; ne dites « arrêté » qu'après cette vérification (voir la leçon 38). Par conception, donnez au travail un arrêt propre (un fichier `STOP` qu'il vérifie avant chaque étape), et faites en sorte que le lanceur s'arrête quand une étape est tuée au lieu de passer à la suivante.

### 69. Un processus lancé depuis un outil de courte durée meurt quand l'outil se termine

`from: 7870a42f` · `by: ai`

**L'idée.** Un serveur ou un programme de longue durée lancé depuis une commande qui se termine (l'outil de commande d'un assistant, une étape de CI, une session distante) devient en général l'enfant de cette commande. Quand la commande se termine, l'outil ou le lanceur ferme en général tout ce qu'il a démarré (son groupe de processus, son job, sa session). Vous l'avez vu démarrer et répondre ; une minute plus tard, il a disparu, et rien ne vous le signale.

**Exemple.** L'application locale d'une personne tournait encore sur une ancienne version. Pour lui donner la nouvelle, le script de démarrage de l'application a été relancé depuis l'outil de commande de l'assistant, le serveur a été vu en train de répondre sur son port, et la personne a été prévenue : « c'est maintenant sur la nouvelle version ». La commande s'est terminée, le système a fermé les processus qu'elle avait ouverts, et la personne n'avait plus d'application du tout. Le problème n'est apparu qu'une demi-heure plus tard, quand un agent a constaté que plus rien n'écoutait sur les ports.

**Question détectrice.** De quel parent est enfant ce que je viens de lancer, et reste-t-il vivant quand ce parent se termine ? L'ai-je vérifié après la fin de l'outil, ou seulement pendant qu'il tournait ?

**Signal d'alarme.** « Je l'ai relancé, il répond sur le port. »

**Que faire.** Ce qu'une personne utilise chaque jour, elle le démarre elle-même, avec son propre raccourci ou son propre service. Si vous devez le lancer, détachez-le de son parent (un mode d'arrière-plan qui survit à la commande, un service système), et vérifiez dans un appel séparé, ensuite, qu'il est toujours vivant. Si vous ne pouvez pas le garantir, ne dites pas que c'est fait : demandez à la personne de l'ouvrir. Arrêter ce genre de travail relève de la leçon 62 ; le lancer deux fois, de la leçon 22.

### 78. Ce que le shell trouve, un programme peut ne pas le trouver

`from: 8b07c6d7` · `by: ai`

**L'idée.** Un nom de commande qui fonctionne dans le shell peut échouer quand un programme le lance : le shell résout des raccourcis (fichiers batch, alias, fonctions) qu'un appel système direct ne connaît pas. Alors, c'est un autre programme portant le même nom qui s'exécute, ou aucun.

**Exemple.** Un script Node appelait `python` pour générer de l'audio. Dans le shell, `python` était un shim de gestionnaire de versions (un fichier `.bat`) ; depuis Node, sans shell, le système d'exploitation ouvrait un alias du magasin d'applications qui affiche seulement « Python was not found ».

**Question détectrice.** Le programme que je lance depuis du code : est-il résolu par le shell (un shim, un fichier batch, un alias), ou est-ce un vrai exécutable ? L'ai-je essayé lancé depuis le code, et non depuis le shell ?

**Signal d'alarme.** « Mais ça marche dans le terminal. »

**Que faire.** Exécutez l'étape une fois avec le même programme que celui qui la lancera. Si la commande est un shim, lancez-la à travers le shell (en Node, `shell: true` sous Windows, avec des arguments sans espaces ni guillemets) ou par son chemin complet, et faites en sorte que l'erreur indique quelle commande n'a pas été trouvée. Une autre machine relève de la leçon 55 ; la configuration d'un autre script, de la leçon 66.

### 79. Un générateur qui ne retrouve pas ce qu'il a déjà fait refait tout

`from: ae59e617` · `by: ai`

**L'idée.** Un processus qui saute le travail déjà terminé (grâce à une empreinte de chaque partie, à un cache ou à un dossier de travail) n'est peu coûteux que sur la machine ou la copie de travail où vit cet état. Lancé ailleurs, il ne voit rien de fait et recommence depuis le début : un travail coûteux, une nouvelle fois, que personne n'a demandé.

**Exemple.** La narration audio d'une leçon avait été enregistrée étape par étape avec un modèle de voix lent (sans mesure de temps), et le générateur sautait les étapes inchangées grâce à son dossier de travail, qui n'est pas dans git. Un agent, pour régénérer une seule étape, l'a lancé dans une autre copie du dépôt qui ne possédait pas ce dossier : il s'est mis à enregistrer toute la leçon sur le GPU partagé. Il a fallu l'arrêter à la main.

**Question détectrice.** Où vit l'état qui permet de sauter ce travail déjà fait ? Existe-t-il dans le dossier et sur la machine où je m'apprête à le lancer ? Si ce n'est pas le cas, le processus s'arrête-t-il, ou refait-il tout en silence ?

**Signal d'alarme.** « Une seule étape a changé » dans une copie fraîche · un dossier de travail dans .gitignore · un agent à qui l'on demande de « lancer le générateur » sans lui dire où se trouve son cache.

**Que faire.** Faites en sorte que le générateur refuse de repartir de zéro quand un résultat existe déjà et que son état manque, et qu'il indique où le lancer (avec une option explicite, comme `--all`, pour qui veut vraiment tout reconstruire). Dans les consignes données aux agents, nommez le dossier où le lancer. Un état manquant lu comme « rien n'a été fait » est le « je n'ai pas pu le lire » de la leçon 1, sous une autre forme.

### 82. Un outil qui vide son dossier au démarrage emporte ce que d'autres y ont enregistré

`from: b6b0c760` · `by: ai`

**L'idée.** Beaucoup d'outils vident leur dossier de sortie à chaque démarrage, pour que les exécutions ne se mélangent pas. Si d'autres processus y enregistrent leurs propres fichiers parce que c'est « le dossier des résultats », la prochaine exécution les supprime sans prévenir, et personne ne s'en aperçoit avant de chercher le fichier.

**Exemple.** Un exécuteur de tests de navigateur vidait son dossier de résultats à chaque démarrage. Des agents de relecture y enregistraient leurs rapports, et un script y enregistrait des fichiers d'étapes par leçon. En une journée, deux longs rapports ont été perdus, dont un demandé par le responsable du projet, et un relecteur a signalé que l'un de ces fichiers d'étapes n'existait pas, parce qu'une exécution de tests l'avait supprimé quelques minutes plus tôt. Ils ont été récupérés dans les transcriptions des agents.

**Question détectrice.** Quel outil écrit dans ce dossier, et l'un d'eux le vide-t-il au démarrage ou à la fin ? Ce que j'enregistre ici survit-il à la prochaine exécution de cet outil ? L'ai-je vérifié avec un fichier de test ?

**Signal d'alarme.** « Je le laisse dans le dossier des résultats » · « le fichier n'existe pas » pour quelque chose écrit quelques minutes plus tôt · un seul dossier ignoré qui contient à la fois des artefacts jetables et des livrables.

**Que faire.** Donnez à chaque outil qui vide son dossier son propre sous-dossier (avec Playwright, `outputDir`) et gardez les livrables en dehors, ou dans un endroit versionné. Vérifiez-le : déposez un fichier de test, lancez l'outil, et constatez qu'il est toujours là. La sortie complète d'un test conservée dans ce dossier relève du cas de la leçon 44 ; modifier un fichier qu'un générateur écrit, de la leçon 48.
