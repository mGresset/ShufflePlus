# Changelog Shuffle+

## 10.3.0

### Lisibilité mobile des modes

- Les cartes **Mode Essentiel** et **Mode Expert** utilisent désormais une structure `icône + contenu` qui résiste aux règles génériques de boutons des Réglages.
- Sur iPhone, le titre reste lisible horizontalement et la description occupe toute la largeur utile sans casser les mots.
- Les cartes deviennent plus compactes sur petits écrans, tout en conservant une zone tactile confortable.

### Architecture & nettoyage

- Nouvelle brique `core/experience-mode-controller.js` pour isoler la transition Essentiel/Expert, le retour depuis un menu avancé et le libellé de confirmation.
- Suppression du wrapper de rendu inutile `renderExperienceModePanel()` dans `app.js`.
- Les styles Essentiel/Expert quittent `style.css` et sont désormais chargés avec `styles/feature-settings.css`, uniquement quand les Réglages en ont besoin.
- Les garde-fous CSS/V10 vérifient automatiquement que cette extraction reste effective.

### Compatibilité

- Aucun changement de raccourci iOS.
- Aucun changement Railway : serveur **v5.2.0** conservé.
- Le diagnostic Spotify Connect introduit en 10.2 reste inchangé.
- Validation finale : **420/420 tests applicatifs**, serveur Railway v5.2.0, build GitHub Pages et smoke test réussis.

## 10.2.0

### Diagnostic & Spotify Connect

- ajoute un diagnostic Spotify Connect dédié qui interroge `GET /me/player/devices` et `GET /me/player` sans réutiliser le cache ;
- effectue une seconde vérification courte lorsque Spotify n’annonce encore aucun appareil au premier passage ;
- compare l’appareil préféré, l’appareil actif et le dernier appareil fonctionnel sans exposer de `device_id` dans les rapports ;
- affiche dans le Centre de fiabilité les contrôles Session Spotify, `/devices`, `/player`, appareil préféré et appareil utilisable ;
- ajoute un bouton **Tester Spotify Connect** et un bouton **Copier le diagnostic** utilisable pour le dépannage ;
- conserve jusqu’à 50 événements dans un historique complet local en complément des derniers événements visibles ;
- ajoute un autodiagnostic après migration de version PWA, sans interrompre un lancement de raccourci en cours ;
- enrichit l’export de fiabilité avec un résumé Spotify Connect anonymisé ;
- conserve le serveur Railway **v5.2.0** et le protocole `RequestId + ResultToken` existant.

## 10.1.4

- rétablit l’alignement à gauche des sous-menus de rubrique sur ordinateur et iPhone ;
- conserve le retour à la ligne responsive sur petit écran, sans réintroduire de défilement horizontal ;
- corrige le sélecteur « Profil principal » du Centre de lancement sur iPhone : son `flex-basis` horizontal ne devient plus une hauteur de 260 px lorsque le formulaire passe en colonne ;
- ajoute un garde-fou de test dédié à la compacité du sélecteur mobile et à l’alignement des sous-menus.

## 10.1.3

- centre horizontalement tous les sous-menus de rubrique (`Musique`, `Créer`, `Lancer` et `Réglages`) ;
- centre également le bouton « Voir plus » avec les autres entrées lorsqu’il est présent ;
- sur iPhone, remplace le défilement horizontal du sous-menu par un retour à la ligne centré et lisible ;
- conserve inchangé le menu principal fixe du bas ;
- validation complète : **411/411 tests applicatifs**, serveur Railway v5.2.0, build et smoke test réussis.

## 10.1.2

- recentre visuellement le bandeau supérieur connecté sur iPhone ;
- évite que la zone « Bienvenue » absorbe tout l’espace disponible dans l’en-tête mobile ;
- corrige l’ouverture de l’éditeur de raccourci : le formulaire est maintenant aligné en haut de la zone visible au lieu d’être placé arbitrairement au centre ;
- ajoute une marge de défilement dédiée pour que le titre et les premiers champs du formulaire restent immédiatement compréhensibles.

## 10.1.1

- Corrige la détection Spotify Connect des raccourcis iPhone : les retries ne réutilisent plus pendant 12 secondes une liste de devices vide mise en cache.
- La recherche d’appareil force désormais un rafraîchissement réel de `GET /me/player/devices` à chaque tentative de raccourci.
- Si Spotify joue déjà sur l’iPhone mais que `/me/player/devices` tarde à le publier, Shuffle+ récupère l’appareil actif via `GET /me/player` avant de conclure à `NO_DEVICE`.
- Ajoute un test de non-régression dédié à ce scénario.

## 10.1.0

### Fiabilité & iPhone

- Ajout d’un assistant de migration directement dans **Créer > Centre de commandes iOS** pour mettre à jour les anciens raccourcis sans les reconstruire.
- Détection d’une URL legacy utilisant `requestId` sans `resultToken`, avec diagnostic lisible et guide de correction.
- Ajout de boutons pour copier l’URL Shuffle+ V10.1, le guide de migration et l’URL Railway sécurisée.
- Le **Centre de fiabilité** affiche désormais un service dédié aux raccourcis iOS : non configuré, Railway requis, prêt à tester ou compatible V10.1 après un lancement confirmé.
- Avant l’application d’une mise à jour PWA, Shuffle+ tente de créer automatiquement une sauvegarde locale des données exportables.
- La sauvegarde pré-mise-à-jour peut être téléchargée ou restaurée depuis **Sauvegarde et restauration**.
- Nouveau module `core/shortcut-migration.js` pour centraliser la compatibilité et les modèles d’URL iOS.
- Nouveau module `core/update-safety.js` pour la sauvegarde de sécurité des mises à jour.
- Extraction du rendu de sauvegarde dans `core/backup-ui.js` afin de poursuivre le découpage progressif de `app.js`.
- Le serveur Railway reste en **v5.2.0** ; aucune nouvelle variable d’environnement n’est requise.

---

## 10.0.1

### Documentation du raccourci iPhone

- Ajout dans le `README.md` d’un tutoriel iOS autonome avec toutes les actions Apple Raccourcis à créer.
- Documentation explicite des variables magiques `RequestId` et `ResultToken`.
- Ajout des paramètres `requestId` et `resultToken` à l’URL Shuffle+ copiée depuis le Centre de commandes iOS.
- Ajout de l’URL Railway complète de lecture du résultat et de la boucle de polling `status`.
- Conservation de `GUIDE-RACCOURCI.md` comme référence détaillée, avec le même flux que le README.
- Aucun changement fonctionnel du moteur Spotify, de la PWA ou du serveur Railway v5.2.0.
- Validation complète : **400/400 tests applicatifs**, tests serveur v5.2.0, build et smoke test réussis.

---

## 10.0.0

### Première release V10

- Passage du canal de publication à **stable** et identité de build `10.0.0`.
- Conservation des correctifs iPhone/OAuth et anti-boucle PWA introduits en 9.9.49.
- Suppression du panneau d’accueil V8 devenu inutilisé et renommage du rendu d’accueil courant sans numéro historique.
- Nettoyage des numéros de sous-version visibles dans les objectifs, recommandations, statistiques, assistant, raccourcis iOS, Mix Studio et synchronisation.
- Mode Essentiel maintenu comme interface quotidienne courte ; les fonctions avancées restent disponibles en mode Expert.
- Ajout d’un contrôle `check-v10-cleanup.mjs` empêchant la réintroduction des principaux reliquats d’interface historiques.
- Ajout de tests V10 dédiés à l’identité de release, au mode Essentiel, au mode conduite et à la protection iPhone/PWA.
- **399 tests applicatifs réussis**, 169 fichiers JavaScript contrôlés, 61 modules reliés et 76 ressources PWA validées.
- La validation automatisée ne remplace pas les essais terrain Spotify Premium, PWA iPhone, Railway, sauvegarde/restauration et conduite.

