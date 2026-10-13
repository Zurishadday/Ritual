# Écriture et documentation

Ce qui s'applique quand vous écrivez pour d'autres : documentation, manuels, textes d'interface, contenus, prompts.

### 11. Retirer un graphique ne retire pas l'affirmation qu'il faisait

`from: 36ab089d` · `by: ai`

**L'idée.** Si vous retirez quelque chose parce que la donnée n'était pas fiable, la même affirmation vit probablement encore dans d'autres textes, écrite avec d'autres mots.

**Exemple.** Un graphique peu fiable a été retiré, mais une carte « principales conclusions » et un plan d'action recommandaient encore ce que le graphique disait.

**Autre exemple.** Un plan de chapitres a été renuméroté de 7 à 15. Deux listes d'un autre document pointaient encore vers « 7.4 » et « 7.7 » de l'ancien plan, qui désignaient maintenant d'autres sujets. Quand vous remplacez un plan, les anciens numéros sont eux aussi des affirmations.

**Question détectrice.** Quels autres textes disent la même chose que ce que je viens de retirer ?

**Signal d'alarme.** « J'ai déjà retiré le graphique. »

**Que faire.** Cherchez par sujet, pas par identifiant. Les échos n'ont pas de nom de variable.

### 37. Documenter ce qui existe, pas ce que vous aimeriez qu'il existe

`from: 928f7db8` · `by: ai`

**L'idée.** Une relecture de documentation améliore le document ; elle ne redessine pas le système. Si le système a une limite, le document la dit. Il ne la cache pas et ne promet pas de la corriger.

**Exemple.** Un manuel disait que les données se synchronisaient toutes seules. Le système ne synchronisait que lorsque l'application était ouverte. La relecture a « corrigé » le manuel en promettant que ce serait bientôt automatique, au lieu d'énoncer la limite telle qu'elle était.

**Question détectrice.** Ce que je m'apprête à écrire, décrit-il le fonctionnement actuel ou le fonctionnement souhaitable ?

**Signal d'alarme.** « Ça devrait marcher comme ça » · « ils vont le corriger ».

**Que faire.** Séparez les constats sur le document (« il est mal écrit ») des constats sur le système (« il fonctionne autrement que l'idéal »). Le second type se déclare comme une limitation.

### 38. Ce qu'on ne sait pas se marque, il ne s'invente pas

`from: 052e301a` · `by: ai`

**L'idée.** Un document officiel affirme tout avec la même autorité. Un détail inventé, comme un responsable, un calendrier ou un délai de réponse, se lit exactement comme un détail réel.

**Exemple.** Une procédure prévoyait un délai de réponse de 24 heures que personne n'avait convenu. Il avait été écrit parce qu'il semblait raisonnable, et une fois publié, il est devenu un engagement.

**Question détectrice.** Est-ce que je connais ce détail, ou est-ce que je le suppose parce qu'il semble raisonnable ?

**Signal d'alarme.** « Forcément, c'est comme ça. »

**Que faire.** Marquez ce qui manque de façon visible, par exemple « En attente » en rouge, et demandez à qui le sait. Une formulation neutre vaut mieux qu'une formulation fausse.

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

`from: 781d2fa2` · `by: ai`

**L'idée.** Après plusieurs séries de corrections ponctuelles, un document peut se contredire lui-même. Chaque correction était vraie dans sa propre section, mais personne n'a relu les autres.

**Exemple.** Une section disait que rien n'est enregistré sans connexion. La FAQ affirmait encore que tout ce qui est capturé est conservé sur l'appareil.

**Question détectrice.** Combien de corrections ce document a-t-il reçues depuis la dernière fois que quelqu'un l'a relu en entier ?

**Signal d'alarme.** « J'ai vérifié chaque correction à son emplacement. »

**Que faire.** À la fin de chaque série, cherchez par sujet tout ce que le document dit sur ce que vous avez corrigé.

### 51. Ce qui vous paraît évident est la première chose à enseigner

`from: 1fed11d1` · `by: ai`

**L'idée.** Quelqu'un qui sait déjà ne voit pas les étapes qu'il franchit sans y penser. Son premier exemple apporte donc plusieurs notions nouvelles à la fois, et un débutant se perd dès la première ligne.

**Exemple.** Un cours de programmation pour débutants s'ouvrait sur une cellule qui introduisait six notions nouvelles à la fois, et le plan n'enseignait jamais ce qu'est un type de donnée, ni que `=` stocke et lit de droite à gauche. Le responsable du cours l'a formulé en une phrase : « vous supposez beaucoup de choses sur les apprenants ». Plus tard, trois leçons disaient « comme en faisant glisser une formule » ; aucune leçon n'avait enseigné le glisser-déposer, seulement « recopier la formule vers le bas ».

**Question détectrice.** Dans mon premier exemple, combien de notions sont nouvelles pour quelqu'un qui ne sait rien ? Chaque symbole, chaque mot, chaque nom de bouton et chaque action que je demande a-t-il déjà été enseigné ?

**Signal d'alarme.** « N'importe qui comprend ça » · « ce n'est qu'une ligne » · « c'est le mot habituel ».

**Que faire.** Avant d'écrire, listez ce que votre exemple tient pour acquis (symboles, mots, clics, choses que l'apprenant aurait déjà dû construire) et enseignez-les d'abord : une idée nouvelle à la fois, chaque symbole expliqué à sa première apparition. Cherchez chaque mot qui correspond au nom d'un bouton, et chaque action demandée, de la même façon que vous cherchez un symbole. Si c'est possible, laissez une vérification automatique comparer ce que chaque exemple utilise avec ce qui a déjà été enseigné.

