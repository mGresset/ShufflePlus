# Rapport final — Shuffle+ v12.0.1

**Spotify Reliability & Preferred Device Identity**

Dépôt de départ : Shuffle+ **v11.13.0** (commit `8434446`, branche `main`, arbre propre), serveur Railway **v5.2.1**.
Version produite : Shuffle+ **v12.0.1**, serveur Railway **v5.3.0**.

---

## 1. Baseline et comparatif

| Mesure | Avant (v11.13.0) | Après (v12.0.1) |
| --- | --- | --- |
| Version frontend / serveur | 11.13.0 / 5.2.1 | 12.0.1 / 5.3.0 |
| Tests unitaires Node | 514 / 514 verts | 561 / 561 verts |
| Tests serveur Railway | OK | OK (+ statut final protégé) |
| Tests E2E Playwright | 7 / 7 (après installation des navigateurs) | 21 / 21 verts (Chromium, WebKit iPhone, PWA) |
| `app.js` (lignes) | 51 238 | 51 018 (−220) |
| `app.js` (octets) | 1 556 609 | 1 551 312 |
| `style.css` | 18 545 lignes / 377 Kio | inchangé |
| Imports statiques de `app.js` | 68 (plafond CI 68) | 68 |
| Modules reliés statiquement à `app.js` | 76 | 82 (+6 modules fiabilité) |
| Modules chargés à la demande | 4 (+ 4 feuilles CSS) | 4 (+ 4 feuilles CSS), inchangé |
| Shell PWA | 13 critiques · 67 runtime · 14 optionnelles · 2 045 Kio critiques | 13 · 73 · 14 · 2 047 Kio |
| Build `dist/` | 98 fichiers · 2 981 Kio | 104 fichiers · ≈ 3 077 Kio |
| Chunks hashés | aucun (voir § 9) | aucun (voir § 9) |

Remarques de baseline :

- le cahier des charges supposait une v11.14.0 et un build esbuild : le dépôt réel est en **v11.13.0** et `scripts/build.mjs` est une **copie statique** (aucun bundler, aucun chunk hashé). La v12 a été construite sur cette réalité ;
- les E2E échouaient localement uniquement parce que les navigateurs Playwright n’étaient pas installés ; après `npx playwright install chromium webkit`, la baseline était 7/7.

## 2. Inventaire fonctionnel (matrice de non-régression)

Toutes les fonctions présentes en v11.13.0 sont conservées. Aucune n’a été supprimée.

| Domaine | État v12 |
| --- | --- |
| Accueil, Lecture en cours, pochette, progression, prochains titres, Essentiel / Expert, personnalisation | conservé |
| Player+ (précédent, lecture/pause, suivant, seek, volume, répétition, shuffle, file, Lire ensuite) | conservé et amélioré (file de commandes sérialisée) |
| Bibliothèque, filtres, tri, favoris, multi-source, titres enregistrés | conservé |
| Mix engine (multi-sources, anti-répétition, variété, découverte, départ aléatoire) | conservé, non modifié |
| Profils (création, édition, duplication, ordre, principal, aperçu, diagnostic, partage/import) | conservé |
| Recherche universelle + catalogue Spotify (Ctrl/⌘+K, debounce, Lire / Lire ensuite / Profil) | conservé |
| Assistant musical (lazy), Adaptive DJ, scènes, routines, mode conduite | conservé ; Dynamic Lyrics retiré en 12.0.1 avec compatibilité legacy |
| Statistiques, objectifs, analyses | conservé |
| Sauvegardes, historique, import/export, synchronisation Railway chiffrée | conservé |
| Apple Raccourcis (profile, profileId, requestId, resultToken, resultServer, x-callback) | conservé et fiabilisé |
| PWA (Service Worker, shell, rollback, update guard, startup recovery) | conservé |
| Centre de fiabilité, diagnostic Spotify Connect, thèmes, réglages, onboarding | conservé et enrichi |
| Appareil Spotify préféré (choix, device_id manuel, oublier) | refondu en identité logique, saisie manuelle conservée en « avancé » |

