# Interface et design

Ce qui s'applique quand une personne va voir ou utiliser ce que vous construisez : écrans, composants, styles, pages.

### 10. Les modules jumeaux évoluent ensemble

`from: cbdd1d55` · `by: ai`

**L'idée.** Si votre produit a deux versions du même écran, pour deux types d'utilisateurs, deux régions ou deux produits, une amélioration de l'une est une amélioration en attente pour l'autre.

**Exemple.** La version bureau a reçu un filtre par date. La version mobile, que les gens perçoivent comme « le même écran », en a été privée pendant un mois.

**Autre exemple.** Dans un cours web, trois choses tenaient sur mobile et y échouaient. Un aperçu réduit d'un document tenait dans la largeur, avec un texte de 3 px. Un exercice de glisser-déposer empilait six zones cibles dans une seule colonne, haute de trois écrans : la cible sortait de l'écran pendant le glissement. Une étiquette d'un graphique en barres dessiné tenait sur ordinateur, mais sur mobile elle passait à la ligne et heurtait l'étiquette suivante.

**Question détectrice.** Ce que je touche a-t-il un jumeau que les utilisateurs considèrent comme « le même module » ?

**Signal d'alarme.** « Ils ne me l'ont pas demandé pour l'autre. » · « Ça tient sur mobile, c'est donc pareil. »

**Que faire.** Ne clôturez pas la modification tant que vous n'avez pas vérifié le jumeau et écrit soit « identique », soit « sans objet parce que… ». Quand le jumeau est la version mobile, vérifiez-la en vous en servant là-bas : lisez le texte à sa taille affichée, terminez chaque glissement ou appui en gardant sa cible à l'écran tout du long, et regardez les étiquettes à la largeur la plus étroite. Pour comparer chaque propriété, voir la leçon 19 ; pour la regarder comme la voit le lecteur, voir la leçon 41.

### 19. Une revue sur une seule dimension n'est pas une revue

`from: e2d5ae25` · `by: ai`

**L'idée.** « Ils sont déjà identiques » suppose d'avoir comparé chaque propriété visible, et non une seule.

**Exemple.** Le design de deux écrans a été rendu identique en quatre tours : d'abord la taille, puis la typographie, puis les couleurs, puis la couleur des libellés. Chaque livraison disait « c'est fini ».

**Autre exemple.** Les illustrations d'un support ont été relues pour le contenu et la taille, mais pas pour le contraste : deux couleurs de texte se sont retrouvées sous le minimum lisible dans quatre images.

**Question détectrice.** Ai-je comparé une propriété ou toutes celles que l'utilisateur voit ?

**Signal d'alarme.** « La taille correspond maintenant, donc le design est le même. »

**Que faire.** Listez toutes les différences avant de corriger la première. Et dans vos notes, le verbe vous trahit : « c'est corrigé » et « ça devient » sont des intentions ; « ça dit » et « ça montre » sont des mesures.

### 31. Rien de technique à l'écran, sauf si cela change une décision

`from: 60f4261e` · `by: ai`

**L'idée.** Chaque élément d'un écran métier doit aider à décider quelque chose. Ce qui aide à l'audit va dans le code ; ce qui aide à décider va à l'écran, dans le langage métier.

**Exemple.** Un écran de ventes affichait, dans sa première ligne, l'identifiant interne de chaque commande et l'heure du dernier calcul. Personne ne décidait quoi que ce soit avec, et cela prenait la place des données qui comptaient.

**Question détectrice.** Cela modifie-t-il une décision de celui qui utilise l'écran ? Sinon, pourquoi est-ce là ?

**Signal d'alarme.** « Au cas où quelqu'un en aurait besoin. »

**Que faire.** Avant d'ajouter quelque chose à l'écran, notez quelle décision cela change. Si cela n'en change aucune, ça va dans le journal technique ou dans le code, pas à l'écran.

### 32. Ce qui fonctionne mais ne se voit pas est signalé comme cassé

`from: 39c9c528` · `by: ai`

