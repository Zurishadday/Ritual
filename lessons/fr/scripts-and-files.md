# Scripts et fichiers

Ce qui s'applique quand un programme écrit, génère, transforme ou déplace des fichiers et des données.

### 6. La définition métier vit à un seul endroit

`from: 4a309d46` · `by: ai`

**L'idée.** Si la règle qui définit « ce qui compte comme actif » est répétée dans chaque requête, les copies finiront par diverger. Ce n'est pas une question de si, mais de quand.

**Exemple.** Un validateur avait le nombre d'éléments de référence saisi à la main : 43. Quand le document est passé à 47, il a rejeté les quatre nouveaux comme inexistants. Maintenant, il compte les éléments du document lui-même.

**Autre exemple.** Un simulateur d'entraînement à des conversations avec des clients classait secrètement un client sur trois comme « hors cible », avec une liste de raisons écrite dans son code ; un évaluateur notait ensuite la personne qui s'entraînait d'après le manuel de vente. Une des raisons du code n'était pas dans la règle du manuel. Le client simulé refusait d'acheter pour cette raison, et l'évaluateur reprochait à la personne de ne pas avoir écarté ce client. Le verdict mesurait l'écart entre deux copies de la règle, et la personne a conclu que le simulateur était fait pour que personne ne puisse vendre.

**Question détectrice.** Si je modifie cette définition, combien de fichiers dois-je toucher ? Si c'est plus d'un, la règle n'est pas configurée à un seul endroit. Le code qui construit un cas et le code qui le juge lisent-ils la règle au même endroit ?

**Signal d'alarme.** « Je le mets aussi ici, ce n'est qu'une ligne » · « ce nombre ne changera pas » · « cette liste sert seulement à générer des cas ».

**Que faire.** Placez la définition en un point que toutes les requêtes traversent, et faites-les toutes lire à partir de là. Un nombre saisi à la main qui recopie une valeur provenant d'ailleurs est aussi une définition répétée. Un générateur de cas et son juge lisent le même fichier de règles, et un test échoue si le générateur produit une condition que ce fichier ne connaît pas. Avant de blâmer celui qui a été jugé, vérifiez le cas par rapport à la règle officielle.

**À ne pas confondre avec.** Répéter une explication volontairement, dans un support pédagogique, n'est pas copier une définition. Ce qu'il ne faut pas copier, c'est la règle qui calcule la valeur.

### 7. Lire ce qui a été publié, pas l'intention

`from: d542c959` · `by: ai`

**L'idée.** Un processus déclare ce qu'il prévoit de faire, mais publie ce qu'il a réellement fait, et les deux ne concordent pas toujours. Celui qui consomme le résultat doit lire le résultat.

**Exemple.** Un écran construisait ses contrôles à partir de la liste des variables que le modèle *allait* utiliser. L'entraînement en a écarté une, et pendant des jours un contrôle ne faisait rien.

**Question détectrice.** Ceci est-il construit à partir de la configuration d'un processus ou de son résultat publié ?

**Signal d'alarme.** « La liste déclarée et le modèle, c'est la même chose. »

**Que faire.** Dérivez-le du résultat publié. Et ce qui ne peut pas être dérivé doit échouer bruyamment au lieu de disparaître discrètement.

### 20. Idempotent ne veut pas dire modifiable

`from: 8ddac922` · `by: ai`

**L'idée.** « Insérer s'il n'existe pas » empêche les doublons, mais fige les choses : ce qui est déjà là n'est jamais réécrit.

**Exemple.** Une légende avec les plages d'une classification avait été insérée une fois. Les plages ont changé, et la légende continuait d'afficher les anciennes.

**Question détectrice.** Si je modifie ce que ce code injecte, la prochaine exécution le mettra-t-elle à jour ?

**Signal d'alarme.** « C'est déjà là, je n'y touche plus. »

**Que faire.** Remplacez-le : supprimez l'ancien, réinjectez-le et vérifiez qu'il ne reste qu'un seul exemplaire.

### 21. Votre marqueur doit vous appartenir

`from: b201fbb7` · `by: ai`

**L'idée.** Si vous repérez votre modification en cherchant un texte que l'utilisateur lit, comme un titre ou une étiquette, une autre amélioration se collera par-dessus et votre modification ne la retrouvera plus.

**Exemple.** Une icône d'aide avait été ajoutée à côté de plusieurs titres, et les mises à jour qui se repéraient par ces titres ont cessé de fonctionner.