---

Ce fichier regroupe l’historique qui était auparavant réparti dans les fichiers `Vx.x.x_NOTES.md`.
Git conserve en complément l’historique complet de chaque modification.

## 9.9.49

### Connexion Spotify iPhone et réparation PWA

- Protection du callback Spotify OAuth/PKCE : la récupération de démarrage ne supprime plus `code_verifier` ni `state` pendant le retour de Spotify.
- Le watchdog de démarrage passe de 10 à 25 secondes et devient non destructif lorsqu’un callback OAuth est présent.
- Ajout d’un verrou anti-boucle de réparation basé à la fois sur `sessionStorage` et sur le paramètre `recovery` de l’URL.
- Une réparation injecte le `shuffleplus_build` courant dans l’URL afin d’empêcher le bootstrap de déclencher une seconde purge si `localStorage` est indisponible sur Safari/PWA iOS.
- Les marqueurs de réparation ne sont nettoyés qu’après 20 secondes de stabilité, au lieu d’être supprimés dès le chargement principal.
- Le bouton de réparation des Réglages délègue désormais au même moteur de récupération sécurisé, au lieu d’utiliser une deuxième implémentation avec `location.reload()`.
- Le mode de secours limite lui aussi le désenregistrement du Service Worker au scope exact de Shuffle+.
- Ajout de tests de non-régression dédiés à la connexion Spotify et aux boucles de rechargement iPhone.

---

## 9.9.48

### Consolidation avant version finale

- Limitation stricte de la réparation PWA au Service Worker du scope Shuffle+ ; les autres projets du même domaine ne peuvent plus être désenregistrés.
- Durcissement de la CSP : les connexions sortantes sont limitées à Spotify et aux serveurs Railway `*.up.railway.app`.
- Canal Railway `launch-results` authentifié par un `ResultToken` aléatoire distinct du `requestId` ; serveur mis à jour en **v5.2.0**.
- Réservation atomique du `requestId` avec empreinte SHA-256 du jeton afin d’empêcher la prise de contrôle du résultat par une requête concurrente.
- Rate limiter Railway renforcé : prise en compte du dernier `X-Forwarded-For`, purge périodique des buckets expirés et plafond mémoire.
- Consolidation des correctifs CSS mobiles du mode conduite 9.9.30→9.9.47 en un seul contrat portrait, sans empilement contradictoire de `height`, `overflow` et spacers Safari.
- Description PWA rendue générique afin qu’elle ne devienne plus obsolète à chaque version.
- Ajout de garde-fous automatisés spécifiques au hardening final.

> Important : le serveur Railway v5.2 nécessite la mise à jour du raccourci iPhone avec `ResultToken`, décrite dans `GUIDE-RACCOURCI.md`.

---

## 9.9.47

### Nettoyage de la documentation

- Regroupement de toutes les notes de versions dans ce fichier `CHANGELOG.md`.
- Suppression des fichiers `Vx.x.x_NOTES.md` devenus redondants.
- Remplacement des fichiers `DEPLOIEMENT-Vx.x.x.md` par un seul `DEPLOIEMENT.md` à jour.
- Renommage du guide de raccourci en `GUIDE-RACCOURCI.md`.
- Suppression des anciens rappels `INSTALLATION-Vx.x.x.txt` et `PATCH_MANIFEST_Vx.x.x.txt`, redondants avec Git et la procédure courante.
- Ajout de contrôles empêchant le retour des anciens fichiers versionnés.

---

## 9.9.46

## Mode conduite

- Remplacement du bouton **Lancer Adaptive DJ** par **🔀 Aléatoire ON/OFF**.
- Le bouton utilise l’état `shuffle_state` réel de Spotify.
- Appui = activation/désactivation du shuffle sur l’appareil Spotify actif.
- Retour visuel immédiat avec `aria-pressed` et état ON/OFF.
- Protection temporaire de 5 s contre les réponses Spotify retardées.
- Les anciennes préférences ayant `Adaptive DJ` comme action principale migrent automatiquement vers `Aléatoire`.
- Adaptive DJ reste disponible dans ses autres rubriques de Shuffle+.

---

## 9.9.45

## Mode conduite

- Suppression complète du lien Spotify du bandeau secondaire.
- Suppression du bouton Liste du bas, doublon du bouton « Voir la liste » situé dans la file d’attente.
- Redistribution des commandes secondaires sur trois colonnes.
- Libellés complets et non tronqués sur mobile.
- « Auto » est renommé « Actualisation auto » pour expliciter son rôle.
- L’actualisation automatique continue de synchroniser périodiquement l’état de lecture Spotify et, lorsque la file est ouverte, son contenu.

---

## 9.9.44

## Badge « Prêt à tester » centré

- Le badge du profil principal utilise maintenant un conteneur `inline-flex`.
- Son libellé est centré horizontalement et verticalement.
- Le badge ne s’étire plus à la hauteur du bloc d’identité sur téléphone.
- Le comportement reste identique pour les états Opérationnel, À configurer et Dernier essai en erreur.

---

## 9.9.43

## Mode conduite équilibré

- Le panneau mobile reprend toute la hauteur utile du viewport Safari.
- L'espace libre est réparti entre les sections au lieu de former une grande zone vide en bas.
- Les boutons compacts de la v9.9.41 restent à la même taille.
- Le mode conduite reste sans défilement en portrait.
- Sur les écrans très courts, la disposition ultra-compacte conserve des espacements minimaux.

---

## 9.9.42

## Cadre conduite ajusté au contenu

- suppression de la hauteur forcée à 100 % du panneau mobile ;
- le cadre se termine désormais juste après le dernier message visible ;
- conservation du viewport Safari fixe et des commandes sans défilement ;
- maintien d'une hauteur maximale de sécurité sur les petits écrans.

---

## 9.9.41

## Mode conduite compact sans défilement

- Réduction des quatre commandes principales sur téléphone.
- Suppression du défilement vertical dans la vue conduite standard.
- Compression adaptative des informations secondaires selon la hauteur disponible.
- Masquage automatique des détails les moins importants sur les petits écrans.
- Conservation de toutes les commandes principales, d’avis et secondaires à l’écran.
- Détection automatique d’un viewport exceptionnellement court avec variante ultra-compacte.

---

## 9.9.40

## Viewport conduite stable après chaque commande

Sur Safari iPhone, un appui sur Pause, Suivant ou une autre commande pouvait produire une mesure transitoire du Visual Viewport pendant le rerendu. Le panneau conduite reprenait alors une hauteur trop grande.

La v9.9.40 conserve la dernière hauteur stable pendant toute l'action, diffère la nouvelle mesure jusqu'à la fin de l'animation Safari et ne remesure plus le viewport à chaque reconstruction de l'interface.

---

## 9.9.39

## Mode conduite sur Safari iPhone

- le panneau est désormais ancré sur le `visualViewport` réellement visible ;
- le décalage vertical de Safari est suivi via `visualViewport.offsetTop` ;
- la position de défilement interne est conservée lors des rerendus automatiques ;
- une réserve basse renforcée permet de remonter entièrement les commandes secondaires, la personnalisation et le message au-dessus de la barre Safari ;
- aucun changement n'est requis dans les raccourcis iPhone ou sur Railway.

---

## 9.9.38

## Navigation et recherche

- L’ouverture de **Rechercher** désélectionne immédiatement l’ancienne rubrique de la barre mobile.
- Tant que la recherche est ouverte, aucun rerendu ne peut réactiver une autre rubrique en arrière-plan.
- À la fermeture de la recherche, la rubrique précédemment ouverte retrouve son état actif.
- Les attributs `aria-current` restent synchronisés avec l’état visuel.

