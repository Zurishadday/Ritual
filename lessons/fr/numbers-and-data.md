# Chiffres et données

Ce qui s'applique quand vous calculez, mesurez ou affichez un nombre : tableaux de bord, rapports, modèles, indicateurs.

### 1. « Je n'ai pas pu le lire » n'est pas « il n'y a rien »

`from: fe96d871` · `by: ai`

**L'idée.** Chaque donnée a trois états : je l'ai, il n'y avait vraiment rien, et je ne sais pas. Les deux derniers se dessinent de la même façon sur un graphique, comme un zéro, alors qu'ils signifient le contraire.

**Exemple.** Une requête échoue à cause d'une autorisation expirée, et le tableau de bord affiche « 0 ventes » pour la région. Personne ne s'en étonne : un zéro a l'air d'une donnée.

**Question détectrice.** Le chiffre que je m'apprête à afficher, ou le « tout va bien » que je m'apprête à croire, pourrait-il venir d'une requête échouée, d'une table vide, d'une autorisation refusée, ou d'un résultat que je n'ai pas lu en entier (voir la leçon 44) ?

**Signal d'alarme.** « Si ça échoue, je mets zéro et je passe à autre chose. »

**Que faire.** Si la lecture échoue, affichez l'erreur sur la carte elle-même, et non un vide ou un zéro. Et un compteur qui affiche « 0 problème » n'est digne de confiance que s'il a d'abord trouvé un problème que vous aviez placé exprès.

### 2. Deux choses qui portent le même nom ne sont pas la même chose

`from: 36e0626d` · `by: ai`

**L'idée.** « Client actif », « date », « le chef », « le seuil » : le même mot cache souvent deux définitions. Quand deux rapports ne concordent pas, c'est presque toujours cela.

**Exemple.** « Date » peut désigner la date de l'événement, la date de chargement ou la date de la partition. Ou « le chef » : le responsable actuel de la personne, ou celui qu'elle avait au moment de ce que vous mesurez.

**Autre exemple.** Une table de campagnes contenait les dépenses de toute l'entreprise, mais le chiffre d'affaires provenait d'un échantillon d'un achat sur cent. Les deux colonnes étaient étiquetées « pesos », et le retour sur investissement sortait négatif pour chaque campagne.

**Question détectrice.** Existe-t-il une règle vraie pour l'une des deux choses et fausse pour l'autre ? Et si je combine deux chiffres dans un même calcul, viennent-ils du même univers, de la même échelle et de la même période ?

**Signal d'alarme.** « C'est la même date » · « la vue filtre déjà » · « ce sont tous les deux en pesos ».

**Que faire.** Donnez à chaque variante un nom différent dans le code et à l'écran, même si c'est laid. Et avant de diviser ou de soustraire deux chiffres provenant de sources différentes, notez d'où vient chacun : si un résultat sort identique dans tous les cas (ils perdent tous, ils gagnent tous), soupçonnez l'échelle avant le métier.

### 3. La période en cours est toujours incomplète

`from: 23269694` · `by: ai`

**L'idée.** Un mois qui n'est pas terminé paraît toujours moins bon qu'un mois clos. Ce n'est pas une tendance : c'est le calendrier.

**Exemple.** La courbe des ventes « chute » au dernier point, qui correspond au mois qui n'est qu'à moitié écoulé.

**Question détectrice.** Ce calcul inclut-il une période qui n'est pas encore terminée ?

**Signal d'alarme.** « On voit déjà la tendance. »

**Que faire.** Arrêtez les indicateurs à la dernière période close, ou signalez la période partielle à l'écran. Et gardez les deux horloges séparées : les chiffres par groupe utilisent les mois clos ; les personnes nommément utilisent le jour en cours.

### 4. Un champ que la source écrase n'est pas un historique

`from: 89a9e01d` · `by: ai`

**L'idée.** Beaucoup de systèmes ne conservent que la valeur du jour. Si vous construisez une variable « historique » sur ce champ, vous mesurez le présent et le déguisez en passé.

**Exemple.** Le système ne garde que le dernier responsable de chaque personne. Pour les personnes parties, ce responsable reste figé, si bien que « le taux de rotation de l'équipe de chaque responsable » finit par mesurer « cette équipe n'existe plus ».

**Question détectrice.** Ce champ garde-t-il sa valeur précédente quand il change, ou la remplace-t-il ?

**Signal d'alarme.** « La colonne est là, je vais simplement l'utiliser. »

**Que faire.** Demandez à la source si la donnée est un instantané ou un historique avant de l'utiliser pour regarder en arrière.

### 5. Un résultat parfait est un avertissement, pas une victoire

`from: 44986978` · `by: ai`

**L'idée.** Si une seule variable sépare presque sans erreur les personnes parties de celles restées, elle contient très probablement le résultat lui-même.

