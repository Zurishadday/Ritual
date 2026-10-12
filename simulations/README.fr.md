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

Pour proposer une nouvelle tâche, ouvrez une issue avec le texte de la tâche et le type de projet qu'elle représente.

## Vérifier une leçon contribuée

Ritual fonctionne dans Claude Code : une leçon ne mérite une question dans la session de quelqu'un que si l'erreur se produit avec Claude. Chaque leçon contribuée et chaque confirmation indique avec quel modèle et en quel mois elle s'est produite.

1. **Elle s'est produite avec Claude, dans un vrai projet, avec son exemple :** elle entre comme `field`, avec ce modèle, après la relecture habituelle (cinq parties, anonyme, pas encore couverte).
2. **Elle s'est produite avec un autre modèle, ou l'exemple est douteux :** le mainteneur transforme la situation en une petite tâche, rédigée comme une demande de client, et la fait tourner avec les modèles Claude actuels, comme dans la méthode ci-dessus.
   - Elle casse avec Claude : elle entre comme `lab` avec ce modèle de Claude, et le modèle de la personne qui l'a contribuée va dans `seen:`.
   - Elle n'a cassé qu'avec l'autre modèle : elle reste un candidat dans l'issue, avec son modèle noté. Personne ne reçoit sa question tant que quelqu'un ne l'a pas vue se produire avec Claude.
3. **Une confirmation** d'une leçon existante ajoute `<modèle> <AAAA-MM>` à son `seen:`. Une leçon vue avec plusieurs modèles est une erreur générale ; une leçon vue seulement avec un ancien modèle est la première qu'une nouvelle exécution vérifie avant de la rétrograder.
