# Serveur Shuffle+ v5.2.1

Serveur Node.js sans dépendance externe. Il transporte les enveloppes de synchronisation déjà chiffrées dans le navigateur et héberge les résultats temporaires des lancements Apple Raccourcis.

## Démarrage local

```bash
cd server
cp .env.example .env
npm start
```

Les variables du fichier `.env` doivent être exportées par l’environnement d’exécution ; le serveur ne charge pas automatiquement les fichiers `.env`.

Test complet :

```bash
npm test
```

## Routes de résultat de lancement

```text
GET  /v1/launch-results/:requestId?token=<ResultToken>
POST /v1/launch-results/:requestId
Authorization: Bearer <ResultToken>
```

Un GET retourne :

- HTTP 202 avec `status: pending` si Shuffle+ n’a encore rien publié ;
- HTTP 202 avec `status: running` pendant le lancement ;
- HTTP 200 avec `status: success`, `error` ou `cancel` lorsque le résultat est final.

L’identifiant doit être un UUID imprévisible généré pour chaque exécution. Il agit comme une capacité d’accès au résultat et ne doit pas être réutilisé.

## Fiabilité v5.2.1

Les opérations d’un même espace sont sérialisées en mémoire pendant le traitement d’une requête. Le contrôle de `baseRevision`, la mise à jour et l’écriture disque sont donc exécutés dans le même verrou logique. Les écritures JSON utilisent un fichier temporaire unique puis un `rename` atomique.

Deux `PUT /state` concurrents basés sur la même révision produisent exactement un succès et un conflit HTTP 409 ; le test serveur couvre ce scénario.

## Données persistantes

Le dossier défini par `SHUFFLEPLUS_DATA_DIR` doit être placé sur un volume Railway persistant. Il contient les espaces chiffrés et les résultats temporaires. Sans volume, les données peuvent disparaître lors d’un redéploiement.

## Variables

```text
SHUFFLEPLUS_DATA_DIR=/data
SHUFFLEPLUS_ALLOWED_ORIGINS=https://mgresset.github.io
SHUFFLEPLUS_LAUNCH_RESULT_TTL_MS=900000
```

## Sécurité

- HTTPS obligatoire en production ;
- limiter `SHUFFLEPLUS_ALLOWED_ORIGINS` à l’origine de la PWA ;
- utiliser un UUID neuf et imprévisible pour chaque lancement ;
- les résultats expirent automatiquement ;
- le serveur ne reçoit aucun jeton Spotify dans les résultats ;
- les paquets de synchronisation restent chiffrés AES-GCM avant l’envoi.
