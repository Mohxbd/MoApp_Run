# MoApp Run — version simple

Application statique HTML/CSS/JavaScript, pensée pour Safari sur iPhone et GitHub Pages. Aucun compte Supabase, aucune clé API et aucune synchronisation Strava OAuth.

## Fonctions
- saisie manuelle d'une course ;
- import CSV (dont CSV d'activités Strava, avec colonnes date, distance et durée reconnues) et restauration JSON ;
- détection prudente des doublons probables ;
- statistiques de base : kilomètres de la semaine, nombre d'activités, allure moyenne agrégée ;
- export JSON pour sauvegarde dans l'app Fichiers ;
- manifeste PWA.

## Déployer
Pousse tous les fichiers du dossier à la racine du dépôt GitHub. Dans Settings → Pages, choisis GitHub Actions. Le workflow `.github/workflows/pages.yml` publie les fichiers statiques.

## Utiliser sur iPhone
1. Ouvre l'URL GitHub Pages dans Safari.
2. Dans Strava, demande l'export de tes données si nécessaire. À réception de l'archive ZIP, ouvre-la dans Fichiers et extrais-la.
3. Dans MoApp Run, ouvre Activités → Choisir un CSV ou JSON et sélectionne le CSV récapitulatif des activités.
4. Vérifie le bilan de l'import, puis utilise « Exporter mes données (JSON) » pour faire une sauvegarde.
5. Pour ajouter une activité ponctuelle, utilise le formulaire de saisie manuelle.

## Limites honnêtes
- Les données sont conservées dans le stockage local du navigateur. Elles ne se synchronisent pas automatiquement entre appareils.
- L'import CSV vise le tableau récapitulatif des activités ; il ne lit pas les points GPS de GPX/TCX/FIT et ne produit pas de records officiels certifiés.
- La structure des CSV d'export peut varier. Si l'import ne reconnaît pas les colonnes, ne modifie pas l'archive originale : signale les noms d'en-tête pour adapter le parseur.
- La date du semi-marathon d'Hyères indiquée dans l'application est une cible provisoire à confirmer auprès de l'organisateur.
- Les records 5 km (24:23) et 10 km (57:52) sont des déclarations initiales non vérifiées.