## 3. Architecture

`app.js` reste l’orchestrateur. La logique appareil / session / raccourci sort dans des modules dédiés, sans dépendance circulaire :

```text
app.js ──► core/spotify-reliability.js (point d’entrée unique, 1 import)
              ├─ core/spotify-device-identity.js   modèle, résolution, migration, stockage
              ├─ core/spotify-device-discovery.js  fenêtre de réveil, /devices + /me/player
              ├─ core/spotify-errors.js            taxonomie d’erreurs
              ├─ core/spotify-player-command-queue.js
              ├─ core/shortcut-launch-controller.js
              ├─ core/launch-reliability.js (existant)
              └─ core/spotify-device.js (existant, rendu strict)
spotify-api.js ─► core/spotify-player-command-queue.js, auth.js (session manager)
```

Les budgets CI (`app.js` ≤ 51 240 lignes, 68 imports statiques) n’ont **pas** été relevés : la place a été obtenue en extrayant la logique appareil d’`app.js` (solde net : −220 lignes).

## 4. iPhone préféré — identité logique

- modèle v2 : `logicalId`, `userConfirmed`, `displayName`, `normalizedName`, `type`, `aliases`, `currentSpotifyDeviceId`, `knownSpotifyDeviceIds` (≤ 5, horodatés, `stale`), `lastSeenAt`, `lastSuccessfulAt`, `lastResolutionAt`, `lastIdChange` (IDs masqués), `status`, `matching` ;
- résolution déterministe : ID courant → ID historique → nom normalisé + type → alias + type → `/me/player` actif ; plusieurs candidats → `ambiguous` ; appareil restreint → `restricted` ; jamais « seul smartphone » ni « nom approchant » ;
- A → B : l’ID courant devient B, A reste dans l’historique, toast « ✅ iPhone retrouvé automatiquement » ;
- l’identité n’est jamais effacée par `/devices=[]`, `204`, hors ligne, timeout, reprise, erreur : uniquement par **Oublier** (confirmation) ;
- **bugs corrigés** trouvés pendant l’audit :
  - `findStoredPreferredDevice` acceptait un nom qui *contient* le nom enregistré, puis **n’importe quel appareil du même type** ;
  - `selectSpotifyDevice("preferred")` retombait sur un smartphone, l’appareil actif puis le premier appareil ;
  - après un lancement réussi en mode « actif » ou « iPhone ou smartphone », l’appareil utilisé (ex. le Mac) **remplaçait** l’iPhone préféré ;
  - en mode « iPhone ou smartphone », n’importe quel téléphone détecté devenait l’iPhone préféré ;
  - `getAvailableDevices` filtrait les appareils restreints, ce qui rendait impossible le message « appareil restreint ».

## 5. Migration des données

- lecture de l’ancienne clé `shuffleplus_preferred_spotify_device_v1` → identité v2 dans `shuffleplus_preferred_spotify_device_v2` ;
- sauvegarde brute préalable dans `shuffleplus_preferred_spotify_device_v1_backup` (une seule fois) ;
- l’ancienne clé est **maintenue en miroir** (`{ id, name, type, savedAt, lastSeenAt }`) : un rollback PWA vers la v11 retrouve l’iPhone ;
- idempotente (même `logicalId` après rechargement), non destructive, testée en unitaire et en E2E (mise à jour v11 → v12 avec tokens, profils, mix, routines) ;
- l’identité n’entre ni dans les sauvegardes partageables ni dans la synchronisation Railway (le `device_id` est volatil et propre à chaque installation).

## 6. Session Spotify (OAuth PKCE inchangé, aucun secret côté client)

