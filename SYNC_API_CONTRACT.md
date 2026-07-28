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