**L'idée.** Si un bouton modifie quelque chose hors de la vue de l'utilisateur, fonctionner et ne pas fonctionner paraissent identiques.

**Exemple.** Un filtre filtrait bien un tableau, mais le tableau se trouvait deux écrans plus bas. Les gens ont signalé qu'il « ne fait rien ».

**Variante.** Masquer un conteneur masque tout ce qu'il contient, même ce qui n'a rien à voir. Par exemple, un lien utile qui se trouvait à l'intérieur d'un contrôle retiré.

**Autre exemple.** Un formulaire d'inscription de cinq questions, envoyé vide, déplaçait le focus vers le premier champ, mais son message se trouvait sous le bouton d'envoi, à environ 900 px plus bas : sur un téléphone, la personne voyait le focus sauter et rien d'autre. Les tests d'accessibilité passaient ; une relecture avec des captures d'écran de téléphone l'a repéré.

**Question détectrice.** Juste après avoir utilisé le contrôle, sans bouger de là où il se trouve, l'utilisateur voit-il ce qui a changé ? Et sur téléphone aussi ?

**Signal d'alarme.** « Ça marche, ça ne se voit simplement pas. » · « Le focus va bien sur le champ, et le lecteur d'écran lit l'erreur. »

**Que faire.** Chaque contrôle dit ce qui a changé et amène l'utilisateur jusqu'à cet endroit. Et avant de masquer quelque chose, vérifiez quels autres éléments se trouvent à l'intérieur. L'erreur d'un formulaire s'affiche juste sous son champ, rattachée à lui (`aria-describedby`, avec `aria-invalid` qui marque le champ), et non à côté du bouton ; vérifiez-le sur une capture d'écran de téléphone (voir la leçon 45 et WEB-4).

### 33. Le glyphe n'est pas le texte

`from: ba84572f` · `by: ai`

**L'idée.** En petits caractères, « ÷ » et « + », « l » et « 1 », « O » et « 0 » se confondent. Si deux personnes lisent la même chose de travers, elles ne sont pas distraites : c'est la taille des caractères.

**Exemple.** Deux personnes différentes ont lu « 98 ÷ 441 » comme « 98 + 441 » sur une carte en petits caractères, et toutes deux ont signalé que le calcul était faux.

**Autre exemple.** La police de code d'un support a fusionné `>=` en un seul symbole, ⩾. Celui qui apprend recopie ce qu'il voit, et ce symbole n'existe ni sur le clavier ni dans le langage.

**Question détectrice.** À la taille et avec la police où il sera lu, ce symbole peut-il être confondu avec un autre, ou ressemble-t-il à quelque chose qu'on ne peut pas taper ?

**Signal d'alarme.** « Chez moi, ça a l'air bien. »

**Que faire.** Quand un symbole se confond, remplacez-le par un mot : « 98 sur 441 » au lieu de « 98 ÷ 441 ».

### 41. Vérifier dans le format que le lecteur voit réellement

`from: 10a08b3c` · `by: ai`


**L'idée.** Trouver un mot dans le texte ne prouve pas qu'il s'affiche. Le texte peut se trouver ailleurs dans le document pendant que le format censé l'afficher sort vide.

**Exemple.** Trois étapes numérotées sont sorties sous forme de puces vides. La vérification automatique les a validées parce que ces mots apparaissaient ailleurs dans le document.

**Autre exemple.** Un avertissement « il y a d'autres colonnes à droite » avait été ajouté et considéré comme fait parce que le code était là. Il n'apparaissait jamais : un style de tableau général supprimait la condition qui l'activait. Quelqu'un d'autre l'a vu sur une capture d'écran.

**Encore un exemple.** Une option de réponse disait « Total : {2 * 78} » dans le fichier. Quand la page a été dessinée, le système a calculé ce qui se trouvait entre les accolades et a affiché « Total : 156 » : deux options identiques. Seule une personne qui a regardé l'écran l'a vu.

