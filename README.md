# Shuffle+ v9.4.1

Shuffle+ est une application web Spotify conçue pour lancer rapidement une playlist ou un mix personnel, notamment depuis un raccourci Apple sur iPhone.

## Nouveautés v9.4.1

- analyse locale de la **file d’attente Spotify** ;
- durée totale visible de la file ;
- nombre d’artistes distincts ;
- détection des morceaux présents plusieurs fois ;
- signalement des répétitions immédiates du même artiste ;
- indicateur de santé : **File fluide**, **File correcte**, **À surveiller** ou **À actualiser** ;
- informations cohérentes entre l’accueil et le mode conduite ;
- affichage corrigé des pochettes, artistes et durées provenant de la file Spotify normalisée ;
- actualisation automatique de la file après le bouton **Suivant** ;
- actualisation au retour dans l’application lorsque les données sont anciennes ;
- aucune modification forcée de l’ordre Spotify : Shuffle+ informe sans supprimer ni déplacer des titres à l’insu de l’utilisateur.

Les profils contextuels de la v9.3.0, les optimisations réseau de la v9.2.0 et la fiabilité Spotify de la v9.1.0 restent inclus.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

La distribution prête à publier est générée dans `dist/`.

Consulte `V9.4.1_NOTES.md` et `DEPLOIEMENT-V9.4.1.md` pour le détail.
