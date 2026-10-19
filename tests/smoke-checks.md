# Contrôles manuels initiaux

- [ ] Ouvrir le site sur iPhone Safari et vérifier l'absence de débordement horizontal.
- [ ] Ajouter une activité valide puis vérifier les totaux.
- [ ] Tenter une distance ou une durée nulle : le formulaire doit refuser.
- [ ] Exporter JSON puis réimporter : les doublons probables doivent être détectés.
- [ ] Importer un CSV avec champs manquants : aucune valeur physiologique ne doit être inventée.
- [ ] Vérifier que `config.js` et les secrets ne sont pas committés.
- [ ] Tester OAuth Strava avec un compte autorisé, état expiré, refus utilisateur et code invalide.
- [ ] Tester la synchronisation sur deux comptes et vérifier l'isolation RLS.
- [ ] Vérifier le renouvellement et la révocation des jetons.
- [ ] Tester les erreurs API et les quotas.