**Autre exemple.** Une relecture cherchait le texte « int( » pour vérifier qu'on avait converti un nombre, et il correspondait à l'intérieur de « print( » : toute ligne qui affichait quelque chose semblait passer. Un décompte de raccourcis clavier cherchait « Ctrl+ » suivi d'une lettre, sans tenir compte de la casse, et comptait Ctrl+Shift+V comme « Ctrl+S » : le S était la première lettre de « Shift ». Ce que vous cherchez doit être un mot entier, pas un morceau d'un autre mot.

**Encore un exemple.** Une relecture prenait la dernière ligne imprimée par le code comme réponse. Avec une fonction qui affiche le nombre à l'intérieur sans le renvoyer, cette ligne existait pour une autre raison : la réponse apparaissait à l'écran, alors que le code ne la livrait jamais.

**Question détectrice.** Le texte que j'utilise comme ancre peut-il exister pour une autre raison, ou quelque chose peut-il grandir à l'intérieur ?

**Signal d'alarme.** « Je m'ancre sur le titre, il est unique. »

**Que faire.** Utilisez des marqueurs à vous, comme un identifiant ou un commentaire de section. Et quand une modification touche plusieurs blocs à la fois, vérifiez-les tous, pas seulement le premier. Un décompte qui vient d'une recherche se vérifie dans ses correspondances, pas seulement dans son total : ouvrez-en trois.

### 22. La deuxième exécution est celle qui trouve le bogue

`from: 8a1c8a92` · `by: ai`

**L'idée.** Une modification qui se répète sans rien casser doit être vérifiée en l'exécutant deux fois, et non une seule.

**Exemple.** Pour vérifier qu'un script ne changeait rien à sa deuxième exécution, la somme de contrôle d'une même exécution a été comparée à elle-même, puis deux sommes prises à partir de listes de fichiers différentes. Les deux comparaisons disaient « identique » ou « différent » sans rien prouver. La comparaison qui fonctionne prend la somme, exécute le script et reprend la somme, à partir des mêmes fichiers et dans une seule commande.

**Autre exemple.** Un lanceur à double-clic démarrait deux serveurs locaux sur des ports fixes et ouvrait le navigateur. Il avait été testé une fois, tout étant fermé, et il marchait. On l'a relancé pour obtenir une nouvelle version alors que l'ancienne tournait encore : les deux nouveaux serveurs ont échoué avec « port already in use », et le navigateur est resté sur l'ancienne version sans que rien ne le signale (voir la leçon 27). Ici, la seconde exécution est entrée en collision avec des processus et des ports, et non avec des fichiers.

**Question détectrice.** Ai-je exécuté ma modification sur quelque chose qui l'avait déjà appliquée ? Quel autre processus touche ce même texte après moi ? Que se passe-t-il si je le relance alors que la première exécution tourne encore ?

**Signal d'alarme.** « Ça a bien tourné, donc c'est fini. »

**Que faire.** Exécutez-le deux fois à partir du même point de départ et comparez les fichiers : la deuxième exécution ne doit rien modifier. Testez un lanceur en le relançant sans fermer l'exécution précédente. Avant de démarrer quoi que ce soit, le lanceur n'arrête que ses propres processus (repérés par leur nom de processus ou le titre de leur fenêtre, jamais par « ce qui occupe le port »), et avertit si un autre programme occupe le port.

### 23. Les adresses fondées sur la position expirent

`from: 9c3d3e62` · `by: ai`

**L'idée.** Si vous insérez quelque chose avant « la cellule 9 », la cellule 9 est maintenant une autre cellule.

**Exemple.** Un script a inséré une cellule de titre avant la cellule 9 d'un carnet, puis a modifié « la cellule 9 » : il a modifié la cellule qu'il venait d'insérer.

**Autre exemple.** Un repère qui pointe vers quelque chose de dessiné (une case, une flèche, une surbrillance) est aussi une adresse fondée sur la position. Une vidéo construite avec du code a redessiné une cellule de code avec un nouveau design, plus large. La case autour du résultat avait `x = 150` tapé à la main, depuis l'ancienne cellule, et s'est retrouvée à cheval sur deux colonnes du tableau de résultats. Celui qui a regardé la vidéo entière l'a vu ; le relecteur des images fixes était passé à côté.

**Question détectrice.** Cet outil repère-t-il les éléments par leur position, et viens-je d'insérer ou de supprimer quelque chose avant ? Un repère vient-il de ce qu'il marque, ou de coordonnées tapées à la main ?

**Signal d'alarme.** « La cellule 9, c'est celle que je viens de regarder. » · « Seul le style a changé, les repères sont les mêmes. »

**Que faire.** Repérez à nouveau l'emplacement après chaque insertion, et vérifiez le résultat en relisant la structure complète. Faites renvoyer par une seule fonction la case de chaque élément dessiné, et demandez-lui chaque repère. Après un redessin, cherchez dans le code les numéros de position qui traînent.

### 24. Écrire avec un filet de sécurité

`from: f7402634` · `by: ai`

**L'idée.** Ouvrir un fichier en écriture le vide instantanément. Si quelque chose échoue en plein milieu de l'écriture, vous vous retrouvez avec un fichier vide.

**Exemple.** Un script a ouvert le fichier de configuration pour le réécrire, a échoué en calculant une des valeurs, et a laissé le fichier vide. Le serveur n'a jamais redémarré.

**Question détectrice.** Quelque chose peut-il échouer entre l'ouverture du fichier et la fin de l'écriture ?

**Signal d'alarme.** « C'est un simple remplacement, je l'écris directement. »

**Que faire.** Préparez tout en mémoire, écrivez dans un fichier temporaire et, à la fin, remplacez l'original en une seule étape.

### 25. Un réglage n'est pas un statut, et une alerte n'est pas une garantie

`from: c5f24f3e` · `by: ai`

**L'idée.** « La tâche planifiée est activée » ne veut pas dire « elle a tourné ce mois-ci ». Et attendre qu'une alerte vous prévienne en cas d'échec revient à faire confiance à l'alerte pour ne jamais échouer.

**Exemple.** Une tâche planifiée apparaissait comme « active » mais n'avait pas tourné depuis deux mois, à cause d'un identifiant expiré. Le tableau de bord affichait le dernier point de données comme s'il datait d'aujourd'hui.

**Question détectrice.** Est-ce que je compte sur quelque chose qui « se déclenche tout seul » ?

**Signal d'alarme.** « C'est planifié, donc ça tourne. »

**Que faire.** Affichez à l'écran la date de la dernière mise à jour des données. Vérifiez quelles périodes manquent. Et faites en sorte que les processus puissent être relancés sans dupliquer les lignes.

### 48. Si un fichier vient d'un générateur, la correction va dans le générateur

`from: 17fcef8c` · `by: ai`

**L'idée.** Quand un fichier est assemblé par un script ou à partir d'autres pièces, le fichier est une sortie, pas l'original. Tout ce qui est corrigé directement dedans est perdu à la prochaine génération, sans aucun avertissement.

**Exemple.** Une note était assemblée à partir des sections remises par chacun. Trois lignes avaient été corrigées directement dans la note, et quand elle a été reconstruite à partir des contributions, les trois anciennes lignes sont revenues. Dans une autre pièce, un relecteur avait corrigé à la main le texte alternatif d'une page issue d'un modèle ; son auteur a régénéré la page, et la correction a disparu.

**Question détectrice.** Ce fichier est-il écrit par autre chose (un script, un modèle, un assemblage de pièces) ? Si je le régénère, ma modification sera-t-elle toujours là ?

**Signal d'alarme.** « Je l'ai corrigé directement dans le fichier » · « je viens de le régénérer ».

**Que faire.** Avant de corriger un fichier, découvrez d'où il vient. Corrigez la source (le modèle, le script, la contribution) et régénérez ; si vous devez corriger la sortie, corrigez aussi la source dans la même étape. Celui qui relit une sortie générée dit ce qui a changé pour que ce soit reporté dans la source. Et avant de reconstruire un fichier à partir de ses sources, comparez-le avec ce qui va en sortir : tout ce qui diffère est une correction qui serait perdue.

### 56. Une mise à jour incrémentale n'est pas une reconstruction : lisez ce qu'elle supprime

`from: 9ffb2735` · `by: ai`

**L'idée.** Une mise à jour qui ne traite que ce qui a changé ne donne pas le même résultat qu'une reconstruction complète. Quand elle remplace tout ce qui vient d'un fichier relu, elle supprime aussi ce que d'autres fichiers avaient apporté aux mêmes entrées. Avant d'accepter qu'une chose disparaisse, listez ce qui est perdu et d'où cela venait.

**Exemple.** Un graphe de connaissances d'un dépôt a été mis à jour avec seulement les fichiers modifiés. Un garde-fou contre la réduction l'a arrêté deux fois. D'abord, des nœuds qui ne partageaient qu'une étiquette ont été fusionnés en un seul (voir la leçon 2). Ensuite, le remplacement des nœuds d'un fichier relu a aussi supprimé les nœuds vers lesquels pointaient d'autres fichiers : dix entrées qui auraient dû afficher leur propre titre affichaient à la place l'étiquette générique d'un ancien nœud.

**Question détectrice.** Qu'est-ce qui existait avant et n'existe plus, et de quel fichier venait chaque chose perdue ?

**Signal d'alarme.** « C'est la même exécution, seulement avec les nouveaux fichiers. »

**Que faire.** Comparez avant et après par identifiant, et gardez la liste de ce qui a été perdu avec son fichier source. Forcez l'écriture seulement si chaque perte est expliquée par une modification de son propre fichier source, et corrigez le script qui fusionne, pas la sortie. Une reconstruction complète passe par la même comparaison (voir la leçon 48).

### 61. Une fonction d'aide qui devine l'intention d'après la forme de ses arguments

`from: 4248a8c5` · `by: ai`

**L'idée.** Une fonction qui décide quoi faire selon qu'un argument a été passé (avec un corps elle fait un POST, sans corps un GET ; avec un identifiant elle met à jour, sans elle insère) transforme un oubli en une opération différente, sans aucune erreur.

**Exemple.** Une fonction d'aide côté interface, pour appeler le serveur, envoyait POST quand elle recevait des données et GET quand elle n'en recevait pas. Un nouveau point d'accès était en POST mais n'avait besoin d'aucune donnée ; il a été appelé sans rien, est parti en GET, et le serveur a répondu « méthode non autorisée ». L'écran n'affichait qu'une courte ligne d'erreur, et le problème n'a été remarqué qu'en testant dans le navigateur.

**Question détectrice.** Cette fonction change-t-elle d'opération selon un argument facultatif ? Si je le laisse de côté parce que je n'en ai pas besoin, fait-elle silencieusement autre chose ?

**Signal d'alarme.** « Celui-ci ne prend pas de données, je l'appelle sans rien. »

**Que faire.** Rendez l'opération explicite (`api.post(path)`, `save(x, create=True)`), ou faites que la valeur par défaut soit le cas sûr. Tant que la fonction ambiguë existe, relisez chaque appel qui omet cet argument.

### 63. Avant de nettoyer en masse ce que personne n'a sauvegardé, sauvegardez-le tel quel

`from: 8f7e7662` · `by: ai`

**L'idée.** Les fichiers fraîchement générés (données, rapports, sortie d'un agent) ne sont souvent pas encore sous contrôle de version. Si l'étape suivante les réécrit en masse (dédoublonner, réétiqueter, retirer des lignes) et supprime trop, il n'existe aucun moyen de revenir à l'original. La leçon 24 protège une écriture qui échoue en plein milieu ; celle-ci protège contre un nettoyage qui réussit et qui est faux.

**Exemple.** Sept agents ont écrit 3,780 phrases d'entraînement dans de nouveaux fichiers. L'étape suivante devait les nettoyer : retirer celles trop proches de l'ensemble de test, et les doublons entre fichiers. Les fichiers n'étaient pas encore dans git. Avant que la réécriture ne s'exécute, le système de permissions l'a bloquée comme irréversible, et il avait raison. Les 3,780 phrases ont d'abord été enregistrées dans un commit, et le nettoyage (73 lignes retirées, 1 réétiquetée) a été mis dans son propre commit, que l'on peut relire et annuler.

**Question détectrice.** Ce que je m'apprête à réécrire est-il sauvegardé dans son état actuel ? Si mon nettoyage retire trop, d'où le récupère-t-on ?

**Signal d'alarme.** « Ce sont des fichiers neufs, je les nettoie d'un seul coup. »

**Que faire.** D'abord un commit (ou une copie) de l'état original. Puis le nettoyage dans son propre commit, avec le compte de ce qui a été retiré et pourquoi (voir la leçon 56), pour que la modification puisse être relue ligne par ligne et annulée.

### 66. Un nouveau script hérite de la configuration que le projet utilise déjà

`from: 6a79105c` · `by: ai`

**L'idée.** Si le projet charge déjà une bibliothèque dans un autre script avec une configuration particulière (chemins de bibliothèques natives, variables d'environnement, appareil, version du modèle), un nouveau script qui l'utilise a besoin de cette même configuration. Le réécrire à zéro répète un problème que le projet a déjà résolu.

