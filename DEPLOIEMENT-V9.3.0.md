# Déploiement Shuffle+ v9.3.0

## GitHub Pages

À la racine du dépôt :

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.3.0"
git push origin main
```

Le workflow GitHub Actions construit puis publie le dossier `dist/`.

## Railway

Le service Railway reste limité au serveur de synchronisation :

```text
Root Directory: /server
```

Laisser les commandes de build et de démarrage vides si Railway utilise `server/Dockerfile`.

## Cache PWA

La v9.3.0 utilise :

```text
shuffleplus-v9.3.0-shell
shuffleplus-v9.3.0-runtime
```

Après le déploiement, ouvrir Shuffle+ puis accepter la mise à jour proposée. Si une ancienne coque reste bloquée, utiliser le bouton de réparation du démarrage.
