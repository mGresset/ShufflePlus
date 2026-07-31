# Déploiement de Shuffle+ v7.6.0

## 1. Installer le patch

Décompresse `ShufflePlus-v7.6.0-patch.zip` à la racine du dépôt ShufflePlus v7.5.0.

## 2. Créer la branche

```powershell
git switch main
git pull origin main
git switch -c release/7.6.0
```

## 3. Valider localement

```powershell
npm run validate
npm start
```

Ouvre ensuite :

```text
http://127.0.0.1:5500/
```

Pour simuler l’interface iPhone depuis le PC :

```text
http://127.0.0.1:5500/?debug_ios=1
```

Cette simulation est volontairement désactivée sur GitHub Pages.

## 4. Vérifier la migration

Sur une installation déjà connectée, la connexion Spotify doit rester disponible sans nouvel assistant. Sur un navigateur vierge, l’assistant Client ID doit apparaître.

## 5. Publier

```powershell
git add .
git commit -m "Release Shuffle+ v7.6.0"
git push -u origin release/7.6.0
```

```powershell
gh pr create --base main --head release/7.6.0 --title "Shuffle+ v7.6.0" --body "Accès public avec Client ID Spotify personnel et mode conduite réservé à iOS/iPadOS."

gh pr merge --squash --delete-branch
```

## 6. Finaliser

```powershell
git switch main
git pull origin main
git tag -a v7.6.0 -m "Shuffle+ v7.6.0"
git push origin v7.6.0
```

## Configuration pour un nouvel utilisateur

Chaque utilisateur doit créer sa propre application Spotify Developer et ajouter exactement l’adresse affichée par Shuffle+ :

```text
https://mgresset.github.io/ShufflePlus/
```

Pour les tests locaux, ajouter également :

```text
http://127.0.0.1:5500/
```

Il faut saisir le Client ID, jamais le Client Secret.