---

## 9.9.37

## Correctif

- Le bouton **Rechercher** retrouve intégralement son apparence neutre après la fermeture de la recherche.
- La bordure active est liée uniquement à l’ouverture réelle de la palette.
- Les états tactiles persistants de Safari (`hover`, `active`, focus résiduel) ne laissent plus de cadre partiel.
- Tout changement de rubrique ferme et réinitialise explicitement la recherche.

---

## 9.9.36

## Navigation mobile cohérente dès le premier rendu

- le bouton **Rechercher** affiche immédiatement la même présentation sur téléphone ;
- l’indication clavier `Ctrl/⌘ K` est masquée avant le chargement différé de la recherche ;
- l’ouverture de la recherche ne provoque plus de changement de texte dans la barre inférieure ;
- l’icône et le libellé **Rechercher** restent visibles en permanence.

---

## 9.9.35

## Navigation mobile

- Le libellé **Rechercher** reste visible après l’ouverture de la recherche globale.
- Le chargement différé de `feature-search.css` ne transforme plus le bouton en icône seule.
- Seul le raccourci clavier `Ctrl/⌘ K` est masqué sur les petits écrans.
- Le libellé revient et reste présent après la fermeture de la recherche ou le changement de rubrique.

---

## 9.9.34

## Mode conduite sur Safari iPhone

- hauteur calée sur `visualViewport.height` lorsque disponible ;
- recalcul lors du redimensionnement et du déplacement du viewport Safari ;
- compensation de la zone basse occupée par l’interface du navigateur ;
- espace de fin scrollable pour afficher entièrement les dernières commandes ;
- conservation des safe areas iPhone.

---

## 9.9.33

## Mode conduite mobile

- Remplacement de la grille verticale rigide par un flux mobile naturel.
- La file Spotify, les commandes principales, les avis et les réglages ne peuvent plus partager la même ligne visuelle.
- Le cadre conduite reste limité au viewport et défile à l'intérieur lorsque nécessaire.
- Les quatre commandes principales conservent une hauteur tactile minimale sans masquer la file d'attente.

---

## 9.9.32

## Correctif mode conduite depuis un raccourci

Le mode conduite charge désormais sa feuille de style dédiée avant tout premier rendu, y compris lorsqu’il est activé directement par une URL Apple Raccourcis.

Cela évite le retour à l’ancienne grille mobile qui plaçait la progression et la file Spotify après les commandes et coupait le bas du cadre.

---

## 9.9.31

## Commandes de raccourci conservées après une recharge PWA

La commande reçue dans l’URL est sauvegardée par le bootstrap avant toute purge de cache ou recharge du runtime. Si Safari recharge ensuite Shuffle+ sans conserver la query string, `app.js` récupère la commande depuis `sessionStorage`, puis exécute normalement le lancement et publie son état sur Railway.

Le relais expire après deux minutes et est supprimé dès que la commande a été convertie en commande pending interne.

---

## 9.9.29

## Détection fiable de l’iPhone enregistré

- Ajout d’une phase de réveil Spotify Connect de 700 ms avant la première recherche.
- Le mode strict « iPhone enregistré » effectue désormais au minimum 10 vérifications.
- Les vérifications sont espacées de 700 à 1 000 ms afin de laisser Spotify annoncer l’iPhone.
- Aucun ordinateur, téléviseur ou autre téléphone n’est utilisé comme appareil de secours.
- Le résultat Railway reste `running` pendant la recherche puis devient `success` ou `error`.

Cette correction vise le cas où le premier lancement échoue mais le second fonctionne parce que Spotify Connect a fini de réveiller l’iPhone.

---

## 9.9.28

## Objectif

Permettre à un raccourci Apple de poursuivre son exécution sans attendre un x-callback Safari.

## Nouveautés

- paramètres d’URL `requestId` et `resultServer` ;
- publication Railway de l’état `running` puis du résultat final ;
- endpoint public à capacité `/v1/launch-results/:requestId` ;
- résultat temporaire expirant après quinze minutes par défaut ;
- trois tentatives de publication côté navigateur ;
- URL des profils enrichie automatiquement avec le serveur Railway configuré ;
- tests frontend et serveur dédiés.

## Résultat JSON

Le raccourci reçoit `status`, `success`, `device`, `message`, `code`, `durationMs`, `action`, `commandId` et `version`.

---

## 9.9.27

## Nouveautés

- prise en charge des paramètres `x-success`, `x-error` et `x-cancel` ajoutés par l’action **Ouvrir les URL X-Callback** d’Apple Raccourcis ;
- retour automatique dans Raccourcis après confirmation de la lecture Spotify ;
- résultat JSON contenant le statut, l’action, l’appareil, la durée et le message ;
- retour d’erreur avec `errorMessage` et `errorCode` ;
- bouton d’annulation pendant l’écran de lancement lorsqu’un callback est disponible ;
- validation des URL de rappel : seul le schéma `shortcuts:` est accepté ;
- les anciennes URL ouvertes avec **Ouvrir les URL** continuent de fonctionner sans callback.

## Limitation iOS

Le retour x-callback replace Raccourcis au premier plan. Safari ne permet pas à une page web de fermer de façon fiable un onglet qu’elle n’a pas créé elle-même ; l’onglet peut donc rester en arrière-plan, mais il n’interrompt plus le raccourci.

---

## 9.9.26

- Les commandes rapides ne conservent plus de faux état sélectionné après un clic, un focus ou un survol tactile persistant.
- La grille affiche toujours six actions : le mode conduite lorsqu’il est disponible, sinon la nouvelle commande « Actualiser Spotify ».
- « Actualiser Spotify » recharge immédiatement le titre, l’état de lecture et l’appareil actif.

---

## 9.9.25

## Assistant

- aucune commande exemple n’est présélectionnée lors d’une nouvelle entrée dans la rubrique ;
- la position horizontale revient au début pour présenter une rangée neutre ;
- ajout de la commande « Montre mes recommandations musicales ».

---

## 9.9.24

## Cadre du diagnostic de lancement

La section « Diagnostic du dernier lancement » de la rubrique Lancer utilise désormais la même géométrie que les autres sous-cartes : bordure liée au thème, fond discret, rayon de 15 px et espacement interne homogène.

Aucune logique Spotify, raccourci ou mode conduite n’est modifiée dans cette version.

---

## 9.9.23

## Personnalisation du mode conduite entièrement défilable

Cette version corrige le panneau **Personnaliser la conduite** qui pouvait se bloquer avant les derniers réglages sur iPhone.

### Cause

Le mode conduite verrouille le défilement de la page principale afin de conserver les commandes dans le viewport. Sur téléphone, le panneau de personnalisation participait pourtant à cette grille fixe et ne disposait que d'une petite zone de défilement imbriquée. Un changement d'option reconstruisait également le panneau et perdait sa position interne.

### Corrections

- le panneau ouvert devient un volet mobile autonome couvrant la zone visible ;
- son en-tête reste accessible pour pouvoir le refermer ;
- la liste interne utilise un défilement vertical fluide compatible iOS ;
- les safe areas de l'iPhone sont respectées en haut et en bas ;
- la dernière option reste accessible avec une marge inférieure ;
- la position interne du panneau est conservée lorsqu'un réglage déclenche un rerendu.

---

## 9.9.22

## Défilement mobile stable

Cette version corrige le retour involontaire vers une ancienne position pendant un défilement rapide sur téléphone.

### Cause

En mode Essentiel, le tableau de bord musical détaillé n'est pas rendu. Le polling Spotify cherchait malgré tout sa carte de lecture toutes les deux secondes. L'absence de cette carte déclenchait une reconstruction complète de l'accueil, puis une restauration de scroll mémorisée avec un léger retard.

