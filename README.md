# Shuffle+ v9.5.0

Shuffle+ est une application web Spotify conçue pour lancer rapidement une playlist ou un mix personnel, notamment depuis un raccourci Apple sur iPhone.

## Nouveautés v9.5.0

- **Centre de fiabilité** dans les Réglages ;
- état synthétique de Spotify, Railway, de la PWA et de l’appareil/file d’attente ;
- contrôle réel de l’endpoint `/health` Railway avec latence et version ;
- journal local limité et dédupliqué des événements importants ;
- événements génériques qui ne stockent ni titres, ni playlists, ni noms d’appareils ;
- récupération guidée : reconnexion Spotify, détection d’appareils, actualisation de la file, réparation PWA, contrôle Railway et reprise d’un lancement interrompu ;
- rapport JSON exportable sans jetons, secrets ou identifiants personnels ;
- diagnostic technique détaillé conservé dans une section repliable.

La file intelligente de la v9.4.0, le correctif thématique v9.4.1, les profils contextuels v9.3.0, les optimisations réseau v9.2.0 et la fiabilité Spotify v9.1.0 restent inclus.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

La distribution prête à publier est générée dans `dist/`.

Consulte `V9.5.0_NOTES.md` et `DEPLOIEMENT-V9.5.0.md` pour le détail.
