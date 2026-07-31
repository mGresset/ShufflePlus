# Déploiement de Shuffle+ v7.9.0

## Base requise

Le patch `ShufflePlus-v7.9.0-patch.zip` doit être appliqué sur une copie de Shuffle+ v7.8.1.

## Installation

1. Sauvegarder ou valider les modifications locales actuelles.
2. Décompresser le patch à la racine du dépôt ShufflePlus.
3. Supprimer l’ancien bootstrap de récupération si celui-ci reste présent :

```powershell
Remove-Item .\startup-recovery-7.8.1.js -ErrorAction SilentlyContinue
```

Le build GitHub Pages ignore aussi automatiquement les anciens fichiers `startup-recovery-x.y.z.js`.

## Validation locale

```powershell
git switch main
git pull origin main
git switch -c release/7.9.0

npm run validate
npm start
```

Ouvrir ensuite :

```text
http://127.0.0.1:5500/
```

Pour simuler l’iPhone :

```text
http://127.0.0.1:5500/?debug_ios=1
```

## Vérifications recommandées

- connexion Spotify ;
- ouverture des cinq rubriques principales ;
- ouverture de Réglages puis du Centre de diagnostic ;
- présence des catégories « Données et migrations » et « Architecture et performances » ;
- export du rapport JSON ;
- lancement d’un profil iOS ;
- mode conduite sur iPhone ou avec `debug_ios=1` ;
- thème personnalisé ;
- mise à jour PWA.

## Publication

```powershell
git add .
git commit -m "Release Shuffle+ v7.9.0"
git push -u origin release/7.9.0
```

Créer la Pull Request :

```powershell
gh pr create --base main --head release/7.9.0 --title "Shuffle+ v7.9.0" --body "Architecture progressive, migrations sûres du stockage, diagnostic enrichi et chargement à la demande."
```

Fusionner après validation :

```powershell
gh pr merge --squash --delete-branch
```

Puis actualiser et créer le tag :

```powershell
git switch main
git pull origin main
git tag -a v7.9.0 -m "Shuffle+ v7.9.0"
git push origin v7.9.0
```

## Retour arrière

La migration ne supprime une donnée JSON corrompue qu’après avoir créé une sauvegarde locale de récupération. Un retour vers la v7.8.1 reste possible, mais la v7.8.1 ignorera simplement les deux nouvelles clés techniques de migration.
