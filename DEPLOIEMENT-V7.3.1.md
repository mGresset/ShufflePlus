# Déployer Shuffle+ v7.3.1

La v7.3.1 est un correctif de sécurité de démarrage construit sur la v7.3.0. Elle ne demande aucune nouvelle autorisation Spotify et ne migre pas les données utilisateur.

## 1. Installer le patch

Décompresser `ShufflePlus-v7.3.1-patch.zip` à la racine du dépôt ShufflePlus en autorisant le remplacement des fichiers.

Le patch doit notamment ajouter :

```text
core/session-recovery.js
startup-recovery-7.3.1.js
tests/v731-recovery.test.mjs
```

## 2. Vérifier dans Visual Studio Code

Dans le terminal intégré :

```powershell
npm run validate
npm start
```

Ouvrir ensuite :

```text
http://127.0.0.1:5500/
```

Vérifier :

1. que la version affichée est `7.3.1` ;
2. que le bouton Spotify redirige normalement ;
3. que **Connexion bloquée ?** affiche les deux options de réparation ;
4. que l’annulation des confirmations ne modifie aucune donnée ;
5. qu’une connexion Spotify existante reste reconnue.

Arrêter le serveur avec `Ctrl+C`.

## 3. Publier la branche

```powershell
git switch main
git pull origin main
git switch -c hotfix/7.3.1

git add .
git commit -m "Hotfix Shuffle+ v7.3.1"
git push -u origin hotfix/7.3.1
```

## 4. Créer et fusionner la Pull Request

```powershell
gh pr create --base main --head hotfix/7.3.1 --title "Shuffle+ v7.3.1" --body "Sécurisation du démarrage, du cache PWA et de la connexion Spotify."
```

Puis :

```powershell
gh pr merge --squash --delete-branch
```

Si la protection de branche attend les tests :

```powershell
gh pr merge --squash --delete-branch --auto
```

## 5. Vérifier GitHub Pages

```powershell
gh run list --limit 5
gh run watch
```

Après réussite du workflow, ouvrir :

```text
https://mgresset.github.io/ShufflePlus/
```

L’ancienne installation peut afficher une bannière de mise à jour. Accepter la mise à jour, puis fermer et rouvrir la PWA.

Si l’ancien écran reste bloqué, utiliser le nouveau lien **Connexion bloquée ? → Réparer Shuffle+**. La réparation conserve les données utilisateur.

## 6. Créer le tag

```powershell
git switch main
git pull origin main
git tag -a v7.3.1 -m "Shuffle+ v7.3.1"
git push origin v7.3.1
```

Puis, facultativement :

```powershell
gh release create v7.3.1 --title "Shuffle+ v7.3.1" --generate-notes
```

## Retour arrière

La v7.3.1 ne modifie pas le format des préférences. Un retour à la v7.3.0 reste possible avec :

```powershell
git revert <COMMIT_DE_LA_V7.3.1>
git push origin main
```
