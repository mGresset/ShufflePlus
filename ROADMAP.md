# Feuille de route Shuffle+

- **v8.0.0 — Version publique simplifiée : terminée**
- **v8.1.0 — Synchronisation serveur simplifiée : terminée**
- **v8.2.0 — Lancement principal et installation guidée : terminée**
- **v8.3.0 — Centre de lancement, raccourci universel et conduite : terminée**
- **v8.3.1 — Design system et thèmes globaux : terminée**
- **v8.3.2 — Correctifs du header, navigation et réglages : terminée**
- **v8.4.0 — Cohérence globale, composants sémantiques et conduite enrichie : terminée**
- **v8.4.1 — Connexion Spotify et installation PWA harmonisées : terminée**
- **v8.5.0 — Découpage progressif, performances et sécurité CSP : terminée**
- **v8.6.0 — Palette stricte des réglages PWA : terminée**
- **v8.7.0 — Fiabilité du raccourci Apple et de Spotify Connect : terminée**
- **v8.8.0 — Recherche globale compacte et styles fonctionnels différés : terminée**
- **v9.0.0 — Accueil quotidien, lecture en cours et file Spotify : terminée**
- **v9.1.0 — Fiabilité Spotify, reprise iPhone et appareils de secours : terminée**
- **v9.2.0 — Chargement adaptatif, budget de performance et cache PWA progressif : terminée**
- **v9.3.0 — Profils contextuels et suggestions appareil/moment : terminée**
- **v9.4.0 — File Spotify intelligente et continuité de lecture : terminée**
- **v9.4.1 — Toasts de confirmation alignés sur le thème : terminée**
- **v9.5.0 — Centre de fiabilité, journal et récupération guidée : terminée**
- **v9.6.0 — Accès immédiat, profils épinglés et derniers lancements : terminée**
- **v9.6.1 — Cohérence du thème dans la rubrique Créer : terminée**
- **v9.7.0 — Mode conduite avancé, verrouillage et personnalisation : terminée**
- **v9.7.1 — Thème Musique et centrage des accès rapides : terminée**
- **v9.7.2 — Thème Corail et grille de couleurs complète : terminée**
- **v9.9.5 — Horloge locale et verrou Pause/Lecture : terminée**
- **v9.9.6 — Convergence Spotify, cache anti-course et confirmation stable : terminée**
- **v10.1.3 — Fiabilité iPhone et centrage global des sous-menus : terminée**
- **v10.1.4 — Sous-menus alignés à gauche et sélecteur de profil mobile compact : terminée**
- **v10.2.0 — Diagnostic Spotify Connect, historique et autodiagnostic PWA : terminée**
- **v10.3.0 — Architecture, nettoyage et lisibilité mobile : terminée**
- **v10.4.0 — Mise à jour PWA transparente, cache précédent conservé et rollback automatique : terminée**
- **v10.5.0 — Assistant iPhone/raccourcis, parcours de test simplifié et Dynamic Lyrics Auto‑Sync : terminée**
- **v10.5.1 — correctif iOS Dynamic Lyrics : fin des confirmations Raccourcis répétées, suivi Spotify natif : terminée**
- **v10.5.2 — accueil : Lecture en cours prioritaire et métadonnées/pochette mises à jour en direct : terminée**
- **v10.6.0 — UX mobile, formulaires iPhone, focus/clavier et cibles tactiles : terminée**
- **v10.7.0 — Performance, démarrage cache-first et tâches Spotify secondaires différées : terminée**


## V10.3 — Architecture & lisibilité mobile

- cartes Essentiel/Expert restructurées pour rester lisibles sur iPhone ;
- styles de l’expérience déplacés du noyau `style.css` vers `styles/feature-settings.css` ;
- transition Essentiel/Expert isolée dans `core/experience-mode-controller.js` ;
- suppression d’un wrapper de rendu devenu inutile dans `app.js` ;
- garde-fous de non-régression sur l’architecture CSS et le découpage V10 ;
- diagnostic Spotify Connect V10.2 et Railway v5.2.0 conservés.

## V10.4 — Mise à jour PWA & rollback

- sauvegarde locale avant activation conservée ;
- transaction de mise à jour dédiée avant `SKIP_WAITING` ;
- ancien shell PWA conservé comme copie de secours ;
- `update-guard.js` indépendant du noyau applicatif ;
- validation de stabilité après `app-ready` ;
- rollback automatique vers le shell précédent en cas d’échec de démarrage ;
- suppression des doubles purges bootstrap lors d’une mise à jour intentionnelle ;
- Railway v5.2.0 et raccourcis iOS inchangés.


## V10.5 — iPhone, Raccourcis & Dynamic Lyrics

- assistant de raccourci iPhone avec copie du guide complet, URL de lancement et URL Railway ;
- état de validation basé sur les lancements réellement confirmés ;
- nouveau `core/ios-shortcut-assistant.js` ;
- nouveau `core/dynamic-lyrics-sync.js` ;
- détection des changements de piste Spotify par identifiant/URI ;
- Auto‑Sync Dynamic Lyrics opt-in avec intervalle configurable ;
- bouton de resynchronisation manuelle ;
- suspension du polling lorsque la PWA est masquée pour respecter iOS et limiter les appels Spotify ;
- rollback PWA V10.4, diagnostic Spotify V10.2 et Railway v5.2.0 conservés.


## V10.6 — UX mobile & cohérence d’interface

- couche mobile globale séparée du design system historique ;
- contrôles de formulaire à 16 px sur iPhone pour éviter le zoom Safari ;
- cibles tactiles harmonisées à 44 px minimum dans les sous-menus ;
- scroll/focus tenant compte de la navigation inférieure et des safe-areas ;
- détection du clavier via Visual Viewport uniquement lorsqu’un vrai champ éditable est actif ;
- navigation inférieure temporairement masquée pendant la saisie lorsque le clavier occupe réellement l’écran ;
- logique Spotify, Now Playing, Dynamic Lyrics, rollback PWA et Railway inchangés.

## V10.7 — Performance & démarrage

- bibliothèque locale affichée immédiatement lorsqu’elle est disponible ;
- rafraîchissement profil/playlists Spotify repoussé après l’ouverture sur les écrans compatibles ;
- découverte des appareils Spotify différée lorsqu’elle n’est pas requise par le lancement courant ;
- suppression d’un appel `/me/player/queue` redondant au démarrage de l’accueil ;
- nouvelle file `core/startup-performance.js` avec attente visibilité/réseau, déduplication et diagnostics ;
- mesure du temps jusqu’à l’interface interactive dans le Centre de fiabilité ;
- logique de lecture Spotify, Dynamic Lyrics, UX mobile, rollback PWA et Railway inchangés.

