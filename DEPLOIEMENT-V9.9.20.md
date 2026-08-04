# Déploiement Shuffle+ v9.9.20

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.20 - navigation mobile stable"
git push origin main
```

Après publication, fermer entièrement Shuffle+, rouvrir l’application et vérifier que `v9.9.20` est affichée. Sur iPhone, faire défiler rapidement une page longue en laissant Safari masquer puis réafficher ses barres : le menu doit rester au bas du viewport.
