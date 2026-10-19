# MoApp Run

Application web mobile-first (HTML/CSS/JavaScript) pour suivre une préparation au semi-marathon d'Hyères 2027. Le frontend est statique et peut être hébergé sur GitHub Pages. L'intégration Strava nécessite Supabase Edge Functions : ne publiez jamais de secret Strava ou de clé `service_role` dans ce dépôt.

## État de cette version

- Interface responsive, navigation mobile et manifeste PWA.
- Saisie manuelle et stockage local des activités.
- Import/export JSON et import CSV simple avec détection prudente de doublons.
- Dashboard alimenté uniquement par les activités réellement ajoutées.
- Base de l'authentification Supabase et appels aux fonctions Strava.
- Le backend, les secrets, les politiques de sécurité et l'application Strava doivent être configurés avant toute synchronisation réelle.
- Les fichiers FIT/GPX/TCX et les traces point par point ne sont pas encore implémentés dans cette version.
- Les séances affichées sont une base générique prudente, pas un plan individualisé validé.

## 1. Publier le frontend

1. Crée un dépôt GitHub, par exemple `moapp-run`.
2. Ajoute les fichiers du dossier `moapp-run/`.
3. Dans **Settings → Pages**, choisis **GitHub Actions** comme source.
4. Le workflow `.github/workflows/pages.yml` publie le site à chaque push sur `main`.

Le frontend fonctionne en mode local sans Supabase. Pour utiliser le cloud, configure les variables GitHub Actions `SUPABASE_URL` et `SUPABASE_ANON_KEY` (variables de dépôt, pas des secrets privés), le workflow génère alors `config.js` à la publication. Le modèle est fourni dans `config.example.js`. L'URL Supabase et la clé `anon`/publishable sont publiques par conception ; elles doivent être protégées par des politiques RLS. N'ajoute jamais de clé `service_role` ou de secret Strava ici.

## 2. Configurer Supabase

1. Crée un projet Supabase.
2. Dans **Authentication → URL Configuration**, ajoute l'URL GitHub Pages à la liste des URL autorisées (y compris le chemin de base du dépôt).
3. Exécute `supabase/migrations/0001_initial.sql` dans le SQL Editor ou avec la CLI.
4. Déploie les fonctions décrites dans `supabase/functions/`.
5. Configure les secrets côté Supabase :
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REDIRECT_URI` (URL publique de la fonction `strava-oauth-callback`)
   - `APP_REDIRECT_URL` (URL du frontend GitHub Pages)
   - les secrets Supabase standards sont fournis par l'environnement Edge Functions.
6. Dans **Strava API settings**, configure le callback/Authorization Callback Domain selon les valeurs de la documentation Strava actuelle. Les paramètres exacts peuvent dépendre de la configuration du portail développeur Strava.
7. Configure l'URL Supabase et la clé publique pour le frontend publié, en suivant `config.example.js`. Ces deux valeurs sont publiques, mais les politiques RLS restent indispensables.

> Important : le callback Strava doit être une URL HTTPS publique pointant vers la fonction backend, jamais vers un fichier HTML contenant le client secret.

## 3. OAuth Strava

Le flux attendu est :
1. L'utilisateur se connecte avec Supabase Auth.
2. `strava-auth-url` crée un état aléatoire associé à son utilisateur et retourne l'URL d'autorisation Strava.
3. Strava redirige vers `strava-oauth-callback`.
4. La fonction valide l'état, échange le code côté serveur et conserve les jetons dans une table non accessible au client.
5. L'utilisateur déclenche la synchronisation depuis l'écran Activités. La fonction `strava-sync` utilise le jeton côté serveur, renouvelle le jeton expiré si besoin, et renvoie les résumés autorisés.
6. La révocation/déconnexion doit supprimer les jetons et les données selon le choix de l'utilisateur et les obligations Strava.

Les fonctions incluses sont un **squelette de démarrage à auditer et tester avant production**. Vérifie les champs d'autorisation demandés, les règles de conservation et les exigences actuelles de Strava. Les activités détaillées et les points GPS nécessitent des scopes et endpoints supplémentaires si autorisés.

## 4. Développement local

Un serveur statique local évite les différences d'URL :
```bash
python3 -m http.server 8000
```
Puis ouvre `http://localhost:8000`. Le flux OAuth ne fonctionnera pas avant la configuration HTTPS et des URL de redirection.

## 5. Données

- Mode local : les activités saisies sont stockées dans `localStorage` du navigateur. Elles ne sont pas automatiquement synchronisées entre appareils.
- Cloud : après configuration, Supabase Auth et PostgreSQL fournissent la synchronisation. Les activités locales ne sont pas supprimées automatiquement.
- Strava : la connexion utilise OAuth officiel. Les données disponibles dépendent des autorisations accordées et de l'API.
- Exporte régulièrement le JSON. Ce n'est pas une sauvegarde serveur tant que le cloud n'est pas configuré.

## 6. Vérifications recommandées avant production

- Tester OAuth avec un compte Strava de test et les URL de redirection exactes.
- Tester renouvellement/révocation des jetons et état OAuth expiré/réutilisé.
- Vérifier RLS avec deux comptes distincts.
- Ajouter tests automatisés d'import, calculs et doublons.
- Ajouter limites de débit, journalisation sans données personnelles et gestion des quotas Strava.
- Vérifier les exigences de marque et les règles de Strava.
- Vérifier l'installabilité PWA sur la version iOS cible.

## Objectif sportif initial

- Semi-marathon visé : 21 mars 2027, date à confirmer.
- Objectif déclaré : 1 h 55 (allure théorique ≈ 5 min 27 s/km).
- Records déclarés non vérifiés : 5 km en 24 min 23 s ; 10 km en 57 min 52 s.
- Première séance de préparation : à déterminer à partir de l'archive réelle de l'utilisateur. Aucune performance personnelle n'est inventée.
