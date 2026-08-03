# Déploiement Shuffle+ v9.9.16

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.16 - sélection unique dans l’assistant"
git push origin main
```

Après publication, fermer entièrement la PWA, la rouvrir avec Internet actif et vérifier que l’en-tête affiche `v9.9.16`.
