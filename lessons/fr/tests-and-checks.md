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

`from: 5301da23` · `by: ai`

**L'idée.** Chaque revue automatique filtre ce qui est « pertinent », et ce filtre peut la rendre aveugle précisément là où se trouve le problème.

**Exemple.** Un auditeur de design ne relisait que les éléments sans enfants. Les libellés qui demandaient une relecture contenaient une icône d'aide, donc il ne les voyait jamais.

**Autre exemple.** Un test parcourait chaque page en cochant toujours la première option et en exécutant chaque requête au fur et à mesure. Il réussissait toujours, sans jamais vérifier que la bonne réponse était acceptée.

**Encore un exemple.** Pour savoir si quelqu'un avait modifié un texte, les espaces étaient ignorés. Cela laissait de côté justement le cas de la page qui expliquait comment mettre en forme ce texte avec des espaces et des sauts de ligne. Normaliser, c'est aussi filtrer.

**Question détectrice.** Que laisse de côté mon filtre ? Notez-le avant de croire le résultat.

**Signal d'alarme.** « Il a trouvé 48 différences, j'ai déjà la liste » · « le test passe par toutes ».

**Que faire.** Notez ce que le filtre laisse de côté et vérifiez à la main un échantillon des éléments exclus. Et quand vous découvrez qu'un filtre vous a rendu aveugle, cherchez les autres filtres semblables que vous avez déjà écrits : une revue qui retirait tous les espaces du code collait deux mots en un seul et rejetait du code correct, peu après que la même leçon avait été tirée d'une normalisation différente.

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

`from: ed079f80` · `by: ai`

**L'idée.** Si la même personne exécute et confirme, une erreur d'exécution se confirme elle-même.

**Exemple.** Celui qui a écrit chaque page a aussi pris les captures d'écran de relecture, et seulement pour les étapes qu'il jugeait risquées. Le relecteur a lu le fichier source. Les étapes sans capture n'ont été vues par personne.

**Question détectrice.** En dehors de la personne qui l'a fait, qui a relu le résultat tel que l'utilisateur le reçoit ?

**Signal d'alarme.** « Je l'ai déjà relu moi-même. »

**Que faire.** L'un exécute et l'autre vérifie en lisant le résultat. « Je l'ai déjà fait » est le signe qu'on peut maintenant le vérifier, pas la vérification. Et celui qui vérifie ne doit pas regarder par le même canal que celui qui a fait (voir la leçon 14) : si les deux ne lisent que la source, aucun des deux ne voit l'écran.

### 34. Croire le symptôme d'un constat QA et mesurer la cause

`from: b3b868fb` · `by: ai`

**L'idée.** Un rapport QA a généralement raison sur le symptôme, mais propose une cause qui n'est qu'une hypothèse.

**Exemple.** Un rapport demandait de corriger un graphique dont les totaux étaient faux, mais ce graphique n'existait pas à l'écran : les données transitaient sans rien pour les dessiner.

**Question détectrice.** Puis-je reproduire la cause avec ma propre mesure, ou l'accepter parce qu'elle semble juste ?

**Signal d'alarme.** « Le rapport dit déjà quelle est la cause. »

**Que faire.** Mesurez avant et après la correction. Une correction qui n'améliore qu'en partie le symptôme n'est pas encore close.
