# Déploiement Shuffle+ v9.9.10

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.10 - Suivant différé et synchro 2 secondes"
git push origin main
```

Après publication :

1. fermer complètement la PWA ;
2. la rouvrir avec une connexion Internet ;
3. vérifier que l’en-tête affiche **Version 9.9.10** ;
4. lancer un titre puis appuyer sur **Suivant** ;
5. vérifier que le nouveau titre apparaît après confirmation Spotify, généralement après la première vérification à 700 ms ;
6. vérifier que l’état se recale automatiquement toutes les 2 secondes lorsque l’application reste visible.
