# Déployer Shuffle+ v7.4.0

La v7.4.0 est construite sur la v7.3.2 stable. Elle ajoute l’intégration facultative de Dynamic Lyrics par l’intermédiaire d’un raccourci iOS personnel.

## 1. Installer le patch

Décompresser `ShufflePlus-v7.4.0-patch.zip` à la racine du dépôt ShufflePlus et autoriser le remplacement des fichiers.

## 2. Valider dans Visual Studio Code

```powershell
git switch main
git pull origin main
git switch -c release/7.4.0

npm run validate
npm start
```

Ouvrir ensuite :

```text
http://127.0.0.1:5500/
```

Contrôler la connexion Spotify, puis ouvrir **Mix & iOS**.

## 3. Configurer Dynamic Lyrics sur l’iPhone

Dans l’application **Raccourcis** :

1. créer un raccourci nommé `Shuffle+ Dynamic Lyrics` ;
2. ajouter l’action Dynamic Lyrics disponible sur l’appareil, ou l’action **Ouvrir l’app** vers Dynamic Lyrics ;
3. exécuter une première fois le raccourci manuellement ;
4. dans Shuffle+, activer l’intégration et utiliser le bouton **Tester** ;
5. activer l’option Dynamic Lyrics dans les commandes Shuffle+ souhaitées.

Le nom est personnalisable, mais il doit correspondre exactement dans les deux applications.

## 4. Publier la branche

```powershell
git add .
git commit -m "Release Shuffle+ v7.4.0"
git push -u origin release/7.4.0
```

Créer la Pull Request :

```powershell
gh pr create --base main --head release/7.4.0 --title "Shuffle+ v7.4.0" --body "Ajout de l’intégration compagnon Dynamic Lyrics dans Mix & iOS et dans les profils de raccourcis."
```

Puis fusionner :

```powershell
gh pr merge --squash --delete-branch
```

## 5. Actualiser la branche principale

```powershell
git switch main
git pull origin main
```

Sur l’iPhone, fermer complètement Shuffle+ puis la rouvrir afin de charger le cache `shuffleplus-v7.4.0`.

## 6. Créer le tag

```powershell
git tag -a v7.4.0 -m "Shuffle+ v7.4.0"
git push origin v7.4.0
```

## Retour arrière

Le retour à la v7.3.2 ne supprime pas les playlists, mix ou réglages Spotify. La clé Dynamic Lyrics restera simplement inutilisée par l’ancienne version.
