# Shuffle+ v9.9.0 — Candidate v10

Shuffle+ v9.9.0 est la version de pré-finalisation du projet. Elle conserve les fonctions Spotify, iPhone, PWA, synchronisation, thèmes, mix, profils et mode conduite des versions précédentes, puis ajoute une étape de validation explicite avant la v10.0.0.

## Nouveautés

- panneau **Pré-finalisation v10** dans Réglages > mode Expert ;
- score de préparation séparant contrôles automatiques et essais réels ;
- cinq validations terrain : Spotify, PWA iPhone, Railway, sauvegarde/restauration et mode conduite ;
- export privé d’un rapport de préparation v10 ;
- sauvegarde et synchronisation de l’état de validation ;
- contrôle CI `check-release-readiness.mjs` ;
- vérification des ressources PWA, du serveur `/health`, des fichiers de version et des secrets potentiels ;
- cache PWA `shuffleplus-v9.9.0`.

## Validation locale

```powershell
npm.cmd run validate
```

La v10.0.0 ne devra être créée qu’après confirmation des cinq essais terrain dans l’application et correction des éventuels problèmes découverts.

Consulte `FINALISATION-V10.md`, `V9.9.0_NOTES.md` et `DEPLOIEMENT-V9.9.0.md`.
