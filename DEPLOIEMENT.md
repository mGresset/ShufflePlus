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
git commit -m "Release Shuffle+ v10.5.0 - iPhone shortcuts et Dynamic Lyrics Auto-Sync"
git push origin main
```

## Après publication

1. Fermer complètement Shuffle+ sur l’iPhone.
2. Rouvrir l’application avec Internet actif.
3. Vérifier que l’interface affiche **v10.5.0**.
4. Ouvrir **Créer > Centre de commandes iOS** et vérifier l’**Assistant Raccourcis V10.5**.
5. Tester un profil iPhone existant avec `RequestId + ResultToken`.
6. Si Dynamic Lyrics est utilisé, activer l’Auto‑Sync, laisser Shuffle+ visible puis vérifier qu’un changement de morceau déclenche la resynchronisation.
7. Vérifier **Réglages > Centre de fiabilité > Tester Spotify Connect**.
8. Tester au minimum Pause/Lecture, Titre suivant et le mode conduite.

## Railway et raccourci iPhone

La V10 conserve le serveur Railway **v5.2.0**. Vérifier qu’il est déployé avant de valider le raccourci. Aucune nouvelle variable Railway n’est nécessaire.

Les anciens raccourcis iPhone sans `ResultToken` peuvent être migrés sans être recréés. Utiliser **Créer > Centre de commandes iOS > Migration V10.1**, ou suivre `GUIDE-RACCOURCI.md`.
