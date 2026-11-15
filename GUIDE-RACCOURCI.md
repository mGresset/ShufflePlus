# Guide du raccourci Shuffle+

## Préparation dans Shuffle+

1. Déploie Shuffle+ **v12.0.0** et le serveur Railway **v5.3.0** (v5.2.1 reste compatible).
2. Dans **Réglages > Synchronisation serveur**, vérifie que l’adresse Railway est enregistrée.
3. Dans **Créer > Centre de commandes iOS**, copie l’URL du profil.
4. Vérifie que l’URL contient `resultServer=`.

## Pourquoi un ResultToken ?

Depuis la v9.9.48, `requestId` identifie le lancement mais ne sert plus de secret. Le raccourci génère un second UUID, `ResultToken`, qui protège la lecture et la publication du résultat Railway. Le serveur ne conserve que son empreinte SHA-256.

## Actions du raccourci

### Variables de départ

1. **Continuer le raccourci dans l’app**.
2. **Générer un UUID** puis renommer la variable magique en `RequestId`.
3. **Générer un deuxième UUID** puis renommer la variable magique en `ResultToken`.
4. Ajouter une action **Texte** contenant l’URL Shuffle+ copiée, suivie de :

```text
&requestId=[RequestId]&resultToken=[ResultToken]
```

Les variables `RequestId` et `ResultToken` doivent être insérées depuis les variables magiques, sans crochets littéraux.

### Lancement

5. **Ouvrir l’app** → Spotify.
6. **Attendre** → 2 secondes.
7. **Ouvrir les URL** → le texte construit à l’étape 4.

Ne pas utiliser **Ouvrir les URL X-Callback**.

### URL de résultat

8. Ajouter une action **Texte** :

```text
https://shuffleplus-production.up.railway.app/v1/launch-results/[RequestId]?token=[ResultToken]
```

9. Renommer cette variable en `ResultUrl`.

### Polling

10. Ajouter **Répéter 45 fois** (30 fois reste possible, mais 45 laisse de la marge si Spotify Connect met jusqu’à 18 s à annoncer l’iPhone).
11. Dans la répétition :
    - **Obtenir le contenu de l’URL** → `ResultUrl`, méthode GET ;
    - **Obtenir la valeur du dictionnaire** → clé `status` ;
    - ajouter un bloc **Si**.

#### Si `status` est `success`

- obtenir `device` et `message` depuis le dictionnaire ;
- afficher une notification, par exemple `Lecture lancée sur [device]` ;
- terminer le raccourci après les actions souhaitées.

#### Sinon, si `status` est `error`

- obtenir `message` et `code` ;
- afficher une alerte ;
- terminer le raccourci.

#### Sinon, si `status` est `cancel`

- afficher `Lancement annulé` ;
- terminer le raccourci.

#### Sinon

- **Attendre** → 1 seconde.

12. Après la répétition, afficher une alerte :

```text
Shuffle+ n’a pas répondu dans le délai prévu.
```

## États renvoyés

- `pending` : le canal est réservé mais Shuffle+ n’a pas encore publié ;
- `running` : le lancement Spotify est en cours ;
- `success` : la lecture est confirmée ;
- `error` : le lancement a échoué ;
- `cancel` : le lancement a été annulé.

## Ce qui se passe pendant un lancement (v12)

```text
Apple Raccourcis
  ↓ ouvre Spotify (Spotify commence à réveiller Spotify Connect)
  ↓ attend 2 s puis ouvre l’URL Shuffle+ (requestId + resultToken + resultServer)
Shuffle+
  1. lit et valide l’URL, réserve le requestId (une seconde ouverture ne relance rien)
  2. publie « running » sur Railway
  3. vérifie la session Spotify (renouvellement automatique si nécessaire)
  4. cherche l’iPhone préféré : /me/player/devices puis /me/player, sans cache,
     avec des essais progressifs pendant 18 s au maximum (0 · 0,8 · 1,6 · 2,8 · 4,5 · 7 · 10 · 14 · 18 s)
     en respectant les limites de Spotify (HTTP 429 / Retry-After)
  5. reconnaît l’iPhone même si Spotify a renouvelé son device_id, et met l’identifiant à jour
  6. transfère la lecture, lance la playlist, applique shuffle / répétition
  7. vérifie via /me/player que la lecture est réellement active sur le même iPhone
  8. mémorise le succès, publie « success » sur Railway, nettoie l’URL
```