**Exemple.** Un script jetable destiné à transcrire sur le GPU échouait avec une DLL CUDA manquante. Le script de constitution du jeu de données du projet avait déjà résolu ce problème : il ajoutait le dossier des bibliothèques du framework de deep learning au chemin de recherche des DLL avant d'importer la bibliothèque de reconnaissance vocale ; le nouveau script n'avait pas recopié cette étape.

**Question détectrice.** Cette bibliothèque est-elle déjà chargée dans un autre script du projet ? Que fait ce script juste avant de l'importer ou de la créer ?

**Signal d'alarme.** « C'est un script de cinq lignes, je n'ai pas besoin de voir comment l'autre fait. »

**Que faire.** Avant d'écrire un script qui utilise une bibliothèque du projet, cherchez où elle est déjà chargée et recopiez sa configuration, ou mieux, importez le chargeur du projet, pour que la configuration vive à un seul endroit (voir la leçon 6). Si une erreur de chargement apparaît, cherchez-la dans le code du projet avant de faire des recherches à l'extérieur.

### 67. Une valeur réglée sur un échantillon ne convient pas à tous les échantillons

`from: c4c22bc2` · `by: ai`

**L'idée.** Un réglage choisi en l'essayant sur un échantillon (un seuil, une coupure, un gain) est calé sur cet échantillon. Quand arrive un échantillon plus fort, plus long ou plus rare, le même chiffre ne donne plus le résultat qui avait été approuvé.

