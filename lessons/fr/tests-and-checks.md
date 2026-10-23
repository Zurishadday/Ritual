# Tests et vérifications

Ce qui s'applique quand vous vérifiez quelque chose : tests automatisés, validateurs, relectures, calibrage.

### 13. Un contrôle qui n'a jamais vu l'erreur ne vérifie rien

`from: eb6c6b31` · `by: ai`

**L'idée.** Un test qui réussit toujours peut être cassé. La seule façon de le savoir est de le voir échouer face à la vraie erreur.

**Exemple.** Un test qui interdisait un mot ne cherchait que la version en minuscules ; avec une majuscule ou un accent, il réussissait.

**Autre exemple.** 37 enregistrements en double avaient été insérés pour un exercice, et le décompte est revenu à 92 : les données contenaient déjà des correspondances naturelles. Une vérification qui comparait le décompte avec ce qui avait été inséré, avant l'enregistrement, l'a détecté.

**Encore un exemple.** Une règle qui détectait le code indenté signalait une ligne commençant par un texte : le cas qui devait passer n'avait pas cette forme. Et un test vérifiant que la comparaison de texte fonctionnait réussissait alors que la comparaison était cassée, parce qu'une autre relecture avait rejeté l'erreur en premier.

**Question détectrice.** Ai-je testé mon contrôle face à l'erreur dans les formes où elle apparaîtrait réellement ? Et face au cas correct ?

**Signal d'alarme.** « Il réussit déjà, donc il est bien configuré. »

**Que faire.** Calibrez-le avec deux cas : un où il doit trouver quelque chose et un où il ne doit rien trouver, et lancez-le réellement le jour même de sa création. Le bon cas compte autant que le mauvais : un contrôle qui rejette ce qui est correct est lui aussi cassé, et c'est plus difficile à remarquer parce qu'il paraît strict. Le cas correct inclut les formes réelles de ce qui est juste, y compris celles que vous n'avez pas écrites vous-même : un autre ordre, un autre nom. Chaque contrôle se calibre lui-même : si un autre attrape l'erreur en premier, le vôtre n'a jamais été testé. Et une relecture qui répète ce qu'elle a déjà lu ne peut pas échouer (une « deuxième passe » qui relit le même fichier) : remplacez-la par une réconciliation qui échoue si quelque chose ne va pas.

### 14. La sonde ne passe pas par le canal qu'elle examine

`from: 5c6ecad0` · `by: ai`

**L'idée.** Si votre contrôle passe par le même circuit qui a pu causer le dommage, le dommage affecte aussi le contrôle, et il répond la même chose que tout soit juste ou faux.

**Exemple.** Ils cherchaient un problème d'accents en envoyant des requêtes avec des accents par le même chemin qui les abîmait.

**Question détectrice.** La transformation que j'examine transforme-t-elle aussi mon test ?

**Signal d'alarme.** « Je le vérifie en envoyant une autre requête exactement pareille. »

**Que faire.** Construisez le test sous une forme que le dommage ne peut pas toucher.

### 15. Un test qui se désactive lui-même ne signale pas qu'il s'est désactivé

`from: 86581aad` · `by: ai`

**L'idée.** Les branches qui disent « si je ne trouve pas les données, je saute le test » s'activent justement quand le monde change, et elles cessent de surveiller sans que personne ne le remarque.

**Exemple.** Un test repérait une table par son titre et, s'il ne la trouvait pas, il passait. Le titre a changé, et le test a réussi pendant des semaines sans rien vérifier.

**Variante.** Une vérification qui tombe au premier fichier cassé laisse sans surveillance chacun des fichiers suivants. Un validateur qui plante, au lieu de signaler « cette page ne peut pas être lue, ligne 12 », désactive toute la relecture.

**Question détectrice.** Mon test a-t-il une sortie silencieuse qui s'active lors d'un changement légitime ?

