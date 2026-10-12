# Ritual

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · **Français** · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**Claude se trompe une fois. Ritual veille à ce que ce soit la dernière.**

Ritual est un plugin pour Claude Code, utilisable dans n'importe quel projet. Il repose sur une seule idée : **chaque erreur devient une leçon, chaque leçon devient une règle, et chaque règle, quand c'est possible, devient un test ou une garde.** D'autres outils notent ce qui a été appris ; celui-ci va plus loin et le vérifie, car une règle qui n'existe que sous forme de texte finit par être oubliée au milieu d'une longue session, alors qu'une règle qui se vérifie elle-même ne l'est pas.

Il livre 49 leçons de terrain, chacune née d'une vraie erreur ; des paquets par type de projet, dont les leçons viennent de l'observation d'un modèle en train de construire quelque chose puis de le casser ; et une seule commande, `/ritual`, qui transforme les erreurs de votre session en vos propres leçons, et vos leçons en règles qui s'appliquent d'elles-mêmes.

## Installation

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

Ensuite, dans votre projet, tapez `/ritual`. La première fois, il détecte ce que vous construisez à partir de vos dépendances, vous pose une seule question (quels paquets de leçons activer, et dans quelle langue) et crée le dossier `.ritual/`. Ensuite, trois hooks fonctionnent sans que vous ayez rien à faire :

| Hook | Ce qu'il fait | Ce que ça coûte |
|---|---|---|
| **Garde** | Bloque les commandes que votre projet a déjà vu échouer, et indique quoi utiliser à la place. Ses règles se trouvent dans `.ritual/guard.json`, chacune avec un cas qu'elle bloque et un cas qu'elle laisse passer. | Rien, tant qu'elle ne bloque pas. |
| **Journal** | Enregistre, au fil de l'eau, chaque commande qui échoue et chaque correction de votre part (« c'est faux », « refais-le »), avec ce que Claude était en train de toucher. | Rien. |
| **Questions** | La première fois dans une session où Claude s'apprête à modifier un test, un composant, un script, un document ou une requête, ou à lancer une commande ou à faire un commit, il lui montre les questions détectrices de ce groupe. Une fois par groupe et par session. | Une ligne par leçon du groupe, de trois à treize selon le groupe et les paquets. |

Rien de cela ne change ce que fait Claude : cela place simplement devant lui, au bon moment, ce que votre projet a déjà appris.

## Le rituel

Quand vous fermez une session, ou après une erreur qui a fait mal, tapez `/ritual`. Il lit le journal et fait, dans l'ordre :

0. Examine les **candidats** laissés ouverts par le rituel précédent : ce qui aurait pu devenir un test et ne l'est pas devenu.
1. **Liste les erreurs**, en commençant par le journal, et confirme la cause de chacune.
2. Cherche **quelle leçon la couvrait et pourquoi elle ne s'est pas déclenchée**, d'abord dans le groupe de l'erreur. Si l'une la couvrait, il affine sa question détectrice ou son signal d'alarme, ou ajoute l'exemple.
3. Cherche les **faux positifs** : les questions qui ont fait s'arrêter Claude pour rien, et les blocages de la garde qui étaient erronés. Un blocage erroné devient un cas que la règle doit laisser passer.
4. Écrit une **nouvelle leçon** seulement si aucune ne couvre le cas, avec ses cinq parties.
5. **Monte l'échelle** là où c'est possible : un motif de commande devient une règle de garde ; une propriété du code, ou un test qui porte le nom de la leçon, vu échouer face à la vraie erreur avant qu'on lui fasse confiance ; ce qui ne peut pas être automatisé et a déjà cassé deux fois, une ligne dans `CLAUDE.md`. Le reste reste un candidat daté.
6. Enregistre tout ensemble, dans le même commit, et lance le vérificateur.
7. Garde les exemples anonymes et, si une leçon vaut pour n'importe quel projet, vous propose le texte à partager ici. Il ne publie jamais rien de lui-même.

Et `/ritual close`, avant de déclarer quelque chose terminé, parcourt les questions des groupes que vous avez touchés face au changement, et vous indique ce qui manque.

## La bibliothèque

