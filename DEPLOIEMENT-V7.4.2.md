# Déploiement de Shuffle+ v7.4.2

## Installation

Décompressez `ShufflePlus-v7.4.2-patch.zip` à la racine du dépôt v7.4.1, puis lancez :

```powershell
git switch main
git pull origin main
git switch -c hotfix/7.4.2

npm run validate
```

Le test OAuth doit apparaître avec le statut `ok`.

## Publication

```powershell
git add .
git commit -m "Hotfix Shuffle+ v7.4.2"
git push -u origin hotfix/7.4.2

gh pr create --base main --head hotfix/7.4.2 --title "Shuffle+ v7.4.2" --body "Correction définitive du test OAuth LF/CRLF sur Windows."
gh pr merge --squash --delete-branch
```

Après la fusion :

```powershell
git switch main
git pull origin main
git tag -a v7.4.2 -m "Shuffle+ v7.4.2"
git push origin v7.4.2
```
