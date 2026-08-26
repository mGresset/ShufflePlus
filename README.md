# Shuffle+ v9.9.49

Shuffle+ est une application web progressive (PWA) conçue pour préparer, lancer et piloter rapidement de la musique Spotify depuis un ordinateur ou un iPhone.

L’application regroupe dans une seule interface :

- la bibliothèque et les playlists Spotify ;
- la création de mix multi-sources ;
- des profils de lancement en une action ;
- des raccourcis iPhone ;
- un assistant musical local ;
- des scènes Adaptive DJ ;
- des routines programmées ;
- un mode conduite ;
- des recommandations, statistiques et objectifs ;
- la sauvegarde locale et la synchronisation chiffrée entre appareils.

> **État du projet :** la branche `9.9.x` est une candidate de finalisation avant la v10. La version actuelle est **9.9.49**.

---

## Sommaire

1. [Fonctions principales](#fonctions-principales)
2. [Prérequis](#prérequis)
3. [Installation rapide](#installation-rapide)
4. [Configuration de Spotify](#configuration-de-spotify)
5. [Navigation détaillée](#navigation-détaillée)
6. [Lecture Spotify et actualisation](#lecture-spotify-et-actualisation)
7. [Installation sur iPhone et PWA](#installation-sur-iphone-et-pwa)
8. [Données, sauvegarde et synchronisation](#données-sauvegarde-et-synchronisation)
9. [Confidentialité et sécurité](#confidentialité-et-sécurité)
10. [Développement local](#développement-local)
11. [Build et déploiement](#build-et-déploiement)
12. [Architecture du projet](#architecture-du-projet)
13. [Validation et tests](#validation-et-tests)
14. [Dépannage](#dépannage)
15. [Documentation complémentaire](#documentation-complémentaire)

---

## Fonctions principales

### Lancement musical en une action

Un profil de lancement peut mémoriser :

- une playlist ou un mix Shuffle+ ;
- l’appareil Spotify prioritaire ;
- l’activation du shuffle ;
- le départ aléatoire ;
- la lecture automatique ;
- l’ouverture du mode conduite ;
- l’intégration Dynamic Lyrics.

Les profils peuvent être épinglés sur l’accueil et lancés depuis le Centre de lancement, un raccourci iPhone ou une suggestion contextuelle.

### Mix multi-sources

Shuffle+ permet de sélectionner jusqu’à **12 sources** musicales, puis de générer un mélange selon les règles configurées :

- répartition entre les sources ;
- limitation des répétitions ;
- évitement des titres récemment utilisés ;
- variété et découverte ;
- départ aléatoire ;
- taille du mix ;
- ordre et comportement du shuffle.

La sélection peut être enregistrée et réutilisée dans un profil, une scène ou une routine.

### Assistant musical local

L’assistant comprend des demandes formulées en français, par exemple :

- lancer une scène ;
- préparer un mix sans démarrer Spotify ;
- effectuer une transition progressive ;
- programmer une routine ;
- ouvrir un tableau de bord ou une fonction de l’application.

L’interprétation du texte est réalisée localement dans le navigateur. Aucun service d’intelligence artificielle externe n’est nécessaire. La dictée vocale dépend des capacités de reconnaissance vocale du navigateur ou du système.

### Adaptive DJ

Adaptive DJ permet de créer des scènes musicales associées à des mix et à des objectifs d’ambiance, notamment :

- énergie ;
- variété ;
- découverte ;
- transitions progressives ;
- durée ou nombre de morceaux ;
- appareil et profil de lecture.

### Routines musicales

Le planificateur peut préparer ou lancer automatiquement un mix ou une scène :

- une seule fois ;
- tous les jours ;
- en semaine ;
- le week-end ;
- certains jours personnalisés.

Chaque routine peut définir une priorité, une fenêtre de rattrapage, un appareil Spotify et l’obligation éventuelle qu’un appareil soit déjà actif.

> Les routines s’exécutent côté navigateur : Shuffle+ doit rester ouvert pour envoyer la commande à Spotify.

### Mode conduite

Le mode conduite fournit une interface agrandie et simplifiée avec :

- le titre et la pochette ;
- le temps et la barre de progression ;
- Pause/Lecture ;
- morceau suivant ;
- file Spotify ;
- maintien de l’écran lorsque la plateforme l’autorise ;
- retour rapide à l’application complète.

---

## Prérequis

### Utilisation

- un compte Spotify ;
- **Spotify Premium** pour piloter la lecture à distance ;
- un navigateur moderne prenant en charge les modules JavaScript ;
- une connexion Internet pour les commandes Spotify et la synchronisation distante ;
- au moins un appareil visible dans Spotify Connect.

### Développement

- Node.js **20 ou supérieur** ;
- npm ;
- Git pour le versionnement et le déploiement ;
- un serveur statique local, fourni par le projet.

Vérifier les versions :

```powershell
node --version
npm.cmd --version
git --version
```

---

## Installation rapide

Depuis le dossier du projet :

```powershell
npm.cmd install
npm.cmd run validate
npm.cmd start
```

Le serveur local utilise l’adresse :

```text
http://127.0.0.1:5500/
```

Ne pas ouvrir directement `index.html` avec une URL `file://` : OAuth, les modules JavaScript, la PWA et le Service Worker nécessitent un serveur HTTP.

---

## Configuration de Spotify

Shuffle+ utilise OAuth avec PKCE. Chaque utilisateur configure son propre **Client ID Spotify**. Aucun Client Secret n’est demandé.

### 1. Créer une application Spotify

Dans le tableau de bord Spotify for Developers :

1. créer une application ;
2. copier son Client ID ;
3. ajouter l’URL de redirection correspondant à l’environnement utilisé.

### 2. URLs de redirection

Production GitHub Pages :

```text
https://mgresset.github.io/ShufflePlus/
```

Développement local :

```text
http://127.0.0.1:5500/
```

L’URL doit correspondre exactement, y compris le `/` final.

### 3. Enregistrer le Client ID

Au premier démarrage :

1. saisir le Client ID dans le panneau de configuration Spotify ;
2. enregistrer ;
3. cliquer sur **Se connecter à Spotify** ;
4. accepter les autorisations demandées.

### Autorisations Spotify utilisées

```text
playlist-read-private
playlist-read-collaborative
playlist-modify-private
user-library-read
user-read-private
user-read-playback-state
user-read-recently-played
user-modify-playback-state
```

Le Client ID est public par nature. En revanche, ne jamais ajouter de Client Secret, de jeton OAuth ou de fichier `.env` privé au dépôt.

---

## Navigation détaillée

La navigation principale contient cinq rubriques : **Accueil**, **Musique**, **Créer**, **Lancer** et **Réglages**. Une recherche universelle est également accessible avec `Ctrl + K` ou `⌘ + K`.

### Accueil

L’accueil présente les actions les plus utiles au quotidien :

- profil principal ;
- bouton **Lancer ma musique** ;
- lecture Spotify actuelle ;
- progression de configuration ;
- appareils et état de disponibilité ;
- file Spotify ;
- profils épinglés ;
- favoris ;
- suggestion contextuelle ;
- prochaine routine ;
- accès rapide aux principales rubriques.

Deux niveaux d’interface sont disponibles :

- **Essentiel** : fonctions quotidiennes et écrans simplifiés ;
- **Expert** : tableaux de bord, statistiques, scènes et réglages avancés.

Le mode Essentiel masque les fonctions avancées sans supprimer leurs données.

### Musique

#### Ma musique

La bibliothèque permet de :

- afficher les playlists et sources accessibles ;
- rechercher par nom ou propriétaire ;
- filtrer les sources ;
- trier par modification, nom ou activité récente ;
- identifier les playlists lisibles ou non lisibles par Shuffle+ ;
- enregistrer des favoris ;
- analyser les sources ;
- sélectionner plusieurs sources ;
- créer et enregistrer un mix.

#### Pour toi

Les recommandations utilisent les réglages, profils, retours et habitudes enregistrés localement afin de suggérer un contenu ou une action pertinente.

#### Statistiques

Le tableau de statistiques suit notamment :

- les sessions envoyées ou confirmées ;
- les morceaux lancés ;
- la durée potentielle ;
- les jours actifs ;
- les séries d’utilisation ;
- le taux de confirmation ;
- des tendances et résumés.

Shuffle+ ne prétend pas mesurer précisément le temps d’écoute réel de Spotify. Une durée « potentielle » correspond aux morceaux envoyés à Spotify.

#### Objectifs

Les objectifs permettent de suivre une fréquence, un volume ou une habitude musicale, avec progression et historique local.

#### Analyses

Les analyses examinent la qualité et la cohérence des mix, la diversité, les répétitions et les tendances d’utilisation.

### Créer

#### Profils de lancement

Un profil regroupe une configuration complète de lancement. Les cartes permettent de :

- lancer immédiatement ;
- copier le lien ou la commande ;
- modifier ;
- dupliquer ;
- supprimer ;
- consulter le dernier diagnostic ;
- épingler le profil sur l’accueil.

#### Assistant

L’assistant propose :

- une zone de texte ;
- la dictée vocale lorsque disponible ;
- des exemples défilants ;
- un plan d’action explicite ;
- un niveau de confiance ;
- une confirmation avant les actions importantes ;
- un historique local.

Le carrousel conserve sa position horizontale après l’analyse et maintient l’exemple actif visible.

#### Adaptive DJ

Cette rubrique permet de créer, modifier et lancer des scènes adaptatives à partir de mix enregistrés.

#### Modes

Les modes regroupent des configurations d’usage et des comportements adaptés à différents contextes.

#### Centre de commandes iOS

Le centre iOS permet de préparer des URLs et des commandes de raccourci avec :

- playlist cible ;
- appareil prioritaire ;
- appareil de secours ;
- shuffle ;
- redémarrage au premier morceau ;
- nombre de tentatives ;
- délai entre les tentatives ;
- historique d’exécution.

#### Résultat asynchrone pour Apple Raccourcis

Depuis la v9.9.31, le flux recommandé n’utilise plus **Ouvrir les URL X-Callback**. Depuis la v9.9.48, le raccourci génère deux UUID : `requestId` pour identifier le lancement et `resultToken` pour authentifier le canal Railway.

Le déroulement est le suivant :

1. Raccourcis génère un identifiant UUID unique ;
2. Raccourcis ouvre Spotify, puis l’URL Shuffle+ du profil en ajoutant `requestId=<UUID>&resultToken=<UUID>` ;
3. Shuffle+ publie d’abord `running`, puis le résultat final sur `/v1/launch-results/<UUID>` ;
4. Raccourcis interroge cette route toutes les secondes ;
5. dès que `status` vaut `success`, `error` ou `cancel`, le raccourci poursuit son workflow.

Le résultat contient notamment :

- `requestId`, `success` et `status` ;
- le `ResultToken` n’est jamais renvoyé dans la réponse et seul son hash est stocké côté Railway ;
- la version de Shuffle+ ;
- l’action et le profil concernés ;
- le nom de l’appareil Spotify ;
- la durée du lancement ;
- un code d’erreur et un message lisible.

Les résultats sont temporaires. Le serveur les supprime après le délai configuré par `SHUFFLEPLUS_LAUNCH_RESULT_TTL_MS`, fixé par défaut à quinze minutes. L’UUID agit comme une capacité secrète : il doit être imprévisible et ne doit pas être réutilisé.

Le serveur Railway configuré dans **Réglages > Synchronisation serveur** est automatiquement ajouté aux URL copiées par le Centre de commandes iOS sous le paramètre `resultServer`. Le raccourci doit ajouter `requestId` et `resultToken`. Sans ces trois paramètres, le lancement Spotify reste possible, mais le résultat sécurisé ne peut pas être publié au raccourci.

L’ancien mécanisme x-callback reste accepté pour compatibilité, mais il n’est plus recommandé dans Safari iOS.

#### Planificateur intelligent

Le formulaire de routine permet de choisir :

- le nom ;
- une scène ou un mix ;
- un profil appliqué ;
- un appareil ;
- une date ou une répétition ;
- la priorité ;
- la fenêtre de rattrapage ;
- le lancement automatique ;
- l’attente d’un appareil actif.

### Lancer

#### Centre de lancement

Le centre affiche les profils prêts, leur diagnostic et leurs dernières exécutions. Il permet un lancement direct sans revenir dans les écrans de configuration.

#### Mode conduite

Le mode conduite est accessible depuis le centre, l’accueil, un profil ou une commande de lecture.

### Réglages

Les réglages couvrent notamment :

- configuration de l’application Spotify ;
- appareil Spotify préféré ;
- modes Essentiel et Expert ;
- thèmes et couleur personnalisée ;
- disposition de l’accueil ;
- options du shuffle ;
- Dynamic Lyrics ;
- assistant vocal ;
- performance et fonctionnement hors connexion ;
- installation et mise à jour de la PWA ;
- sauvegarde et restauration ;
- synchronisation entre appareils ;
- diagnostics et centre de fiabilité ;
- préparation de la future v10 ;
- guide intégré.

### Recherche universelle

La recherche permet d’ouvrir rapidement une rubrique, une fonction ou une action. Elle est accessible depuis le bouton Rechercher et avec :

```text
Ctrl + K
⌘ + K
```

---

## Lecture Spotify et actualisation

### Horloge locale

La barre et le compteur avancent localement toutes les **500 ms**. Shuffle+ n’interroge donc pas Spotify à chaque animation.

### Synchronisation normale

Lorsque l’application est visible, l’état Spotify est recalé périodiquement, généralement toutes les **2 secondes**. Les appels sont suspendus ou réduits lorsque la page est masquée.

### Pause et Lecture

Après une commande Pause ou Lecture :

- l’interface adopte immédiatement l’état demandé ;
- les anciennes réponses Spotify ne peuvent pas annuler visuellement la commande ;
- la progression se fige ou reprend localement ;
- l’état réel est confirmé par des lectures fraîches de Spotify.

### Morceau suivant

Après **Suivant** :

1. Shuffle+ attend environ **700 ms** ;
2. vérifie l’identifiant du morceau ;
3. recommence à intervalles courts si Spotify renvoie encore l’ancien titre ;
4. affiche le nouveau morceau dès confirmation ;
5. reprend ensuite le rythme normal de synchronisation.

Cette stratégie évite d’afficher prématurément un titre incorrect.

### Limites Spotify

Spotify peut refuser une commande lorsque :

- le compte n’est pas Premium ;
- aucun appareil n’est actif ou contrôlable ;
- l’application Spotify n’a pas été autorisée ;
- le quota temporaire est atteint ;
- la session a expiré.

Shuffle+ gère les erreurs `429`, respecte `Retry-After`, limite les requêtes concurrentes et propose des actions de récupération.

---

## Installation sur iPhone et PWA

### Installer depuis Safari

1. ouvrir l’URL GitHub Pages dans Safari ;
2. toucher **Partager** ;
3. choisir **Sur l’écran d’accueil** ;
4. ouvrir Shuffle+ depuis son icône.

L’application peut également afficher un bouton **Installer l’application** lorsque le navigateur le permet.

### Mise à jour

Après un nouveau déploiement :

1. vérifier que l’en-tête affiche la nouvelle version ;
2. fermer complètement la PWA ;
3. la rouvrir avec Internet actif ;
4. utiliser l’outil de réparation dans les réglages si un ancien runtime reste chargé.

Le bootstrap versionné et le Service Worker nettoient les anciens caches `shuffleplus-*` lorsque nécessaire.

### Hors connexion

Sans réseau, Shuffle+ peut conserver une partie de son interface et de ses données locales. Les fonctions suivantes nécessitent Internet :

- connexion OAuth ;
- lecture et commandes Spotify ;
- chargement de la bibliothèque distante ;
- synchronisation serveur ;
- mise à jour de la PWA.

---

## Données, sauvegarde et synchronisation

### Données locales

Les réglages, profils, mix, routines, historiques et préférences sont principalement stockés dans le navigateur.

Vider les données du site ou désinstaller la PWA peut supprimer ces informations si aucune sauvegarde n’a été créée.

### Sauvegarde JSON

Le centre de sauvegarde permet d’exporter puis de restaurer les données Shuffle+. Le paquet n’inclut pas les secrets Spotify.

Il est recommandé d’exporter une sauvegarde avant :

- une modification importante ;
- une réinstallation ;
- un changement d’iPhone ;
- une migration de serveur ;
- une version majeure.

### Synchronisation chiffrée

Le sous-dossier `server/` fournit un serveur Node.js de synchronisation. Le navigateur chiffre les paquets avant leur envoi :

- AES-GCM 256 bits ;
- dérivation PBKDF2-SHA-256 ;
- clé issue du code ou de la phrase secrète d’appairage ;
- jetons d’appareil révocables ;
- jetons stockés côté serveur sous forme d’empreinte SHA-256 ;
- aucun jeton Spotify dans les paquets.

Le serveur transporte les enveloppes chiffrées sans posséder la clé de déchiffrement.

Consulter `SYNC_API_CONTRACT.md` et `server/README.md` pour les détails.

---

## Confidentialité et sécurité

Shuffle+ applique notamment :

- OAuth Spotify avec PKCE ;
- aucun Client Secret dans le navigateur ;
- politique CSP restrictive ;
- échappement du contenu injecté dans l’interface ;
- validation statique des fichiers et imports ;
- absence de jetons Spotify dans les sauvegardes synchronisées ;
- chiffrement côté client pour la synchronisation ;
- journalisation serveur limitée ;
- contrôle des origines autorisées ;
- nettoyage et migration des anciens stockages.

L’assistant textuel analyse les demandes localement. La reconnaissance vocale, lorsqu’elle est utilisée, dépend de l’implémentation du navigateur et du système d’exploitation.

---

## Développement local

### Installer les dépendances

```powershell
npm.cmd install
```

### Lancer l’application

```powershell
npm.cmd start
```

### Contrôles statiques

```powershell
npm.cmd run check
```

Ce contrôle vérifie notamment :

- la syntaxe JavaScript ;
- la cohérence de version ;
- le graphe des imports ;
- la politique de sécurité ;
- l’architecture CSS ;
- les fichiers nécessaires à une release ;
- l’intégrité de cette documentation.

### Tests

```powershell
npm.cmd test
```

### Validation complète

```powershell
npm.cmd run validate
```

La validation exécute les tests, construit `dist/`, contrôle le build et lance un smoke test local.

### Serveur de synchronisation

```powershell
cd server
Copy-Item .env.example .env
npm.cmd test
npm.cmd start
```

Variables principales :

```text
PORT
HOST
SHUFFLEPLUS_DATA_DIR
SHUFFLEPLUS_ALLOWED_ORIGINS
SHUFFLEPLUS_MAX_BODY_BYTES
SHUFFLEPLUS_RATE_LIMIT
```

En production, `SHUFFLEPLUS_DATA_DIR` doit pointer vers un stockage persistant.

---

## Build et déploiement

### Générer GitHub Pages

```powershell
npm.cmd run build
npm.cmd run check:dist
```

Le dossier publiable est :

```text
dist/
```

### Déploiement du dépôt

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.49"
git push origin main
```

GitHub Pages publie l’interface statique. Le serveur de synchronisation peut être déployé séparément sur Railway ou un hébergeur Node.js compatible avec un volume persistant.

### Après publication

1. fermer complètement la PWA ;
2. la rouvrir avec Internet actif ;
3. vérifier que l’en-tête affiche **v9.9.49** ;
4. tester la connexion Spotify, Pause/Lecture, Suivant et un profil de lancement.

---

## Architecture du projet

### Fichiers principaux

```text
index.html                 Structure initiale et configuration PWA
app.js                     Orchestration principale de l’interface
config.js                  Version, redirections et scopes Spotify
auth.js                    OAuth Spotify PKCE
spotify-api.js             Accès à l’API Spotify
shuffle-engine.js          Génération des mix
service-worker.js          Cache et fonctionnement PWA
bootstrap-9.9.49.js        Chargement versionné et migration du runtime
startup-recovery-9.9.49.js Réparation avant le chargement principal
style.css                  Styles historiques et composants
 design-system.css         Harmonisation globale et thème
```

### Modules métier

```text
adaptive-dj.js
adaptive-dashboard.js
musical-assistant.js
voice-assistant.js
personalized-recommendations.js
listening-statistics.js
musical-goals.js
usage-profiles.js
universal-search.js
offline-performance.js
app-health.js
```

### Modules `core/`

Le dossier `core/` contient les briques isolées de navigation, PWA, lecture, appareil Spotify, sécurité, synchronisation, thèmes, sauvegarde et fiabilité.

### Styles chargés à la demande

```text
styles/feature-home.css
styles/feature-search.css
styles/feature-settings.css
styles/feature-driving.css
```

### Serveur

```text
server/server.js
server/test.js
server/.env.example
server/Dockerfile
server/README.md
```

---

## Validation et tests

La v9.9.49 est validée automatiquement par `npm.cmd run validate`, qui couvre notamment :
- tests du serveur réussis ;
- 163 fichiers JavaScript contrôlés ;
- 59 modules reliés à `app.js` ;
- 74 ressources PWA contrôlées ;
- validation CSP ;
- contrôle de l’architecture CSS ;
- build GitHub Pages vérifié ;
- smoke test local réussi.

Les contrôles automatisés ne remplacent pas les essais réels suivants :

- compte Spotify Premium ;
- iPhone et Safari ;
- PWA installée ;
- Spotify Connect ;
- déploiement Railway ;
- synchronisation entre deux appareils.

---

## Dépannage

### `npm.ps1` est bloqué sous PowerShell

Utiliser les exécutables `.cmd` :

```powershell
npm.cmd install
npm.cmd run validate
```

Ou autoriser les scripts pour l’utilisateur courant :

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### La version affichée n’est pas la bonne

Depuis la v9.9.49, **Réparer Shuffle+** est protégé contre les boucles de rechargement sur Safari/PWA iOS et ne touche jamais à l’état PKCE pendant un retour de connexion Spotify.

- fermer entièrement la PWA ;
- rouvrir avec Internet actif ;
- recharger la page ;
- utiliser **Réparer Shuffle+** dans les réglages ;
- vérifier les références de version dans `VERSION`, `config.js`, `app.js`, `index.html`, `service-worker.js` et `package.json`.

### Aucun appareil Spotify n’est détecté

- ouvrir Spotify sur l’appareil ;
- démarrer brièvement un morceau ;
- revenir dans Shuffle+ ;
- actualiser les appareils ;
- vérifier que le compte est Premium et identique dans les deux applications.

### La lecture est refusée

Vérifier :

- Spotify Premium ;
- les scopes OAuth ;
- le Client ID ;
- l’URL de redirection ;
- l’autorisation du compte dans l’application Spotify Developer ;
- la disponibilité de l’appareil Spotify Connect.

### Erreur `429`

Spotify limite temporairement les appels. Shuffle+ applique automatiquement une période de refroidissement et respecte `Retry-After`. Attendre avant de relancer plusieurs commandes.

### La synchronisation distante ne fonctionne pas

- vérifier l’URL du serveur ;
- vérifier HTTPS ;
- contrôler `SHUFFLEPLUS_ALLOWED_ORIGINS` ;
- vérifier le volume persistant ;
- consulter `/health` ;
- exécuter les tests du dossier `server/`.

---

## Documentation complémentaire

- `CHANGELOG.md` : historique consolidé des versions ;
- `DEPLOIEMENT.md` : procédure de publication de la version courante ;
- `DEPLOIEMENT_SERVEUR_V5.md` : déploiement du serveur Railway ;
- `GUIDE-RACCOURCI.md` : construction du raccourci iPhone ;
- `FINALISATION-V10.md` : conditions avant la v10 stable ;
- `ROADMAP.md` : trajectoire du projet ;
- `SYNC_API_CONTRACT.md` : protocole de synchronisation ;
- `server/README.md` : serveur et sécurité.

Les anciens fichiers `Vx.x.x_NOTES.md` et `DEPLOIEMENT-Vx.x.x.md` ont été consolidés afin de garder la racine du dépôt lisible. L’historique détaillé reste également disponible dans Git.

---

## Statut de la v10

La v10.0.0 sera déclarée stable après validation réelle de :

1. la lecture Spotify Premium ;
2. la PWA sur iPhone ;
3. la synchronisation entre appareils ;
4. l’export et la restauration d’une sauvegarde ;
5. le mode conduite ;
6. `npm.cmd run validate` sans échec.

Les correctifs de compatibilité, de sécurité et d’ergonomie resteront possibles après la v10.
