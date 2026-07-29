# Serveur Shuffle+ v5.0

Serveur Node.js sans dépendance externe. Il transporte des enveloppes déjà chiffrées dans le navigateur et ne possède pas la clé de déchiffrement.

## Démarrage local

```bash
cd server
cp .env.example .env
npm start
```

Les variables du fichier `.env` doivent être exportées par l’environnement d’exécution ; le serveur ne charge pas automatiquement les fichiers `.env` afin de rester sans dépendance.

Test complet :

```bash
npm test
```

## Données persistantes

Le dossier défini par `SHUFFLEPLUS_DATA_DIR` doit être placé sur un disque persistant. Sans cela, les espaces seront perdus au redémarrage de l’hébergeur.

## Sécurité

- HTTPS obligatoire en production ;
- limiter `SHUFFLEPLUS_ALLOWED_ORIGINS` à l’origine de la PWA ;
- sauvegarder régulièrement le dossier de données ;
- ne jamais publier les codes de liaison SP5 ;
- le serveur stocke les jetons d’appareil uniquement sous forme SHA-256 ;
- les paquets Shuffle+ sont chiffrés AES-GCM avant l’envoi.
