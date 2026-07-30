# Déployer Shuffle+ v7.3.0

La v7.3.0 ajoute l’iPhone Spotify préféré, un lancement iOS vérifié et la liste des prochains morceaux dans le mode conduite.

## 1. Installer le patch

Décompresser `ShufflePlus-v7.3.0-patch.zip` à la racine du dépôt ShufflePlus en autorisant le remplacement des fichiers.

Le patch est prévu pour une base **v7.2.1**.

## 2. Vérifier dans Visual Studio Code

Dans le terminal intégré :

```powershell
node --version
npm run validate
npm start
```

Ouvrir ensuite :

```text
http://127.0.0.1:5500/
```

## 3. Configurer l’iPhone préféré

1. Ouvrir Spotify sur l’iPhone et lancer brièvement un morceau.
2. Dans Shuffle+, ouvrir **Mix & iOS**.
3. Dans **Appareil Spotify prioritaire**, toucher **Détecter**.
4. Sélectionner l’iPhone puis choisir **Enregistrer cet iPhone**.
5. Si l’iPhone n’apparaît pas, coller le `device_id` récupéré dans Spotify Developer dans le champ manuel.

Le `device_id` est conservé uniquement dans le stockage local du navigateur. Il n’est pas ajouté au dépôt GitHub.

## 4. Configurer la commande iOS

Dans **Centre de commandes iOS** :

- choisir la playlist ;
- sélectionner **iPhone préféré enregistré** ;
- laisser **Activer le shuffle Spotify** coché ;
- laisser **Forcer le premier morceau** décoché pour obtenir un départ aléatoire ;
- cocher **Ouvrir le mode conduite après le lancement** si souhaité ;
- enregistrer puis copier l’URL de la commande.

## 5. Créer le raccourci sur l’iPhone

Dans l’application **Raccourcis** :

1. ajouter **Ouvrir l’app** et choisir Spotify ;
2. ajouter **Attendre** pendant 1 seconde ;
3. ajouter **Ouvrir les URL** et coller l’URL copiée depuis Shuffle+ ;
4. donner un nom au raccourci et éventuellement l’ajouter à l’écran d’accueil.

## 6. Publier avec GitHub

```powershell
git checkout main
git pull origin main
git checkout -b release/7.3.0

git add .
git commit -m "Release Shuffle+ v7.3.0"
git push -u origin release/7.3.0
```

Créer ensuite une Pull Request vers `main`. Le workflow GitHub Pages exécute `npm run validate` avant tout déploiement.

Après fusion et vérification du site :

```powershell
git checkout main
git pull origin main
git tag -a v7.3.0 -m "Shuffle+ v7.3.0"
git push origin v7.3.0
```

## 7. Actualiser la PWA

Après le déploiement :

1. ouvrir Shuffle+ dans Safari ;
2. accepter la bannière de mise à jour si elle apparaît ;
3. fermer complètement l’application installée ;
4. la rouvrir ;
5. vérifier que la version affichée est `7.3.0`.

## Retour arrière

En cas de problème :

```powershell
git revert HEAD
git push origin main
```

Les préférences et raccourcis locaux restent compatibles avec la v7.2.1.
