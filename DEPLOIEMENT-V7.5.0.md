# Déploiement de Shuffle+ v7.5.0

## 1. Installer le patch

Décompresse `ShufflePlus-v7.5.0-patch.zip` à la racine du dépôt ShufflePlus v7.4.3.

L’ancien fichier `startup-recovery-7.4.3.js` peut rester localement : le build ne publie que le fichier correspondant à la version active.

## 2. Valider dans Visual Studio Code

```powershell
git switch main
git pull origin main
git switch -c release/7.5.0

npm run validate
npm start
```

Ouvre ensuite :

```text
http://127.0.0.1:5500/
```

Vérifie :

- la rubrique **Mes raccourcis** ;
- les profils déjà enregistrés ;
- les actions Lancer, Copier, Modifier et Dupliquer ;
- le diagnostic après un lancement ;
- l’ouverture de Mix & iOS depuis Nouveau profil ;
- le fonctionnement du raccourci iPhone existant.

Arrête le serveur avec `Ctrl+C`.

## 3. Publier la branche

```powershell
git add .
git commit -m "Release Shuffle+ v7.5.0"
git push -u origin release/7.5.0
```

## 4. Créer et fusionner la Pull Request

```powershell
gh pr create --base main --head release/7.5.0 --title "Shuffle+ v7.5.0" --body "Ajout de Mes raccourcis, diagnostic par profil et protection contre les doubles lancements iOS."

gh pr merge --squash --delete-branch
```

## 5. Finaliser

```powershell
git switch main
git pull origin main
git tag -a v7.5.0 -m "Shuffle+ v7.5.0"
git push origin v7.5.0
```

Sur iPhone, ferme complètement la PWA puis rouvre-la afin de charger le cache v7.5.0.
