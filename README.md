# Shuffle+ v9.1.0

Shuffle+ est une application web Spotify conçue pour lancer rapidement une playlist ou un mix personnel, notamment depuis un raccourci Apple sur iPhone.

## Nouveautés v9.1.0

- relances automatiques des commandes Spotify temporaires (`404`, `429`, `502`, `503`, `504`) ;
- respect de l’en-tête Spotify `Retry-After` lors d’une limitation de débit ;
- bascule automatique vers un autre appareil Spotify Connect lorsque le premier ne répond pas ;
- reprise d’un lancement récent après le retour d’Internet ou le retour de Shuffle+ au premier plan ;
- indicateur de fiabilité du profil principal fondé sur les derniers lancements ;
- actualisation automatique de la file d’attente après une lecture confirmée ;
- cadres du menu Réglages harmonisés ;
- libellé **File d’attente Spotify** uniformisé ;
- cache PWA et bootstrap de récupération migrés vers la version 9.1.0 ;
- compatibilité maintenue avec les profils, mix, réglages et données de la v9.0.0 et de la v8.8.0.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

La distribution prête à publier est générée dans `dist/`.

Consulte `V9.1.0_NOTES.md` et `DEPLOIEMENT-V9.1.0.md` pour le détail.