Un délai global de 30 s borne le lancement. En mode **iPhone préféré** (recommandé), aucune commande n’est jamais envoyée à un autre appareil (Mac, télévision, enceinte, autre téléphone) : un échec propre est préféré à une lecture au mauvais endroit.

### Codes d’erreur utiles

| Code | Signification |
| --- | --- |
| `PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE` | Spotify n’annonce pas encore l’iPhone ; rien n’a été lancé ailleurs, préférence conservée. |
| `PREFERRED_DEVICE_AMBIGUOUS` | Plusieurs appareils portent le même nom et le même type : confirmer le bon dans la carte « Appareil Spotify préféré ». |
| `PREFERRED_DEVICE_NOT_CONFIGURED` | Aucun iPhone préféré enregistré. |
| `SPOTIFY_DEVICE_RESTRICTED` | Spotify interdit le contrôle à distance de cet appareil. |
| `SPOTIFY_REAUTH_REQUIRED` | Spotify demande une nouvelle autorisation ; profils, iPhone et réglages sont conservés. |
| `SPOTIFY_RATE_LIMITED` | Spotify demande de patienter. |
| `SPOTIFY_PREMIUM_REQUIRED` | La commande à distance nécessite Spotify Premium. |
| `PLAYBACK_NOT_CONFIRMED` | Commande reçue mais lecture non confirmée sur l’iPhone. |
| `LAUNCH_TIMEOUT` | Le délai global de 30 s a été dépassé. |

## Dépannage

- **401** : `ResultToken` est absent ou mal formé ;
- **403** : le `ResultToken` ne correspond pas à celui qui a réservé ce `requestId` ;
- `pending` pendant trente secondes : vérifier que l’URL Shuffle+ contient `requestId`, `resultToken` et `resultServer` ;
- `running` qui affiche « Réveil de Spotify Connect… » : normal pendant quelques secondes juste après l’ouverture de Spotify ;
- erreur 404 : vérifier que Railway exécute bien le serveur **v5.3.0** (ou v5.2.1) ;
- erreur CORS dans Shuffle+ : vérifier `SHUFFLEPLUS_ALLOWED_ORIGINS` ;
- résultat perdu après un redéploiement : vérifier le volume et `SHUFFLEPLUS_DATA_DIR` ;
- l’iPhone enregistré est absent : Shuffle+ annule le lancement sans basculer sur un autre appareil (code `PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE`), et l’iPhone reste enregistré.

## Migration depuis l’ancien raccourci

L’ancien raccourci qui n’envoie que `requestId` n’est volontairement plus accepté par Railway v5.2. Ajoute simplement le second UUID `ResultToken` aux deux URL comme indiqué ci-dessus ; le reste du raccourci peut rester identique.

## Assistant Raccourcis dans Shuffle+

Dans **Créer > Centre de commandes iOS**, le bloc **Assistant Raccourcis** permet de :

- copier l’URL Shuffle+ du profil principal ;
- copier l’URL Railway de résultat ;
- copier toutes les étapes du raccourci dans un seul texte ;
- tester le profil directement.

Le protocole ne change pas : `RequestId` et `ResultToken` restent obligatoires pour le canal de résultat sécurisé.

## Dynamic Lyrics Auto‑Sync

Si l’intégration Dynamic Lyrics est activée, Shuffle+ 12.0.0 peut surveiller le morceau Spotify. Il ne relance toutefois plus le raccourci compagnon à chaque nouveau titre : iOS affiche une confirmation pour chaque URL `shortcuts://` ouverte automatiquement par une PWA. Dynamic Lyrics doit donc assurer le suivi courant via sa connexion Spotify native. Le bouton **Resynchroniser manuellement** reste disponible si nécessaire.

Le bouton **Resynchroniser maintenant** permet de forcer une relance du raccourci compagnon pour le morceau courant.
