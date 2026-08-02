# Déploiement Shuffle+ v8.5.0

## 1. Mettre `main` à jour et créer la branche

Dans le terminal VS Code, à la racine du dépôt :

```powershell
git switch main
git pull --ff-only origin main
git switch -c release/8.5.0
```

Extraire le patch v8.4.1 → v8.5.0 à la racine du dépôt en remplaçant les fichiers existants.

Vérifier que le terminal est bien dans le dépôt :

```powershell
Test-Path .git
Get-Content .\VERSION
```

Résultats attendus :

```text
True
8.5.0
```

## 2. Installer et valider

Si PowerShell bloque `npm.ps1`, utiliser `npm.cmd` :

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Résultat attendu : 143 tests réussis, contrôle CSP valide, build de production valide et test du serveur local réussi.

Contrôles manuels recommandés :

- connexion Spotify et enregistrement du Client ID ;
- ouverture de Spotify for Developers et de Spotify Web ;
- navigation dans une longue page de réglages ;
- chargement des pochettes dans la bibliothèque ;
- thème bleu, violet et couleur personnalisée ;
- installation et mise à jour de la PWA ;
- mode conduite sur iPhone.

## 3. Envoyer la branche

```powershell
git add -A
git status
git commit -m "Release Shuffle+ v8.5.0"
git push -u origin release/8.5.0
```

## 4. Fusionner directement dans `main`

Ces commandes évitent le merge manuel dans l’interface GitHub :

```powershell
git switch main
git pull --ff-only origin main
git merge release/8.5.0
git push origin main
```

Railway redéploiera automatiquement `main`.

## 5. Supprimer la branche après validation Railway

```powershell
git branch -d release/8.5.0
git push origin --delete release/8.5.0
```

## Cache PWA

En cas d’ancien affichage :

- utiliser `Ctrl + F5` sur ordinateur ;
- fermer complètement puis rouvrir la PWA sur iPhone ;
- utiliser le bandeau « Mettre à jour » lorsqu’il apparaît ;
- en dernier recours, utiliser la réparation du cache dans les réglages.