**Variante.** Les captures d'écran que juge un relecteur peuvent montrer un écran que personne n'atteint. L'outil de capture d'un cours répondait à chaque exercice de code par une ligne de remplissage juste pour passer à la suite, si bien que la capture « après » montrait cette ligne et un message « pas le résultat attendu » : les relecteurs ne voyaient jamais ce que voit l'apprenant après une bonne réponse. Sur ordinateur, les captures incluaient aussi l'en-tête et le menu latéral, et la leçon sortait en une bande illisible. Pour capturer en vue d'une relecture, répondez à chaque étape comme le ferait un utilisateur qui réussit, et ne capturez que la partie relue.

**Question détectrice.** Ai-je vu l'élément exact tel que le lecteur le voit, ou ai-je seulement trouvé le mot (ou le code) dans la source ?

**Signal d'alarme.** « Le mot est dans le fichier » · « c'est une correction d'une ligne ».

**Que faire.** Vérifiez l'élément exact, par exemple « ces trois étapes, en puces », et regardez la page comme le lecteur la verra au moins une fois. Une petite correction se vérifie aussi : c'est justement là qu'on attend le moins qu'une autre règle la remplace. Et la première fois que vous utilisez une nouvelle ressource sur la page (un bloc de code, un en-tête fixe), regardez-la aussi sur mobile.

### 45. Quelqu'un parcourt aussi le chemin d'erreur

`from: 93409a9c` · `by: ai`

**L'idée.** Si vous ne testez que ce qui se passe quand tout va bien, celui qui fait une erreur trouve la faille. Et en apprentissage, faire des erreurs est ce qui arrive le plus souvent.

**Exemple.** Une cellule de requête ne comptait une tentative que lorsque la requête s'exécutait. Avec une faute de frappe, le bouton pour passer à l'étape suivante ne s'activait jamais, et la personne restait bloquée. Les tests réussissaient, parce qu'ils lançaient toujours la requête de départ, qui n'avait aucune erreur.

**Question détectrice.** Si l'utilisateur fait l'erreur la plus probable (une faute de frappe, une réponse vide, deux clics), que voit-il, et peut-il continuer ?

**Signal d'alarme.** « Ça marche avec la bonne réponse. »

**Que faire.** Pour chaque contrôle, testez trois chemins : le bon, l'erreur la plus courante et le vide. Les trois disent ce qui s'est passé et laissent l'utilisateur continuer.

### 46. Ce qui s'exécute à chaque requête ne peut pas grandir avec le contenu

`from: b7ad7ec2` · `by: ai`

**L'idée.** Quelque chose qui se fait à chaque page, comme lire tout le contenu ou recalculer un index, coûte peu avec dix pages et beaucoup avec cent. Cela grandit petit à petit et personne ne le remarque, jusqu'à ce que quelque chose commence à échouer « de temps en temps ».

**Exemple.** Chaque page d'un site lisait et analysait tout le contenu pour construire la table des matières. Seule, une page prenait 0,4 s. Mais la barre latérale demandait une quarantaine de pages à la fois, et ensemble elles prenaient 16 s. Des mois plus tard, les tests ont commencé à échouer lors du changement de page, et l'échec ressemblait à un problème du test.

**Question détectrice.** Cette chose qui s'exécute à chaque requête parcourt-elle tout le contenu ? Combien de temps prend-elle aujourd'hui, combien avec le double, et combien avec beaucoup de requêtes simultanées ?

**Signal d'alarme.** « Ça charge vite en local » · « c'est un échec intermittent ».

**Que faire.** Mesurez sur le serveur compilé et selon la façon dont les gens l'utilisent, avec toutes ses requêtes ensemble, pas une page seule. Mettez en cache ce qui ne change pas pendant que le serveur tourne, et laissez un test qui mesure avec le cas qui l'a réellement rendu lent.

### 49. Une règle générale ne doit pas écraser en silence les règles spécifiques

`from: 4a81cf45` · `by: ai`

**L'idée.** Une règle qui s'applique à tout (un style global, une valeur par défaut) peut écraser ce que chaque élément a décidé pour lui-même, sans qu'aucun avertissement ne vous prévienne.

