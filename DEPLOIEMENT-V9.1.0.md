# Déploiement Shuffle+ v9.1.0

## Validation locale

```powershell
npm run validate
```

## Publication GitHub

```powershell
git add -A
git commit -m "Release Shuffle+ v9.1.0"
git push origin main
```

GitHub Actions construit et publie le dossier `dist/`.

## Railway

Le service Railway doit conserver :

```text
Root Directory: /server
Build Command: vide
Start Command: vide
```

Le Dockerfile `server/Dockerfile` démarre le serveur de synchronisation.

## Mise à jour PWA

La v9.1.0 utilise le cache `shuffleplus-v9.1.0`. Après publication, ouvrir Shuffle+, choisir **Rechercher une mise à jour**, puis appliquer la nouvelle version. En cas de cache résistant, utiliser le panneau de récupération au démarrage.
