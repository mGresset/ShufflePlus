# Déploiement de Shuffle+ v8.7.1

## Préparation

```powershell
cd "D:\OneDrive\Documents\ShufflePlus"
git switch main
git pull --ff-only origin main
git switch -c release/8.7.1
```

Extraire le patch v8.7.1 à la racine du dépôt en remplaçant les fichiers existants, puis supprimer l’ancien bootstrap :

```powershell
Remove-Item .\startup-recovery-8.7.0.js -ErrorAction SilentlyContinue
```

## Validation locale

```powershell
Get-Content .\VERSION
npm.cmd install
npm.cmd run validate
npm.cmd start
```

La version doit être `8.7.1` et les tests doivent afficher `165` réussites et `0` échec.

## Envoi de la branche

```powershell
git add -A
git status
git commit -m "Release Shuffle+ v8.7.1"
git push -u origin release/8.7.1
```

## Fusion directe dans main

```powershell
git switch main
git pull --ff-only origin main
git merge release/8.7.1
git push origin main
```

Railway redéploie automatiquement `main`.

## Nettoyage après validation Railway

```powershell
git branch -d release/8.7.1
git push origin --delete release/8.7.1
```

Après déploiement, utiliser `Ctrl + F5` sur ordinateur. Sur iPhone, fermer complètement la PWA puis la rouvrir pour renouveler le cache.
