# Shuffle+ v9.9.10 — Candidate v10

Shuffle+ v9.9.10 rend la commande **Suivant** plus fiable en laissant Spotify appliquer le changement avant la première lecture d’état, tout en accélérant la synchronisation automatique visible.

## Principales améliorations

- **Première vérification après 700 ms** : aucun appel de lecture n’est lancé immédiatement après la commande Suivant.
- **Confirmation toutes les 700 ms** : Shuffle+ vérifie ensuite l’identifiant du titre jusqu’au changement confirmé, pendant 5,6 secondes maximum.
- **Aucune prédiction de file** : le titre courant reste affiché et sa barre est figée jusqu’à la confirmation réelle de Spotify.
- **Protection contre les réponses anciennes** : une courte garde empêche une requête partie avant la confirmation de réafficher l’ancien morceau.
- **Actualisation toutes les 2 secondes** : tableau de bord et mode conduite se recalent plus vite lorsque l’application est visible.
- **Pause/Lecture conservée** : les protections de stabilité des versions précédentes restent actives.
- **PWA cohérente** : cache `shuffleplus-v9.9.10` et chargement versionné du runtime.

## Validation

```powershell
npm.cmd run validate
```

La validation couvre les tests applicatifs, le serveur Railway, le build GitHub Pages et le test local.

Consulte `V9.9.10_NOTES.md`, `DEPLOIEMENT-V9.9.10.md` et `INSTALLATION-V9.9.10.txt`.
