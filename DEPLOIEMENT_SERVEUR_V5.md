# Déploiement du serveur Shuffle+ v5.0

## 1. Héberger le dossier `server`

Le serveur requiert Node.js 20 ou une image Docker compatible. Il doit disposer :

- d’une URL HTTPS publique ;
- d’un disque persistant pour `SHUFFLEPLUS_DATA_DIR` ;
- de la variable `SHUFFLEPLUS_ALLOWED_ORIGINS=https://mgresset.github.io`.

## 2. Vérifier

Ouvrir :

```text
https://VOTRE-SERVEUR/health
```

La réponse doit contenir `status: ok` et `version: 5.0.0`.

## 3. Relier Shuffle+

Dans la PWA :

1. Réglages → Synchronisation multi-appareils ;
2. saisir l’URL HTTPS du serveur ;
3. cliquer sur **Créer mon espace** ;
4. copier le code de liaison SP5 ;
5. sur l’autre appareil, coller ce code dans **Relier cet appareil**.

## 4. Modèle de sécurité

La clé de chiffrement reste dans les navigateurs. Le serveur conserve uniquement :

- l’enveloppe AES-GCM opaque ;
- la révision ;
- l’empreinte technique ;
- le nom et la dernière activité des installations.

Le code SP5 contient la clé : il doit être traité comme un mot de passe principal.


## Canal de résultat des raccourcis — v5.2

Le serveur exige maintenant un `ResultToken` aléatoire distinct du `requestId`. Aucune nouvelle variable Railway n’est requise. Après le déploiement du serveur v5.2, le raccourci iPhone doit être mis à jour selon `GUIDE-RACCOURCI.md`.
