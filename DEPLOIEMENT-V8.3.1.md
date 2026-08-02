# Déploiement de Shuffle+ v8.3.1

## Méthode recommandée

Appliquer le patch v8.3.0 → v8.3.1 à la racine du dépôt GitHub.

```powershell
git switch main
git pull origin main
git switch -c release/8.3.1
```

Extraire le patch en remplaçant les fichiers existants, puis exécuter :

```powershell
npm run validate
npm start
```

Après vérification locale :

```powershell
git add .
git commit -m "Release Shuffle+ v8.3.1"
git push -u origin release/8.3.1
```

Créer ensuite une Pull Request vers `main`, la fusionner, puis vérifier le nouveau déploiement Railway.

## Points à vérifier après déploiement

1. La version affichée est `8.3.1`.
2. Le thème sélectionné colore aussi le lancement principal et le centre de lancement.
3. Les boutons ont la même hauteur et les mêmes arrondis.
4. Les listes déroulantes et champs ne gardent plus le style gris natif du navigateur.
5. La PWA charge bien `design-system.css?v=8.3.1`.

## Railway

Aucune nouvelle variable d’environnement n’est requise. La configuration actuelle reste compatible.
