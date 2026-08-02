# Shuffle+ v9.0.0

Shuffle+ est une application web Spotify pensée pour lancer une playlist ou un mix personnel en une seule action, notamment depuis un raccourci Apple sur iPhone.

## Nouveautés v9.0.0

- nouvel accueil quotidien centré sur **Lancer ma musique** ;
- profil principal, appareil Spotify et options visibles immédiatement ;
- morceau en cours avec progression, pause/reprise et titre suivant ;
- aperçu des trois prochains morceaux et accès **Liste de lecture** ;
- comportement adapté : file complète dans le mode conduite sur iPhone/iPad, actualisation directe ailleurs ;
- mode **Essentiel** allégé, tandis que le mode **Expert** conserve le tableau de bord avancé ;
- nouvelle feuille `feature-home.css` chargée uniquement pour l’accueil ;
- nouveau module testable `core/daily-home.js` ;
- cache PWA, manifeste et récupération de démarrage migrés vers la version 9.0.0 ;
- compatibilité maintenue avec les profils, mix, réglages et données de la v8.8.0.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

La distribution prête à publier est générée dans `dist/`.

Consulte `V9.0.0_NOTES.md` et `DEPLOIEMENT-V9.0.0.md` pour le détail.