**Signal d'alarme.** « Si je ne trouve pas l'ancre, je saute le test. »

**Que faire.** Si ce qui manque est un outil, le sauter est honnête. Si ce qui manque est la donnée surveillée, le test doit échouer. Et un fichier qui ne peut pas être lu est un constat avec sa ligne, et non la fin de la relecture.

### 16. Le filtre de votre contrôle exclut généralement exactement ce qui compte

`from: ef7dcfa7` · `by: ai`

**L'idée.** Chaque revue automatique filtre ce qui est « pertinent », et ce filtre peut la rendre aveugle précisément là où se trouve le problème.

**Exemple.** Un auditeur de design ne relisait que les éléments sans enfants. Les libellés qui demandaient une relecture contenaient une icône d'aide, donc il ne les voyait jamais.

**Autre exemple.** Un test parcourait chaque page en cochant toujours la première option et en exécutant chaque requête au fur et à mesure. Il réussissait toujours, sans jamais vérifier que la bonne réponse était acceptée.

**Encore un exemple.** Pour savoir si quelqu'un avait modifié un texte, les espaces étaient ignorés. Cela laissait de côté justement le cas de la page qui expliquait comment mettre en forme ce texte avec des espaces et des sauts de ligne. Normaliser, c'est aussi filtrer. Et un test lancé pour une seule page a « réussi » sans rien tester : le filtre était une expression régulière appliquée aux noms de tests, et le titre de la page contenait des parenthèses, qui sont des caractères spéciaux dans une expression régulière ; le filtre ne correspondait à aucun test, et aucun n'a été exécuté.

**Question détectrice.** Que laisse de côté mon filtre ? Notez-le avant de croire le résultat. Et combien en a-t-il sélectionné ? Zéro n'est pas une réussite.

**Signal d'alarme.** « Il a trouvé 48 différences, j'ai déjà la liste » · « le test passe par toutes » · « l'exécution filtrée a réussi ».

**Que faire.** Notez ce que le filtre laisse de côté et vérifiez à la main un échantillon des éléments exclus. Et quand vous découvrez qu'un filtre vous a rendu aveugle, cherchez les autres filtres semblables que vous avez déjà écrits : une revue qui retirait tous les espaces du code collait deux mots en un seul et rejetait du code correct, peu après que la même leçon avait été tirée d'une normalisation différente. Avant de lire le verdict d'une exécution filtrée, comptez ce que le filtre a sélectionné (`--list`, ou le décompte de tests exécutés de l'outil), et filtrez par identifiant plutôt que par nom : une exécution qui n'a rien sélectionné n'a pas de verdict, et pas de verdict veut dire « je ne sais pas » (voir la leçon 44).

### 17. Du code qui compile n'est pas du code qui s'exécute

`from: 2a71a25d` · `by: ai`

**L'idée.** Un vérificateur de syntaxe approuve du code qui plante à l'exécution. Un écran blanc avec tout « au vert » est la pire défaillance possible.

**Exemple.** Une page a passé la vérification de syntaxe et la vérification de types. À l'ouverture, elle était blanche : elle utilisait une variable qui n'existe que sur le serveur.

**Question détectrice.** Mon test : exécute-t-il le code ou se contente-t-il de le lire ?

**Signal d'alarme.** « La vérification de syntaxe passe, le code est bon. »

**Que faire.** Ayez au moins un test qui fait tourner la page ou le programme en entier.

### 18. Vérifier la source n'est pas vérifier ce qui est livré

`from: fd2f11f3` · `by: ai`

**L'idée.** Si vous vérifiez X et que l'utilisateur reçoit Y, dérivé de X, il existe entre les deux un code que personne ne regarde.

**Exemple.** Ils ont vérifié que chaque résultat publié était correct, mais une version construite à partir de ces résultats est arrivée à l'écran : elle utilisait une règle différente pour les données manquantes.

