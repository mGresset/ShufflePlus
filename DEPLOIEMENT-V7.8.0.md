# Déploiement de Shuffle+ v7.8.0

## 1. Base requise

Utilise la **v7.7.0 stable** comme base.

Décompresse `ShufflePlus-v7.8.0-patch.zip` à la racine du dépôt.

L’ancien fichier `startup-recovery-7.7.0.js` peut rester localement : le build ne le publie pas. Pour garder le dépôt propre, supprime-le avec :

```powershell
Remove-Item .\startup-recovery-7.7.0.js -ErrorAction SilentlyContinue
```

## 2. Créer la branche

```powershell
git switch main
git pull origin main
git switch -c release/7.8.0
```

## 3. Valider localement

```powershell
npm run validate
npm start
```

Ouvre :

```text
http://127.0.0.1:5500/
```

Pour simuler l’interface iPhone :

```text
http://127.0.0.1:5500/?debug_ios=1
```

## 4. Vérifier la navigation

La barre principale doit afficher exactement :

```text
Accueil | Musique | Créer | Raccourcis | Réglages
```

Vérifie ensuite :

1. **Musique** → Ma musique et Pour toi ;
2. **Musique** → Voir plus → Statistiques, Objectifs et Analyses ;
3. **Créer** → Mix & iOS et Assistant ;
4. **Créer** → Voir plus → Adaptive DJ et Modes ;
5. **Raccourcis** → Mes raccourcis ;
6. sur la simulation iOS, **Voir plus** → Conduite ;
7. **Réglages** → Voir plus → Guide et aide.

Teste également :

```text
http://127.0.0.1:5500/?view=statistics
http://127.0.0.1:5500/?view=adaptive
http://127.0.0.1:5500/?view=guide
```

## 5. Vérifier la mise à jour PWA

Le test complet nécessite une ancienne version déjà contrôlée par un Service Worker. Après déploiement :

1. ouvre la v7.7.0 installée ;
2. attends le bandeau de mise à jour ;
3. touche **Mettre à jour** une seule fois ;
4. vérifie l’affichage de **Mise à jour…** ;
5. vérifie le passage à la version 7.8.0 ;
6. confirme que le bandeau ne revient pas pour la même version.

## 6. Publier

```powershell
git add .
git commit -m "Release Shuffle+ v7.8.0"
git push -u origin release/7.8.0
```

```powershell
gh pr create --base main --head release/7.8.0 --title "Shuffle+ v7.8.0" --body "Navigation réduite à cinq rubriques et correction du double bandeau de mise à jour PWA."

gh pr merge --squash --delete-branch
```

## 7. Finaliser

```powershell
git switch main
git pull origin main
git tag -a v7.8.0 -m "Shuffle+ v7.8.0"
git push origin v7.8.0
```

Sur iPhone, ne vide pas les données. Ouvre simplement Shuffle+ et utilise le bandeau de mise à jour lorsqu’il apparaît.
