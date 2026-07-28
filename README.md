# Shuffle+

**Shuffle+** est une application web personnelle qui se connecte à Spotify afin de créer des ordres de lecture plus variés, construire des mix à partir de plusieurs sources, piloter la lecture sur les appareils Spotify et automatiser le lancement depuis iOS.

Version documentée : **3.7.0 — Historique enrichi et corrections**

## Sommaire

- [Présentation](#présentation)
- [Fonctions principales](#fonctions-principales)
- [Navigation dans l’application](#navigation-dans-lapplication)
- [Fonctionnement général](#fonctionnement-général)
- [Mix intelligent](#mix-intelligent)
- [Adaptive DJ](#adaptive-dj)
- [Adaptive Learning](#adaptive-learning)
- [Adaptation automatique](#adaptation-automatique)
- [Intelligence Dashboard](#intelligence-dashboard)
- [Commandes iOS et Raccourcis](#commandes-ios-et-raccourcis)
- [Lecture Spotify](#lecture-spotify)
- [Sauvegarde des données](#sauvegarde-des-données)
- [Installation](#installation)
- [Configuration Spotify](#configuration-spotify)
- [Déploiement sur GitHub Pages](#déploiement-sur-github-pages)
- [Architecture des fichiers](#architecture-des-fichiers)
- [Données locales et confidentialité](#données-locales-et-confidentialité)
- [Dépannage](#dépannage)
- [Limites actuelles](#limites-actuelles)
- [Évolution prévue](#évolution-prévue)

## Présentation

Shuffle+ améliore le mélange classique d’une playlist Spotify en tenant compte de plusieurs critères :

- répétition des artistes et des albums ;
- morceaux écoutés récemment ;
- préférences et priorités ;
- titres à exclure ;
- versions live, remix, instrumental ou karaoké ;
- durée des morceaux et cohérence des transitions ;
- progression d’intensité du mix ;
- durée cible selon le contexte ;
- association automatique d’un mix à un créneau horaire ;
- apprentissage local des choix de mix, suggestions manuelles et adaptation automatique facultative.

L’application est une application web statique : elle fonctionne directement dans le navigateur et ne nécessite pas de serveur applicatif personnel.

## Fonctions principales

### Connexion Spotify

- authentification Spotify avec Authorization Code et PKCE ;
- renouvellement automatique du jeton lorsque Spotify fournit un jeton de renouvellement ;
- déconnexion et suppression des jetons locaux ;
- récupération du profil Spotify de l’utilisateur.

### Bibliothèque musicale

- affichage des playlists accessibles ;
- prise en charge des playlists privées et collaboratives autorisées ;
- accès aux titres enregistrés dans « Titres likés » ;
- recherche dans la bibliothèque ;
- filtres et tris ;
- favoris pour retrouver rapidement certaines sources ;
- détection de l’activité récente et de la date de modification lorsqu’elle est disponible ;
- chargement de plusieurs sources pour fabriquer un seul mix.

### Génération intelligente

- mélange Fisher-Yates comme base aléatoire ;
- réduction des artistes consécutifs ;
- réduction des albums consécutifs ;
- évitement des morceaux présents dans l’historique récent ;
- limitation des transitions incohérentes ;
- règles d’exclusion ;
- règles de priorité ;
- nettoyage des doublons et variantes ;
- courbe d’intensité ;
- profils de mix réutilisables ;
- statistiques après génération.

### Gestion des mix

- création d’un mix à partir d’une ou plusieurs playlists ;
- enregistrement d’un mix dans Shuffle+ ;
- modification de ses sources ;
- association d’un profil ;
- duplication, renommage et suppression ;
- historique des mix lancés ;
- relance depuis l’historique ;
- sauvegarde du résultat dans une nouvelle playlist Spotify privée ;
- programmation locale de mix à certains jours et horaires.

### Lecture Spotify

- détection des appareils Spotify disponibles ;
- sélection d’un appareil ;
- lecture directe de l’ordre généré ;
- lecture d’une playlist fixe ;
- transfert ou ciblage de la lecture selon la commande ;
- reprise d’une file d’attente sauvegardée ;
- lecture par blocs lorsque le mix contient beaucoup de titres ;
- mémorisation de l’ordre récemment envoyé à Spotify.

### Automatisation iOS

- plusieurs commandes iOS ;
- playlist fixe ;
- mix intelligent enregistré ;
- Adaptive DJ ;
- moteur Adaptive Learning, observations, confiance et suggestions ;
- choix de l’iPhone, de l’appareil actif ou d’un appareil nommé ;
- appareil de secours ;
- nombre de tentatives et délai entre les tentatives ;
- démarrage automatique ;
- historique des commandes exécutées ;
- URL prête à être utilisée dans l’application Raccourcis d’Apple.

## Navigation dans l’application

Depuis la version 3.7.0, l’interface est divisée en cinq menus afin d’éviter une longue succession de blocs.

### 🎵 Ma musique

Ce menu sert à :

- rechercher et trier les playlists ;
- sélectionner une ou plusieurs sources ;
- ouvrir une playlist ;
- consulter les titres ;
- créer un nouveau mélange ;
- modifier manuellement l’ordre obtenu ;
- retirer un titre ;
- lancer la lecture ;
- sauvegarder l’ordre dans Spotify.

### 🔀 Mix & iOS

Ce menu regroupe :

- les commandes iOS ;
- les mix enregistrés ;
- les programmations ;
- l’historique des mix.

### 🤖 Adaptive DJ

Ce menu permet :

- d’activer ou désactiver Adaptive DJ ;
- de voir le créneau actuellement détecté ;
- d’associer un mix enregistré à chaque créneau ;
- de lancer immédiatement le mix conseillé ;
- de simuler un autre créneau sans lancer la lecture ;
- de copier l’URL destinée au raccourci iOS ;
- de consulter l’historique Adaptive DJ ;
- d’activer Adaptive Learning, consulter sa confiance et appliquer ou ignorer ses suggestions ;
- d’autoriser l’adaptation automatique, régler ses seuils et annuler un changement.

### 🧠 Intelligence

Ce menu fournit un tableau de bord local :

- activité sur 7 jours, 30 jours, 6 mois ou toute la période ;
- nombre de mix générés et de lancements suivis ;
- nombre et durée potentielle des titres envoyés à Spotify ;
- mix, artistes et albums dominants ;
- confiance Adaptive DJ par créneau ;
- suivi des adaptations automatiques ;
- score de santé du mélange ;
- export d’un rapport JSON indépendant ;
- distinction entre mix généré, commande envoyée et écoute confirmée ;
- filtres par type d’événement et semaine / week-end ;
- comparaison avant / après lorsqu’un choix Adaptive DJ est corrigé ;
- confirmation manuelle d’une écoute réellement effectuée.

Une correction est détectée lorsqu’un autre mix est lancé manuellement dans les 30 minutes suivant Adaptive DJ. Ce mécanisme reste local et peut être réinitialisé avec les statistiques Intelligence.

La « durée potentielle » additionne les durées des titres envoyés à Spotify. Shuffle+ ne peut pas confirmer que chaque titre a été écouté intégralement. Les statistiques sont donc des mesures de préparation et d’envoi, pas un historique Spotify officiel.

### ⚙️ Réglages

Ce menu contient :

- l’export et l’import des données ;
- le nettoyage des doublons ;
- les profils de mix ;
- les priorités ;
- la cohérence ;
- l’intensité ;
- les exclusions.

## Fonctionnement général

Le parcours habituel est le suivant :

1. l’utilisateur se connecte à Spotify ;
2. Shuffle+ charge les playlists et les titres enregistrés ;
3. une ou plusieurs sources sont sélectionnées ;
4. l’application récupère leurs morceaux ;
5. les exclusions et le nettoyage sont appliqués ;
6. le moteur de mélange construit un ordre selon les réglages ;
7. l’utilisateur peut réordonner ou retirer des titres ;
8. le résultat peut être lu directement ou enregistré dans Spotify.

Les préférences, les mix, les profils, les historiques et la configuration sont conservés dans le stockage local du navigateur.

## Mix intelligent

### Sources

Un mix peut utiliser jusqu’à plusieurs sources distinctes parmi :

- les playlists Spotify ;
- les titres enregistrés ;
- les sources favorites.

La version actuelle limite le nombre de sources simultanées pour préserver les performances du navigateur.

### Réglages de mélange

Les réglages principaux permettent notamment de choisir :

- l’écart souhaité entre deux morceaux du même artiste ;
- l’écart souhaité entre deux morceaux du même album ;
- la force d’évitement des titres récents ;
- la cohérence générale ;
- la courbe d’intensité ;
- les règles prioritaires ;
- les exclusions ;
- la durée cible Adaptive.

### Profils

Un profil mémorise un ensemble de réglages. Il permet de passer rapidement d’un style de mix à un autre, par exemple :

- équilibré ;
- découverte ;
- favoris ;
- trajet ;
- soirée ;
- détente.

Les profils peuvent être appliqués au mix courant ou associés à un mix enregistré.

### Priorités

Les priorités peuvent favoriser :

- certains morceaux ;
- certains artistes ;
- certains albums.

Elles influencent l’ordre sans nécessairement supprimer les autres titres.

### Exclusions

Les exclusions peuvent retirer des titres selon :

- le nom du morceau ;
- l’artiste ;
- l’album ;
- certains mots-clés ;
- le type de version ;
- d’autres critères enregistrés dans l’interface.

### Nettoyage

Le nettoyage cherche les doublons ou variantes proches, par exemple :

- version album et version single ;
- version remasterisée ;
- live ;
- remix ;
- instrumental ;
- karaoké.

Le niveau de nettoyage détermine à quel point ces variantes sont regroupées ou retirées.

### Cohérence

La cohérence réduit les ruptures fortes entre deux titres, principalement à partir des informations réellement disponibles dans les données Spotify chargées par l’application, comme :

- la durée ;
- les catégories de durée ;
- le type de version ;
- les successions répétitives.

Shuffle+ ne dispose pas de toutes les caractéristiques audio avancées pour chaque titre. La cohérence ne doit donc pas être interprétée comme un véritable mixage audio ou un fondu DJ.

### Intensité

La courbe d’intensité organise progressivement le mix selon un profil choisi, par exemple :

- stable ;
- montée progressive ;
- départ énergique ;
- vague ;
- final plus calme.

Cette fonction classe les titres à partir des informations disponibles et des réglages internes. Elle ne modifie pas le son des morceaux.

## Adaptive DJ

Adaptive DJ sélectionne automatiquement un mix enregistré selon l’heure locale du navigateur.

### Créneaux par défaut

| Contexte | Horaire |
|---|---:|
| 🌙 Nuit | 00 h – 06 h |
| 🌅 Morning | 06 h – 10 h |
| 🎯 Focus | 10 h – 17 h |
| 🚗 Trajet | 17 h – 21 h |
| 🎉 Soirée | 21 h – 00 h |

### Configuration

1. créer et enregistrer les mix souhaités ;
2. ouvrir le menu **Adaptive DJ** ;
3. activer la fonction ;
4. choisir un mix pour chaque créneau ;
5. enregistrer ;
6. tester un créneau ou lancer le créneau actuel.

### URL automatique

L’URL générique est construite sous cette forme :

```text
https://mgresset.github.io/ShufflePlus/?action=adaptive&autoplay=1
```

Au lancement :

1. Shuffle+ détermine l’heure ;
2. le créneau correspondant est choisi ;
3. le mix associé est chargé ;
4. l’ordre est généré ;
5. un appareil Spotify est recherché ;
6. la lecture démarre lorsque l’appareil est disponible.

Un contexte peut aussi être imposé dans l’URL :

```text
?action=adaptive&context=drive&autoplay=1
```

Valeurs disponibles :

```text
morning
focus
drive
evening
night
```


## Adaptive Learning

La version 3.4.0 ajoute un apprentissage comportemental local dans le menu **Adaptive DJ**. Son principe est volontairement prudent :

> Shuffle+ observe et propose. L’utilisateur conserve la décision finale.

### Données observées

Adaptive Learning mémorise les choix de mix effectués dans Shuffle+ :

- lancement manuel d’un mix enregistré ;
- lancement d’un mix enregistré depuis une commande iOS ;
- nouvelle association enregistrée entre un créneau Adaptive DJ et un mix ;
- lancement réel d’Adaptive DJ, conservé comme historique de contexte.

Les tests de créneau qui ne lancent pas Spotify ne sont pas considérés comme une préférence réelle.

Les lancements automatiques Adaptive DJ sont conservés pour l’historique, mais ils ne peuvent pas créer seuls une suggestion. Cette règle évite que l’application renforce artificiellement sa propre configuration.

### Suggestions

Pour chaque créneau, Shuffle+ recherche le mix choisi le plus régulièrement. Une suggestion peut apparaître lorsque :

- au moins trois choix exploitables ont été observés ;
- un même mix revient plusieurs fois ;
- le niveau de confiance atteint le seuil interne ;
- le mix proposé est différent du mix actuellement associé au créneau.

La confiance combine principalement :

- la proportion de choix en faveur du même mix ;
- le nombre total d’observations disponibles ;
- la récence des données conservées ;
- l’origine du choix, une association explicitement enregistrée ayant plus de poids qu’un lancement automatique.

L’indication « principalement en semaine » ou « principalement le week-end » décrit les observations ayant conduit à la suggestion. La configuration 3.4.0 reste cependant commune à tout le créneau : elle ne crée pas encore deux réglages distincts selon le type de jour.

### Décisions possibles

- **Appliquer** : le mix proposé devient le mix du créneau concerné ;
- **Ignorer** : la suggestion est masquée et ne revient qu’après de nouveaux indices significatifs ;
- **Réinitialiser l’apprentissage** : les observations et décisions d’apprentissage sont supprimées ;
- **Désactiver** : les nouveaux choix ne sont plus enregistrés, sans effacer les données existantes.

Dans la version 3.5.0, aucune suggestion n’est appliquée automatiquement par défaut. Le mode automatique exige une autorisation explicite.

### Stockage et durée

Les données Adaptive Learning sont enregistrées dans `localStorage` sous la clé `shuffleplus_adaptive_learning_v1`.

- jusqu’à 300 observations sont conservées ;
- les observations de plus de 180 jours sont écartées lors de la normalisation ;
- les suggestions acceptées ou ignorées sont limitées afin de préserver le stockage ;
- l’export JSON Shuffle+ inclut l’état complet de l’apprentissage.

### Limite importante

La version 3.4.0 apprend les **choix de mix**, pas les réactions titre par titre. Elle ne détecte pas encore de manière fiable les morceaux passés, les titres terminés ou les préférences audio détaillées. Ces informations demanderaient une collecte de lecture plus continue et des règles supplémentaires.


## Adaptation automatique

La version 3.5.0 ajoute une adaptation automatique **facultative** à Adaptive Learning. Cette option est désactivée par défaut.

### Fonctionnement

Une adaptation est évaluée uniquement lors d’un véritable lancement **Adaptive DJ** avec lecture demandée :

1. Shuffle+ détermine le créneau courant ;
2. il recherche l’habitude la plus forte pour ce créneau ;
3. il vérifie la confiance minimale et le nombre de choix concordants ;
4. il met à jour l’association si le candidat est différent du mix actuel ;
5. il prépare puis lance le nouveau mix.

Une simulation de créneau ne déclenche aucun changement.

### Réglages

Dans **Adaptive DJ → Adaptive Learning**, il est possible de :

- autoriser ou interdire les changements automatiques ;
- choisir une confiance minimale de 60 % à 95 % ;
- choisir le nombre minimal de préférences concordantes ;
- voir le prochain changement possible.

Réglages prudents par défaut :

```text
Confiance minimale : 75 %
Choix concordants : 5
```

### Journal et retour arrière

Chaque modification automatique conserve l’ancien mix, le nouveau mix, le créneau, la confiance, le nombre d’indices et la date. Le bouton **Annuler** restaure l’ancien mix tant que le créneau n’a pas été modifié depuis.

Si la préparation ou la lecture du nouveau mix échoue, Shuffle+ restaure automatiquement l’association précédente et inscrit le retour arrière dans le journal.

### Garde-fou contre l’auto-renforcement

Les lancements Adaptive DJ restent enregistrés dans l’historique, mais leur poids est nul dans le calcul des préférences. Shuffle+ ne peut donc pas augmenter sa confiance simplement en répétant sa propre décision.

## Intelligence Dashboard

La version 3.6 ajoute un tableau de bord sans créer de nouveau module JavaScript. Les événements sont enregistrés dans le stockage local du navigateur au moment où un mix est généré ou envoyé à Spotify.

### Mesures disponibles

- mix générés ;
- lancements envoyés à Spotify ;
- nombre de titres envoyés ;
- durée potentielle calculée à partir de `duration_ms` ;
- mix les plus utilisés ;
- artistes et albums les plus présents dans les ordres suivis ;
- confiance Adaptive Learning par créneau ;
- suggestions acceptées ou ignorées ;
- changements automatiques appliqués ou annulés ;
- qualité du dernier ordre disponible.

### Score de santé du mélange

Le score est une synthèse interne sur 100 construite à partir de :

- séparation des artistes ;
- séparation des albums ;
- transitions brusques ;
- titres récents dans les vingt premiers ;
- respect de la courbe d’intensité ;
- diversité des artistes et des albums.

Ce score sert à comparer les ordres générés par Shuffle+. Il ne constitue pas une mesure musicale universelle.

### Export du rapport

Le bouton « Exporter le rapport » crée un fichier JSON contenant le résumé de la période choisie, les classements, les profils Adaptive et les événements locaux correspondants. La sauvegarde générale de Shuffle+ inclut également les données Intelligence.

## Commandes iOS et Raccourcis

### Types de commandes

Shuffle+ peut générer trois grandes catégories de commandes :

- **Playlist fixe** : lance une playlist Spotify donnée ;
- **Mix intelligent** : génère puis lance un mix enregistré ;
- **Adaptive DJ** : choisit le mix selon le contexte horaire.

### Création d’une commande

Dans **Mix & iOS** :

1. créer une commande ;
2. choisir son type ;
3. sélectionner la playlist ou le mix ;
4. choisir le mode d’appareil ;
5. choisir l’appareil de secours ;
6. régler les nouvelles tentatives ;
7. enregistrer ;
8. copier l’URL générée.

### Raccourci Apple conseillé

Dans l’application **Raccourcis** :

1. ajouter l’action **Ouvrir l’app** et choisir Spotify ;
2. ajouter une courte attente, par exemple une seconde ;
3. ajouter l’action **Ouvrir les URL** ;
4. coller l’URL fournie par Shuffle+ ;
5. ajouter le raccourci à l’écran d’accueil ou à une automatisation personnelle.

Ouvrir Spotify avant Shuffle+ aide l’API à détecter l’iPhone comme appareil disponible.

### Paramètres d’URL reconnus

Les paramètres principaux sont :

```text
action
command ou commandId
playlist ou playlistId
mix ou mixId
profile ou profileId
context ou mood
autoplay
```

Actions reconnues dans la version actuelle :

```text
quickplay
play-playlist
smartmix
adaptive
```

`autoplay=0` prépare l’action sans demander systématiquement une lecture automatique lorsque le flux concerné le permet.

## Lecture Spotify

### Appareil disponible

Pour qu’une commande distante fonctionne :

- l’appareil doit apparaître dans Spotify ;
- il ne doit pas être marqué comme restreint par l’API ;
- Spotify doit généralement être ouvert ou récemment actif sur l’appareil ;
- le compte et les autorisations doivent permettre le contrôle de lecture.

### Ordre généré

Pour un mix intelligent, Shuffle+ envoie directement les URI des morceaux dans l’ordre généré. La version actuelle limite un envoi direct à un nombre raisonnable de titres et utilise une logique de file d’attente/reprise pour les ensembles plus longs.

### Playlist fixe

Pour une playlist fixe, Shuffle+ peut demander à Spotify de lancer directement le contexte de la playlist, avec ou sans mélange Spotify selon la configuration de la commande.

### Sauvegarde dans Spotify

Le bouton de sauvegarde :

1. crée une playlist privée sur le compte connecté ;
2. ajoute les titres dans l’ordre actuellement affiché ;
3. conserve cet ordre comme une playlist Spotify classique.

## Sauvegarde des données

Shuffle+ possède un export JSON permettant de sauvegarder les données locales importantes, notamment :

- sources favorites ;
- préférences ;
- mix enregistrés ;
- profils ;
- historique récent ;
- commandes iOS ;
- historique des commandes ;
- réglages Adaptive DJ ;
- historique Adaptive DJ ;
- observations, confiance, suggestions, réglages automatiques et journal de retour arrière d’Adaptive Learning ;
- programmations.

### Export

Dans **Réglages**, utiliser le bouton d’export. Un fichier JSON est téléchargé par le navigateur.

### Import

1. ouvrir **Réglages** ;
2. sélectionner le fichier JSON précédemment exporté ;
3. confirmer l’import ;
4. vérifier les mix et les paramètres restaurés.

Il est recommandé de faire un export avant une mise à jour importante ou avant de vider les données du navigateur.

## Installation

### Prérequis

- un compte Spotify ;
- une application créée dans Spotify for Developers ;
- un hébergement HTTPS, par exemple GitHub Pages ;
- un navigateur moderne ;
- Git pour publier les mises à jour.

### Installation locale

Télécharger ou cloner le projet :

```bash
git clone <URL_DU_DEPOT>
cd ShufflePlus
```

Comme les modules JavaScript utilisent `type="module"`, il est préférable d’utiliser un petit serveur local plutôt que d’ouvrir directement `index.html` avec `file://`.

Exemple avec Python :

```bash
python -m http.server 8080
```

Puis ouvrir :

```text
http://localhost:8080
```

Le Redirect URI local doit être ajouté dans la configuration Spotify si la connexion est testée en local.

## Configuration Spotify

La configuration se trouve dans `config.js` :

```javascript
export const CONFIG = {
    appName: "Shuffle+",
    version: "3.5.0",
    clientId: "VOTRE_CLIENT_ID",
    redirectUri: "https://votre-site.example/",
    scopes: [
        // autorisations Spotify
    ]
};
```

### Étapes

1. créer une application dans le tableau de bord Spotify ;
2. copier son Client ID ;
3. ajouter exactement l’adresse de retour utilisée par Shuffle+ ;
4. renseigner le même Client ID et la même URL dans `config.js` ;
5. publier ;
6. se reconnecter à Spotify après tout changement important de permissions.

### Autorisations demandées

La version actuelle demande les autorisations nécessaires pour :

- lire les playlists privées et collaboratives ;
- lire les titres enregistrés ;
- lire le profil ;
- consulter les appareils et l’état de lecture ;
- lire les écoutes récentes ;
- contrôler la lecture ;
- créer ou modifier des playlists privées.

## Déploiement sur GitHub Pages

Depuis le dossier du projet :

```bash
git add .
git commit -m "Mise à jour Shuffle+"
git pull --rebase origin main
git push origin main
```

Après la publication :

- sur PC : utiliser `Ctrl + F5` ;
- sur iPhone : fermer complètement Safari puis rouvrir ;
- vérifier que `index.html` charge la bonne version de `app.js`.

Exemple :

```html
<script type="module" src="./app.js?v=3.7.0"></script>
```

Le paramètre `?v=` sert à limiter les problèmes de cache après une mise à jour.

## Architecture des fichiers

```text
ShufflePlus/
├── index.html
├── style.css
├── app.js
├── config.js
├── auth.js
├── spotify-api.js
├── storage.js
├── shuffle-engine.js
├── adaptive-dj.js
├── README.md
└── fichiers de notes de version
```

### `index.html`

Structure minimale de la page, boutons de connexion et conteneur principal de l’application.

### `style.css`

Design responsive, composants, menus, cartes, formulaires, états de lecture, interface Adaptive DJ, panneau Adaptive Learning et adaptation automatique.

### `app.js`

Fichier central de l’application :

- orchestration ;
- interface ;
- bibliothèque ;
- mix ;
- profils ;
- règles ;
- lecture ;
- commandes iOS ;
- programmations ;
- Adaptive DJ ;
- Adaptive Learning et adaptation automatique ;
- sauvegarde et restauration.

La version 3.3.4 privilégie cette intégration afin d’éviter la multiplication de petits modules d’interface.

### `config.js`

Nom, version, Client ID, Redirect URI et autorisations Spotify.

### `auth.js`

Connexion PKCE, traitement du retour Spotify, renouvellement des jetons et déconnexion.

### `spotify-api.js`

Appels vers l’API Spotify : profil, playlists, morceaux, appareils, lecture et création de playlists.

### `storage.js`

Stockage des jetons et des informations temporaires d’authentification.

### `shuffle-engine.js`

Algorithme de mélange, historique récent, priorités, cohérence et analyse des transitions.

### `adaptive-dj.js`

Définition des cinq créneaux horaires et résolution du contexte courant.

## Données locales et confidentialité

Shuffle+ n’utilise pas de base de données personnelle dans cette version.

Les données de l’application sont principalement enregistrées dans :

- `localStorage` pour les préférences persistantes ;
- `sessionStorage` pour certaines informations temporaires ;
- l’API Spotify pour les données du compte et les actions demandées.

Cela signifie :

- les réglages restent liés au navigateur et à l’appareil ;
- vider les données du site peut supprimer la configuration locale ;
- utiliser un autre navigateur ne restaure pas automatiquement les réglages ;
- l’export JSON est important pour sauvegarder et transférer la configuration.

Le Client ID d’une application web PKCE est visible côté navigateur. Aucun secret client ne doit être ajouté au dépôt ou à `config.js`.

## Dépannage

### Le bouton de connexion ne réagit pas

Ouvrir les outils de développement puis l’onglet **Console**. Une erreur d’import JavaScript peut empêcher l’enregistrement du clic.

Exemple déjà rencontré :

```text
The requested module './adaptive-dj.js'
does not provide an export named '...'
```

Dans ce cas, vérifier que le nom importé dans `app.js` existe réellement dans `adaptive-dj.js`.

### La page charge une ancienne version

Vérifier :

```html
<script type="module" src="./app.js?v=3.7.0"></script>
```

Puis forcer le rechargement du navigateur.

### Erreur 403 pendant la lecture

Vérifier :

- que le compte connecté a accès à l’application Spotify ;
- que les autorisations ont été acceptées ;
- que Spotify est ouvert sur l’appareil ;
- que l’appareil n’est pas restreint ;
- que le Redirect URI est exact ;
- qu’une reconnexion a été faite après une modification des scopes.

### Aucun appareil détecté

1. ouvrir Spotify sur l’iPhone ou l’ordinateur ;
2. lancer brièvement un morceau ;
3. attendre une seconde ;
4. relancer la commande Shuffle+.

### `favicon.ico` renvoie 404

Cette erreur indique simplement qu’aucune icône de site n’est installée. Elle ne bloque pas l’application.

### Les réglages ont disparu

Le stockage local du navigateur a probablement été vidé ou le site est ouvert avec une autre adresse. Importer la dernière sauvegarde JSON.

## Limites actuelles

- l’application dépend des possibilités et restrictions de l’API Spotify ;
- la détection d’appareil peut demander que Spotify soit déjà ouvert ;
- certaines fonctions de lecture ne sont pas disponibles pour tous les niveaux de compte ;
- les réglages ne sont pas synchronisés entre appareils ;
- les programmations sont locales et nécessitent que la page puisse s’exécuter ;
- Shuffle+ ne réalise pas de transition audio réelle entre les morceaux ;
- Adaptive Learning 3.5.0 apprend les choix de mix, mais pas encore les skips ou préférences titre par titre ;
- l’adaptation automatique s’exécute au lancement d’Adaptive DJ et non lorsque la page est fermée ;
- les tendances semaine / week-end sont visibles, mais les associations automatiques restent communes au créneau ;
- les données musicales accessibles ne contiennent pas toujours assez d’informations pour mesurer précisément l’énergie ou le tempo.

## Évolution prévue

### Version 4.0 — Application installable

Objectif : transformer Shuffle+ en PWA installable sur iPhone et ordinateur, avec icônes, manifeste, meilleure gestion hors ligne de l’interface et raccourcis d’application.

## Licence et usage

Projet personnel. Ajouter ici la licence choisie avant une diffusion publique ou une contribution externe.
