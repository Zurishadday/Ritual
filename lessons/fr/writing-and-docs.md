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
