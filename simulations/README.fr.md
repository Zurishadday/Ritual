# Simulations

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · **Français** · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Les leçons des paquets (`web`, `apps`, `crm`, `ai`) ne sont pas inventées. Elles viennent de l'observation d'un modèle en train de construire quelque chose, puis de le casser. Chaque simulation est une tâche réaliste, rédigée comme le ferait un client, qu'un modèle construit sans Ritual. Ensuite, un autre modèle, dans une autre session, fait tourner ce qui a été construit et note ce qui a cassé, avec des preuves. Ce qui casse devient une leçon avec `origin: lab · <modèle> · <année-mois>` ; ce qui ne casse pas n'entre pas.

## Méthode

1. **Construire** avec un modèle mécanique (Sonnet), dans un dossier propre, en utilisant le texte de `TASK.md` tel quel et rien d'autre. Il ne voit ni les leçons, ni les hooks, ni ce dossier.
2. **Relire** avec un modèle de jugement (Opus), dans une autre session, en utilisant `REVIEW.md`. Il fait tourner ce qui a été construit et essaie les chemins que les gens empruntent vraiment (entrée vide, erreurs, double clic, mobile, clavier). Il cherche aussi ce qui ne plante pas mais reste faux (un mot de passe, un texte non échappé). Chaque constat est accompagné de sa preuve : la commande et sa sortie, ou ce qui a été vu à l'écran. Le relecteur ne corrige rien.
3. **Rédiger les leçons** avec le même modèle de jugement, en cinq parties. Le relecteur humain du dépôt les intègre ensuite : il vérifie qu'aucune n'est déjà couverte par le noyau, et lance le vérificateur.
4. **Chaque tâche est exécutée deux fois.** Ce qui casse les deux fois est une leçon ; ce qui ne casse qu'une fois reste un candidat.

Chaque exécution est enregistrée dans `<tâche>/runs/<année-mois>-<modèle>-<n>/` (`2026-10-sonnet-1`, `2026-10-sonnet-2`) : le code tel qu'il a été laissé (c'est le projet d'exemple avec de vrais bogues, et le cas de calibrage de ses leçons) et `FINDINGS.md`.

## Comment répéter une simulation

Quand sort un nouveau modèle, la tâche est relancée. Une leçon qui ne casse plus n'est pas supprimée : elle est rétrogradée (`demoted`, dans la configuration du projet qui l'utilise), et l'exécution le consigne. Ainsi, la bibliothèque se réduit d'elle-même quand les modèles s'améliorent, sur la base de données.

C'est le script qui le fait : `node scripts/simulate.mjs <task>` (par exemple `web`). Sonnet construit et Opus relit, deux fois, chacun dans sa propre session Claude Code isolée, et le script compare les exécutions : une leçon dont l'erreur s'est reproduite dans toutes les exécutions est confirmée avec ce modèle, et une leçon dont l'erreur ne s'est produite dans aucune exécution est candidate à la rétrogradation. Vérifiez d'abord l'isolation avec `node scripts/simulate.mjs --probe` : le modèle qui construit ne doit voir ni votre CLAUDE.md, ni votre mémoire, ni vos plugins, et il doit pouvoir démarrer un site et y accéder. Rien dans la bibliothèque ne change tant que le mainteneur ne l'applique pas avec `/maintain`.

Pour proposer une nouvelle tâche, ouvrez une issue avec le texte de la tâche et le type de projet qu'elle représente.

<a name="ab"></a>

## Ritual aide-t-il ? Un A/B sur la tâche web

La même tâche (la demande web en espagnol), le même constructeur (`claude-sonnet-5-5`) et le même relecteur (`claude-opus-5-5`), 2026-10, avec Claude Code 2.1.295–2.1.296. Sans Ritual, puis avec les hooks de Ritual chargés et le projet configuré avec le paquet `web` (`--with-ritual`). Puis la reprise : le même constructeur, sans Ritual, reçoit les constats du relecteur pour une construction et les corrige (`--fix`), afin que le coût de construire et celui de corriger ce qui restait se comparent en totalité.