**Exemple.** Le style de focus clavier, écrit pour tout le site, venait avec son propre rayon de bordure. Comme il était placé au-dessus des styles propres à chaque composant, un bouton en forme de pilule changeait de forme au focus clavier. Personne ne l'a remarqué, parce qu'à la souris le focus n'apparaît pas.

**Question détectrice.** Cette règle générale touche-t-elle à quelque chose que chaque élément décide déjà pour lui-même ? En cas de conflit, laquelle l'emporte ?

**Signal d'alarme.** « Je l'ai rendu global pour ne pas avoir à le répéter. »

**Que faire.** Laissez la règle générale ne toucher que ce qui lui appartient (le contour de focus, pas la forme). Si elle doit l'emporter volontairement, écrivez-le à côté. Et testez-la sur l'élément le plus différent, pas seulement sur le plus courant.

### 57. Une touche n'arrive pas de la même façon sur chaque système

`from: 13762f96` · `by: ai`

**L'idée.** Ce qu'un programme reçoit d'une touche dépend du système et de la disposition du clavier. Sous Windows, AltGr arrive comme Ctrl et Alt à la fois ; sur un Mac, beaucoup de symboles se tapent avec Option ; la même position de touche tape un autre symbole sur une autre disposition. Un code qui filtre les touches selon leurs modificateurs, testé seulement avec la touche que le test envoie, rejette les personnes qui ont bien fait.

**Exemple.** Un exercice web demandait aux apprenants de taper des symboles un par un, et ignorait toute touche accompagnée de Ctrl, pour que les raccourcis ne comptent pas. Sur un clavier de disposition espagnole sous Windows, @ se tape avec AltGr, qui arrive comme Ctrl et Alt : personne avec ce matériel ne pouvait terminer. Le test envoyait @ sans modificateur et passait. Un relecteur l'a trouvé en lisant le code.

**Question détectrice.** Ai-je testé cette touche comme elle arrive sous Windows, sur un Mac et sur une autre disposition, avec ses modificateurs, ou seulement comme le test l'envoie ?

**Signal d'alarme.** « Dans le test, ça passe. »

**Que faire.** Avant de filtrer une touche selon ses modificateurs, listez comment elle arrive sur chaque système (AltGr : Ctrl et Alt sous Windows, ce que `getModifierState("AltGraph")` permet de distinguer ; Option : `altKey` ; Command : `metaKey`), ou acceptez la touche quand `event.key` est le caractère attendu, quels que soient les modificateurs reçus. Écrivez le test avec l'événement que chaque système envoie, pas avec le seul caractère (voir la leçon 13). Ce qui ne peut pas être simulé (un raccourci que le système se réserve) reçoit une autre voie sur le même écran, et une personne l'essaie sur une vraie machine.

### 59. Un événement venant de quelque chose déjà remplacé ne doit pas agir

`from: 7847058f` · `by: ai`

**L'idée.** Quand quelque chose peut être relancé avant que le précédent ait fini (un micro, une recherche, une connexion, un minuteur), le rappel tardif de l'ancien arrive pendant que le nouveau tourne. S'il ne vérifie pas qu'il est toujours l'instance en cours, il agit sur l'état nouveau : il redémarre, envoie ou écrase.

**Exemple.** Un bouton de dictée lançait un moteur de reconnaissance vocale ; à son événement « fin », il envoyait le texte ou, si l'écoute était encore active, il redémarrait. Entre « terminé » et cet événement, il s'écoulait une demi-seconde pendant laquelle le bouton était déjà revenu à « parler ». Un clic rapide a lancé un nouveau moteur, et l'événement de fin de l'ancien a constaté « écoute encore active » et s'est relancé. Le micro est resté allumé pendant que la voix de synthèse de l'autre côté répondait, et l'a transcrite comme si la personne l'avait dite.

**Question détectrice.** Si ceci est relancé avant que le précédent ait fini, le rappel tardif du précédent peut-il agir sur le nouveau ? Qu'est-ce qui empêche de le relancer pendant que le précédent est encore en train de se fermer ?