### Corrections

- le polling silencieux ne reconstruit plus jamais l'accueil ;
- la carte Spotify n'est mise à jour que lorsqu'elle est réellement affichée en mode Expert ;
- la position courante est mémorisée immédiatement à chaque événement de scroll ;
- seule l'écriture dans `localStorage` reste différée ;
- les rerendus explicites d'une même page restaurent la position exacte capturée juste avant le remplacement du DOM.

---

## 9.9.21

## Ciblage strict de l’iPhone enregistré

- Le mode « iPhone préféré enregistré » ne bascule plus vers le dernier appareil actif, un autre smartphone ou le premier appareil disponible.
- Si l’iPhone enregistré n’est pas visible, Shuffle+ réessaie uniquement cet appareil puis annule le lancement.
- Si Spotify renouvelle le `device_id`, le même iPhone peut encore être retrouvé par son nom et son type enregistrés.
- Les modes « iPhone ou smartphone », « Appareil actif » et « Premier disponible » conservent leurs mécanismes de secours.
- Le diagnostic affiche « iPhone enregistré indisponible » et confirme qu’aucun autre appareil n’a été utilisé.

---

## 9.9.20

## Navigation mobile stable sur Safari

- La barre principale n’utilise plus uniquement `bottom: 0` sur iPhone.
- Sa position est synchronisée avec `window.visualViewport` pendant le scroll, le redimensionnement et les changements d’orientation.
- La barre reste collée au bas de la zone réellement visible lorsque les barres Safari se replient.
- Un ancrage CSS classique reste disponible si `VisualViewport` n’est pas pris en charge.
- Le padding inférieur de l’application suit automatiquement la hauteur réelle du menu.

---

## 9.9.19

## Mode conduite adaptatif

- Le mode conduite utilise désormais `100dvh` sur les navigateurs modernes.
- La hauteur n’est plus calculée directement avec `visualViewport.height`, ce qui évite une interface trop courte avec le zoom d’affichage Safari.
- Le cadre occupe toute la zone visible, en portrait comme en paysage.
- Sur téléphone, le panneau « Personnaliser la conduite » participe au flux de l’écran au lieu de flotter au-dessus d’une grande zone vide.

## Pochette d’album stable

- Les synchronisations Spotify périodiques mettent à jour uniquement les données de lecture utiles.
- La pochette n’est plus recréée lorsque son URL n’a pas changé.
- Lors d’un vrai changement de morceau, la nouvelle image est préchargée avant de remplacer l’ancienne.

---

## 9.9.18

## Assistant musical

- Conservation de la position horizontale du carrousel d’exemples pendant les rerendus.
- L’exemple actif reste visible après la sélection.
- Aucun appel à `scrollIntoView` : le défilement vertical de la page reste intact.

---

## 9.9.17

## Sélection tactile fiable dans l’assistant

- Aucun exemple n’est sélectionné au démarrage.
- Un seul exemple peut avoir `aria-pressed="true"`.
- La sélection est réappliquée après chaque rerendu de la page Assistant.
- Les anciens marqueurs visuels `is-selected` sont supprimés.
- Les états `:hover`, `:focus` et `:active` d’un bouton non sélectionné restent neutres.
- Le survol tactile persistant de Safari et des navigateurs hybrides ne peut plus imiter une sélection.

## Validation

- 307 tests applicatifs réussis.
- Tests du serveur réussis.
- Build GitHub Pages validé.
- Contrôle de distribution et smoke test réussis.

---

## 9.9.15

## Harmonisation desktop
- Alignement vertical et horizontal affiné sur les principaux panneaux desktop.
- Espacement cohérent entre les cadres de la rubrique Créer.
- En-têtes et groupes d’actions normalisés.

## Couleurs du thème
- Le bandeau Analyse des playlists utilise désormais le thème actif.
- Les cartes de succès et profils opérationnels utilisent la couleur d’accent active au lieu du vert historique.
- Les erreurs et avertissements conservent leurs couleurs sémantiques.

## Assistant
- Espacement réel entre Parler à Shuffle+ et Analyser la demande.
- Les exemples de commandes possèdent un état sélectionné fiable via aria-pressed.
- L’exemple sélectionné suit réellement la commande analysée.

---

## 9.9.14

## Interface

- Barre supérieure recentrée verticalement dans son cadre.
- Alignement homogène du logo, des indicateurs, du message de bienvenue et des actions.
- Planificateur intelligent restructuré pour empêcher les chevauchements.
- Actions du planificateur alignées et adaptées aux largeurs desktop, tablette et mobile.

## Correctif CI

- Toutes les attentes de version de la suite de tests ont été synchronisées sur 9.9.14.
- Le test de synchronisation rapide n’attend plus l’ancienne version 9.9.13.

## Validation

- 297 tests applicatifs réussis sur 297.
- Tests du serveur réussis.
- Build GitHub Pages validé.
- Smoke test local réussi.

---

## 9.9.13

## Barre supérieure mobile

La version et l’état réseau sont maintenant disposés côte à côte sur une seule ligne. Les badges conservent une taille compacte sur les écrans de 390 px et moins.

## Logo Shuffle+ interactif

Le logo et le nom Shuffle+ forment désormais un lien accessible. Un appui ouvre la page Accueil et replace la page en haut. Le lien dispose d’un libellé pour les lecteurs d’écran, d’une cible tactile d’au moins 44 px et d’un focus clavier visible.

## Compatibilité

Les corrections de lecture Spotify, de défilement mobile et de cache PWA des versions précédentes restent inchangées.

---

## 9.9.12

## Défilement mobile stable

L’actualisation Spotify automatique toutes les deux secondes reconstruisait auparavant toute la page d’accueil. Sur Safari iOS, cette reconstruction interrompait le défilement inertiel et restaurait une position enregistrée quelques instants plus tôt.

La v9.9.12 remplace ce rendu global par une mise à jour DOM ciblée de la carte de lecture :

- appareil actif ;
- pochette ;
- titre, artiste et album ;
- bouton Pause/Lecture ;
- barre et temps de progression.

Le reste de la page conserve ses nœuds DOM et sa position de défilement. Une reconstruction globale n’est utilisée qu’en secours si la carte n’existe pas encore.

## Compatibilité

Les corrections Spotify de Pause/Lecture, du bouton Suivant et du polling toutes les deux secondes restent inchangées.

---

## 9.9.11

## Carte Configuration sur téléphone

Sur le tableau de bord Expert, la carte de configuration pouvait toucher visuellement le bloc « Bon après-midi, ton univers musical ». Le conteneur de la page est maintenant une grille avec un espacement explicite entre l’accueil v9 et le tableau musical.

La carte elle-même utilise une hauteur automatique, masque tout débordement décoratif et place son bouton dans le flux normal. Sous 520 px, la progression, le texte et le bouton sont empilés avec un espacement constant.

## Version dans la barre supérieure

La version n’est plus masquée sur mobile. Elle apparaît sous la forme compacte `v9.9.11`, empilée au-dessus du badge « En ligne » afin de préserver la place disponible pour le nom de l’utilisateur.

## Déconnexion simplifiée

Le bouton de déconnexion n’utilise plus le style secondaire ou danger. Il affiche uniquement l’icône de sortie, sans fond, contour, capsule ni ombre. Il conserve un libellé accessible et un contour de focus uniquement pour la navigation au clavier.

## Compatibilité

La logique Spotify de la v9.9.10 est inchangée :

- confirmation différée du titre suivant après 700 ms ;
- synchronisation automatique toutes les 2 secondes lorsque l’application est visible ;
- horloge locale de progression toutes les 500 ms.

---

## 9.9.10

## Suivant : confirmation différée

