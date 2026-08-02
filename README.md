# Shuffle+ v8.8.0

Shuffle+ est une interface web Spotify conçue pour lancer rapidement une playlist ou un mix intelligent, notamment depuis un raccourci Apple. L’application inclut aussi un centre de lancement, un mode conduite, des profils, des recommandations, des statistiques, des thèmes personnalisables et une synchronisation chiffrée facultative.

## Nouveautés v8.8.0

- recherche universelle déplacée dans la barre de navigation principale ;
- suppression de la grande carte « Rechercher dans Shuffle+ » en haut des pages ;
- bouton compact **Rechercher** sur ordinateur et icône seule sur mobile ;
- raccourci `Ctrl + K` sur Windows/Linux et `⌘ + K` sur macOS ;
- palette de recherche plus compacte ;
- résultats regroupés par catégorie : rubriques, playlists, mix, scènes, profils et réglages ;
- navigation au clavier conservée avec les flèches, Entrée et Échap ;
- recherches récentes conservées ;
- recherche locale de la bibliothèque maintenue dans la rubrique Musique ;
- thèmes, raccourcis Apple et déploiement GitHub → Railway inchangés.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Le déploiement reste compatible avec la chaîne actuelle : Visual Studio Code → GitHub → Railway.

Consulte `V8.8.0_NOTES.md` et `DEPLOIEMENT-V8.8.0.md` pour le détail.
