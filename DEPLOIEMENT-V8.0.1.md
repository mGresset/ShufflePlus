# Déploiement de Shuffle+ v8.0.1

## Préparation

Décompresse le patch à la racine du dépôt ShufflePlus v8.0.0.

```powershell
git switch main
git pull origin main
git switch -c hotfix/8.0.1

Remove-Item .\startup-recovery-8.0.0.js -ErrorAction SilentlyContinue

npm run validate
npm start
```

Ouvre `http://127.0.0.1:5500/`, connecte-toi puis teste tous les boutons de Réglages. Seuls les deux boutons Essentiel/Expert doivent afficher le message d’activation du mode.

## Publication

```powershell
git add .
git commit -m "Hotfix Shuffle+ v8.0.1"
git push -u origin hotfix/8.0.1

gh pr create --base main --head hotfix/8.0.1 --title "Shuffle+ v8.0.1" --body "Correction des clics bloqués dans Réglages par le sélecteur du mode Essentiel/Expert."

gh pr merge --squash --delete-branch
```

Après fusion :

```powershell
git switch main
git pull origin main
git tag -a v8.0.1 -m "Shuffle+ v8.0.1"
git push origin v8.0.1
```