La version 9.9.9 interrogeait encore Spotify trop tôt après la commande Suivant : une lecture générale partait environ 140 ms après l’action et le mode conduite lançait une vérification immédiate.

La version 9.9.10 applique désormais la séquence suivante :

1. envoi de la commande Suivant ;
2. attente de 700 ms ;
3. lecture fraîche de l’état Spotify ;
4. nouvelle vérification toutes les 700 ms tant que l’identifiant du titre n’a pas changé ;
5. arrêt immédiat dès confirmation, avec une limite de 5,6 secondes.

Le prochain titre n’est plus prédit depuis la file Spotify. Pendant l’attente, Shuffle+ conserve le titre courant et fige la barre de progression. Le nouveau titre et sa progression réelle sont affichés uniquement après confirmation de Spotify.

Une garde post-confirmation de 2,1 secondes protège aussi l’interface contre une ancienne requête réseau qui terminerait en retard.

## Actualisation automatique

Lorsque l’application est visible :

- tableau de bord : toutes les 2 secondes ;
- mode conduite : toutes les 2 secondes ;
- horloge locale de progression : toutes les 500 ms, sans appel Spotify supplémentaire.

Lorsque l’application est masquée, les minuteries réseau sont arrêtées.

---

## 9.9.9

## Titre suivant instantané

La commande **Suivant** n'attend plus le prochain rafraîchissement périodique pour mettre à jour l'interface.

Dès l'appui :

- Shuffle+ utilise le premier titre disponible dans la file Spotify pour afficher immédiatement le morceau attendu ;
- la barre de progression revient à zéro et recommence à avancer avec l'horloge locale ;
- plusieurs lectures Spotify fraîches sont déclenchées à intervalles courts jusqu'à confirmation du changement réel ;
- les anciens retours correspondant encore au titre précédent ne peuvent pas écraser l'affichage optimiste pendant la transition ;
- si la commande échoue réellement, le titre, la progression et la file précédents sont restaurés.

La logique est commune au tableau de bord, aux commandes rapides et au mode conduite.

## Synchronisation automatique accélérée

Lorsque l'actualisation automatique est activée :

- le tableau de bord vérifie désormais Spotify toutes les **5 secondes** ;
- le mode conduite vérifie désormais Spotify toutes les **5 secondes** au lieu de 12 secondes ;
- les requêtes sont suspendues lorsque l'application n'est pas visible ;
- l'horloge et la barre continuent d'être animées localement toutes les 500 ms, sans appel Spotify supplémentaire.

Après **Suivant**, la file Spotify est relue sans cache afin de présenter les morceaux à venir dans le bon ordre.

## Validation

- 284 tests applicatifs réussis sur 284 ;
- tests du serveur Railway réussis ;
- 125 fichiers JavaScript vérifiés ;
- 57 modules reliés à `app.js` ;
- 72 ressources PWA contrôlées ;
- build GitHub Pages validé ;
- test serveur local réussi.

---

## 9.9.8

## Correctif Pause / Lecture

Cette version corrige deux causes qui pouvaient produire un retour visuel à l'ancien état alors que Spotify avait bien mis la musique en pause.

### Runtime PWA cohérent

Shuffle+ est désormais chargé par `bootstrap-9.9.8.js`.

Lors du premier lancement de cette version, le bootstrap :

- détecte le changement d'identité du build ;
- désinscrit l'ancien Service Worker ;
- supprime les anciens caches `shuffleplus-*` ;
- recharge une seule fois l'application ;
- importe ensuite `app.js` avec l'identité exacte du build.

Cela empêche une page HTML 9.9.8 d'exécuter un ancien `app.js` 9.9.5, 9.9.6 ou 9.9.7.

### Réponse Spotify incertaine

Spotify peut appliquer une commande Pause/Lecture, puis retourner une erreur réseau ou interrompre la réponse.

Après qu'une commande a été envoyée :

- Shuffle+ ne restaure plus immédiatement l'ancien bouton ;
- l'état local attendu reste prioritaire ;
- la barre demeure figée après Pause ;
- les vérifications Spotify différées confirment ensuite l'état réel.

Une erreur survenue avant l'envoi de la commande continue en revanche à restaurer l'état précédent.

## Validation

- 278 tests réussis sur 278 ;
- 124 fichiers JavaScript vérifiés ;
- 57 modules reliés à `app.js` ;
- 72 ressources PWA contrôlées ;
- tests du serveur Railway réussis ;
- build GitHub Pages validé ;
- test serveur local réussi.

---

## 9.9.7

## Correction principale

La commande Spotify était bien exécutée, mais un rendu secondaire pouvait encore réinjecter pendant quelques secondes l’ancien état `is_playing`. Le bouton revenait alors sur « Pause » et l’horloge locale repartait, tandis que la musique restait réellement en pause.

La v9.9.8 rend l’intention locale autoritaire sur toutes les surfaces pendant la convergence Spotify :

- accueil ;
- tableau de bord musical ;
- commandes rapides ;
- mode conduite ;
- barre et compteur actualisés toutes les 500 ms.

L’état local est conservé au minimum 6,5 secondes et n’est libéré qu’après deux confirmations Spotify fraîches conformes. Une erreur réelle de commande restaure immédiatement l’état précédent.

## Réseau

Les contrôles de convergence utilisent explicitement des lectures fraîches de `/me/player`, sans désactiver le cache pour les autres usages silencieux. Cela évite la régression visuelle sans augmenter inutilement le quota Spotify.

## Validation

- 274 tests applicatifs réussis ;
- tests du serveur Railway réussis ;
- 122 fichiers JavaScript contrôlés ;
- 57 modules reliés à `app.js` ;
- build GitHub Pages et cache PWA vérifiés ;
- test du serveur local réussi.

---

## 9.9.6

## Objectif

Supprimer la régression où le bouton passait brièvement sur **Lecture**, revenait sur **Pause**, puis la barre continuait d’avancer après une commande de mise en pause.

## Cause corrigée

Une requête `GET /me/player` démarrée avant la commande pouvait se terminer après `PUT /me/player/pause` et remettre l’ancien état de lecture dans le cache mémoire. Les vérifications automatiques pouvaient ensuite relire cette réponse obsolète.

## Nouvelle convergence Spotify

- toute mutation de lecture invalide le cache avant et après la commande ;
- les requêtes GET déjà en vol ne peuvent plus repeupler le cache après une mutation ;
- les contrôles de confirmation utilisent des réponses Spotify fraîches, sans cache ;
- une réponse contradictoire remet la période de confirmation à zéro ;
- le verrou local se libère uniquement après 2,4 secondes d’état frais et stable ;
- un garde-fou maximal de 30 secondes évite un verrou permanent ;
- le mode conduite utilise désormais exactement le même verrou et la même horloge que l’accueil et le tableau de bord.

## Résultat attendu

- clic sur **Pause** : le bouton devient immédiatement **▶ Lecture** ;
- la barre et le compteur se figent immédiatement ;
- aucun ancien retour Spotify ne peut rétablir **⏸ Pause** ;
- la synchronisation réelle se fait automatiquement, sans appuyer sur Actualiser ;
- clic sur **Lecture** : le compteur repart depuis la position figée.

## Validation

- 269 tests applicatifs réussis sur 269 ;
- tests du serveur Railway réussis ;
- 121 fichiers JavaScript analysés ;
- 57 modules reliés à `app.js` ;
- 71 ressources PWA vérifiées ;
- build GitHub Pages validé ;
- test local de démarrage réussi.

---

## 9.9.5

## Objectif

Transformer la dernière version 9.x en candidate vérifiable avant la release finale 10.0.0. Cette version ne prétend pas être validée à 100 % sur un compte Spotify et un iPhone tant que les essais terrain n’ont pas été confirmés.

## Centre de pré-finalisation

