# Déploiement de Shuffle+ v7.4.1

## Cause du correctif

Le test `v731-recovery.test.mjs` vérifiait deux instructions consécutives avec une expression régulière qui n'acceptait que `\n`. Après une édition ou une extraction sous Windows, `auth.js` pouvait utiliser `\r\n`, ce qui faisait échouer la CI alors que le JavaScript restait valide.

## Installation du patch

Décompressez `ShufflePlus-v7.4.1-patch.zip` à la racine du dépôt v7.4.0, puis lancez :

```powershell
git switch main
git pull origin main
git switch -c hotfix/7.4.1

git add --renormalize .
npm run validate
```

`git add --renormalize .` fait appliquer immédiatement les règles de `.gitattributes` aux fichiers déjà présents dans le dépôt.

## Publication

```powershell
git add .
git commit -m "Hotfix Shuffle+ v7.4.1"
git push -u origin hotfix/7.4.1

gh pr create --base main --head hotfix/7.4.1 --title "Shuffle+ v7.4.1" --body "Correction de la validation Windows CRLF/LF et fiabilisation du build GitHub Pages."
gh pr merge --squash --delete-branch
```

Après la fusion :

```powershell
git switch main
git pull origin main
git tag -a v7.4.1 -m "Shuffle+ v7.4.1"
git push origin v7.4.1
```

## Vérifications attendues

- `npm run validate` réussit sous Windows ;
- le test OAuth passe avec `LF` et `CRLF` ;
- `dist/` ne contient que `startup-recovery-7.4.1.js` parmi les bootstrap versionnés ;
- les fonctions de la v7.4.0 restent inchangées.
