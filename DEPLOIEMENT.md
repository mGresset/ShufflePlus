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
git commit -m "Release Shuffle+ v9.9.47 - documentation consolidée"
git push origin main
```

## Après publication

1. Fermer complètement Shuffle+ sur l’iPhone.
2. Rouvrir l’application avec Internet actif.
3. Vérifier que l’interface affiche **v9.9.47**.
4. Tester au minimum la connexion Spotify, Pause/Lecture, Titre suivant et le mode conduite.

## Railway

Cette release ne modifie pas le serveur Railway ni le raccourci iPhone. Pour le serveur, consulter `DEPLOIEMENT_SERVEUR_V5.md`.