Le nouveau panneau calcule un score à partir de :

- connexion HTTPS ;
- stockage local ;
- migrations de données ;
- chargement des modules ;
- build de production ;
- tests du serveur ;
- cinq confirmations terrain.

La mention **Prête pour v10** apparaît uniquement lorsque tous ces points sont validés.

## Confidentialité

Le rapport exporté ne contient aucun jeton Spotify, nom d’appareil, titre, playlist ou secret Railway.

## Stabilisation de l’interface

- le Guide apparaît directement dans Réglages, sans bouton « Voir plus » ;
- le bouton Pause devient immédiatement « Lecture » après la mise en pause ;
- les réponses Railway mal formées produisent un message compréhensible, sans afficher le contenu brut ;
- le créateur de mix multi-sources suit réellement le thème actif dans la page Musique ;
- le niveau de nettoyage occupe une ligne complète et les quatre options sont alignées en grille 2 × 2.

## Lecture et progression en temps réel

- l’état demandé par le bouton Pause/Lecture reste prioritaire pendant douze secondes, même si Spotify renvoie brièvement un ancien état ;
- le verrou n’est plus supprimé au premier retour conforme, ce qui évite l’oscillation Lecture → Pause ;
- une horloge locale horodatée fait progresser le temps et la barre toutes les 500 ms sans multiplier les appels Spotify ;
- la pause fige immédiatement la progression locale ;
- la reprise repart depuis la position figée ;
- l’accueil, le tableau de bord et le mode conduite partagent la même horloge ;
- le nouveau module `core/playback-clock.js` est inclus dans le cache PWA et testé indépendamment.

---

## 9.9.4

## Objectif

Transformer la dernière version 9.x en candidate vérifiable avant la release finale 10.0.0. Cette version ne prétend pas être validée à 100 % sur un compte Spotify et un iPhone tant que les essais terrain n’ont pas été confirmés.

## Centre de pré-finalisation

Le nouveau panneau calcule un score à partir de :

- connexion HTTPS ;
- stockage local ;
- migrations de données ;
- chargement des modules ;
- build de production ;
- tests du serveur ;
- cinq confirmations terrain.

La mention **Prête pour v10** apparaît uniquement lorsque tous ces points sont validés.

## Confidentialité

Le rapport exporté ne contient aucun jeton Spotify, nom d’appareil, titre, playlist ou secret Railway.

## Stabilisation de l’interface

- le Guide apparaît directement dans Réglages, sans bouton « Voir plus » ;
- le bouton Pause devient immédiatement « Lecture » après la mise en pause ;
- les réponses Railway mal formées produisent un message compréhensible, sans afficher le contenu brut ;
- le créateur de mix multi-sources suit réellement le thème actif dans la page Musique ;
- le niveau de nettoyage occupe une ligne complète et les quatre options sont alignées en grille 2 × 2.

---

## 9.9.3

## Objectif

Transformer la dernière version 9.x en candidate vérifiable avant la release finale 10.0.0. Cette version ne prétend pas être validée à 100 % sur un compte Spotify et un iPhone tant que les essais terrain n’ont pas été confirmés.

## Centre de pré-finalisation

Le nouveau panneau calcule un score à partir de :

- connexion HTTPS ;
- stockage local ;
- migrations de données ;
- chargement des modules ;
- build de production ;
- tests du serveur ;
- cinq confirmations terrain.

La mention **Prête pour v10** apparaît uniquement lorsque tous ces points sont validés.

## Confidentialité

Le rapport exporté ne contient aucun jeton Spotify, nom d’appareil, titre, playlist ou secret Railway.

## Stabilisation de l’interface

- le Guide apparaît directement dans Réglages, sans bouton « Voir plus » ;
- le bouton Pause devient immédiatement « Lecture » après la mise en pause ;
- les réponses Railway mal formées produisent un message compréhensible, sans afficher le contenu brut ;
- le créateur de mix multi-sources suit réellement le thème actif dans la page Musique ;
- le niveau de nettoyage occupe une ligne complète et les quatre options sont alignées en grille 2 × 2.

---

## 9.9.2

## Objectif

Transformer la dernière version 9.x en candidate vérifiable avant la release finale 10.0.0. Cette version ne prétend pas être validée à 100 % sur un compte Spotify et un iPhone tant que les essais terrain n’ont pas été confirmés.

## Centre de pré-finalisation

Le nouveau panneau calcule un score à partir de :

- connexion HTTPS ;
- stockage local ;
- migrations de données ;
- chargement des modules ;
- build de production ;
- tests du serveur ;
- cinq confirmations terrain.

La mention **Prête pour v10** apparaît uniquement lorsque tous ces points sont validés.

## Confidentialité

Le rapport exporté ne contient aucun jeton Spotify, nom d’appareil, titre, playlist ou secret Railway.

## Stabilisation de l’interface

- le Guide apparaît directement dans Réglages, sans bouton « Voir plus » ;
- le bouton Pause devient immédiatement « Lecture » après la mise en pause ;
- les réponses Railway mal formées produisent un message compréhensible, sans afficher le contenu brut ;
- le créateur de mix multi-sources suit réellement le thème actif dans la page Musique ;
- le niveau de nettoyage occupe une ligne complète et les quatre options sont alignées en grille 2 × 2.

---

## 9.9.1

## Objectif

Transformer la dernière version 9.x en candidate vérifiable avant la release finale 10.0.0. Cette version ne prétend pas être validée à 100 % sur un compte Spotify et un iPhone tant que les essais terrain n’ont pas été confirmés.

## Centre de pré-finalisation

Le nouveau panneau calcule un score à partir de :

- connexion HTTPS ;
- stockage local ;
- migrations de données ;
- chargement des modules ;
- build de production ;
- tests du serveur ;
- cinq confirmations terrain.

La mention **Prête pour v10** apparaît uniquement lorsque tous ces points sont validés.

## Confidentialité

Le rapport exporté ne contient aucun jeton Spotify, nom d’appareil, titre, playlist ou secret Railway.

## Stabilisation de l’interface

- le Guide apparaît directement dans Réglages, sans bouton « Voir plus » ;
- le bouton Pause devient immédiatement « Lecture » après la mise en pause ;
- les réponses Railway mal formées produisent un message compréhensible, sans afficher le contenu brut ;
- le créateur de mix multi-sources suit réellement le thème actif dans la page Musique ;
- le niveau de nettoyage occupe une ligne complète et les quatre options sont alignées en grille 2 × 2.

---

## 9.9.0

## Objectif

Transformer la dernière version 9.x en candidate vérifiable avant la release finale 10.0.0. Cette version ne prétend pas être validée à 100 % sur un compte Spotify et un iPhone tant que les essais terrain n’ont pas été confirmés.

## Centre de pré-finalisation

Le nouveau panneau calcule un score à partir de :

- connexion HTTPS ;
- stockage local ;
- migrations de données ;
- chargement des modules ;
- build de production ;
- tests du serveur ;
- cinq confirmations terrain.

La mention **Prête pour v10** apparaît uniquement lorsque tous ces points sont validés.

## Confidentialité

Le rapport exporté ne contient aucun jeton Spotify, nom d’appareil, titre, playlist ou secret Railway.

---

## 9.8.0

## Nouveautés

- Nouveau bouton **Personnaliser** sur l’accueil.
- Trois ordres prédéfinis : Équilibré, Lancement d’abord et File d’abord.
- Mode d’affichage confortable ou compact.
- Possibilité de masquer Accès immédiat, Lecture en cours, File d’attente et les raccourcis inférieurs.
- Aperçu configurable sur 2, 3 ou 5 titres dans la file Spotify.
- Les préférences sont conservées localement, exportées dans les sauvegardes et restaurées lors d’un import.
- Mise en page responsive pour ordinateur, tablette et iPhone.

