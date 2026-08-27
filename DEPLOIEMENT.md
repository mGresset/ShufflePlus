# Déploiement Shuffle+

Procédure de publication de la version courante.

## Validation complète

```powershell
npm.cmd run validate
```

La commande exécute les contrôles JavaScript, les tests applicatifs et serveur, le build GitHub Pages, le contrôle de `dist/` et le smoke test local.

## Publication Git

```powershell
git add -A
git commit -m "Release Shuffle+ v10.0.0 - version finale"
git push origin main
```

## Après publication

1. Fermer complètement Shuffle+ sur l’iPhone.
2. Rouvrir l’application avec Internet actif.
3. Vérifier que l’interface affiche **v10.0.0**.
4. Tester au minimum la connexion Spotify, Pause/Lecture, Titre suivant et le mode conduite.

## Railway et raccourci iPhone

La V10 conserve le serveur Railway **v5.2.0**. Vérifier qu’il est déployé avant de valider le raccourci. Aucune nouvelle variable Railway n’est nécessaire.

Le raccourci iPhone doit ensuite être mis à jour avec un second UUID `ResultToken`. La procédure exacte est dans `GUIDE-RACCOURCI.md`.
