# Shuffle+ v8.6.0

Shuffle+ est une interface web Spotify conçue pour lancer rapidement une playlist ou un mix intelligent, notamment depuis un raccourci Apple. L’application inclut aussi un centre de lancement, un mode conduite, des profils, des recommandations, des statistiques et une synchronisation chiffrée facultative.

## Nouveautés v8.6.0

- découpage du rendu PWA et de la configuration Spotify hors de `app.js` ;
- module central de sécurité et ouverture contrôlée des liens Spotify ;
- politique CSP de 15 directives, sans scripts inline ni `eval` ;
- contrôle de sécurité intégré à `npm run check` ;
- préconnexion à Spotify pour accélérer l’autorisation et les appels API ;
- chargement différé des pochettes secondaires ;
- rendu différé des panneaux longs situés hors écran ;
- mesures légères de performance intégrées au diagnostic ;
- thèmes, Client ID personnel, profils et raccourcis Apple conservés.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Le déploiement reste compatible avec la chaîne actuelle : Visual Studio Code → GitHub → Railway.

Consulte `V8.6.0_NOTES.md` et `DEPLOIEMENT-V8.6.0.md` pour le détail.


## Version 8.6.0

La palette du thème actif est désormais appliquée strictement aux cartes et états PWA dans les réglages, sans fond vert hérité.
