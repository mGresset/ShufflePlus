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
git commit -m "Release Shuffle+ v11.0.0 - consolidation stable"
git push origin main
```

## Après publication

1. Fermer complètement Shuffle+ sur l’iPhone.
2. Rouvrir l’application avec Internet actif.
3. Vérifier que l’interface affiche **v11.0.0**.
4. Ouvrir **Créer > Centre de commandes iOS** et vérifier l’**Assistant Raccourcis**.
5. Tester un profil iPhone existant avec `RequestId + ResultToken`.
6. Si Dynamic Lyrics est utilisé, vérifier que la surveillance suit les changements de titre sans ouvrir Raccourcis automatiquement ; utiliser **Resynchroniser manuellement** uniquement si nécessaire.
7. Ouvrir **Réglages > Sauvegarde et restauration**, créer une **Sauvegarde locale** et vérifier qu’elle apparaît dans l’historique avec son aperçu.
8. Vérifier **Réglages > Centre de fiabilité > Tester Spotify Connect**.
9. Tester au minimum Pause/Lecture, Titre suivant et le mode conduite.

## Railway et raccourci iPhone

Shuffle+ 11.0.0 conserve le serveur Railway **v5.2.0**. Vérifier qu’il est déployé avant de valider le raccourci. Aucune nouvelle variable Railway n’est nécessaire.

Les anciens raccourcis iPhone sans `ResultToken` peuvent être migrés sans être recréés. Utiliser **Créer > Centre de commandes iOS > Migration V10.1**, ou suivre `GUIDE-RACCOURCI.md`.
