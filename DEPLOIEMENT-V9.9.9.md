# Déploiement Shuffle+ v9.9.9

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.9 - titre suivant instantané et synchro rapide"
git push origin main
```

Après la publication GitHub Pages :

1. fermer complètement la PWA ;
2. la rouvrir avec Internet actif ;
3. vérifier que l'en-tête affiche **Version 9.9.9** ;
4. lancer une musique puis appuyer sur **Suivant** ;
5. vérifier que le prochain titre apparaît immédiatement ou en moins d'une seconde, et que la barre repart du début ;
6. laisser ensuite Spotify changer de titre depuis un autre appareil et vérifier que Shuffle+ se recale dans un délai maximal d'environ 5 secondes.