**Signal d'alarme.** « Quand ça se termine, ça vérifie le drapeau et décide »

**Que faire.** Chaque rappel vérifie d'abord qu'il est toujours l'instance en cours (`if (current !== me) return`), et le contrôle reste désactivé (ou `aria-disabled`, voir la leçon WEB-4) pendant que le précédent finit de se fermer. Pour le tester, double-cliquez, ou lancez deux recherches à la suite dont la première est plus lente.

### 73. Une page qui doit convaincre se conçoit à partir de ce qu'elle montre

`from: a71c6a9e` · `by: ai`

**L'idée.** Une page qui doit convaincre quelqu'un (s'inscrire, acheter, assister) se construit à partir des images et des éléments que les gens voient ; les mots viennent avec eux. Écrite d'abord en texte puis décorée, elle se lit comme un document, pas comme une invitation.

**Exemple.** Une page d'inscription à un cours en direct gratuit était juste (accessible, honnête, soignée), mais faite de paragraphes et d'une carte avec la date. Le propriétaire la trouvait « trop sobre, sans images ». Reconstruite à partir de ce qu'elle montre (l'élément unique que personne d'autre n'a sur le premier écran, chaque section portée par une image ou un élément lourd, environ 80 mots par écran), elle a été approuvée immédiatement.

**Question détectrice.** Si je supprime chaque mot de la page, que dit encore chaque section avec ce qui reste ? Le premier écran montre-t-il le résultat promis, ou se contente-t-il de le décrire ?

**Signal d'alarme.** « Le contenu est prêt ; on ajoutera des images plus tard. »

**Que faire.** Avant le premier paragraphe, listez ce que la page peut montrer (de vraies photos de la personne, le produit en marche, des données inventées mais cohérentes, dessinées avec du code) et décidez quel élément porte chaque section. Dessinez les images de données ou d'écrans avec du code, pour que chaque chiffre et chaque libellé qu'elles contiennent soit réel ; les photos de personnes, elles, sont de vraies photos. Écrivez ensuite le texte, le minimum qui fonctionne.

### VIDEO-1. Dans une vidéo, chaque action tombe au moment où la narration la nomme

`from: 0fa6dd51` · `by: ai`

**L'idée.** Quand l'écran fait quelque chose avant ou après que la voix le dit, le spectateur regarde ce qu'il n'entend pas et entend ce qu'il ne voit pas. Un clic qui précède son mot enseigne le clic sans son nom.

**Exemple.** Dans une série de vidéos de tableur commentées, construites avec du code, chaque clic était placé à une fraction de sa scène. Un relecteur pédagogique a trouvé des clics tombés avant que la voix ne nomme l'option (une couleur dans un panneau latéral), et une phrase qui commençait par le contexte alors que le curseur faisait déjà son premier clic. La règle qui en est sortie : si une phrase commence par le contexte, ce passage ne contient aucun clic, et chaque clic tombe sur le mot qui le nomme.

**Autre exemple.** Dans la même série, le responsable du cours a dit qu'une vidéo passait d'une idée à la suivante beaucoup trop vite. Une pause sur image fixe de 1 à 1,5 seconde à la fin de chaque nouvelle idée a réglé le problème.

**Encore un exemple.** Dans des vidéos du même genre, la voix disait « on la laisse ouverte, C2:C » alors que l'écran montrait C1:C1000. Une autre phrase disait « on l'entoure de IFERROR » sans dire où va le curseur, et sans nommer les guillemets qui sont tapés. Le relecteur pédagogique les a toutes deux marquées comme à corriger.

**Question détectrice.** Pour chaque clic et chaque frappe de touche dans cette scène, sur quel mot de la narration tombe-t-il ? Ce mot le nomme-t-il ? La narration dit-elle ce que montre l'image, et dit-elle où chaque geste est fait ? Chaque nouvelle idée se termine-t-elle par un moment immobile avant que la suivante ne commence ?

**Signal d'alarme.** « Ça le dit à peu près là » · « c'est une fraction de la scène, ça tombe juste » · « l'image rend ça clair ».

