# Shuffle+ v9.9.7 — Candidate v10

Shuffle+ v9.9.7 corrige la régression Pause/Lecture observée après la v9.9.5. L’intention locale devient prioritaire sur tous les rendus : une ancienne réponse Spotify ne peut plus réactiver visuellement la lecture ni faire repartir la barre avant la convergence réseau.

## Nouveautés

- panneau **Pré-finalisation v10** dans Réglages > mode Expert ;
- score de préparation séparant contrôles automatiques et essais réels ;
- cinq validations terrain : Spotify, PWA iPhone, Railway, sauvegarde/restauration et mode conduite ;
- export privé d’un rapport de préparation v10 ;
- sauvegarde et synchronisation de l’état de validation ;
- contrôle CI `check-release-readiness.mjs` ;
- vérification des ressources PWA, du serveur `/health`, des fichiers de version et des secrets potentiels ;
- cache PWA `shuffleplus-v9.9.7` ;
- horloge locale de lecture mise à jour toutes les 500 ms ;
- verrou de cohérence Pause/Lecture face aux réponses Spotify retardées ;
- invalidation anti-course du cache `/me/player` avant et après les commandes ;
- vérifications fraîches sans cache jusqu’à confirmation stable de Spotify.

## Validation locale

```powershell
npm.cmd run validate
```

La v10.0.0 ne devra être créée qu’après confirmation des cinq essais terrain dans l’application et correction des éventuels problèmes découverts.

Consulte `FINALISATION-V10.md`, `V9.9.7_NOTES.md` et `DEPLOIEMENT-V9.9.7.md`.
