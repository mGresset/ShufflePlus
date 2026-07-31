# Déploiement de Shuffle+ v8.0.0

Le patch `ShufflePlus-v8.0.0-patch.zip` s’applique sur la version stable **v7.9.0**.

## 1. Sauvegarde recommandée

Avant la mise à jour, exporte une sauvegarde Shuffle+ depuis l’application. Si la synchronisation Railway est active, copie également le code de liaison `SP5...` et conserve-le dans un emplacement sécurisé.

## 2. Appliquer le patch

Décompresse le contenu du patch à la racine du dépôt ShufflePlus. Le dossier `.git` doit rester en place.

Supprime l’ancien bootstrap de récupération :

```powershell
Remove-Item .\startup-recovery-7.9.0.js -ErrorAction SilentlyContinue
```

## 3. Créer la branche

```powershell
git switch main
git pull origin main
git switch -c release/8.0.0
```

## 4. Valider dans Visual Studio Code

```powershell
npm run validate
npm start
```

Ouvre ensuite :

```text
http://127.0.0.1:5500/
```

Pour simuler l’iPhone :

```text
http://127.0.0.1:5500/?debug_ios=1
```

Contrôles recommandés :

- l’installation existante est en mode Expert ;
- le passage Essentiel/Expert fonctionne ;
- les cinq menus principaux restent disponibles ;
- les pages avancées disparaissent du menu Essentiel puis reviennent en Expert ;
- le panneau Connexion Spotify reste fonctionnel ;
- l’adresse Railway est toujours présente ;
- la synchronisation envoi/réception fonctionne ;
- le mode conduite fonctionne sur la simulation iOS ;
- le thème et les raccourcis existants sont conservés.

Arrête le serveur local avec `Ctrl+C`.

## 5. Publier la branche

```powershell
git add .
git commit -m "Release Shuffle+ v8.0.0"
git push -u origin release/8.0.0
```

## 6. Créer et fusionner la Pull Request

```powershell
gh pr create --base main --head release/8.0.0 --title "Shuffle+ v8.0.0" --body "Version publique simplifiée avec modes Essentiel/Expert et récupération sécurisée de la liaison serveur."

gh pr merge --squash --delete-branch
```

## 7. Actualiser le dépôt local

```powershell
git switch main
git pull origin main
```

## 8. Créer le tag officiel

```powershell
git tag -a v8.0.0 -m "Shuffle+ v8.0.0"
git push origin v8.0.0
```

## 9. Vérifier GitHub Pages

```powershell
gh run list --limit 5
gh run watch
```

Ouvre ensuite :

```text
https://mgresset.github.io/ShufflePlus/
```

Sur iPhone, ferme complètement la PWA puis rouvre-la pour charger le cache `shuffleplus-v8.0.0`.