## Compatibilité

Toutes les données des versions 8.x et 9.x restent compatibles. En l’absence de réglage enregistré, l’accueil conserve la disposition équilibrée historique.

---

## 9.7.2

## Nouvelle couleur Corail

- Ajout du thème prédéfini **Corail** (`#fb7185` vers `#f97316`).
- La grille d’apparence contient désormais 14 couleurs, soit deux lignes complètes de 7 sur grand écran.
- Le thème Corail est appliqué à tous les écrans, au mode conduite, aux pop-ups et aux composants déjà reliés aux variables d’accent.
- Les réglages, profils, mix, sauvegardes et données des versions précédentes restent compatibles.

## Validation

La release inclut des tests de non-régression sur le nombre de thèmes, la palette Corail et la grille à sept colonnes.

---

## 9.7.1

## Correctifs visuels

- le panneau « Créer un mix multi-sources » du menu Musique suit désormais la couleur active du thème ;
- les sources sélectionnées, cases de sélection, états de focus et panneaux d’enregistrement utilisent `--accent` et `--accent-secondary` ;
- les anciennes couleurs vertes restent supprimées même avec une couleur personnalisée ;
- les icônes et libellés de « Tout Shuffle+ » sont centrés horizontalement et verticalement.

## Compatibilité

Toutes les fonctions de la v9.7.0 sont conservées. Aucun profil, mix, historique, favori ou réglage Spotify n’est supprimé.

## Validation

- 227 tests d’interface et de logique ;
- tests du serveur de synchronisation ;
- contrôle JavaScript, imports, CSP et architecture CSS ;
- build GitHub Pages ;
- contrôle de la distribution ;
- test du serveur local.

---

## 9.7.0

## Objectif

Renforcer l’usage en voiture sans déclencher de commandes par erreur et permettre d’adapter l’interface aux habitudes du conducteur.

## Conduite avancée

- bouton permanent de verrouillage des commandes ;
- déverrouillage par maintien d’une seconde ;
- les commandes musicales et les avis sont désactivés lorsque le verrouillage est actif ;
- option « Verrouiller à l’ouverture » ;
- retour haptique facultatif lorsqu’il est pris en charge par l’appareil ;
- maintien de l’écran actif conservé depuis les versions précédentes.

## Personnalisation

L’utilisateur peut choisir l’action mise en avant parmi :

- Adaptive DJ ;
- pause ou reprise ;
- titre suivant ;
- commande vocale.

Il peut également activer ou désactiver :

- le retour haptique ;
- le verrouillage à l’ouverture ;
- la file Spotify plein écran ;
- les boutons d’avis musicaux.

## File d’attente

La file Spotify peut désormais occuper tout l’écran, y compris avec les zones de sécurité de l’iPhone. Le mode classique reste disponible dans les préférences.

## Compatibilité

Les réglages v9.6.1 et antérieurs sont normalisés automatiquement. Aucun profil, mix, historique, favori ou réglage Spotify n’est supprimé.

## Validation

- 224 tests d’interface et de logique ;
- tests du serveur de synchronisation ;
- contrôle JavaScript, imports, CSP et architecture CSS ;
- build GitHub Pages ;
- contrôle de la distribution ;
- test du serveur local.

---

## 9.6.1

Version corrective consacrée à la cohérence visuelle de la rubrique **Créer**.

## Corrections

- Dynamic Lyrics utilise désormais la couleur active au lieu de la palette rose historique.
- Mix Studio ne conserve plus ses cadres et indicateurs verts codés en dur.
- Les sources sélectionnées, curseurs, poids et variantes suivent le thème.
- Les panneaux Mes mix, Programmations et Historique utilisent la même matière visuelle.
- Les statistiques de l’historique ne restent plus orange.
- Les boutons principaux suivent `--accent` et `--accent-secondary`.
- Les boutons de suppression restent rouges afin de conserver leur signification.
- Les thèmes prédéfinis et les couleurs personnalisées sont tous pris en charge.

## Compatibilité

Aucune migration de données. Les profils, mix, favoris, historiques, réglages et données de synchronisation de la v9.6.0 restent compatibles.

---

## 9.6.0

## Accès immédiat

- Regroupe sur l’accueil les profils épinglés, les derniers lancements réussis et les favoris Spotify.
- Jusqu’à quatre profils peuvent être épinglés.
- Le profil principal est épinglé automatiquement lors de la première utilisation de la v9.6.0.
- Un profil peut ensuite être retiré sans être réajouté automatiquement.
- Les lancements récents sont dédupliqués par profil et limités aux trois derniers profils réussis.
- Les favoris affichent les titres likés et les playlists encore accessibles.
- La recherche globale est accessible depuis le nouveau panneau.

## Données et synchronisation

- Nouvelle préférence locale `shuffleplus_pinned_shortcut_profiles_v1`.
- Les identifiants des profils épinglés sont inclus dans les sauvegardes JSON.
- Les épingles sont prises en charge par la fusion de synchronisation des automatisations.
- Les profils supprimés sont automatiquement retirés des épingles.

## Interface

- Mise en page responsive en trois, deux ou une colonne selon la largeur.
- Couleurs, bordures et états interactifs suivent le thème actif.
- Le cache PWA passe à `shuffleplus-v9.6.0`.

## Compatibilité

- Données, mix, profils, thèmes, favoris, historiques et synchronisation des versions précédentes conservés.
- Toutes les améliorations des versions 9.1 à 9.5 restent incluses.

---

## 9.5.0

## Centre de fiabilité

- Vue synthétique de l’état de Spotify, Railway, de la PWA et de l’appareil/file d’attente.
- Vérification directe de l’endpoint `/health` du serveur Railway, avec latence et version.
- Journal local des événements importants, limité et dédupliqué.
- Les événements sont génériques : aucun titre, nom de playlist, jeton ou secret n’est enregistré.
- Plan de récupération guidée selon l’état réel : reconnexion Spotify, détection d’appareils, actualisation de la file, réparation PWA, contrôle Railway et reprise d’un lancement interrompu.
- Rapport de fiabilité exportable au format JSON, expurgé des données sensibles.
- Diagnostic technique historique conservé dans une section repliable.

## Compatibilité

- Données, mix, profils, thèmes et synchronisation des versions précédentes conservés.
- Correctif v9.4.1 du toast thématique inclus.
- Cache PWA migré vers `shuffleplus-v9.5.0`.

---

## 9.4.1

## Correctif d’interface

- Le toast de confirmation du changement de mode Expert/Essentiel suit désormais la couleur active du thème.
- Toutes les confirmations standard utilisent les variables `--accent` et `--accent-rgb`.
- Les avertissements et les erreurs conservent leurs couleurs sémantiques distinctes.
- Ajout d’un test de non-régression pour empêcher le retour du vert codé en dur.

---

## 9.4.0

## Objectif

Cette version améliore la compréhension et la continuité de la file d’attente Spotify sans tenter de contourner les limites de l’API Spotify.

## File d’attente intelligente

Le nouveau module `core/queue-continuity.js` analyse localement les titres renvoyés par Spotify :

- nombre total de titres visibles ;
- durée cumulée ;
- nombre d’artistes distincts ;
- doublons de titre ;
- répétitions consécutives du même artiste ;
- fraîcheur de la dernière actualisation ;
- score de continuité et état lisible.

L’analyse n’envoie aucune donnée vers un service tiers.

## Accueil

Le panneau « À suivre » affiche désormais :

- le nombre réel de titres visibles dans la file ;
- une estimation de durée ;
- le nombre d’artistes ;
- un avertissement si des doublons sont repérés ;
- les artistes, pochettes et durées corrects avec les objets normalisés de Shuffle+.

