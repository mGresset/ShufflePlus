# Shuffle+ v8.4.0

Shuffle+ est une interface web Spotify conçue pour lancer rapidement une playlist ou un mix intelligent, notamment depuis un raccourci Apple. L’application inclut aussi un centre de lancement, un mode conduite, des profils, des recommandations, des statistiques et une synchronisation chiffrée facultative.

## Nouveautés v8.4.0

- design homogène sur l’ensemble des pages ;
- boutons historiques classés automatiquement selon leur fonction : principal, secondaire, discret ou danger ;
- formulaires, sélecteurs et zones de texte reliés à la palette active ;
- treize thèmes prédéfinis et couleur personnalisée conservés ;
- mode conduite enrichi avec progression du titre ;
- aperçu de la file Spotify toujours accessible, même avant son premier chargement ;
- indicateur de fraîcheur de la file ;
- trois prochains titres avec pochette, artiste et durée ;
- lien direct vers le titre actif dans Spotify ;
- premiers composants d’interface extraits d’`app.js` dans des modules testables.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Le déploiement reste compatible avec la chaîne actuelle : Visual Studio Code → GitHub → Railway.

Consulte `V8.4.0_NOTES.md` et `DEPLOIEMENT-V8.4.0.md` pour le détail.