- `spotifySessionManager` : `getValidAccessToken`, `forceRefresh`, `refreshAccessToken`, `requireReauthorization`, `getDiagnostics` ;
- refresh single-flight partagé (y compris entre `getValidAccessToken` et `forceRefresh`) ;
- rotation : nouveau `refresh_token` enregistré, absent → ancien conservé ; `invalid_grant` après rotation par un autre onglet → un seul nouvel essai avec le jeton le plus récent au lieu d’effacer un jeton valide ;
- HTTP 401 → un refresh forcé → un seul nouvel essai → sinon `SPOTIFY_REAUTH_REQUIRED` (pas de boucle) ;
- erreur réseau pendant le refresh → aucune donnée supprimée ;
- message de reconnexion : « Spotify demande une nouvelle autorisation. Tes profils, ton iPhone préféré et tes réglages sont conservés. » ;
- la reprise iPhone (`visibilitychange`, `pageshow`, `online`) passe toujours par le coordinateur existant `createSessionResumeCoordinator` (déduplication et cooldown), désormais relié à la résolution d’identité, sans re-rendu intempestif de l’écran.

## 7. Apple Raccourcis

- flux : URL → validation → réservation du `requestId` → `running` → session → résolution de l’iPhone (fenêtre 0 → 18 s, respect du 429) → mise à jour de l’ID → transfert → lecture → shuffle → vérification `/me/player` sans cache → succès mémorisé → `success` → URL nettoyée ;
- paramètres historiques conservés (`profile`, `profileId`, `command`, `playlist`, `requestId`, `resultToken`, `resultServer`, x-callback) ; les anciens raccourcis sans `requestId` fonctionnent toujours ;
- un même `requestId` ne relance jamais (registre local borné à 40 entrées, 6 h) ;
- délai global de 30 s via `AbortController` ;
- messages `running` publiés dans l’ordre (« Connexion Spotify… », « Recherche de l’iPhone… », « Réveil de Spotify Connect… », « iPhone retrouvé… », « Vérification… »), limités à un toutes les 1,2 s, jamais après le statut final ;
- un `requestId` resté « en cours » après une fermeture de Shuffle+ par iOS n’est pas relancé : un statut final `LAUNCH_INTERRUPTED` est publié pour que le raccourci obtienne une réponse ;
- Railway v5.3.0 : le premier statut final est définitif (ni un `running` tardif ni une seconde ouverture ne peuvent l’écraser).

## 8. Player

- toutes les commandes `/me/player*` non-GET passent par une file unique : plus de requêtes simultanées previous/repeat, transfer/play, play/shuffle, seek/volume/queue ;
- une commande bloquée libère la file après 15 s ;
- la commande `play` du lancement utilise la même file et le même traitement 401 ;
- `supports_volume` / `is_restricted` restent respectés par Player+ (inchangé).

## 9. UX / mobile

- nouvelle carte « Appareil Spotify préféré » (Profils de lancement > Centre de commandes iOS) : statut coloré, dernière détection, dernier lancement réussi, identifiant « Géré automatiquement », dernier renouvellement, **Rechercher maintenant**, **Tester** (sans commande de lecture), **Réassocier**, **Oublier** (confirmation) ; saisie manuelle en section repliable ;
- cibles tactiles ≥ 44 px, champs ≥ 16 px (pas de zoom Safari), bouton principal pleine largeur sur téléphone, actions en grille 3 colonnes, aucun débordement horizontal (vérifié en E2E sur WebKit iPhone 15 Pro et Chromium) ;
- Centre de fiabilité : services « iPhone préféré » et « Session Spotify », journal porté de 50 à 200 événements ;
- le reste de l’interface n’a pas été redessiné : priorité à la fiabilité, pas de changement « pour changer ».

**Build** : le dépôt n’utilise pas esbuild. Introduire un bundler aurait imposé de réécrire le Service Worker, le bootstrap versionné, le rollback PWA et les garde-fous CI qui reposent sur des chemins de fichiers stables : risque élevé pour la PWA iPhone, sans bénéfice pour la fiabilité Spotify visée par cette version. Le build reste une copie statique (inscrit dans la ROADMAP).

## 10. Tests

