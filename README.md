# Shuffle+ v8.7.0

Shuffle+ est une interface web Spotify conçue pour lancer rapidement une playlist ou un mix intelligent, notamment depuis un raccourci Apple. L’application inclut aussi un centre de lancement, un mode conduite, des profils, des recommandations, des statistiques, des thèmes personnalisables et une synchronisation chiffrée facultative.

## Nouveautés v8.7.0

- précontrôle du réseau, du Client ID, du profil et de la source avant lancement ;
- vérification explicite de la session Spotify avant la recherche d’appareil ;
- mémorisation séparée du dernier appareil ayant réellement réussi une lecture ;
- priorité donnée à cet appareil lors des lancements suivants ;
- détection Spotify Connect détaillée avec compteur de tentatives ;
- progression en six étapes : profil, connexion, appareil, activation, lecture et vérification ;
- seconde activation automatique lorsque Spotify reçoit la commande sans démarrer la lecture ;
- erreurs classées avec une action adaptée : ouvrir Spotify, reconnecter, modifier le profil ou réessayer ;
- diagnostic enrichi avec version, réseau, appareil, durée et étapes ;
- commande Apple conservée en attente lorsque le problème est récupérable ;
- thèmes et chaîne de déploiement GitHub → Railway inchangés.

## Validation

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Le déploiement reste compatible avec la chaîne actuelle : Visual Studio Code → GitHub → Railway.

Consulte `V8.7.0_NOTES.md` et `DEPLOIEMENT-V8.7.0.md` pour le détail.