| | Erreurs couvertes par les leçons, apparues (sur 9) | Nouvelles erreurs | Construction | Corriger ce qui a été trouvé | Construction + correction |
|---|---|---|---|---|---|
| Sans Ritual ([1](web/runs/2026-10-sonnet-5-5-1), [2](web/runs/2026-10-sonnet-5-5-2)) | 7, 8 | 6, 7 | $0.28, $0.27 | $0.53, $0.45 | **$0.82, $0.72** |
| Questions seulement ([1](web/runs/2026-10-sonnet-5-5-ritual-1), [2](web/runs/2026-10-sonnet-5-5-ritual-2), [3](web/runs/2026-10-sonnet-5-5-ritual-3)) | 6, 9, 8 | 4, 4, 7 | $0.26, $0.27, $0.27 | | |
| Avec Ritual aujourd'hui ([1](web/runs/2026-10-sonnet-5-5-ritual-v2-1), [2](web/runs/2026-10-sonnet-5-5-ritual-v2-2), [3](web/runs/2026-10-sonnet-5-5-ritual-v2-3)) | **1, 2, 2** | 4, 5, 4 | $0.38, $0.53, $0.60 | $0.24, $0.17, $0.29 | **$0.63, $0.70, $0.90** |

Ce qu'il montre :

- **Erreurs :** les erreurs couvertes par les neuf leçons sont apparues en moyenne 7,5 fois par construction sans Ritual, 1,7 avec : environ trois quarts de moins. Les nouvelles erreurs, hors des leçons, sont passées de 6,5 à 4,3.
- **Coût :** construire avec Ritual coûte plus cher (environ $0.23 de plus par construction : il conçoit pour les leçons et revient une fois pour vérifier). Corriger ce qui reste coûte environ la moitié (−52 % en argent, −53 % en tokens de sortie : 24 300 contre 11 300 en moyenne). Construction plus correction reviennent à peu près au même prix : $0.77 contre $0.74 en moyenne, un écart plus petit que celui entre les exécutions. Le résultat final part de bien moins d'erreurs pour le même prix.
- **Les questions seules n'ont rien changé.** La version qui n'affichait que les questions de chaque groupe pendant l'écriture a fini là où la construction sans Ritual avait fini. Ce qui a changé le résultat, ce sont les leçons de paquet au début et à la clôture, qui renvoient le constructeur une fois avant qu'il ne termine.

Ce qu'il ne montre pas : il s'agit d'une seule tâche, de deux ou trois exécutions par bras et d'un seul modèle. Trouver les erreurs n'est pas compté : la relecture coûte $1.30–$2.40 par construction, le même pour les deux bras. Chaque construction et correction qui en parle indique que le shell a été refusé pour les commandes tentées, dans les deux bras ; aucune n'a donc fait tourner le site : la vérification web automatique de la clôture n'a jamais été exécutée, et les corrections n'ont pas été relues à nouveau.

## Vérifier une leçon contribuée

Ritual fonctionne dans Claude Code : une leçon ne mérite une question dans la session de quelqu'un que si l'erreur se produit avec Claude. Chaque leçon contribuée et chaque confirmation indique avec quel modèle et en quel mois elle s'est produite.

1. **Elle s'est produite avec Claude, dans un vrai projet, avec son exemple :** elle entre comme `field`, avec ce modèle, après la relecture habituelle (cinq parties, anonyme, pas encore couverte).
2. **Elle s'est produite avec un autre modèle, ou l'exemple est douteux :** le mainteneur transforme la situation en une petite tâche, rédigée comme une demande de client, et la fait tourner avec les modèles Claude actuels, comme dans la méthode ci-dessus.
   - Elle casse avec Claude : elle entre comme `lab` avec ce modèle de Claude, et le modèle de la personne qui l'a contribuée va dans `seen:`.
   - Elle n'a cassé qu'avec l'autre modèle : elle reste un candidat dans l'issue, avec son modèle noté. Personne ne reçoit sa question tant que quelqu'un ne l'a pas vue se produire avec Claude.
3. **Une confirmation** d'une leçon existante ajoute `<modèle> <AAAA-MM>` à son `seen:`. Une leçon vue avec plusieurs modèles est une erreur générale ; une leçon vue seulement avec un ancien modèle est la première qu'une nouvelle exécution vérifie avant de la rétrograder.