**Exemple.** Les respirations d'une voix générée ont été baissées de 18 dB ; dans un échantillon de 15 s, elles devenaient inaudibles et l'utilisateur l'a approuvé. Dans la leçon complète, le modèle respirait plus fort, et quatre respirations restaient audibles. Avant de couper plus fort, chacune a été inspectée : trois n'étaient pas des respirations mais le « s » final de mots, que le détecteur avait confondus (leçon 13), et couper à −35 dB faisait perdre le « s » à la transcription.

**Question détectrice.** Sur combien d'échantillons, et lesquels parmi les cas extrêmes, ce chiffre a-t-il été choisi ? Décrit-il le résultat que je veux, ou une étape qui n'a donné ce résultat que sur cet échantillon ?

**Signal d'alarme.** « C'était parfait sur l'échantillon, appliquez la même chose à tout. » · « il en reste quelques-unes, coupez plus fort ».

**Que faire.** Choisissez la valeur sur les cas extrêmes, et non sur un seul échantillon : le plus fort, le plus long, le cas le plus rare. Quand c'est possible, écrivez-la comme le résultat voulu, avec des bornes (« finir à −61 dBFS, en coupant entre 18 et 35 dB »), plutôt que comme un pas fixe. Quand quelque chose survit au réglage, examinez chaque cas avant de le resserrer : ce n'est peut-être pas ce pour quoi le réglage existe.

