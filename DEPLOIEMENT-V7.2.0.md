# Déployer Shuffle+ v7.2.0

## 1. Choisir l’archive

Pour mettre à jour une v7.1.1 déjà installée, utiliser `ShufflePlus-v7.2.0-patch.zip`.

Pour recréer un dossier complet, utiliser `ShufflePlus-v7.2.0.zip`.

Conserver dans tous les cas le dossier `.git` du dépôt local existant.

## 2. Configuration Spotify

Les Redirect URIs restent inchangées :

```text
https://mgresset.github.io/ShufflePlus/
http://127.0.0.1:5500/
```

Aucune nouvelle autorisation Spotify n’est ajoutée par la v7.2.0.

## 3. Installer le patch

Dans l’explorateur de fichiers :

1. fermer le serveur local Shuffle+ s’il est ouvert ;
2. sauvegarder le dossier du dépôt ;
3. extraire le patch à la racine ;
4. accepter le remplacement des fichiers ;
5. vérifier la présence des nouveaux dossiers `core/` et `tests/`.

## 4. Valider dans Visual Studio Code

Ouvrir le terminal intégré :

```powershell
node --version
npm run validate
```

Node.js 20 minimum est accepté. Le workflow GitHub utilise Node.js 24.

La validation exécute successivement :

```text
syntaxe JavaScript
cohérence de version
graphe des imports
tests unitaires
tests Spotify v7.1.1
tests du serveur de synchronisation
build GitHub Pages
contrôle du dossier dist
test HTTP du serveur local
```

## 5. Tester localement

```powershell
npm start
```

Puis ouvrir :

```text
http://127.0.0.1:5500/
```

Parcours conseillé :

1. connexion Spotify ;
2. passage entre Accueil, Ma musique et Mix & iOS ;
3. ouverture d’une playlist ;
4. création ou lancement d’un mix ;
5. ouverture de Pour toi, Statistiques et Réglages ;
6. entrée et sortie du mode Conduite ;
7. fermeture puis réouverture de l’application installée.

Arrêter le serveur avec `Ctrl+C`.

## 6. Publier par Pull Request

```powershell
git checkout main
git pull origin main
git checkout -b release/7.2.0
git add .
git commit -m "Release Shuffle+ v7.2.0"
git push -u origin release/7.2.0
```

Créer une Pull Request vers `main`. Le workflow exécute `npm run validate` sur la Pull Request, mais ne déploie pas son contenu.

Après fusion, le push sur `main` reconstruit et publie automatiquement GitHub Pages.

## 7. Vérifier GitHub Pages

Dans GitHub :

```text
Actions
→ Tester et déployer Shuffle+
→ Vérification complète
→ Déploiement GitHub Pages
```

Le site reste accessible à :

```text
https://mgresset.github.io/ShufflePlus/
```

## 8. Actualiser la PWA

1. ouvrir Shuffle+ ;
2. aller dans Réglages ;
3. rechercher une mise à jour ;
4. accepter la bannière de mise à jour ;
5. sur iPhone, fermer complètement la PWA puis la rouvrir si nécessaire.

Le nouveau Service Worker ne prend la main que si tous les fichiers essentiels de la v7.2.0 ont été récupérés.

## 9. Créer le tag

```powershell
git checkout main
git pull origin main
git tag -a v7.2.0 -m "Shuffle+ v7.2.0"
git push origin v7.2.0
```

## 10. Retour arrière

La v7.2.0 ne migre aucune donnée. Un retour vers la v7.1.1 reste donc possible :

```powershell
git log --oneline -10
git revert IDENTIFIANT_DU_COMMIT
git push origin main
```

GitHub Pages republiera le commit précédent.
