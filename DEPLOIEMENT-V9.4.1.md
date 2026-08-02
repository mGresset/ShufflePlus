# Déploiement de Shuffle+ v9.4.1

## GitHub Pages

Depuis le terminal de Visual Studio Code, à la racine du dépôt :

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.4.1"
git push origin main
```

Le workflow GitHub Actions construit ensuite le dossier `dist` et publie GitHub Pages.

## Railway

Le service Railway reste limité au serveur de synchronisation :

```text
Root Directory: /server
```

Laisse les champs Build Command et Start Command vides si Railway utilise `server/Dockerfile`.

## Vérification après publication

1. Ouvrir Shuffle+ dans le navigateur.
2. Vérifier que la version affichée est `9.4.1`.
3. Actualiser la file Spotify depuis l’accueil.
4. Vérifier les indicateurs de durée, artistes et doublons.
5. Sur iPhone, fermer puis rouvrir la PWA afin de valider le nouveau cache.
