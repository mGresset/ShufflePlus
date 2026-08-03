# Déploiement Shuffle+ v9.9.11

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.11 - interface mobile corrigée"
git push origin main
```

Après publication :

1. fermer complètement la PWA ;
2. la rouvrir avec une connexion Internet ;
3. vérifier que l’en-tête affiche **v9.9.11** ;
4. vérifier que le bouton de déconnexion ne présente ni fond ni contour ;
5. faire défiler l’accueil Expert jusqu’à la carte Configuration ;
6. vérifier qu’un espace est visible avant le bloc « Bon après-midi, ton univers musical ».
