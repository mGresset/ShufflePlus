# Déployer Shuffle+ 8.6.0

## 1. Préparer la branche

Dans le terminal VS Code :

```powershell
cd "D:\OneDrive\Documents\ShufflePlus"
git switch main
git pull --ff-only origin main
git switch -c release/8.6.0
```

## 2. Appliquer le patch

Extraire `ShufflePlus-v8.6.0-patch-from-8.5.0.zip` à la racine du projet en acceptant le remplacement des fichiers.

Supprimer ensuite l’ancien bootstrap de récupération :

```powershell
Remove-Item .\startup-recovery-8.5.0.js -ErrorAction SilentlyContinue
```

## 3. Valider localement

```powershell
Get-Content .\VERSION
npm.cmd install
npm.cmd run validate
```

Résultat attendu :

```text
8.6.0
pass 150
fail 0
Build vérifié : Shuffle+ 8.6.0.
Test serveur local : OK.
```

## 4. Envoyer la branche

```powershell
git add -A
git status
git commit -m "Release Shuffle+ v8.6.0"
git push -u origin release/8.6.0
```

## 5. Fusionner directement dans main

```powershell
git switch main
git pull --ff-only origin main
git merge release/8.6.0
git push origin main
```

Railway redéploiera automatiquement la branche `main`.

## 6. Nettoyer après validation Railway

```powershell
git branch -d release/8.6.0
git push origin --delete release/8.6.0
```

## 7. Actualiser l’application

- ordinateur : `Ctrl + F5` ;
- iPhone/PWA : fermer complètement Shuffle+, puis la rouvrir ;
- en cas de cache persistant : utiliser **Rechercher une mise à jour** dans les réglages.
