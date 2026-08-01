# Déploiement de Shuffle+ v8.1.0

## Préparation

Décompresse le patch à la racine du dépôt ShufflePlus v8.0.1.

```powershell
git switch main
git pull origin main
git switch -c release/8.1.0

Remove-Item .\startup-recovery-8.0.1.js -ErrorAction SilentlyContinue

npm run validate
npm start
```

Ouvre `http://127.0.0.1:5500/` puis vérifie dans Réglages :

- la nouvelle page Synchronisation ;
- le bouton Synchroniser maintenant ;
- l’activation automatique ;
- l’assistant avec une adresse serveur de test ;
- la zone Options avancées.

Ne crée pas un nouvel espace de production pendant le test local si tu souhaites conserver ta liaison actuelle.

## Publication

```powershell
git add .
git commit -m "Release Shuffle+ v8.1.0"
git push -u origin release/8.1.0

gh pr create --base main --head release/8.1.0 --title "Shuffle+ v8.1.0" --body "Simplification de la synchronisation serveur, assistant Railway et fusion automatique sécurisée."

gh pr merge --squash --delete-branch
```

Après fusion :

```powershell
git switch main
git pull origin main
git tag -a v8.1.0 -m "Shuffle+ v8.1.0"
git push origin v8.1.0
```
