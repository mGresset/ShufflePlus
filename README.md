# Shuffle+ v9.2.0

Shuffle+ est une application web Spotify conçue pour lancer rapidement une playlist ou un mix personnel, notamment depuis un raccourci Apple sur iPhone.

## Nouveautés v9.2.0

- profil réseau automatique : rapide, standard, économisé ou hors connexion ;
- respect du mode **Économie de données** du navigateur ;
- préchargement des écrans uniquement après une intention réelle : survol, focus ou toucher ;
- préchauffage en arrière-plan réservé aux connexions suffisamment rapides ;
- cache PWA divisé entre coque critique et ressources optionnelles ;
- installation et mise à jour du Service Worker moins dépendantes des outils secondaires ;
- budget de performance adapté au réseau, visible dans le Centre de diagnostic ;
- diagnostic des modules préchargés, du profil réseau et du score de démarrage ;
- ajout des modules `core/network-performance.js` et `core/performance-budget.js` ;
- compatibilité maintenue avec les profils, mix, réglages et données des versions 9.1.0, 9.0.0 et 8.8.0.

Les améliorations de fiabilité Spotify de la v9.1.0 restent incluses : nouvelles tentatives temporaires, appareil de secours, reprise iPhone et actualisation de la file d’attente.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

La distribution prête à publier est générée dans `dist/`.

Consulte `V9.2.0_NOTES.md` et `DEPLOIEMENT-V9.2.0.md` pour le détail.
