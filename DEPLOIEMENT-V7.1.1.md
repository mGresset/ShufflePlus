# Déployer Shuffle+ v7.1.1

## 1. Préparer Spotify for Developers

Dans les réglages de l’application Spotify associée au Client ID présent dans `config.js`, conserver ou ajouter exactement ces deux Redirect URIs :

```text
https://mgresset.github.io/ShufflePlus/
http://127.0.0.1:5500/
```

Les majuscules, minuscules, slash final, protocole, port et chemin doivent correspondre exactement.

## 2. Installer la version dans le dépôt

Faire une copie de sauvegarde du dépôt actuel, puis remplacer les fichiers du dépôt par le contenu du dossier `ShufflePlus-v7.1.1`.

Ne pas copier un ancien dossier `.git` provenant d’une archive : conserver le dossier `.git` déjà présent dans le dépôt local.

## 3. Vérifier dans Visual Studio Code

Ouvrir le dossier du dépôt dans Visual Studio Code, puis ouvrir le terminal intégré :

```powershell
node --version
npm test
npm run build
```

Node.js 20 minimum est requis. Le workflow GitHub utilise Node.js 24.

Résultat attendu :

```text
Syntaxe JavaScript valide
Version cohérente : 7.1.1
5 tests réussis
Tests serveur Shuffle+ v5.0 : OK
Build GitHub Pages créé dans dist/
```

## 4. Tester localement

Lancer :

```powershell
npm start
```

Ouvrir ensuite :

```text
http://127.0.0.1:5500/
```

Tester au minimum :

1. connexion Spotify ;
2. affichage des playlists ;
3. ouverture d’une playlist ;
4. génération d’un mix ;
5. lecture sur un appareil Spotify ;
6. déconnexion puis reconnexion ;
7. navigation vers Pour toi, Statistiques et Mode conduite.

Arrêter le serveur avec `Ctrl+C`.

## 5. Envoyer sur GitHub

### Méthode recommandée avec une branche

```powershell
git checkout -b release/7.1.1
git add .
git commit -m "Release Shuffle+ v7.1.1"
git push -u origin release/7.1.1
```

Créer ensuite une Pull Request vers `main`, puis la fusionner.

### Méthode directe

```powershell
git checkout main
git pull origin main
git add .
git commit -m "Release Shuffle+ v7.1.1"
git push origin main
```

Chaque push sur `main` déclenche automatiquement :

```text
npm test
npm run build
GitHub Pages upload
GitHub Pages deploy
```

## 6. Activer GitHub Pages une seule fois

Dans GitHub :

```text
Repository
→ Settings
→ Pages
→ Build and deployment
→ Source : GitHub Actions
```

Puis ouvrir l’onglet `Actions` et vérifier que le workflow **Tester et déployer Shuffle+** est vert.

Le site doit rester accessible à :

```text
https://mgresset.github.io/ShufflePlus/
```

## 7. Actualiser la PWA

Sur ordinateur :

1. ouvrir Shuffle+ ;
2. utiliser le bouton de recherche de mise à jour dans les réglages, ou recharger la page ;
3. cliquer sur « Mettre à jour » lorsque la bannière apparaît.

Sur iPhone :

1. ouvrir l’application installée ;
2. la fermer complètement puis la rouvrir ;
3. accepter la mise à jour si Shuffle+ l’affiche.

En dernier recours seulement, ouvrir l’adresse dans Safari, recharger, puis relancer l’application depuis l’écran d’accueil.

## 8. Créer le tag de version

Après validation du site :

```powershell
git checkout main
git pull origin main
git tag -a v7.1.1 -m "Shuffle+ v7.1.1"
git push origin v7.1.1
```

## 9. Revenir en arrière en cas de problème

Identifier le commit de la v7.1.1 :

```powershell
git log --oneline -10
```

Puis créer un commit d’annulation :

```powershell
git revert IDENTIFIANT_DU_COMMIT
git push origin main
```

GitHub Pages redéploiera automatiquement la version précédente.
