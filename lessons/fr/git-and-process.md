# Git et processus

Ce qui s'applique quand vous sauvegardez, clôturez, transmettez ou coordonnez : commits, états, éléments en attente, travail en parallèle.

### 8. Lister les consommateurs, ne pas s'en souvenir

`from: b3d4e214` · `by: ai`

**L'idée.** Quand vous modifiez une donnée que d'autres lisent par son nom, la liste de ceux qui la lisent doit être écrite. La mémoire en oublie toujours un.

**Exemple.** Les libellés de trois écrans ont été mis à jour après le changement d'un modèle. Le quatrième, dont personne ne se souvenait, continuait de proposer les options de l'ancien modèle.

**Autre exemple.** En rédigeant un chapitre, on a affirmé de mémoire que le lecteur connaissait déjà trois fonctions d'un chapitre antérieur. Une recherche a montré que le chapitre n'en enseignait qu'une, et qu'un autre chapitre avait déjà expliqué le sujet présenté comme nouveau.

**Encore un exemple.** Une modification a été enregistrée avec la liste des fichiers écrite de mémoire, et l'un d'eux manquait : celui qui faisait fonctionner la nouveauté. La liste des changements en attente, relue ensuite, l'a montré.

**Question détectrice.** D'où vient la liste de ceux qui utilisent ceci : d'une recherche ou de ma mémoire ?

**Signal d'alarme.** « J'ai déjà couvert les trois endroits où c'est utilisé » · « ils l'ont déjà vu » · « j'ai déjà tout ajouté ».

**Que faire.** Tenez une carte écrite des impacts par type de modification. Parcourez-la en entier en disant « modifié » ou « sans objet parce que… », et si la modification crée un nouveau consommateur, ajoutez-le dans la même modification. Avant de citer une source, copiez la phrase que vous affirmez à partir de cette source : ce que quelqu'un dit qu'une autre personne a fait ou vu doit aussi être vérifié.

### 9. Un état vit dans plusieurs fiches : déplacez-les ensemble

`from: bc14d730` · `by: ai`

**L'idée.** Clôturer un élément en attente implique généralement trois endroits : la liste des éléments en attente, le test qui le surveille et le document qui le décrit. Si vous en déplacez un seul, les autres le contredisent.

**Exemple.** Un élément en attente était marqué comme clos dans la liste, mais le test qui le surveillait était encore marqué « échec attendu » et le document le décrivait toujours comme ouvert. Trois endroits, trois versions.

**Question détectrice.** Quels autres endroits affirment cet état ? Nommez-les avant d'enregistrer.

**Signal d'alarme.** « Je mettrai à jour l'autre côté plus tard. »

**Que faire.** L'unité de travail est l'ensemble complet, dans la même modification.

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

`from: 3565a1b4` · `by: ai`

**L'idée.** Quand plusieurs personnes travaillent en même temps, chacune voit clairement sa propre partie. Ce qu'elles partagent (les tests, les données, les documents de tout le projet) combine leurs modifications : des noms qui se heurtent, des copies qui prennent du retard, des tests qui lisent le travail à moitié fini de quelqu'un d'autre. Intégrer est un travail, pas un copier-coller.

**Exemple.** Quatre personnes écrivaient chacune une partie au même moment en laissant les parties communes comme livrable. À l'intégration, deux livrables utilisaient un nom qui existait déjà dans le test partagé, et le test a cessé de tourner. Un autre test gardait une copie de ce qu'il vérifiait ; la partie avait changé, pas la copie. Un test a échoué à cause d'une image qu'une autre personne dessinait encore. Et au final, chaque partie ne pouvait pas être enregistrée séparément : les fichiers partagés portaient déjà les modifications de tout le monde.

**Question détectrice.** Quel fichier deux parties touchent-elles en même temps, et qui l'intègre ? Mon test lit-il le travail à moitié fini de quelqu'un d'autre ?

**Signal d'alarme.** « Chacun a testé sa partie » · « l'échec est dans une autre partie ».

**Que faire.** Confiez à une seule personne l'intégration de ce qui est partagé, avec une étape qui s'arrête si un nom entre en conflit. Faites lire les tests à l'original, pas à une copie. Lancez toute la suite de tests une fois que tout le monde a fini, ou sans les parties qui changent encore, et dites lesquelles ont été exclues. Et enregistrez ensemble les parties qui partagent des fichiers, pour que chaque version enregistrée fonctionne en entier.
