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
<<<<<<< HEAD
git commit -m "Release Shuffle+ v9.9.48 - consolidation finale"
=======
git commit -m "Release Shuffle+ v9.9.47 - documentation consolidée"
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
git push origin main
```

## Après publication

1. Fermer complètement Shuffle+ sur l’iPhone.
2. Rouvrir l’application avec Internet actif.
<<<<<<< HEAD
3. Vérifier que l’interface affiche **v9.9.48**.
4. Tester au minimum la connexion Spotify, Pause/Lecture, Titre suivant et le mode conduite.

## Railway et raccourci iPhone

Cette release **modifie le serveur Railway** : déployer le serveur **v5.2.0** avant de valider le raccourci. Aucune nouvelle variable Railway n’est nécessaire.

Le raccourci iPhone doit ensuite être mis à jour avec un second UUID `ResultToken`. La procédure exacte est dans `GUIDE-RACCOURCI.md`.
=======
3. Vérifier que l’interface affiche **v9.9.47**.
4. Tester au minimum la connexion Spotify, Pause/Lecture, Titre suivant et le mode conduite.

## Railway

Cette release ne modifie pas le serveur Railway ni le raccourci iPhone. Pour le serveur, consulter `DEPLOIEMENT_SERVEUR_V5.md`.
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