**Autre exemple.** Un relecteur a lu le fichier source de chaque page et l'a approuvé. Un tableau qui se transformait en cartes sur mobile, et ne pouvait plus être comparé, n'est apparu que lorsque la page a été regardée.

**Question détectrice.** Est-ce que quelqu'un vérifie ce qui atteint l'écran, ou seulement ce qui sort de la source ?

**Signal d'alarme.** « Ça vient de données déjà vérifiées » · « le fichier est bon ».

**Que faire.** Vérifiez au point où cela atteint la personne : la page telle qu'elle est vue, le fichier qu'elle télécharge, le message qu'elle reçoit (voir aussi la leçon 41).

### 26. Ce qui est en production peut aussi se dégrader

`from: 7b79664a` · `by: ai`

**L'idée.** Les filtres de qualité examinent généralement ce qui est nouveau. Ce qui est déjà en place n'est pas réexaminé, et ses hypothèses vieillissent sans que personne ne les remette en question.

**Exemple.** Un rapport publié continuait à filtrer sur une colonne que la source avait cessé de remplir. Il affichait zéro, et comme il était « déjà validé », personne ne se posait la question.

**Question détectrice.** Cette chose qui tourne depuis des mois, quelqu'un a-t-il revérifié ses hypothèses depuis sa publication ?

**Signal d'alarme.** « On a déjà validé ça à la publication. »

**Que faire.** Soumettez ce qui est déjà en usage aux mêmes tests que le nouveau candidat, à chaque relecture.

### 28. Celui qui exécute et celui qui vérifie sont deux personnes différentes

`from: 0090f5e0` · `by: ai`

**L'idée.** Si la même personne exécute et confirme, une erreur d'exécution se confirme elle-même.

**Exemple.** Celui qui a écrit chaque page a aussi pris les captures d'écran de relecture, et seulement pour les étapes qu'il jugeait risquées. Le relecteur a lu le fichier source. Les étapes sans capture n'ont été vues par personne.

**Question détectrice.** En dehors de la personne qui l'a fait, qui a relu le résultat tel que l'utilisateur le reçoit ?

**Signal d'alarme.** « Je l'ai déjà relu moi-même. »

**Que faire.** L'un exécute et l'autre vérifie en lisant le résultat. « Je l'ai déjà fait » est le signe qu'on peut maintenant le vérifier, pas la vérification. Et celui qui vérifie ne doit pas regarder par le même canal que celui qui a fait (voir la leçon 14) : si les deux ne lisent que la source, aucun des deux ne voit l'écran. Celui qui approuve une affirmation sur un outil (ce qu'il fait, ce qu'il contient, comment il est configuré) dit ce qu'il a regardé aujourd'hui : son aide, sa configuration ou une exécution. S'il n'a pas regardé, il le dit, et le travail s'arrête jusqu'à ce que quelqu'un le fasse.

### 34. Croire le symptôme d'un constat QA et mesurer la cause

`from: b3b868fb` · `by: ai`

**L'idée.** Un rapport QA a généralement raison sur le symptôme, mais propose une cause qui n'est qu'une hypothèse.

**Exemple.** Un rapport demandait de corriger un graphique dont les totaux étaient faux, mais ce graphique n'existait pas à l'écran : les données transitaient sans rien pour les dessiner.

**Question détectrice.** Puis-je reproduire la cause avec ma propre mesure, ou l'accepter parce qu'elle semble juste ?

**Signal d'alarme.** « Le rapport dit déjà quelle est la cause. »

**Que faire.** Mesurez avant et après la correction. Une correction qui n'améliore qu'en partie le symptôme n'est pas encore close.

### 55. Le vert sur votre machine n'est que le verdict d'une seule machine

`from: 4bc0daad` · `by: ai`

