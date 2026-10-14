# Console et outils

Ce qui s'applique quand vous lancez des commandes, des serveurs, des tests ou des captures, et quand l'outil s'interpose entre vous et le système.

### 27. Douter de l'instrument avant de douter du système

`from: 4b9a0956` · `by: ai`

**L'idée.** Si un chiffre n'a pas changé alors qu'il aurait dû, ou a changé juste au moment où vous le regardiez, soupçonnez dans l'ordre : le cache, un autre processus qui écrit dans la même table, l'outil à travers lequel vous regardez, et seulement à la toute fin le système lui-même.

**Exemple.** Une table « avait perdu la moitié de ses colonnes ». Quelques minutes plus tard, elle était complète : vous la regardiez pendant qu'un autre processus la reconstruisait.

**Autre exemple.** Une nouvelle image « ne se chargeait pas » sur la page. Le fichier était bon : le serveur de test ne voyait pas les dossiers créés après son démarrage.

**Encore un exemple.** Un script « calculait mal un motif de texte ». Le script était bon : la console par laquelle on lui passait le code transformait chaque `\n` en un vrai saut de ligne avant que le script ne le lise. Et dans un carnet où les cellules partagent la mémoire, une erreur qui aurait dû apparaître n'est pas apparue : la variable était encore stockée depuis une cellule précédente.

**Question détectrice.** Est-ce que je regarde le système, ou un cache, une copie, ou un outil qui a gardé un ancien instantané de celui-ci ou l'a modifié en cours de route ?

**Signal d'alarme.** « Je l'ai déjà corrigé et c'est toujours pareil » · « cette fois je l'ai vraiment bien tapé ».

**Que faire.** Prenez un second instantané quelques minutes plus tard avant de déclarer un désastre. Si un instrument vous a déjà trompé de la même façon, remplacez-le au lieu de continuer à le surveiller : un raté qui se répète n'est pas de la malchance, c'est le mauvais outil. Une console qui transforme `\n` ou `\\` en cours de route ne convient pas pour lui passer du code : le code va dans un fichier, écrit avec un outil qui n'y touche pas, et s'exécute depuis là. Et tout ce qui est mécanique (une commande qui a déjà échoué trois fois) se bloque par un garde-fou, il ne se retient pas de mémoire.

### 29. Vérifier la commande avant de la transmettre à quelqu'un d'autre

`from: 0c95aa16` · `by: ai`

**L'idée.** Celui qui exécute la commande de quelqu'un d'autre le fait à l'aveugle. Chaque commande cassée érode la confiance qu'il aurait accordée à la suivante.

**Exemple.** Une commande de déploiement contenait un nom de branche tapé de mémoire. La branche avait un autre nom, et celui qui l'a lancée a perdu une demi-heure avant de demander.

**Question détectrice.** Pour chaque nom de cette commande, l'ai-je lu aujourd'hui dans le système, ou l'ai-je tapé de mémoire ?

**Signal d'alarme.** « C'est la même commande que d'habitude. »

**Que faire.** Exécutez-la vous-même avant de la transmettre, et recopiez chaque nom (script, chemin, branche) depuis le système, pas depuis la mémoire.

### 44. Ce que vous retirez de la sortie peut être le verdict

`from: ca6fa003` · `by: ai`

**L'idée.** Ne regarder que les dernières lignes d'un résultat, ou le faire passer par une autre commande, peut jeter justement la partie qui disait « échec ». Une sortie tronquée d'un test raté ressemble exactement à celle d'un test réussi.

**Exemple.** Une page a été marquée comme relue parce que son test « s'était terminé sans erreur ». Le résultat est passé par une commande qui n'affichait que la fin, et l'avis disant que le test avait échoué s'est perdu en chemin.

**Autre exemple.** Une suite de tests relançait automatiquement chaque test en échec. Les tests réussis au second essai ne comptaient pas comme échecs, seulement comme « instables », et la cause restait cachée : chaque changement d'étape demandait à nouveau la page au serveur. Sans relance, l'échec apparaissait et pouvait être mesuré.

**Question détectrice.** Est-ce que je lis le verdict (combien ont réussi, combien ont échoué, comment cela s'est terminé), ou seulement un morceau de la sortie ?

**Signal d'alarme.** « Aucune erreur n'est apparue à l'écran » · « les dernières lignes suffisent ».

**Que faire.** Trouvez la ligne du verdict avant de changer un statut. Si vous enchaînez des commandes, assurez-vous que l'échec de la première parvient jusqu'à la fin. Si la sortie n'a pas de verdict, cela signifie « je ne sais pas », pas « c'est passé » (voir la leçon 1). Et enregistrez la sortie complète dans un fichier et cherchez le verdict là : ainsi, vous n'avez pas à décider à l'avance combien lire.

### 53. Le code passe par l'éditeur, pas par le traitement de texte du shell

`from: 34503dce` · `by: ai`

**L'idée.** Réécrire un fichier source avec les outils de chaînes du shell (le lire, remplacer, le réécrire) fait passer le code par des règles conçues pour autre chose : un encodage par défaut, la priorité des opérateurs, le guillemetage et l'échappement. La modification semble juste dans la commande, et le fichier qui en sort est différent de ce que la commande semble dire.

**Exemple.** Deux modifications dans une même session, toutes deux dans Windows PowerShell 5.1. Une lecture-remplacement-écriture d'un script (`Get-Content`, `-replace`, `Set-Content -Encoding utf8`) a lu le fichier dans la page de codes ANSI du système et l'a réécrit en UTF-8 : chaque ✓ et · est devenu `âœ“` et `Â·`, et son auto-contrôle a affiché la marque déformée. Puis une liste de remplacements écrite comme ``@('old', 'new' + "`n" + 'more')`` a perdu des lignes : dans PowerShell, la virgule lie plus fort que `+`, donc chaque paire est devenue quatre éléments, et seul le premier morceau du nouveau texte a été écrit.

**Question détectrice.** Cette modification de code passe-t-elle par l'éditeur, ou par la lecture, le remplacement et l'écriture du shell, avec ses règles d'encodage, de priorité et de guillemets ?

**Signal d'alarme.** « C'est un simple remplacement, je le fais en une seule commande » · « plusieurs remplacements d'un coup, c'est plus rapide ».

**Que faire.** Modifiez le code avec les outils d'édition et d'écriture de l'éditeur. Quand une modification doit être scriptée, écrivez le script dans un fichier et lancez-le avec un interpréteur qui lit et écrit en UTF-8 et dont les littéraux de chaînes sont simples (`node fix.mjs`, `python -I fix.py`). Puis regardez le diff : une modification qui a touché plus de lignes que prévu, ou des caractères que vous n'aviez pas touchés, vient du shell.