### 68. Une étape qui lit au-delà d'un bord passe avant l'étape qui le coupe

`from: 1e65549b` · `by: ai`

**L'idée.** Certaines étapes ont besoin de matière au-delà du bord de ce sur quoi elles travaillent : une réverbération ou un écho prolonge un son au-delà de sa fin, et un filtre de lissage ou une moyenne glissante lit les voisins de chaque point. Placées après un découpage, un fondu ou un filtre, elles ne trouvent plus rien à lire, et le résultat sort inchangé, ou faux aux bords.

**Exemple.** Pour que les phrases de narration s'estompent plus naturellement, une légère réverbération a été testée. Elle a été appliquée à des phrases déjà découpées et déjà estompées : la queue de réverbération sortait 8 à 30 dB sous le fond sonore, inaudible, et le test n'a rien changé.

**Question détectrice.** Cette étape a-t-elle besoin de matière qui se trouve au-delà du point où j'ai déjà coupé, estompé ou filtré ? À quel endroit de la chaîne la place-je ?

**Signal d'alarme.** « J'ajouterai l'effet à la fin, sur ce qui est déjà fait. »

**Que faire.** Avant d'ajouter une étape à une chaîne de traitement, notez ce qu'elle a besoin en entrée et ce qu'elle laisse en sortie, et placez-la là où son entrée existe encore. Puis vérifiez qu'elle a changé la sortie (voir la leçon 50) avant de demander à quelqu'un de regarder ou d'écouter.

### VIDEO-3. Coller des extraits sur du silence numérique révèle leur bruit de fond

`from: 1bd2ffe3` · `by: ai`

