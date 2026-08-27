# Guide du raccourci Shuffle+

## Préparation dans Shuffle+

1. Déploie Shuffle+ **v10.1.4** et le serveur Railway **v5.2.0**.
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

10. Ajouter **Répéter 30 fois**.
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

## Dépannage

- **401** : `ResultToken` est absent ou mal formé ;
- **403** : le `ResultToken` ne correspond pas à celui qui a réservé ce `requestId` ;
- `pending` pendant trente secondes : vérifier que l’URL Shuffle+ contient `requestId`, `resultToken` et `resultServer` ;
- erreur 404 : vérifier que Railway exécute bien le serveur **v5.2.0** ;
- erreur CORS dans Shuffle+ : vérifier `SHUFFLEPLUS_ALLOWED_ORIGINS` ;
- résultat perdu après un redéploiement : vérifier le volume et `SHUFFLEPLUS_DATA_DIR` ;
- l’iPhone enregistré est absent : Shuffle+ annule le lancement sans basculer sur un autre appareil.

## Migration depuis l’ancien raccourci

L’ancien raccourci qui n’envoie que `requestId` n’est volontairement plus accepté par Railway v5.2. Ajoute simplement le second UUID `ResultToken` aux deux URL comme indiqué ci-dessus ; le reste du raccourci peut rester identique.
