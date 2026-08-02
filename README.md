# Shuffle+ v9.3.0

Shuffle+ est une application web Spotify conçue pour lancer rapidement une playlist ou un mix personnel, notamment depuis un raccourci Apple sur iPhone.

## Nouveautés v9.3.0

- profils contextuels étendus : **Voiture**, **Maison**, **Écouteurs**, **Matin**, **Travail**, **Sport**, **Soirée** et **Nuit** ;
- reconnaissance locale du nom de l’appareil Spotify : voiture, AirPods/casque ou enceinte domestique ;
- suggestions selon le moment de la journée lorsque l’appareil ne suffit pas ;
- carte de suggestion directement sur l’accueil quotidien ;
- aucune lecture automatique sans action explicite ;
- bouton **Pas maintenant** qui masque la suggestion pendant quatre heures ;
- proposition de configuration lorsqu’un profil ne possède pas encore de mix ;
- mémorisation locale du dernier profil contextuel accepté ;
- sauvegarde et synchronisation des préférences contextuelles ;
- compatibilité maintenue avec les profils, mix et réglages des versions précédentes.

Les optimisations réseau de la v9.2.0 et la fiabilité Spotify de la v9.1.0 restent incluses.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

La distribution prête à publier est générée dans `dist/`.

Consulte `V9.3.0_NOTES.md` et `DEPLOIEMENT-V9.3.0.md` pour le détail.
