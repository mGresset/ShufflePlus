# Déploiement de Shuffle+ v8.3.0

## Base requise

Appliquer cette version sur Shuffle+ v8.2.0.

## Installation locale

1. Créer une branche depuis la dernière version publiée :

```powershell
git switch main
git pull origin main
git switch -c release/8.3.0
```

2. Copier le contenu du dossier ou du patch v8.3.0 à la racine du dépôt.

3. Supprimer l’ancien bootstrap si nécessaire :

```powershell
Remove-Item .\startup-recovery-8.2.0.js -ErrorAction SilentlyContinue
```

4. Valider la version :

```powershell
npm run validate
npm start
```

5. Ouvrir `http://127.0.0.1:5500/`.

## Points à tester

- présence de la rubrique **Lancer** ;
- sélection du profil principal ;
- copie et partage de l’URL universelle ;
- lancement réel sur un iPhone avec Spotify ouvert ;
- progression Profil → Appareil → Lecture ;
- actions proposées après une erreur ;
- copie du diagnostic ;
- trois prochains titres dans le mode conduite ;
- ouverture de la file complète ;
- conservation de chaque thème et d’une couleur personnalisée ;
- mode Essentiel et mode Expert ;
- synchronisation Railway ;
- mise à jour PWA.

## Publication GitHub et Railway

```powershell
git add .
git commit -m "Release Shuffle+ v8.3.0"
git push -u origin release/8.3.0
```

Créer puis fusionner la Pull Request :

```powershell
gh pr create --base main --head release/8.3.0 --title "Shuffle+ v8.3.0" --body "Centre de lancement, raccourci Apple universel, diagnostic guidé et file de conduite enrichie."
gh pr merge --squash --delete-branch
```

Après la fusion :

```powershell
git switch main
git pull origin main
git tag -a v8.3.0 -m "Shuffle+ v8.3.0"
git push origin v8.3.0
```

Railway redéploie automatiquement le serveur depuis le dépôt GitHub selon la configuration actuelle. Aucun changement de variable d’environnement n’est requis.
