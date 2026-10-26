# Git et processus

Ce qui s'applique quand vous sauvegardez, clôturez, transmettez ou coordonnez : commits, états, éléments en attente, travail en parallèle.

### 8. Lister les consommateurs, ne pas s'en souvenir

`from: 74a3645f` · `by: ai`

**L'idée.** Quand vous modifiez une donnée que d'autres lisent par son nom, la liste de ceux qui la lisent doit être écrite. La mémoire en oublie toujours un.

**Exemple.** Les libellés de trois écrans ont été mis à jour après le changement d'un modèle. Le quatrième, dont personne ne se souvenait, continuait de proposer les options de l'ancien modèle.

**Autre exemple.** En rédigeant un chapitre, on a affirmé de mémoire que le lecteur connaissait déjà trois fonctions d'un chapitre antérieur. Une recherche a montré que le chapitre n'en enseignait qu'une, et qu'un autre chapitre avait déjà expliqué le sujet présenté comme nouveau.

**Encore un exemple.** Une modification a été enregistrée avec la liste des fichiers écrite de mémoire, et l'un d'eux manquait : celui qui faisait fonctionner la nouveauté. La liste des changements en attente, relue ensuite, l'a montré. Une autre fois, un commit annonçait qu'une copie de certains fichiers était « à jour » alors que trois d'entre eux manquaient ; un autre relecteur l'a repéré.

**Question détectrice.** D'où vient la liste de ceux qui utilisent ceci : d'une recherche ou de ma mémoire ?

**Signal d'alarme.** « J'ai déjà couvert les trois endroits où c'est utilisé » · « ils l'ont déjà vu » · « j'ai déjà tout ajouté ».

**Que faire.** Tenez une carte écrite des impacts par type de modification. Parcourez-la en entier en disant « modifié » ou « sans objet parce que… », et si la modification crée un nouveau consommateur, ajoutez-le dans la même modification. Avant de citer une source, copiez la phrase que vous affirmez à partir de cette source : ce que quelqu'un dit qu'une autre personne a fait ou vu doit aussi être vérifié. Avant d'écrire qu'une copie est « complète » ou « à jour », comparez la liste de ce qu'elle devrait contenir à la liste de ce qu'elle contient.

### 9. Un état vit dans plusieurs fiches : déplacez-les ensemble

`from: dbaa12af` · `by: ai`

**L'idée.** Clôturer un élément en attente implique généralement trois endroits : la liste des éléments en attente, le test qui le surveille et le document qui le décrit. Si vous en déplacez un seul, les autres le contredisent.

**Exemple.** Un élément en attente était marqué comme clos dans la liste, mais le test qui le surveillait était encore marqué « échec attendu » et le document le décrivait toujours comme ouvert. Trois endroits, trois versions.

**Autre exemple.** Une zone de texte était remplie par la dictée vocale, qui gardait le texte dans une variable à part, et le bouton d'envoi envoyait cette variable. La personne a effacé à la main la première moitié pendant qu'elle dictait encore, et tout le texte a été envoyé, partie effacée comprise. Plus tard, l'envoi vidait la zone mais pas la variable, si bien que la dictée suivante commençait par le message précédent.

**Encore un exemple.** Une boîte de question demandait s'il fallait publier un texte et affichait le brouillon enregistré comme aperçu. Le script qui publiait construisait son propre corps à partir de ce brouillon : un préfixe sur le titre, des champs que le brouillon n'avait pas. La personne aurait dit oui à un texte qui n'était pas celui qui a été publié ; un relecteur l'a repéré avant la première utilisation, et l'aperçu vient maintenant de la même fonction que celle qui publie.

**Question détectrice.** Quels autres endroits affirment cet état ? Nommez-les avant d'enregistrer. Et ce que j'envoie ou enregistre : vient-il de la copie que voit la personne, ou de celle gardée à part ?

**Signal d'alarme.** « Je mettrai à jour l'autre côté plus tard. » · « La variable a déjà le texte, j'envoie celle-là. »

