# Déploiement Shuffle+

Procédure de publication de la version courante.

## Validation complète

```powershell
npm.cmd install
npx.cmd playwright install chromium webkit
npm.cmd run release:check
```

`release:check` exécute la validation Node/build puis les parcours Playwright sur Chromium, WebKit/iPhone et le scénario PWA. Les requêtes Spotify des E2E sont simulées et n’utilisent aucun compte réel.

## Publication Git

```powershell
git add -A
git commit -m "Release Shuffle+ v12.0.1 - Spotify reliability"
git push origin main
```

## Après publication

1. Fermer complètement Shuffle+ sur l’iPhone.
2. Rouvrir l’application avec Internet actif.
3. Vérifier que l’interface affiche **v12.0.1**.
4. Ouvrir **Profils de lancement > Centre de commandes iOS** : la carte **Appareil Spotify préféré** doit afficher ton iPhone (migré automatiquement depuis la v11). Appuyer sur **Rechercher maintenant** puis **Tester**, et vérifier l’**Assistant Raccourcis**.
5. Tester un profil iPhone existant avec `RequestId + ResultToken`.
6. Ouvrir **Réglages > Sauvegarde et restauration**, créer une **Sauvegarde locale** et vérifier qu’elle apparaît dans l’historique avec son aperçu.
7. Vérifier **Réglages > Centre de fiabilité** : le contrôle **Shell PWA essentiel** doit afficher toutes les ressources essentielles en cache.
9. Vérifier **Réglages > Centre de fiabilité > Tester Spotify Connect**.
10. Tester au minimum Pause/Lecture, Titre suivant et le mode conduite.
11. Ouvrir la recherche, chercher un titre puis tester **Lire**, **Lire ensuite** et **Profil** sur un profil personnalisé.
12. Vérifier dans GitHub Actions que les projets **chromium-desktop**, **webkit-iphone** et **pwa-chromium** sont verts avant le déploiement.

## Railway et raccourci iPhone

Shuffle+ 12.0.1 reste compatible avec Railway **v5.2.1**, mais le serveur **v5.3.0** est recommandé : il empêche qu’un statut `running` arrivé en retard écrase le résultat final d’un raccourci. Redéployer le dossier `server/` (aucune nouvelle variable Railway), puis vérifier `GET /health` → `version: 5.3.0`.

Les anciens raccourcis iPhone sans `ResultToken` peuvent être migrés sans être recréés. Utiliser **Créer > Centre de commandes iOS > Migration V10.1**, ou suivre `GUIDE-RACCOURCI.md`.
