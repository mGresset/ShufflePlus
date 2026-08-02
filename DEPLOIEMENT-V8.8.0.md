# Déploiement Shuffle+ v8.8.0

1. Partir de `main` en v8.7.1.
2. Créer `release/8.8.0`.
3. Extraire le patch à la racine.
4. Supprimer `startup-recovery-8.7.1.js`.
5. Exécuter `npm.cmd install` puis `npm.cmd run validate`.
6. Committer et pousser la branche.
7. Fusionner localement dans `main`, puis pousser `main`.
8. Vérifier le déploiement Railway et actualiser la PWA.