**Que faire.** L'unité de travail est l'ensemble complet, dans la même modification. Ce qui est envoyé ou enregistré vient de ce que voit la personne, et chaque envoi ou remise à zéro vide toutes les copies d'un seul coup, en une ligne de code.

### 30. Expliquer avant d'agir, et attendre le oui

`from: a2c8ffe9` · `by: ai`

**L'idée.** Avancer vite dans la mauvaise direction n'est pas du progrès.

**Exemple.** L'arborescence de dossiers d'un projet entier a été réorganisée sans prévenir. Le changement était correct en lui-même et a été entièrement annulé, parce qu'une autre personne avait déjà décidé de cette structure pour des raisons qui ne figuraient pas dans le code.

**Autre exemple.** Une personne devait choisir entre désactiver une vérification automatique par défaut et la laisser active. La question ne donnait que les gains et désignait la vérification par son nom dans le code. Elle a dit oui : c'était fait et publié. Puis on a demandé ce que cela pouvait abîmer, et quatre explications ont encore passé avant qu'on puisse dire ce qui avait été désactivé.

**Question détectrice.** Ce bloc est-il volumineux, difficile à annuler, ou modifie-t-il quelque chose qu'une autre personne a déjà décidé ? Si oui, expliquez et attendez. Sinon, dites ce que vous allez faire et allez-y : demander la permission à chaque étape a aussi un coût. Quand je demande un oui : ai-je dit, avec leurs mots, ce qui pourrait mal tourner ?

**Signal d'alarme.** « Je sais déjà ce qu'ils veulent. » · « Option 1 (recommandée) » avec seulement ses avantages.

**Que faire.** Avant chaque grand bloc de travail, expliquez en langage simple ce que vous allez faire et pourquoi, et attendez la confirmation. Quand vous proposez des options, donnez à chacune une ligne sur ce qui pourrait mal tourner et sur la facilité à l'annuler, et nommez les choses par ce qu'elles font, pas par leur nom dans le code. Si la réponse est une question, la décision n'est pas encore prise.

### 35. Une liste de choses à faire notée en passant devient périmée

`from: 6deec922` · `by: ai`

**L'idée.** Ce que vous avez noté comme « pour plus tard » en faisant autre chose n'existe peut-être plus, ou était peut-être une décision délibérée.

**Exemple.** Une note disait « retirer le filtre par date ». Quand on s'y est enfin mis, le filtre était déjà une décision écrite de l'équipe, et le retirer a cassé un rapport.

**Question détectrice.** Ai-je vérifié cet élément aujourd'hui, ou vais-je le traiter simplement parce qu'il est écrit ?

**Signal d'alarme.** « C'était sur la liste. »

**Que faire.** Avant de traiter un élément en attente, vérifiez-le aujourd'hui et cherchez une décision écrite qui dit qu'il a été laissé ainsi volontairement.

### 40. Le journal dit ce qui reste et pourquoi, pas une chronique des erreurs

`from: 8309d6b7` · `by: ai`

**L'idée.** L'historique des modifications sert à comprendre le produit, pas à raconter les erreurs déjà résolues de celui qui a fait la modification.

**Exemple.** Un historique disait « A a été essayé et a échoué ; B a été essayé et a échoué ; C a été retenu ». Quelqu'un qui le lit des mois plus tard n'avait besoin que de C et de sa raison, et devait lire trois paragraphes pour le trouver.

**Question détectrice.** Cette ligne aide-t-elle à comprendre le produit ou à éviter de répéter une erreur, ou enregistre-t-elle simplement ce qui m'est arrivé ?

**Signal d'alarme.** « Gardons une trace de tout ce qui s'est passé. »

**Que faire.** Écrivez l'état final et sa raison. Ce qui a été essayé et a échoué n'est noté que s'il enseigne quelque chose dont quelqu'un a besoin pour ne pas le refaire.

### 47. Ce qui est travaillé en parallèle entre en collision dans ce qui est partagé

`from: 83287f40` · `by: ai`

