# Déploiement Shuffle+ v9.9.4

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.4 - candidate v10"
git push origin main
```

GitHub Pages doit utiliser GitHub Actions. Railway doit conserver `Root Directory: /server`.

Après publication, fermer complètement la PWA puis la rouvrir pour charger le cache `shuffleplus-v9.9.4`.