**Que faire.** Si la voix ne donne aucun horodatage par mot, placez chaque action selon la position de son mot dans la phrase (les caractères qui le précèdent), et vérifiez-la dans la vidéo entière à sa vitesse réelle, pas sur des images fixes. Si le moteur de voix fournit des horodatages par mot, placez les actions dessus. Changer de voix ou reformuler une phrase déplace chaque mot : revérifiez la scène. Terminez chaque nouvelle idée par une courte pause sur image fixe, d'environ une seconde, et jugez-la aussi à vitesse réelle. Ce que dit la voix se vérifie sur l'image au moment où elle passe (rendez cette image exacte) ; le moment où chaque action tombe se vérifie à vitesse réelle. Là où la voix et l'image ne concordent pas, changez l'une des deux. La narration dit où est fait chaque nouveau geste, et nomme chaque symbole la première fois qu'il apparaît.

### VIDEO-2. Dans une vidéo, ce qui change sans être montré est signalé

`from: c7d1a08d` · `by: ai`

**L'idée.** Quand l'effet d'une étape est invisible à l'écran (supprimer un espace final, transformer une formule en sa valeur), une vidéo qui montre cette étape a l'air de ne rien faire. Le spectateur ne peut pas cliquer partout pour le découvrir : la vidéo doit donc signaler ce qui a changé et rester assez longtemps immobile pour qu'on voie la marque.

**Exemple.** Une vidéo générée enseignait comment supprimer les espaces superflus dans une colonne de tableur, puis coller le résultat en valeurs uniquement. La colonne nettoyée avait exactement l'air de la colonne sale, et coller les valeurs ne changeait rien de visible. Le responsable du cours l'a regardée et a dit que le changement ne se remarquait pas, et qu'on ne comprenait pas pourquoi coller uniquement les valeurs comptait. Elle a été corrigée avec un point orange sur chaque espace superflu, une scène côte à côte des deux colonnes, et une flèche allant de la cellule source à la formule qui la lit, chacun maintenu immobile un instant.

**Question détectrice.** Son coupé, l'écran montre-t-il ce que cette étape a changé, et y reste-t-il assez longtemps pour être vu ?

**Signal d'alarme.** « La narration l'explique » · « le changement est discret, mais il est là ».

**Que faire.** Pour chaque étape du script, notez ce qui change à l'écran. Si rien de visible ne change, ajoutez une marque (un point, la barre de formule, une flèche, un avant et après côte à côte), maintenez l'image dessus un instant, et dites dans la narration que c'est la marque de la vidéo, et non celle du logiciel.

### WEB-2. Un formulaire public reçoit des robots dès le premier jour

`from: 6a05ed7d` · `by: ai`

**L'idée.** Un formulaire ouvert à Internet n'est pas rempli uniquement par des personnes. Si rien n'arrête les envois automatiques et si celui qui lit les messages ne peut pas faire le ménage, la première vague de spam enterre les vrais clients.

**Exemple.** Dans les deux exécutions de la simulation Web, le formulaire de contact a accepté 650 messages envoyés par un script en quelques secondes, tous disant « merci ». L'administrateur n'avait ni pages ni bouton de suppression : la page d'administration atteignait entre un et six millions de pixels de haut, et sur mobile le texte du message sortait de l'écran. Dans les deux cas, le constructeur l'a noté comme en attente.

**Question détectrice.** Si demain mille faux messages arrivent, comment le responsable trouvera-t-il le seul vrai, et comment supprimera-t-il les autres ?

**Signal d'alarme.** « C'est un petit site, personne ne va l'attaquer » · « on ajoutera la limite plus tard ».

**Que faire.** Dès le départ, un frein peu coûteux : un champ caché que les gens ne remplissent pas, et une limite d'envois par adresse et par minute. Et une administration avec des pages, les plus récentes en premier, et un moyen de supprimer ou de marquer comme indésirable. Testez en envoyant des centaines de messages avec un script et en ouvrant l'administration sur un téléphone.