**L'idée.** Quand plusieurs personnes travaillent en même temps, chacune voit clairement sa propre partie. Ce qu'elles partagent (les tests, les données, les documents de tout le projet) combine leurs modifications : des noms qui se heurtent, des copies qui prennent du retard, des tests qui lisent le travail à moitié fini de quelqu'un d'autre. Intégrer est un travail, pas un copier-coller.

**Exemple.** Quatre personnes écrivaient chacune une partie au même moment en laissant les parties communes comme livrable. À l'intégration, deux livrables utilisaient un nom qui existait déjà dans le test partagé, et le test a cessé de tourner. Un autre test gardait une copie de ce qu'il vérifiait ; la partie avait changé, pas la copie. Un test a échoué à cause d'une image qu'une autre personne dessinait encore. Et au final, chaque partie ne pouvait pas être enregistrée séparément : les fichiers partagés portaient déjà les modifications de tout le monde.

**Autre exemple.** Deux conversations travaillaient dans le même dossier, qui partage plus que des fichiers : une seule branche active, un seul résultat de build, un seul port pour le serveur de test. Une conversation a fait passer le dossier sur une autre branche ; le commit suivant de l'autre conversation a atterri sur cette branche, et son push vers main a répondu « everything up to date » sans rien envoyer. Remettre ensuite le dossier sur main a entraîné avec lui les modifications non enregistrées de la première conversation.

**Question détectrice.** Quel fichier deux parties touchent-elles en même temps, et qui l'intègre ? Mon test lit-il le travail à moitié fini de quelqu'un d'autre ? Sur quelle branche se trouve ce dossier juste avant le commit, et qui d'autre l'utilise ?

**Signal d'alarme.** « Chacun a testé sa partie » · « l'échec est dans une autre partie » · « chacun touche des fichiers différents, ils ne se heurtent pas ».

**Que faire.** Confiez à une seule personne l'intégration de ce qui est partagé, avec une étape qui s'arrête si un nom entre en conflit. Faites lire les tests à l'original, pas à une copie. Lancez toute la suite de tests une fois que tout le monde a fini, ou sans les parties qui changent encore, et dites lesquelles ont été exclues. Et enregistrez ensemble les parties qui partagent des fichiers, pour que chaque version enregistrée fonctionne en entier. Donnez à chaque session son propre dossier (`git worktree`), lisez `git status -sb` avant chaque commit, et après un push vérifiez que la branche distante contient le commit.

### 65. Une règle sur la manière de travailler n'a pas d'exception pour les petites étapes

`from: 1f76d0cd` · `by: ai`

**L'idée.** Une consigne permanente sur la manière de travailler (qui fait quoi, où cela tourne, avec quel outil) n'a pas d'exception de taille. « C'est juste une petite vérification » est exactement le cas que la règle était censée couvrir.

**Exemple.** L'utilisateur avait demandé, et cela avait été enregistré en mémoire, que tout le travail mécanique (installations, exécution de scripts, transcription) soit confié à un sous-agent au modèle moins coûteux, le modèle principal ne faisant que raisonner. Face à trois longs fichiers audio, le modèle principal a lui-même écrit et lancé un essai de transcription « pour voir ce qu'ils contenaient » ; il a échoué sur une bibliothèque manquante, a réessayé, et l'utilisateur l'a arrêté pour lui rappeler la règle.

**Question détectrice.** Avant la première commande d'une demande : existe-t-il une règle permanente (mémoire, instructions du projet, ce que l'utilisateur a dit) sur qui fait ce genre d'étape, ou sur la manière de la faire ? Est-ce que je la saute parce que l'étape est « petite » ?

**Signal d'alarme.** « Je jette d'abord un coup d'œil, et je délègue ensuite. » · « c'est trop court pour valoir la peine de déléguer ».

**Que faire.** Classez l'étape selon sa nature, pas selon sa taille : si elle est mécanique, elle suit la règle dès la première commande. Si une exception se justifie vraiment, dites-le avant de la faire et laissez l'utilisateur décider.
