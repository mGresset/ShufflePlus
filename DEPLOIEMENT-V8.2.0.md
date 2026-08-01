# Déploiement de Shuffle+ v8.2.0

## Base requise

Appliquer ce patch sur Shuffle+ v8.1.0.

## Installation

1. Décompresser `ShufflePlus-v8.2.0-patch.zip`.
2. Copier son contenu à la racine du dépôt ShufflePlus.
3. Supprimer l’ancien bootstrap de récupération si présent :

```powershell
Remove-Item .\startup-recovery-8.1.0.js -ErrorAction SilentlyContinue
```

4. Valider localement :

```powershell
npm run validate
npm start
```

5. Ouvrir :

```text
http://127.0.0.1:5500/
```

## Points à tester

- affichage du panneau **Lancement principal** ;
- choix d’un profil principal ;
- copie de l’URL iOS ;
- lancement réel sur Spotify ;
- progression des sept étapes ;
- confirmation du raccourci et de l’installation ;
- sauvegarde puis restauration de la configuration ;
- synchronisation Railway ;
- mode Essentiel et mode Expert ;
- mise à jour PWA sur iPhone.

## Publication GitHub

```powershell
git switch main
git pull origin main
git switch -c release/8.2.0

git add .
git commit -m "Release Shuffle+ v8.2.0"
git push -u origin release/8.2.0
```

```powershell
gh pr create --base main --head release/8.2.0 --title "Shuffle+ v8.2.0" --body "Ajout du lancement principal et de l’installation guidée en sept étapes."

gh pr merge --squash --delete-branch
```

Après la fusion :

```powershell
git switch main
git pull origin main
git tag -a v8.2.0 -m "Shuffle+ v8.2.0"
git push origin v8.2.0
```
