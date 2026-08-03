# Shuffle+ v9.9.12 — Défilement mobile stable

Shuffle+ v9.9.12 corrige le retour automatique de la page pendant un défilement rapide sur iPhone.

## Correction principale

- Le rafraîchissement Spotify toutes les 2 secondes ne reconstruit plus l’ensemble de l’accueil.
- Seule la carte « Maintenant » est mise à jour en place : titre, artiste, pochette, appareil, bouton et progression.
- La position de défilement et l’inertie tactile de Safari ne sont plus interrompues par le polling.
- Les protections Pause/Lecture et Suivant des versions précédentes sont conservées.

## Validation

```powershell
npm.cmd run validate
```

Consulte `V9.9.12_NOTES.md`, `DEPLOIEMENT-V9.9.12.md` et `INSTALLATION-V9.9.12.txt`.