### WEB-3. Un repli que personne n'a testé n'est pas un repli

`from: c0e4cb66` · `by: ai`

**L'idée.** Un formulaire avec `method` et `action` promet un repli qui fonctionne même si JavaScript échoue. Si le serveur ne répond qu'à ce que JavaScript attend, la promesse est fausse et la personne se retrouve face à du code.

**Exemple.** Dans les deux exécutions de la simulation Web, le formulaire était envoyé avec JavaScript et déclarait `method="post"`. Sans JavaScript, dans une version le serveur rejetait l'envoi avec une ligne de JSON et le message était perdu ; dans l'autre, il enregistrait le message et n'affichait que `{"ok":true}` sur une page blanche. Le résumé de cette seconde version disait qu'il n'enverrait pas sans JavaScript.

**Question détectrice.** Si ce fichier JavaScript ne se charge pas, que voit la personne quand elle envoie le formulaire ?

**Signal d'alarme.** « Tout le monde a JavaScript de toute façon » · « je laisse l'`action` au cas où ».

**Que faire.** Choisissez l'une des deux options et testez-la : soit le serveur accepte l'envoi normal et répond par une page (ou redirige vers une page de remerciement), soit le formulaire ne déclare pas de repli qu'il n'a pas. Envoyez une fois avec JavaScript désactivé.

### WEB-4. Si vous désactivez le bouton, le focus part avec lui

`from: 4dc9e2b6` · `by: ai`

**L'idée.** Désactiver le bouton pendant l'envoi empêche un double envoi, mais le bouton perd le focus et le navigateur le place sur le document. Quelqu'un qui utilise le clavier, après l'avis, recommence depuis le début.

**Exemple.** Dans les deux exécutions de la simulation Web, l'envoi désactivait le bouton. Avec un e-mail rejeté par le serveur, l'avis apparaissait sous le bouton, le focus tombait sur le document, et la touche Tab suivante amenait l'utilisateur au premier lien de la page, loin du champ à corriger.

**Question détectrice.** Après l'envoi, qu'il ait réussi ou échoué, où se retrouve le focus et où va la touche Tab suivante ?

**Signal d'alarme.** « Je le désactive pour que personne n'envoie deux fois. »

**Que faire.** Quand l'envoi se termine, placez le focus là où la personne doit continuer : sur le champ en erreur (marqué avec `aria-invalid` et son message à côté) ou sur l'avis de succès. Ou empêchez le double envoi sans désactiver, avec `aria-disabled` et un indicateur. Parcourez l'erreur en n'utilisant que le clavier.

### WEB-5. Une connexion par mot de passe sans limite de tentatives n'est pas plus solide que le mot de passe le plus faible

`from: 0e974320` · `by: ai`

**L'idée.** Une connexion qui répond à chaque mauvais mot de passe à pleine vitesse permet à n'importe qui d'en essayer des milliers par minute. Un mot de passe par défaut solide masque le problème tant que le propriétaire n'en choisit pas un lui-même, et rien n'empêche que ce choix soit court.

**Exemple.** Dans les deux exécutions de la relance de la simulation Web, la page d'administration demandait un mot de passe et ne limitait jamais les échecs : 200 mauvais mots de passe d'affilée ont reçu 200 refus en moins d'une seconde, sans aucun blocage. Le mot de passe par défaut était long et aléatoire, mais le compte rendu de celui qui a construit le site indiquait au propriétaire comment en définir un nouveau, et rien n'exigeait qu'il soit long.

**Question détectrice.** Combien de mauvais mots de passe peut-on essayer sur cette connexion en une minute, et que se passe-t-il après le cinquième ?

**Signal d'alarme.** « Le mot de passe par défaut est solide » · « ce n'est que la page d'administration ».

**Que faire.** Ralentissez ou bloquez les échecs répétés, par adresse et par compte, avec une attente qui s'allonge à chaque fois. Exigez une longueur minimale quand le propriétaire définit un mot de passe. Testez : envoyez vingt mauvais mots de passe d'affilée et vérifiez que les derniers sont refusés.
