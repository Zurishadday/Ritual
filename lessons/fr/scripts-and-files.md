# Scripts et fichiers

Ce qui s'applique quand un programme écrit, génère, transforme ou déplace des fichiers et des données.

### 6. La définition métier vit à un seul endroit

`from: 5286faa8` · `by: ai`

**L'idée.** Si la règle qui définit « ce qui compte comme actif » est répétée dans chaque requête, les copies finiront par diverger. Ce n'est pas une question de si, mais de quand.

**Exemple.** Un validateur avait le nombre d'éléments de référence saisi à la main : 43. Quand le document est passé à 47, il a rejeté les quatre nouveaux comme inexistants. Maintenant, il compte les éléments du document lui-même.

**Question détectrice.** Si je modifie cette définition, combien de fichiers dois-je toucher ? Si c'est plus d'un, la règle n'est pas configurée à un seul endroit.

**Signal d'alarme.** « Je le mets aussi ici, ce n'est qu'une ligne » · « ce nombre ne changera pas ».

**Que faire.** Placez la définition en un point que toutes les requêtes traversent, et faites-les toutes lire à partir de là. Un nombre saisi à la main qui recopie une valeur provenant d'ailleurs est aussi une définition répétée.

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

`from: e8ae4ba7` · `by: ai`

**L'idée.** Si vous repérez votre modification en cherchant un texte que l'utilisateur lit, comme un titre ou une étiquette, une autre amélioration se collera par-dessus et votre modification ne la retrouvera plus.

**Exemple.** Une icône d'aide avait été ajoutée à côté de plusieurs titres, et les mises à jour qui se repéraient par ces titres ont cessé de fonctionner.

**Autre exemple.** Une relecture cherchait le texte « int( » pour vérifier qu'on avait converti un nombre, et il correspondait à l'intérieur de « print( » : toute ligne qui affichait quelque chose semblait passer. Ce que vous cherchez doit être un mot entier, pas un morceau d'un autre mot.

**Encore un exemple.** Une relecture prenait la dernière ligne imprimée par le code comme réponse. Avec une fonction qui affiche le nombre à l'intérieur sans le renvoyer, cette ligne existait pour une autre raison : la réponse apparaissait à l'écran, alors que le code ne la livrait jamais.

**Question détectrice.** Le texte que j'utilise comme ancre peut-il exister pour une autre raison, ou quelque chose peut-il grandir à l'intérieur ?

**Signal d'alarme.** « Je m'ancre sur le titre, il est unique. »

**Que faire.** Utilisez des marqueurs à vous, comme un identifiant ou un commentaire de section. Et quand une modification touche plusieurs blocs à la fois, vérifiez-les tous, pas seulement le premier.

### 22. La deuxième exécution est celle qui trouve le bogue

`from: 56b0053e` · `by: ai`

**L'idée.** Une modification qui se répète sans rien casser doit être vérifiée en l'exécutant deux fois, et non une seule.

**Exemple.** Pour vérifier qu'un script ne changeait rien à sa deuxième exécution, la somme de contrôle d'une même exécution a été comparée à elle-même, puis deux sommes prises à partir de listes de fichiers différentes. Les deux comparaisons disaient « identique » ou « différent » sans rien prouver. La comparaison qui fonctionne prend la somme, exécute le script et reprend la somme, à partir des mêmes fichiers et dans une seule commande.

**Question détectrice.** Ai-je exécuté ma modification sur quelque chose qui l'avait déjà appliquée ? Quel autre processus touche ce même texte après moi ?

**Signal d'alarme.** « Ça a bien tourné, donc c'est fini. »

**Que faire.** Exécutez-le deux fois à partir du même point de départ et comparez les fichiers : la deuxième exécution ne doit rien modifier.

### 23. Les adresses fondées sur la position expirent

`from: d94e6ad5` · `by: ai`

**L'idée.** Si vous insérez quelque chose avant « la cellule 9 », la cellule 9 est maintenant une autre cellule.

**Exemple.** Un script a inséré une cellule de titre avant la cellule 9 d'un carnet, puis a modifié « la cellule 9 » : il a modifié la cellule qu'il venait d'insérer.

**Question détectrice.** Cet outil repère-t-il les éléments par leur position, et viens-je d'insérer ou de supprimer quelque chose avant ?

**Signal d'alarme.** « La cellule 9, c'est celle que je viens de regarder. »

**Que faire.** Repérez à nouveau l'emplacement après chaque insertion, et vérifiez le résultat en relisant la structure complète.

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

### WEB-1. Dans un fichier qui ne fait que grandir, une ligne cassée entraîne la suivante

`from: 67b63f0b` · `by: ai`

**L'idée.** Enregistrer chaque enregistrement comme une ligne à la fin d'un fichier est simple et supporte bien un grand nombre d'enregistrements. Mais si une écriture est interrompue, la ligne reste sans son saut de ligne, et l'enregistrement suivant se colle dessus. Ignorer les « lignes abîmées » à la lecture fait disparaître les deux, sans bruit. C'est l'autre face de la leçon 24 : là, le fichier est vidé ; ici, ce qui suit est perdu.

**Exemple.** Dans les deux exécutions de la simulation Web, le formulaire enregistrait chaque message sous forme de ligne JSON, et le panneau d'administration ignorait toute ligne qu'il ne pouvait pas lire. Avec une ligne coupée à la fin du fichier, le message suivant a reçu la réponse « Merci ! », a été enregistré, et n'est jamais apparu dans le panneau d'administration. L'une des deux versions avait un commentaire disant « ligne abîmée : ignorée ».

**Question détectrice.** Si la dernière écriture est restée à moitié faite, que se passe-t-il pour la suivante ? Ce que mon lecteur saute, alerte-t-il quelqu'un ?

**Signal d'alarme.** « Les lignes abîmées sont ignorées » · « ça ne fait qu'ajouter à la fin ».

**Que faire.** Avant d'ajouter, si le fichier ne se termine pas par un saut de ligne, commencez l'enregistrement par un saut de ligne ; ou enregistrez chaque enregistrement dans son propre fichier. À la lecture, comptez les lignes qui n'ont pu être lues et affichez ce compte là où le responsable le verra. Testez en laissant volontairement une ligne coupée, puis en écrivant un enregistrement après elle.