**Exemple.** Un modèle devient soudain bien meilleur. Il s'avère qu'une variable vaut 1 pour toutes les personnes parties et 0 pour toutes celles restées, parce que la source la remplit différemment pour chaque groupe. Autre variante : le modèle apprend en quelle année quelque chose s'est produit, et non à qui cela est arrivé.

**Question détectrice.** Ma mesure de qualité pourrait-elle monter parce que le modèle devine quand quelque chose s'est produit au lieu de deviner à qui c'est arrivé ?

**Signal d'alarme.** « C'est presque parfait ! » · « ajustons pour l'année et passons à autre chose. »

**Que faire.** Testez vers l'avant : entraînez sur le passé et évaluez sur une période ultérieure. Et avant d'ajuster pour un facteur, demandez-vous si ce facteur est justement ce qui décide du résultat que vous voulez prédire.

### 12. Exécuter la requête ne prouve pas que le chiffre est juste

`from: b2232042` · `by: ai`

**L'idée.** « Ça n'a pas échoué » n'est pas « c'est correct ». Comparez à quelque chose d'indépendant de votre propre calcul.

**Exemple.** Une question à choix multiples affirmait que comparer un nombre avec une chaîne de texte entre guillemets provoque une erreur. Dans certains autres moteurs, c'est le cas ; dans celui que les gens utilisaient réellement, la requête s'exécutait et renvoyait des lignes.

**Autre exemple.** Un texte expliquait correctement qu'un bloc nommé n'existe qu'à l'intérieur de sa propre requête, mais son propre exemple supposait que trois requêtes distinctes le partageaient. À l'exécution, la deuxième requête a provoqué une erreur : la table n'existait pas.

**Encore un exemple.** Chaque exemple d'une page a été exécuté, et trois phrases se sont tout de même révélées fausses : l'explication d'une option, écrite à la fin, décrivait ce que fait une ligne sans que personne ne l'ait jamais exécutée ; une règle de lecture des erreurs (« si elle dit ceci, alors il manque cela ») était contredite par une autre étape de la même page ; et l'introduction disait qu'une fonction « renvoie un résultat » alors qu'elle n'en renvoie pas.

**Question détectrice.** Qu'est-ce qui, en dehors de mon propre code, va me permettre de vérifier ce résultat ? Et pour tout ce que le texte dit que le système fait, qu'il s'agisse d'un exemple, d'une règle ou de l'explication d'une option, l'ai-je exécuté sur le vrai moteur ?

**Signal d'alarme.** « Chez moi ça marche » · « ça n'a pas renvoyé d'erreur » · « c'est comme ça que ça marche, je viens de l'expliquer ».

**Que faire.** Recoupez avec un chiffre connu, le système source ou la période précédente. Testez dans l'environnement réel : avec ses autorisations, ses bibliothèques et la copie du code qui s'exécute réellement. Chaque affirmation sur le comportement du système est exécutée une fois avant d'être écrite, y compris celle qui apparaît au passage dans un exemple ou qui est écrite en dernier. Si l'affirmation est une règle générale (« seulement », « toujours », « jamais »), cherchez le cas qui la ferait échouer et exécutez-le aussi : « convertir en entier ne lit que les entiers » a été vérifié avec une chaîne de texte contenant des décimales, et s'est révélé faux pour un nombre à décimales. Quand vous énoncez une fraction (« cinq sur six »), nommez le tout dont elle est une fraction ; et un scénario inventé se vérifie lui aussi : la taille, l'écart et la p-value doivent être cohérents entre eux.

### 36. Mesurer avant d'écrire

`from: 91ed55e0` · `by: ai`

**L'idée.** Chaque chiffre d'un document provient d'une mesure datée et sourcée, et non de la mémoire ou d'une version antérieure du document.

**Exemple.** Une explication disait qu'un bogue faisait perdre « presque un ticket sur cinq ». Mesuré, c'était plus d'un sur cinq : la phrase venait d'un calcul mental, et non des données.

**Autre exemple.** Un texte affirmait qu'un groupe de cohortes « dépassait 50 % » ; cinq des douze étaient en dessous. Dans un autre, l'illustration montrait un calcul fait à la main qui ne tombait pas juste : le pourcentage multiplié par le total ne donnait pas le nombre dessiné.

**Question détectrice.** De quelles données et de quelle date viennent ce chiffre, ou cette comparaison (« plus d'un millier », « plus de la moitié », « presque tous ») ?

**Signal d'alarme.** « C'est le chiffre qu'on avait déjà » · « ça sort à peu près ça » · « on voit bien qu'ils passent tous ».

**Que faire.** Avant d'écrire un chiffre, mesurez-le à nouveau et notez à côté quelles données et quelle date l'ont fourni. Les mots de quantité (« presque », « plus de », « la plupart ») sont des chiffres déguisés : mesurez-les de la même façon. Et si une image contient des calculs, faites en sorte que le même script qui la dessine fasse le calcul.