## Mode conduite

Le mode conduite reprend les mêmes indicateurs. Les doublons et répétitions immédiates d’artiste sont marqués dans la liste complète afin de pouvoir les repérer rapidement sans surcharger l’écran principal.

## Continuité de lecture

La file est actualisée :

- après une commande « Suivant » ;
- lors d’une actualisation du tableau de bord si les données sont anciennes ;
- au retour au premier plan lorsque l’accueil était ouvert et que la file est périmée.

## Compatibilité

Aucune migration destructive n’est nécessaire. Les profils, mix, réglages, historiques, préférences contextuelles et données de synchronisation des versions précédentes sont conservés.

---

## 9.3.0

## Objectif

Suggérer le bon profil musical à partir de signaux simples disponibles localement, sans lancer Spotify sans consentement.

## Profils contextuels

La liste des profils rapides passe de quatre à huit entrées : Voiture, Maison, Écouteurs, Matin, Travail, Sport, Soirée et Nuit. Les quatre profils historiques sont migrés sans supprimer les personnalisations existantes.

## Moteur de suggestion

Le module `core/contextual-profiles.js` :

- reconnaît certains appareils Spotify à partir de leur nom ;
- classe le moment de la journée ;
- attribue un score aux profils disponibles ;
- privilégie un appareil reconnu par rapport à une simple heure ;
- tient compte du dernier profil accepté ;
- respecte la désactivation temporaire des suggestions.

Aucune donnée n’est envoyée à un service externe pour cette détection.

## Interface

L’accueil peut afficher une seule suggestion avec :

- le profil recommandé ;
- la raison de la recommandation ;
- un niveau de confiance ;
- un bouton de lancement ou de configuration ;
- un bouton pour masquer la proposition pendant quatre heures.

## Données

L’état contextuel est enregistré sous `shuffleplus_contextual_profile_state_v1` et participe aux sauvegardes et synchronisations Shuffle+.

## Compatibilité

Les mix, profils de lancement, réglages Spotify, préférences PWA et données des versions précédentes sont conservés.

---

## 9.2.0

## Objectif

Réduire le travail effectué au démarrage sans retirer de fonction et sans modifier les données enregistrées par les versions précédentes.

## Chargement adaptatif

Shuffle+ lit les informations réseau exposées par le navigateur : état en ligne, économie de données, type de connexion, débit indicatif et latence. Quatre profils sont utilisés :

- `offline` : aucun préchargement ;
- `constrained` : uniquement les intentions prioritaires ;
- `balanced` : préchargement modéré ;
- `fast` : préchargement et préchauffage en arrière-plan autorisés.

La recherche, les réglages, le diagnostic et les styles du mode conduite sont préparés après un survol, un focus clavier ou un toucher. Une fonction déjà chargée n’est jamais téléchargée deux fois.

## Cache PWA progressif

Le Service Worker installe d’abord `CRITICAL_APP_SHELL`. Les ressources optionnelles sont ensuite préparées via le message `WARM_OPTIONAL_SHELL` lorsque le réseau le permet.

Cette séparation évite qu’un outil secondaire, tel que le diagnostic ou la recherche globale, retarde l’installation d’une mise à jour.

## Budget de performance

Le Centre de diagnostic affiche désormais :

- le profil réseau actif ;
- l’état du préchargement adaptatif ;
- un score de budget de démarrage ;
- les dépassements éventuels de temps, volume transféré ou nombre de ressources.

Les seuils sont adaptés au profil réseau afin de ne pas comparer une connexion 3G et une connexion rapide de la même manière.

## Compatibilité

Aucune clé de stockage existante n’est supprimée ou renommée. Les profils de lancement, mix, thèmes, raccourcis, appareils Spotify, historiques et paramètres de synchronisation restent compatibles.

---

## 9.1.0

## Objectif

Cette version renforce le lancement Spotify sur iPhone sans ajouter de nouveaux menus complexes.

## Fiabilité Spotify

- nouvelle couche de nouvelle tentative pour les erreurs temporaires ;
- délai dynamique avec prise en charge de `Retry-After` ;
- conservation du statut, du motif et du code HTTP Spotify dans les diagnostics ;
- bascule vers un maximum de trois appareils de secours détectés par Spotify Connect ;
- confirmation finale de la lecture sur l’appareil réellement actif.

## Reprise iPhone

Un lancement récent conservé en attente peut reprendre lorsque :

- Internet revient ;
- Safari ou la PWA repasse au premier plan ;
- Shuffle+ redémarre dans les quinze minutes suivant l’interruption.

Les protections contre les doubles lancements restent actives pour les ouvertures normales du raccourci.

## Interface

- état de santé du profil principal : À tester, Fiable, Opérationnel ou À vérifier ;
- affichage de l’appareil utilisé lors du dernier lancement ;
- nombre d’appareils tentés visible dans le résultat ;
- file d’attente actualisée après le démarrage ;
- terminologie et cadres de Réglages harmonisés.

## Compatibilité

Aucune clé de stockage utilisateur n’est supprimée. Les profils, commandes iOS, mix, thèmes, préférences d’appareil et historiques existants restent lisibles.

---

## 9.0.0

## Objectif

La version 9 recentre l’application sur son usage initial : choisir un profil principal et lancer sa musique le plus rapidement possible, sans supprimer les fonctions avancées déjà présentes.

## Nouvel accueil

L’écran Accueil affiche désormais :

- le profil principal sélectionné ;
- l’appareil Spotify visé ;
- les options Shuffle, Conduite et Dynamic Lyrics ;
- un grand bouton **Lancer ma musique** ;
- les actions de copie et de partage du raccourci universel ;
- le morceau en cours, sa pochette et sa progression ;
- les commandes pause/reprise et suivant ;
- un aperçu de la file Spotify ;
- la prochaine étape de configuration si l’installation est incomplète ;
- cinq accès rapides vers Musique, Profils, Lancer, Guide et Réglages.

## Essentiel et Expert

En mode Essentiel, l’accueil v9 remplace l’ancien tableau de bord très chargé. En mode Expert, l’accueil v9 reste en tête et l’ancien tableau de bord avancé demeure disponible en dessous.

Aucune donnée avancée n’est supprimée lors du changement de mode.

## Architecture

Nouveaux fichiers :

- `core/daily-home.js` : normalisation et rendu de l’accueil ;
- `styles/feature-home.css` : styles chargés uniquement lors de l’ouverture de l’accueil ;
- `tests/v900-daily-home.test.mjs` : tests fonctionnels de la v9 ;
- `startup-recovery-9.0.0.js` : bootstrap de récupération versionné.

Le Service Worker précharge le module de données de l’accueil et conserve la feuille de style comme ressource optionnelle versionnée.

## Compatibilité

La v9 conserve les clés de stockage existantes. Les profils de lancement, mix, thèmes, réglages, appareil préféré, historique et configuration Spotify de la v8.8.0 restent utilisables.

## Validation effectuée

- 106 fichiers JavaScript syntaxiquement valides ;
- 47 modules reliés au graphe de l’application ;
- 15 directives CSP contrôlées ;
- 4 feuilles fonctionnelles chargées à la demande ;
- 175 tests applicatifs réussis ;
- tests du serveur de synchronisation réussis ;
- build `dist/` réussi ;
- contrôle de la distribution réussi ;
- smoke test du serveur local réussi.

## Vérifications réelles encore recommandées

Les tests automatisés ne remplacent pas un essai avec un compte Spotify Premium et un véritable iPhone. Tester notamment :

- le callback OAuth Spotify ;
- le lancement depuis Raccourcis ;
- la détection de l’iPhone dans Spotify Connect ;
- l’ouverture de la liste complète en mode conduite ;
- l’installation et la mise à jour de la PWA Safari.

---
