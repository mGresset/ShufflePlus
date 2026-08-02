# Déploiement Shuffle+ v8.7.0

## Préparation

Depuis le dépôt local v8.6.0 :

```powershell
cd "D:\OneDrive\Documents\ShufflePlus"
git switch main
git pull --ff-only origin main
git switch -c release/8.7.0
```

Extraire le patch v8.7.0 à la racine du dépôt en remplaçant les fichiers existants.

Supprimer l’ancien bootstrap :

```powershell
Remove-Item .\startup-recovery-8.6.0.js -ErrorAction SilentlyContinue
```

## Validation

```powershell
Get-Content .\VERSION
npm.cmd install
npm.cmd run validate
```

Résultat attendu :

```text
8.7.0
pass 159
fail 0
Build vérifié : Shuffle+ 8.7.0.
Test serveur local : OK.
```

Test local facultatif :

```powershell
npm.cmd start
```

## Envoi sur GitHub

```powershell
git add -A
git status
git commit -m "Release Shuffle+ v8.7.0"
git push -u origin release/8.7.0
```

## Fusion directe dans main

```powershell
git switch main
git pull --ff-only origin main
git merge release/8.7.0
git push origin main
```

Railway redéploie automatiquement `main`.

## Nettoyage après validation Railway

```powershell
git branch -d release/8.7.0
git push origin --delete release/8.7.0
```

## Vérification fonctionnelle recommandée

Sur iPhone :

1. ouvrir Spotify et lancer brièvement un morceau ;
2. exécuter le raccourci Apple universel ;
3. vérifier les six étapes de progression ;
4. fermer Spotify puis relancer pour contrôler l’écran de récupération ;
5. reconnecter Spotify si nécessaire ;
6. confirmer que le dernier iPhone opérationnel est repris au lancement suivant.
