# Déploiement Shuffle+ v9.6.1

## GitHub Pages

Dans le terminal Visual Studio Code, à la racine du dépôt :

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.6.1"
git push origin main
```

Le workflow GitHub Actions construit et publie le dossier `dist/`.

## Railway

Le service Railway reste limité au serveur de synchronisation :

```text
Root Directory: /server
```

Laisser les commandes Build et Start vides si Railway utilise `server/Dockerfile`.

## PWA

Après publication :

1. fermer complètement Shuffle+ ;
2. rouvrir la PWA ;
3. accepter la mise à jour si le bandeau apparaît ;
4. vérifier que la version affichée est `9.6.1`.