Les leçons se trouvent dans [`lessons/fr/`](lessons/fr/README.md) (l'original est en anglais, dans [`lessons/en/`](lessons/en/README.md)), réparties en sept groupes selon **ce que vous faisiez** au moment où c'est arrivé :

| Groupe | Ce qu'il couvre |
|---|---|
| Écriture et documentation | Documentation, manuels, textes d'écran, contenus, prompts. |
| Chiffres et données | Tableaux de bord, rapports, modèles, tout chiffre affiché. |
| Tests et vérifications | Tests automatisés, validateurs, relectures, calibrage. |
| Scripts et fichiers | Programmes qui écrivent, génèrent ou transforment des fichiers et des données. |
| Interface et design | Écrans, composants, styles, pages. |
| Console et outils | Commandes, serveurs, captures, et l'outil qui gêne. |
| Git et processus | Commits, états, éléments en attente, travail parallèle. |

Au-dessus des groupes se trouvent les **paquets** par type de projet : des leçons qui ne s'appliquent que si vous construisez ce type de projet. Ils vivent dans le fichier de leur groupe avec un préfixe (`WEB-1`), et leurs questions n'apparaissent que si le paquet est activé. Ils sont activés à l'installation et peuvent être modifiés dans `.ritual/config.json`.

| Paquet | Leçons |
|---|---|
| `web` | 4 : ce qui se perd après une écriture interrompue, les robots sur un formulaire public, le repli sans JavaScript, et le focus sur l'envoi. |
| `apps`, `crm`, `ai` | En route, avec la même méthode. |

Chaque leçon a cinq parties, toujours les cinq : **l'idée**, un **exemple** réel et anonyme, la **question détectrice** qui sépare le cas qui s'applique de celui qui ne s'applique pas, le **signal d'alarme** (la phrase que vous vous dites juste avant de refaire l'erreur) et **que faire**. Et un numéro qui ne change jamais : une leçon redondante est marquée comme fusionnée dans une autre, jamais supprimée. Le format complet se trouve dans [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md).

Chacune indique son origine, ainsi que le modèle et le mois où elle s'est produite (`field · ~opus · 2026-08` ; le `~` signifie qu'elle vient de la mémoire, et non d'un enregistrement) :

- `field` : une vraie erreur dans un projet, avec cet exemple.
- `lab` : elle a cassé dans une [simulation](simulations/README.md), et indique quel modèle et quand. Elle devient `field` lorsque quelqu'un la confirme dans son propre projet.
- `proposal` : seulement pour ce qui ne casse pas visiblement (la sécurité), avec une source publique.

Un exemple, la leçon 13 :

> **Un contrôle qui n'a jamais vu l'erreur ne vérifie rien.** Un test qui réussit toujours peut être cassé. La seule façon de le savoir est de le voir échouer face à la vraie erreur. *Question détectrice :* ai-je testé mon contrôle face à l'erreur dans les formes où elle apparaîtrait réellement ? Et face au cas correct ? *Signal d'alarme :* « Il réussit déjà, donc il est bien configuré. »

Ritual applique cette leçon à lui-même : chaque règle de garde, chaque contrôle et chaque hook de ce dépôt porte ses cas, et a été vu échouer avant d'être publié.

## Les leçons des paquets viennent de simulations

Les leçons par type de projet ne sont pas inventées. Un modèle construit une tâche réaliste sans Ritual ; un autre modèle, dans une autre session, fait tourner ce qui a été construit et note ce qui a cassé, avec des preuves. Ce qui casse entre comme leçon ; ce qui ne casse pas n'entre pas. Chaque tâche est exécutée deux fois : ce qui casse les deux fois est une leçon ; ce qui ne casse qu'une fois reste un candidat. Quand un nouveau modèle sort, les tâches sont relancées, et une leçon qui ne casse plus est rétrogradée, avec des données à l'appui. La méthode et les tâches se trouvent dans [`simulations/`](simulations/README.md).

La première était un site pour un atelier de réparation de vélos, avec un formulaire de contact et une page d'administration. Sonnet l'a construit deux fois, et les deux versions échappaient correctement le HTML, gardaient les requêtes à l'intérieur du dossier public et tenaient face à 300 messages simultanés. Malgré cela, les deux perdaient en silence le message arrivé après une écriture interrompue, les deux acceptaient des centaines de messages venant d'un robot sans moyen de les nettoyer, et l'une affirmait que son test passait alors qu'il échouait une fois sur dix. Chaque constat, avec ses preuves, se trouve dans [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md), à côté du code tel qu'il a été laissé.

Ritual est aussi vérifié avec ses propres leçons. WEB-1 a trouvé le même bug dans le journal de Ritual lui-même, et il a été corrigé avec un test vu échouer d'abord.

## Contribuer

La façon la plus simple : **confirmer une leçon**. Si une leçon vous est aussi arrivée, [ouvrez une demande de confirmation](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml) avec votre exemple anonyme et le modèle que vous utilisiez. Chaque confirmation ajoute ce modèle à la liste `seen:` de la leçon : la bibliothèque sait ainsi à quels modèles une erreur s'applique, et quels modèles plus récents ne la commettent plus. Une leçon `lab` ou `proposal` accompagnée d'un exemple réel devient `field`, avec votre nom si vous le souhaitez.

Ritual tourne avec Claude : une leçon qui ne s'est produite qu'avec un autre modèle est vérifiée avec Claude avant que quiconque reçoive sa question ([comment](simulations/README.md#checking-a-contributed-lesson)).

Vous pouvez aussi :

- **[Partager une leçon](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml)** de la vôtre : cinq parties, un exemple anonyme, le groupe auquel elle appartient et le modèle avec lequel elle s'est produite. `/ritual` rédige le texte pour vous.
- **Proposer une tâche de simulation** pour un type de projet qui manque.
- **Relire une traduction** : les leçons sont traduites par un modèle, et chacune l'indique (`by: ai`). Si vous êtes locuteur natif, corrigez-la et signez-la avec votre nom d'utilisateur GitHub. La procédure se trouve dans [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md).
- **Ajouter une règle de garde**, ou un cas qu'elle aurait dû laisser passer.

Avant d'ouvrir une pull request : `npm test`. Il lance le calibrage de chaque contrôle et de chaque hook, vérifie que chaque leçon a ses cinq parties et que les index sont à jour (`node scripts/lessons.mjs --index` les régénère).

## Langues

L'anglais est l'original. Les leçons existent en sept langues : [English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md). Chaque traduction indique de quelle version de l'original elle provient : quand l'original change, le vérificateur avertit que la traduction est périmée.

## Licence

MIT © 2026 Zurishadday
