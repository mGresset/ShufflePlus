# Déploiement de Shuffle+ v7.4.3

## Préparation

La v7.4.3 s’installe sur la v7.4.2. Elle ne supprime aucune donnée locale et ne modifie pas les Redirect URIs Spotify.

Décompressez `ShufflePlus-v7.4.3-patch.zip` à la racine du dépôt, puis lancez :

```powershell
git switch main
git pull origin main
git switch -c hotfix/7.4.3

npm run validate
npm start
```

Ouvrez ensuite :

```text
http://127.0.0.1:5500/
```

## Vérifications conseillées

1. Connectez-vous à Spotify.
2. Ouvrez plusieurs fois rapidement le tableau de bord et le mode Conduite.
3. Vérifiez que le morceau en cours reste correctement affiché.
4. Ouvrez la Liste de lecture et vérifiez son actualisation.
5. Ouvrez `Réglages → Centre de diagnostic` et consultez la rubrique `Utilisation de l’API Spotify`.
6. Placez l’application en arrière-plan, attendez quelques secondes puis revenez : les minuteurs doivent reprendre sans doublon.

## Publication

```powershell
git add .
git commit -m "Hotfix Shuffle+ v7.4.3"
git push -u origin hotfix/7.4.3
```

Créez la Pull Request :

```powershell
gh pr create --base main --head hotfix/7.4.3 --title "Shuffle+ v7.4.3" --body "Optimisation du quota Spotify, déduplication des requêtes, cache mémoire et réduction des actualisations automatiques."
```

Puis fusionnez :

```powershell
gh pr merge --squash --delete-branch
```

Après la fusion :

```powershell
git switch main
git pull origin main
git tag -a v7.4.3 -m "Shuffle+ v7.4.3"
git push origin v7.4.3
```

## Après le déploiement

Sur l’iPhone, fermez complètement Shuffle+ puis rouvrez-la afin de charger le Service Worker `shuffleplus-v7.4.3`.

Si une pause de quota est active, ne videz pas les données et ne reconnectez pas Spotify. Shuffle+ reprendra automatiquement les appels après le délai annoncé.
