# Déploiement Shuffle+ v9.9.36

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.36 - recherche mobile stable dès le chargement"
git push origin main
```

Après publication, fermer complètement Safari, rouvrir Shuffle+ et vérifier que le bouton **Rechercher** n’affiche jamais `Ctrl/⌘ K` sur téléphone.
