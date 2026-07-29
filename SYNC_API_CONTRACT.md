# Shuffle+ — Contrat d’API de synchronisation v1

Ce document décrit le contrat prévu pour la future synchronisation serveur de Shuffle+.
La version 4.6.0 **n’envoie encore aucune donnée à un serveur**.

## Principes

- chaque navigateur possède un `installationId` local unique ;
- le compte Spotify reste l’identité musicale, mais les jetons Spotify ne sont jamais inclus dans les paquets ;
- les données synchronisées sont encapsulées dans un paquet versionné ;
- chaque paquet possède une empreinte, une date d’export et un résumé ;
- un conflit est résolu selon une politique explicite : manuel, plus récent, appareil local ou paquet distant.

## Paquet client

```json
{
  "format": "shuffleplus-sync-package",
  "schemaVersion": 1,
  "appVersion": "4.6.0",
  "exportedAt": "2026-07-28T18:00:00.000Z",
  "dataUpdatedAt": "2026-07-28T17:58:00.000Z",
  "spotifyUserId": "spotify-user-id",
  "sourceInstallation": {
    "id": "installation-uuid",
    "label": "iPhone",
    "createdAt": 1785260000000,
    "updatedAt": 1785260000000
  },
  "fingerprint": "a1b2c3d4",
  "byteSize": 42000,
  "summary": {},
  "backup": {}
}
```

## Endpoints proposés pour v5

### `POST /v1/sync/push`

Enregistre un nouveau paquet pour l’utilisateur authentifié.

Réponse attendue :

```json
{
  "revision": 12,
  "acceptedFingerprint": "a1b2c3d4",
  "serverTime": "2026-07-28T18:00:02.000Z"
}
```

### `GET /v1/sync/pull?afterRevision=12`

Retourne la dernière révision disponible et les métadonnées nécessaires à la comparaison.

### `POST /v1/sync/resolve`

Valide explicitement la résolution d’un conflit.

```json
{
  "localRevision": 12,
  "remoteRevision": 13,
  "resolution": "prefer-remote"
}
```

### `GET /v1/sync/installations`

Liste les installations associées au compte Shuffle+.

### `DELETE /v1/sync/installations/{installationId}`

Révoque une ancienne installation.

## Sécurité prévue

- authentification serveur distincte du jeton Spotify ;
- chiffrement TLS en transit ;
- stockage chiffré côté serveur ;
- aucune conservation des jetons Spotify dans les paquets ;
- journalisation minimale ;
- possibilité de supprimer l’ensemble des données distantes.

## Hors périmètre de la v4.6

- création de compte Shuffle+ ;
- envoi automatique ;
- serveur distant ;
- synchronisation en arrière-plan ;
- fusion champ par champ entièrement automatique.

## Appairage local v4.7

La v4.7 valide deux nouveaux objets avant leur transport futur par le serveur :

- `shuffleplus-pairing-invitation` : invitation temporaire contenant l’identité de l’installation source, une expiration, un code de contrôle et une preuve secrète ;
- `shuffleplus-pairing-acceptance` : confirmation retournée par le second appareil, ciblée vers l’installation d’origine.

Le futur serveur ne devra jamais journaliser le contenu des sauvegardes en clair. Il devra uniquement transporter des enveloppes chiffrées, vérifier leur expiration et empêcher la réutilisation d’une invitation consommée.



## Fusion sélective locale v4.8

La v4.8 ajoute un plan de résolution par catégorie avant tout transport serveur.
Le futur serveur pourra transporter le paquet complet, mais la décision finale reste côté client.
Les catégories actuelles sont : `library`, `profiles`, `automation`, `feedback`, `learning` et `history`.
Chaque catégorie accepte `local`, `merge` ou `remote`. Aucun jeton Spotify n’est inclus.
## Préparation cryptographique v4.9

La v4.9 introduit une enveloppe locale `shuffleplus-encrypted-sync-package`.
Le contenu du paquet de synchronisation est chiffré dans le navigateur avec AES-GCM 256 bits.
La clé est dérivée d’une phrase secrète par PBKDF2-SHA-256 avec 210 000 itérations.
Le futur serveur v5 devra transporter cette enveloppe sans connaître la phrase secrète ni déchiffrer son contenu.

Champs principaux :

```json
{
  "format": "shuffleplus-encrypted-sync-package",
  "schemaVersion": 1,
  "appVersion": "4.9.0",
  "encryptedAt": "2026-07-28T20:00:00.000Z",
  "encryption": {
    "algorithm": "AES-GCM",
    "keyDerivation": "PBKDF2-SHA-256",
    "iterations": 210000,
    "salt": "base64",
    "iv": "base64"
  },
  "ciphertext": "base64"
}
```


## API mise en œuvre en v5.0

Le sous-dossier `server/` implémente réellement :

- `POST /v1/spaces`
- `POST /v1/spaces/{spaceId}/join`
- `GET /v1/spaces/{spaceId}/state?afterRevision=N`
- `PUT /v1/spaces/{spaceId}/state`
- `GET /v1/spaces/{spaceId}/devices`
- `DELETE /v1/spaces/{spaceId}/devices/{installationId}`
- `DELETE /v1/spaces/{spaceId}`
- `GET /health`

Le serveur utilise un jeton révocable par installation. Le secret racine n’est jamais envoyé ; seule son empreinte SHA-256 sert à autoriser l’ajout d’un nouvel appareil. Les enveloppes de données sont chiffrées par le navigateur avec la clé contenue dans le code SP5.
