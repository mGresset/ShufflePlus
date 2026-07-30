# Déployer Shuffle+ v7.2.1

La v7.2.1 corrige l'erreur `groups is not defined` de la v7.2.0.

## Méthode recommandée

Décompresser `ShufflePlus-v7.2.1-patch.zip` à la racine du dépôt ShufflePlus en autorisant le remplacement des fichiers.

Dans Visual Studio Code :

```powershell
git checkout main
git pull origin main
git checkout -b hotfix/7.2.1
npm run validate
npm start
```

Ouvrir ensuite :

```text
http://127.0.0.1:5500/
```

Vérifier :

1. connexion Spotify ;
2. affichage de la page Accueil ;
3. ouverture de Ma musique, Mix & iOS et Réglages ;
4. ouverture du Centre de diagnostic.

Après validation :

```powershell
git add .
git commit -m "Hotfix Shuffle+ v7.2.1"
git push -u origin hotfix/7.2.1
```

Créer puis fusionner la Pull Request vers `main`. GitHub Actions publiera ensuite la version sur GitHub Pages.

Une fois le site public vérifié :

```powershell
git checkout main
git pull origin main
git tag -a v7.2.1 -m "Shuffle+ v7.2.1"
git push origin v7.2.1
```

## Application déjà installée

Après le déploiement :

- ouvrir Shuffle+ dans Safari ou Chrome ;
- accepter la bannière de mise à jour lorsqu'elle apparaît ;
- si l'ancienne erreur reste affichée, fermer complètement la PWA puis la rouvrir ;
- en dernier recours, recharger une fois la page publique avant de rouvrir l'application installée.

Aucune reconnexion Spotify n'est normalement nécessaire.
