# Déploiement de Shuffle+ v7.7.0

## 1. Installer le patch

Décompresse `ShufflePlus-v7.7.0-patch.zip` à la racine du dépôt ShufflePlus v7.6.0.

La v7.6.1 n’est pas nécessaire et ne doit pas être utilisée comme base.

## 2. Créer la branche

```powershell
git switch main
git pull origin main
git switch -c release/7.7.0
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

## 4. Vérifier le moteur explicable

1. Ouvre une playlist ou crée un mix multi-sources.
2. Clique sur **Mélange intelligent**.
3. Vérifie l’apparition du panneau **Pourquoi cet ordre ?**.
4. Copie la graine.
5. Clique sur **Rejouer exactement** et vérifie que l’ordre reste identique.
6. Ouvre **Pourquoi ici ?** sous quelques titres.
7. Teste une playlist contenant beaucoup de morceaux du même artiste afin de vérifier l’affichage des contraintes relâchées.

## 5. Publier

```powershell
git add .
git commit -m "Release Shuffle+ v7.7.0"
git push -u origin release/7.7.0
```

```powershell
gh pr create --base main --head release/7.7.0 --title "Shuffle+ v7.7.0" --body "Ajout du moteur de mélange explicable, des graines reproductibles et du rapport avant/après."

gh pr merge --squash --delete-branch
```

## 6. Finaliser

```powershell
git switch main
git pull origin main
git tag -a v7.7.0 -m "Shuffle+ v7.7.0"
git push origin v7.7.0
```

Après le déploiement, ferme complètement la PWA sur l’iPhone puis rouvre-la afin de charger le cache `shuffleplus-v7.7.0`.