### 52. Écrire sur un outil qui évolue vite à partir de la pratique d'aujourd'hui, pas de mémoire

`from: 15098a47` · `by: ai`

**L'idée.** Une leçon ou un guide sur un outil qui change tous les quelques mois devient périmé pendant qu'on l'écrit s'il repose sur ce que l'auteur se rappelle. Sa prémisse peut être fausse avant même que le premier lecteur la lise.

**Exemple.** Un plan de module « analyse avec l'IA » commençait par « l'IA ne peut pas voir vos données, décrivez donc votre tableau au lieu de le coller ». Le responsable du cours a fait remarquer que les agents se connectent désormais à la base de données, exécutent eux-mêmes les requêtes et renvoient le chiffre. Une recherche avec sources et dates l'a confirmé : copier du code depuis un chat était la façon de faire deux ans plus tôt. Plusieurs leçons ont été réécrites autour de ce qui tient encore : définir la question, superviser l'agent et vérifier le chiffre.

**Question détectrice.** Lesquelles des prémisses de ce texte dépendent de ce que l'outil sait faire aujourd'hui ? Quand les ai-je vérifiées pour la dernière fois, et d'après quelle source ?

**Signal d'alarme.** « C'est comme ça que ça marche » · « tout le monde fait comme ça ».

**Que faire.** Avant d'écrire sur un outil qui évolue vite, cherchez la pratique actuelle avec des sources et des dates : ce que l'outil fait maintenant, ce qui est gratuit, ce que les gens utilisent réellement. Construisez le texte autour de la compétence qui survivra à la prochaine version (cadrer, superviser, vérifier), et gardez les étapes propres à l'outil à un seul endroit, facile à mettre à jour. Signalez ce que vous n'avez pas pu vérifier, et essayez vous-même avant de publier.

### EDU-2. Ce que l'apprenant voit avant de répondre ne peut pas contenir la réponse

`from: a7bc9d8b` · `by: ai`

**L'idée.** Une question cesse de mesurer dès que sa réponse est déjà apparue : dans une image, dans l'idée clé, dans l'explication d'un autre exercice, dans le titre d'une étape ou dans une leçon précédente. Celui qui répond juste vient peut-être de la lire.

**Exemple.** Une illustration avec le bon chiffre était placée au-dessus de l'exercice qui le demandait. Une leçon demandait ce qui se passe quand on stocke une nouvelle valeur dans une variable, dans une étape intitulée « Stocker à nouveau la remplace ». Un résumé placé sous le quiz final était lu avant d'y répondre. Une boîte de retour qui apparaît après la première tentative, même ratée, donnait la direction de la réponse.

**Question détectrice.** L'apprenant voit-il ce chiffre, cette image ou cette formulation avant de répondre, ici ou dans une leçon précédente ? Pas seulement le nombre exact : aussi une approximation (« environ 25 »), la conclusion écrite dans une légende, un titre, un « vous venez de voir que… », ou ce que montre à l'écran la mauvaise réponse la plus probable d'un exercice précédent.

**Signal d'alarme.** « C'est juste du contexte » · « ce n'est que le titre » · « c'est la légende ».

**Que faire.** Cherchez chaque réponse dans tout ce qui est montré avant sa question, y compris ce qui apparaît après une première tentative ratée, ce que le code de départ affiche à l'exécution, les fichiers téléchargeables et ce qui peut être compté dans un dessin. Rédigez en dernier le titre de l'étape et les objectifs d'apprentissage, et relisez-les à côté du résultat de chaque prédiction. Une vérification automatique trouve les chiffres exacts ; les approximations et les paraphrases ne sont repérées que par quelqu'un qui lit en ayant la réponse à l'esprit.

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
