# Déploiement Shuffle+ v8.4.1

## 1. Mettre `main` à jour et créer la branche

Dans le terminal VS Code, à la racine du dépôt :

```powershell
git switch main
git pull --ff-only origin main
git switch -c release/8.4.1
```

Extraire le patch v8.4.0 → v8.4.1 à la racine du dépôt en remplaçant les fichiers existants.

## 2. Installer et valider

Si PowerShell bloque `npm.ps1`, utiliser `npm.cmd` :

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Résultat attendu : 134 tests réussis, build de production valide et test serveur local réussi.

Contrôles manuels recommandés :

- écran de configuration Spotify sans Client ID enregistré ;
- champ Client ID en pleine largeur sur ordinateur et mobile ;
- boutons d’enregistrement et Spotify for Developers correctement alignés ;
- thème bleu, violet, rose et couleur personnalisée dans la rubrique PWA ;
- badge d’installation et trois capacités sans vert fixe ;
- installation et recherche de mise à jour PWA.

## 3. Envoyer la branche

```powershell
git add -A
git status
git commit -m "Release Shuffle+ v8.4.1"
git push -u origin release/8.4.1
```

## 4. Fusionner directement dans `main`

Ces commandes évitent le merge manuel dans l’interface GitHub :

```powershell
git switch main
git pull --ff-only origin main
git merge release/8.4.1
git push origin main
```

Railway redéploiera automatiquement `main`.

## 5. Supprimer la branche après validation Railway

```powershell
git branch -d release/8.4.1
git push origin --delete release/8.4.1
```

## Cache PWA

En cas d’ancien affichage :

- `Ctrl + F5` sur ordinateur ;
- fermer complètement puis rouvrir la PWA sur iPhone ;
- utiliser le bandeau « Mettre à jour » lorsqu’il apparaît.