**L'idée.** Quand des morceaux audio sont placés sur une piste de zéros, chaque morceau porte son propre bruit de fond, et les intervalles sont un silence absolu. L'oreille entend le fond s'allumer et s'éteindre à chaque coupure. Un fond posé sous les intervalles ne cache cela que s'il correspond aux morceaux en niveau et en timbre, et même un fond qui correspond peut s'entendre comme un souffle constant.

**Exemple.** La narration d'une leçon a été construite en plaçant chaque phrase générée sur des zéros. Avec une voix propre (plancher de bruit à −83 dB), rien n'était audible ; avec une voix clonée qui portait le bruit de la pièce (−48 dB), l'utilisateur entendait un silence soudain à chacune des 17 coupures. Plus tard, un remplissage à −63 dB sous une voix dont le plancher était à −58 dB laissait des sauts de niveau, et un autre à −58 dB s'entendait comme un souffle léger et constant.

**Question détectrice.** Quel est le plancher de bruit à l'intérieur de chaque morceau, et entre les morceaux ? Correspondent-ils en niveau et en timbre, ou la coupure change-t-elle l'un ou l'autre ?

**Signal d'alarme.** « L'intervalle est silencieux, il ne peut pas être plus propre. » · « je vais juste mettre un fond dessous ».

**Que faire.** Mesurez le plancher des morceaux avant de les assembler. S'il est aussi bas que les intervalles (ici, la voix propre à −83 dB ne montrait aucune couture), laissez les intervalles silencieux. Sinon, nettoyez les morceaux vers ce niveau avant de les assembler ; si vous posez un fond sous les intervalles, prenez-le dans les morceaux eux-mêmes, à leur niveau, et écoutez l'ensemble au casque avant de le garder. Vérifiez la sortie pour y trouver des sauts de niveau à chaque coupure. La cause du bruit fait l'objet de la leçon AI-3.

### WEB-1. Un stockage endommagé ne doit pas entraîner l'enregistrement suivant avec lui

`from: e896b1e3` · `by: ai`

**L'idée.** Quelle que soit la façon dont un site enregistre ses données, une écriture endommagée peut aussi faire tomber ce qui vient après. Si les enregistrements sont ajoutés sous forme de lignes, une ligne coupée court colle l'enregistrement suivant à elle, et un lecteur qui saute les « lignes endommagées » perd les deux, sans rien signaler. Si tous les enregistrements sont dans un seul fichier, lu, modifié puis réécrit en entier, dès que ce fichier ne peut plus être lu, chaque nouvel enregistrement échoue, et seule une console que personne ne regarde le signale. C'est l'autre face de la leçon 24 : là, le fichier se vide ; ici, tout ce qui suit se perd.

**Exemple.** Dans les deux exécutions de la première simulation Web, le formulaire enregistrait chaque message sous forme de ligne JSON, et le panneau d'administration sautait toute ligne qu'il ne pouvait pas lire. Avec une ligne coupée à la fin du fichier, le message suivant a reçu la réponse « Merci ! », a été enregistré, et n'est jamais apparu dans le panneau d'administration. Une des deux versions avait un commentaire qui disait « ligne endommagée : ignorée ».

**Autre exemple.** Dans les deux exécutions de la relance, chaque message se trouvait dans un seul fichier JSON, écrit d'abord dans un fichier temporaire puis renommé, si bien qu'un plantage au milieu de l'écriture ne faisait plus de mal. Mais avec le fichier endommagé d'une autre façon (une modification à la main, un disque plein, une mauvaise restauration), chaque nouveau visiteur recevait « Erreur interne », la page d'administration n'affichait rien, et le seul signal était une trace d'erreur dans la console du serveur.

**Question détectrice.** Si le stockage est endommagé demain, que devient l'enregistrement du prochain visiteur, et qui s'en aperçoit ?

**Signal d'alarme.** « Les lignes endommagées sont sautées » · « on ajoute juste à la fin » · « l'écriture est atomique, donc le fichier ne peut pas se casser ».

**Que faire.** Faites en sorte qu'un nouvel enregistrement ne dépende pas des anciens : ajoutez-le à un fichier qui se termine par un saut de ligne (commencez l'enregistrement par un saut de ligne s'il n'y en a pas), ou enregistrez chaque enregistrement dans son propre fichier, plutôt que de réécrire un seul fichier qui les contient tous. À la lecture, comptez ce qui n'a pas pu être lu et affichez ce compte là où le propriétaire le verra. Testez en endommageant le stockage à la main (coupez la dernière ligne, tronquez le fichier), puis en envoyant un enregistrement.
