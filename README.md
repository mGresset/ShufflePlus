# Shuffle+ v9.9.9 — Candidate v10

Shuffle+ v9.9.9 accélère la synchronisation de l'interface avec Spotify sans transformer l'horloge locale en polling réseau permanent.

## Principales améliorations

- **Suivant instantané** : le prochain morceau connu dans la file Spotify est affiché immédiatement et la progression repart de zéro.
- **Confirmation ciblée** : après une commande Suivant, Shuffle+ effectue plusieurs vérifications fraîches rapprochées jusqu'à ce que Spotify confirme le nouveau titre.
- **Actualisation toutes les 5 secondes** : tableau de bord et mode conduite se recalent plus rapidement lorsque l'application est visible.
- **Pause/Lecture conservée** : les protections des versions 9.9.7 et 9.9.8 restent actives.
- **PWA cohérente** : cache `shuffleplus-v9.9.9` et chargement versionné du runtime.

## Validation

```powershell
npm.cmd run validate
```

La validation couvre les tests applicatifs, le serveur Railway, le build GitHub Pages et le test local.

Consulte `V9.9.9_NOTES.md`, `DEPLOIEMENT-V9.9.9.md` et `INSTALLATION-V9.9.9.txt`.
