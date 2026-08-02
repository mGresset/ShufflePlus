# Déploiement Shuffle+ v9.5.0

## GitHub Pages

Depuis la racine du dépôt :

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.5.0"
git push origin main
```

Le workflow GitHub Actions construit et publie le dossier `dist`.

## Railway

Le service Railway reste limité au serveur de synchronisation :

```text
Root Directory: /server
```

Laisse les commandes Build et Start vides lorsque le `Dockerfile` du dossier `server` est détecté.
