# Déploiement Shuffle+ v9.2.0

## Vérification locale

Dans le terminal Visual Studio Code, à la racine du projet :

```powershell
npm.cmd install
npm.cmd run validate
```

## Publication GitHub

```powershell
git add -A
git commit -m "Release Shuffle+ v9.2.0"
git push origin main
```

Le workflow GitHub Actions construit le dossier `dist` et publie GitHub Pages.

## Railway

Railway ne doit déployer que le serveur de synchronisation :

```text
Root Directory : /server
```

Laisser les champs **Build Command** et **Start Command** vides lorsque le Dockerfile du dossier `server` est utilisé.

## Mise à jour de la PWA

La v9.2.0 utilise les caches :

```text
shuffleplus-v9.2.0-shell
shuffleplus-v9.2.0-runtime
```

Après publication, ouvrir Shuffle+, aller dans **Réglages → Application installable**, puis utiliser **Rechercher une mise à jour** si la bannière n’apparaît pas automatiquement.
