# Déploiement Shuffle+ v8.3.2

## 1. Créer la branche de version

```powershell
git switch main
git pull origin main
git switch -c release/8.3.2
```

Extraire le patch v8.3.1 → v8.3.2 à la racine du dépôt en remplaçant les fichiers existants.

## 2. Valider localement

```powershell
npm run validate
npm start
```

Vérifier principalement :

- header après connexion Spotify ;
- absence simultanée des boutons connexion et déconnexion ;
- page Réglages avec plusieurs thèmes ;
- défilement de la barre de navigation ;
- affichage ordinateur, tablette et iPhone.

## 3. Envoyer la branche

```powershell
git add .
git commit -m "Release Shuffle+ v8.3.2"
git push -u origin release/8.3.2
```

## 4. Fusionner directement dans main depuis le terminal

```powershell
git switch main
git pull origin main
git merge release/8.3.2
git push origin main
```

Railway redéploiera automatiquement la branche `main` si le service est configuré ainsi.

## 5. Nettoyer la branche après validation Railway

```powershell
git branch -d release/8.3.2
git push origin --delete release/8.3.2
```

## Cache PWA

La version et le cache du Service Worker passent à `8.3.2`. En cas d’ancien affichage :

- recharger avec `Ctrl + F5` sur ordinateur ;
- fermer puis rouvrir la PWA sur iPhone ;
- utiliser la commande de mise à jour intégrée si elle apparaît.
