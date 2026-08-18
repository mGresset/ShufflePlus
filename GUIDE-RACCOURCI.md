# Guide du raccourci Shuffle+

## Préparation dans Shuffle+

1. Déploie la version courante de Shuffle+ et le serveur Railway v5.1.
2. Dans **Réglages > Synchronisation serveur**, vérifie que l’adresse Railway est enregistrée.
3. Dans **Créer > Centre de commandes iOS**, copie l’URL du profil.
4. Vérifie que l’URL contient `resultServer=`.

## Actions du raccourci

### Variables de départ

1. **Continuer le raccourci dans l’app**.
2. **Générer un UUID**.
3. Renommer la variable magique en `RequestId`.
4. Ajouter une action **Texte** contenant l’URL Shuffle+ copiée, suivie de :

```text
&requestId=[RequestId]
```

La variable `RequestId` doit être insérée depuis les variables magiques, sans crochets littéraux.

### Lancement

5. **Ouvrir l’app** → Spotify.
6. **Attendre** → 1 seconde.
7. **Ouvrir les URL** → le texte construit à l’étape 4.

Ne pas utiliser **Ouvrir les URL X-Callback**.

### URL de résultat

8. Ajouter une action **Texte** :

```text
https://TON-SERVEUR.up.railway.app/v1/launch-results/[RequestId]
```

9. Renommer cette variable en `ResultUrl`.

### Polling

10. Ajouter **Répéter 20 fois**.
11. Dans la répétition :
    - **Obtenir le contenu de l’URL** → `ResultUrl`, méthode GET ;
    - **Obtenir la valeur du dictionnaire** → clé `status` ;
    - ajouter un bloc **Si**.

#### Si `status` est `success`

- obtenir `device` et `message` depuis le dictionnaire ;
- afficher une notification, par exemple `Lecture lancée sur [device]` ;
- placer ici les actions qui doivent suivre le lancement ;
- terminer le raccourci après ces actions.

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

- `pending` : la page Shuffle+ n’a pas encore publié ;
- `running` : le lancement Spotify est en cours ;
- `success` : la lecture est confirmée ;
- `error` : le lancement a échoué ;
- `cancel` : le lancement a été annulé.

## Exemple de succès

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "version": "9.9.28",
  "status": "success",
  "success": true,
  "device": "iPhone de Mimieu",
  "message": "Lecture démarrée et vérifiée",
  "durationMs": 2841
}
```

## Dépannage

- `pending` pendant vingt secondes : vérifier que l’URL ouverte contient `requestId` et `resultServer` ;
- erreur 404 : vérifier que Railway exécute bien le serveur v5.1 ;
- erreur CORS dans Shuffle+ : vérifier `SHUFFLEPLUS_ALLOWED_ORIGINS` ;
- résultat perdu après un redéploiement : vérifier le volume et `SHUFFLEPLUS_DATA_DIR` ;
- l’iPhone enregistré est absent : la v9.9.21+ annule le lancement sans basculer sur un autre appareil.