- `tests/v1200-preferred-device-identity.test.mjs` (26 tests) : cas A à J du cahier des charges, migration, ambiguïté, restreint, Mac en mode strict, historique borné, annulation, cooldown 429, reauth, hors ligne ;
- `tests/v1201-spotify-session-player.test.mjs` (21 tests) : token valide / bientôt expiré, single-flight, rotation, sans nouveau refresh token, 401 + retry, second 401, refresh hors ligne, `invalid_grant`, rotation inter-onglets, Premium vs session, file Player (ordre, échec, blocage, sérialisation réelle de `spotify-api.js`), `requestId`, registre borné, statuts ordonnés, timeout/annulation ;
- `e2e/spotify-reliability.spec.mjs` (7 scénarios × Chromium + WebKit iPhone) : A → B via raccourci avec `/devices` vide deux fois, Mac jamais commandé en mode strict, `requestId` dupliqué, 401 + `invalid_grant`, carte appareil (rendu et ergonomie tactile), mise à jour v11 → v12 ;
- 6 anciens tests qui vérifiaient le **texte** de l’ancienne implémentation ont été réécrits vers le nouveau contrat (aucun test supprimé, aucun `skip`, aucun `force: true`, aucun `waitForTimeout` ajouté) ;
- résultats finaux : voir § 1.

## 11. Relecture indépendante

Une relecture indépendante du diff a relevé, puis vu corriger et couvrir par des tests :

- **« Réassocier » conservait les IDs de l’appareil précédent** : un Mac choisi par erreur puis corrigé restait ciblable en mode strict. Désormais, seul un appareil prouvé identique (ID connu) conserve l’historique ; tout autre choix repart d’une identité neuve ;
- **un succès en mode souple pouvait réécrire l’identité sur simple ressemblance nom + type** (observation d’un seul appareil, donc sans détection d’ambiguïté). Les observations isolées ne mettent plus l’identité à jour que sur preuve par ID ;
- `requestId` bloqué après une coupure, progression publiée sur le mauvais `requestId` en cas de lancement concurrent, vérification interrompue après une lecture acceptée, jeton renouvelé non réutilisé au second envoi : corrigés.

## 12. Limitations connues

- **Le comportement réel de Spotify Connect sur un iPhone physique n’a pas pu être testé depuis cet environnement.** Il est couvert par des mocks et par WebKit (profil iPhone 15 Pro), mais nécessite un dernier test sur l’appareil réel (voir RELEASE-CHECKLIST.md, points 14 à 21) ;
- correspondance « nom + type » : si un autre smartphone porte **exactement** le même nom que ton iPhone (ex. deux appareils nommés « iPhone ») et que ton iPhone est absent, Shuffle+ peut le considérer comme ton iPhone renouvelé. Donner un nom unique à l’iPhone (Réglages iOS > Général > Informations > Nom) supprime ce risque ; si les deux sont présents, Shuffle+ signale l’ambiguïté sans choisir ;
- si iOS ferme Shuffle+ en plein lancement, la réouverture publie `LAUNCH_INTERRUPTED` (sans relancer la musique) ; il suffit de relancer le raccourci. Le registre des `requestId` est local au contexte : Safari et la PWA installée ont des stockages séparés sur iOS ;
- après un délai global dépassé, une lecture déjà acceptée par Spotify n’est plus interrompue : la vérification finale va à son terme ;
- aucune exécution en arrière-plan n’est possible quand la PWA iOS est complètement fermée (contrainte iOS, inchangée).

## 13. Déploiement

```bash
npm ci
npx playwright install chromium webkit
npm run release:check
git add .
git commit -m "Release Shuffle+ v12.0.1 - Spotify reliability"
git push
```

GitHub Actions exécute ensuite les vérifications statiques, les tests unitaires et serveur, le build, `check:dist`, le smoke test, Playwright (Chromium, WebKit/iPhone, PWA) puis publie `dist/` sur GitHub Pages ; aucun déploiement si une étape échoue.

Railway : redéployer `server/` pour passer en v5.3.0 (aucune variable nouvelle). Shuffle+ 12 reste compatible avec v5.2.1.
