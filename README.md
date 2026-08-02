# Shuffle+ v8.4.1

Shuffle+ est une interface web Spotify conçue pour lancer rapidement une playlist ou un mix intelligent, notamment depuis un raccourci Apple. L’application inclut aussi un centre de lancement, un mode conduite, des profils, des recommandations, des statistiques et une synchronisation chiffrée facultative.

## Nouveautés v8.4.1

- parcours de configuration Spotify réorganisé en deux blocs lisibles ;
- Client ID présenté dans un champ pleine largeur avec aide explicite ;
- boutons « Enregistrer et continuer » et « Ouvrir Spotify for Developers » alignés sous le champ ;
- rappel clair de ne jamais renseigner le Client Secret ;
- états de l’installation PWA reliés à la couleur du thème actif ;
- suppression des cartes et badges verts fixes dans les réglages PWA ;
- indicateurs de capacités PWA remplacés par des symboles cohérents et accessibles ;
- treize thèmes prédéfinis et couleur personnalisée conservés.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Le déploiement reste compatible avec la chaîne actuelle : Visual Studio Code → GitHub → Railway.

Consulte `V8.4.1_NOTES.md` et `DEPLOIEMENT-V8.4.1.md` pour le détail.