**L'idée.** Un contrôle qui a réussi là où vous l'avez lancé prouve seulement que le travail tient sur cette machine : son système, sa vitesse, son horloge, son fuseau horaire, ses noms de fichiers. Là où le travail tournera vraiment (un autre système, un serveur, la CI, l'ordinateur de l'utilisateur), l'un de ces éléments peut différer, et le même contrôle peut échouer là-bas alors qu'il réussit ici.

**Exemple.** Le test d'un résumé a réussi sur la machine Windows du développeur et a été poussé, six commits d'affilée. Sur les runners Linux de la CI, il échouait à chaque fois : les machines étaient assez rapides pour écrire une entrée dans la même milliseconde que la marque que le test venait d'écrire, donc « après la marque » l'excluait. Le verdict local était lu à chaque fois ; celui des autres machines attendait dans un courriel jusqu'à ce que l'utilisateur le trouve.

**Question détectrice.** Où cela tournera-t-il vraiment, et mon contrôle y a-t-il tourné, ou seulement ici ? Si un verdict venant de là-bas existe (CI, serveur de préproduction, appareil de l'utilisateur), l'ai-je lu avant de dire que ça fonctionne ?

**Signal d'alarme.** « Ça marche chez moi », ou un push suivi de la tâche suivante alors que la CI tourne encore ou est en échec. Tout ce qui dépend du temps, de l'ordre, de la vitesse, de la casse des noms de fichiers, des séparateurs de chemins, des fins de ligne, de la locale ou du fuseau horaire.

**Que faire.** Nommez les machines où le travail tourne et obtenez un verdict de chacune : lisez la CI jusqu'au bout après un push (chaque job, pas seulement le premier vert), lancez sur le serveur ou sur une copie de celui-ci, ou demandez le résultat à l'utilisateur. Un échec sur l'une d'elles est réel, même s'il n'apparaît jamais ici : reproduisez-le ici en forçant la différence (une date fixe, une horloge rapide, un chemin sensible à la casse) avant de le corriger, et corrigez l'hypothèse, pas la machine.

### EDU-1. Si la réponse est la même sans la compétence, l'exercice ne la mesure pas

`from: 164808ab` · `by: ai`

**L'idée.** Un exercice ne vérifie une compétence que si quelqu'un qui saute cette compétence obtient un résultat différent. Si le point de départ, un exemple ou un raccourci produit déjà la bonne réponse, l'exercice valide tout le monde. C'est la leçon 13 appliquée aux exercices : un contrôle n'a de valeur qu'une fois que vous l'avez vu rejeter l'erreur.

**Exemple.** Un exercice demandait le plus gros achat de l'été, avec un filtre de date. Le plus gros achat de toute la table était aussi un achat d'été : sans le filtre, le résultat était le même, et l'exercice l'a accepté. Un autre exercice exigeait que le code contienne un `=` ; il passait avec le résultat tapé à la main, `total = 1945`. Le contrôle regardait la lettre, pas la compétence.

**Autre exemple.** Un exercice réalisé dans un tableur demandait aux apprenants de régler la région, d'importer un CSV et de retaper combien d'unités d'un produit il contenait. Le nombre était un entier stocké dans le fichier : un éditeur de texte brut l'affichait sans import ni réglage de la région. On l'a remplacé par des unités multipliées par un prix avec un séparateur décimal, qui ne donne le bon résultat que si le tableur lit correctement ce séparateur. Dans le même cours, un exercice de tri des fichiers par extension pouvait être résolu à partir des seuls noms de fichiers.

**Encore un exemple.** Dans un cours avec des interfaces dessinées (un navigateur, une boîte de messagerie, un tableur), les exercices ne vérifiaient que l'état final, et d'autres chemins y menaient. Fermer la leçon et rester sur l'autre onglet validait « changer d'onglet » ; rouvrir un autre onglet validait « rouvrir la leçon » ; supprimer la cellule et tirer la poignée de recopie validait « copier la formule ». Et un compteur comptait deux fois un faux e-mail signalé puis supprimé.

**Question détectrice.** Quel résultat obtient quelqu'un qui saute exactement ce que j'enseigne, ou qui rend l'exercice sans y toucher ? Est-il différent du bon ? Ai-je choisi un cas où les deux calculs tombent juste par hasard (le premier groupe, la première étape, le total) ?

**Signal d'alarme.** « Avec la bonne réponse, il donne le chiffre, donc ça marche. » · « De toute façon, ils feront le réglage. »

**Que faire.** Résolvez chaque exercice trois fois : sans y toucher, avec l'erreur la plus probable, et correctement. Seule la troisième version doit passer. Puis appliquez la même liste de raccourcis à chaque exercice : le nombre tapé à la main, le code de départ avec la réponse ajoutée à la fin, le symptôme corrigé à la main au lieu de la cause, le mot exigé employé à vide, et une exécution avec la mémoire laissée par une tentative précédente. Gardez toute tolérance inférieure à l'écart entre la réponse et l'erreur la plus probable, et écrivez trois formes correctes qu'un apprenant utiliserait, pour que le contrôle ne rejette pas ce qui est juste. Quand l'exercice se fait dans un autre outil et que seul un nombre tapé revient, demandez un nombre qui n'apparaît qu'après l'étape enseignée (un calcul que le réglage affecte), et non une valeur stockée dans le fichier ; ajoutez « le réglage sauté » aux raccourcis. Dans un exercice de tri, gardez tout identique, sauf la fonctionnalité enseignée. Dans une interface dessinée, vérifiez le chemin, pas seulement l'état final : l'action enseignée doit avoir lieu, donc fermer l'onglet de la leçon ne doit pas compter comme changer d'onglet. Et comptez chaque élément une fois, quoi qu'il lui arrive ensuite.

### EDU-4. Si l'on peut deviner la bonne option à sa place, à sa longueur ou à son apparence, le quiz mesure la devinette

`from: d2e6b716` · `by: ai`

**L'idée.** Chaque question peut être correcte prise isolément, et l'ensemble donner quand même la réponse : la bonne option est toujours la deuxième, toujours la plus longue, toujours de taille moyenne, ou la seule à avoir un bouton. Les apprenants repèrent les régularités plus vite que les auteurs.

**Exemple.** Dans le quiz de clôture d'un module, la bonne réponse était la deuxième option dans six questions sur sept. Sur l'ensemble d'un cours, la bonne option était la plus longue dans 55 % des questions, alors que le hasard, avec trois options, donne une chance sur trois. Après un rééquilibrage de la longueur à la main, la bonne option s'est retrouvée la plus courte dans six questions sur sept d'une leçon, et celle du milieu dans chaque question de trois leçons de suite.

**Autre exemple.** Dans une boîte de messagerie dessinée, seuls les faux e-mails avaient un bouton de signalement, si bien que les apprenants les signalaient sans lire l'expéditeur. Dans une question « touchez la bonne capture d'écran », la bonne capture était la seule à contenir quelque chose : les deux autres étaient des blocs de couleur.

**Question détectrice.** Si je ne lis que la position, la longueur et l'apparence des options, sans le texte, est-ce que je devine la bonne plus d'une fois sur trois ?

**Signal d'alarme.** « J'ai vérifié chaque question, elles sont toutes correctes. »

**Que faire.** Mélangez les options à l'affichage, selon un ordre qui ne dépend pas de l'endroit où la bonne a été écrite. Mesurez la plus longue, la plus courte et celle du milieu par fichier, et regroupez les petits fichiers par module, pour que quelques questions ne cachent pas la régularité. Relisez les chiffres au regard de ce que vous visiez : une passe d'équilibrage peut déplacer l'indice qui trahit la réponse au lieu de le supprimer. Donnez à chaque option les mêmes commandes (chaque e-mail a un lien et un bouton), et dessinez les mauvaises options aussi crédiblement que la bonne.
