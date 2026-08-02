# Déploiement Shuffle+ v8.4.0

## 1. Mettre `main` à jour et créer la branche

Dans le terminal VS Code, à la racine du dépôt :

```powershell
git switch main
git pull --ff-only origin main
git switch -c release/8.4.0
```

Extraire le patch v8.3.2 → v8.4.0 à la racine du dépôt en remplaçant les fichiers existants.

## 2. Installer et valider

Si PowerShell bloque `npm.ps1`, utiliser `npm.cmd` :

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Résultat attendu : 129 tests réussis, build de production valide et test serveur local réussi.

Contrôles manuels recommandés :

- plusieurs thèmes dans Réglages ;
- boutons Enregistrer, Réinitialiser et Supprimer ;
- header connecté sur ordinateur et mobile ;
- mode conduite en portrait et paysage ;
- progression du titre et chargement de la file Spotify ;
- ouverture du titre actif dans Spotify.

## 3. Envoyer la branche

```powershell
git add -A
git commit -m "Release Shuffle+ v8.4.0"
git push -u origin release/8.4.0
```

## 4. Fusionner directement dans `main`

Ces commandes évitent le merge manuel dans l’interface GitHub :

```powershell
git switch main
git pull --ff-only origin main
git merge release/8.4.0
git push origin main
```

Railway redéploiera automatiquement `main`.

## 5. Supprimer la branche après validation Railway

```powershell
git branch -d release/8.4.0
git push origin --delete release/8.4.0
```

## Cache PWA

En cas d’ancien affichage :

- `Ctrl + F5` sur ordinateur ;
- fermer complètement puis rouvrir la PWA sur iPhone ;
- utiliser le bandeau « Mettre à jour » lorsqu’il apparaît.
