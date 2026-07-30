# Feuille de route Shuffle+

- **v7.4.2 — Test OAuth Windows corrigé : terminée**
  - normalisation préalable des fins de ligne ;
  - simulation indépendante des formats LF et CRLF ;
  - prévention des séquences invalides `\r\r\n` ;
  - aucune modification du fonctionnement Spotify ou Dynamic Lyrics.

- **v7.4.1 — Déploiement Windows fiabilisé : terminée**
  - tests compatibles avec les fins de ligne LF et CRLF ;
  - politique `.gitattributes` commune à Windows et GitHub Actions ;
  - exclusion des anciens bootstrap de récupération lors du build ;
  - intégration Dynamic Lyrics inchangée.

- **v7.3.0 — Raccourci iOS et conduite : terminée**
  - iPhone préféré enregistré par `device_id` ;
  - recherche de secours par nom et type ;
  - transfert, shuffle, lancement et vérification ;
  - départ aléatoire pour les nouvelles commandes ;
  - ouverture automatique facultative du mode conduite ;
  - liste des prochains morceaux en conduite.

- **v7.3.1 — Démarrage et connexion sécurisés : terminée**
  - secours indépendant lorsque `app.js` ne démarre pas ;
  - réparation ciblée du cache et du Service Worker ;
  - réinitialisation de l’authentification sans supprimer les préférences ;
  - contrôle automatique des versions chargées ;
  - nettoyage des états PKCE incomplets ou expirés ;
  - stratégie réseau prioritaire pour les scripts versionnés.

- **v7.3.2 — Interface iPhone stabilisée : terminée**
  - bandeau de mise à jour placé au-dessus de la navigation fixe ;
  - boutons de mise à jour accessibles avec la safe area iOS ;
  - en-tête connecté maintenu sur une seule ligne ;
  - message de bienvenue tronqué sans déplacer la déconnexion ;
  - contrôles renforcés pour les écrans iPhone étroits.

- **v7.4.0 — Dynamic Lyrics et profils compagnons : terminée**
  - configuration dans Mix & iOS ;
  - lancement par un raccourci iOS personnel ;
  - activation indépendante pour chaque profil ;
  - délai d’ouverture configurable ;
  - test et copie du lien compagnon ;
  - aucune parole ajoutée au mode conduite.

- **v7.5.0 — Moteur explicable : prévue**
  - rapport avant/après ;
  - graine reproductible ;
  - explication des compromis du mélange.

- **v7.2.1 — Correctif connexion/navigation : terminée**
  - correction de `groups is not defined` ;
  - tests de régression du menu et du diagnostic.

- **v7.2.0 — Architecture et performances : terminée**
  - navigation centralisée dans `core/app-menu.js` ;
  - échappement HTML partagé ;
  - rendu limité à la rubrique active ;
  - graphe d’imports et build GitHub Pages vérifiés ;
  - cache PWA borné ;
  - validation des Pull Requests.

- **v7.1.1 — Fiabilité Spotify : terminée**
  - expiration `invalid_grant` ;
  - reconnexion assistée ;
  - renouvellement simultané dédupliqué ;
  - gestion séparée de `QUOTA_EXCEEDED`.

- **v7.1.0 — Performance et hors connexion : terminée**
  - affichage immédiat de la bibliothèque locale ;
  - cache IndexedDB des playlists ouvertes ;
  - état réseau clair ;
  - mode économie de données ;
  - cache PWA séparé et plus robuste.

- **v7.0.0 — Stabilisation et navigation organisée : terminée**
  - navigation regroupée ;
  - mémoire de position par rubrique ;
  - centre de diagnostic ;
  - réparation du cache PWA ;
  - consolidation PC, Safari et PWA.

- **v6.9.0 — Modes d’utilisation : terminée**
  - Quotidien, Conduite, Sport, Soirée et Découverte ;
  - application coordonnée de la page, de la scène et du thème ;
  - intégration Assistant, Guide, recherche, aide et sauvegarde.

- **v6.8.0 — Recherche universelle : terminée**
  - recherche des rubriques et réglages ;
  - recherche des playlists, mix, scènes et profils ;
  - navigation précise et mise en évidence ;
  - historique local et raccourcis clavier ;
  - interface mobile plein écran.

- **v6.7.0 — Visite guidée et aide contextuelle : terminée**
  - parcours en six étapes ;
  - aide « ? » par rubrique ;
  - conseils dynamiques et états de démarrage ;
  - réglages, sauvegarde et restauration.

- **v6.6.0 — Guide simplifié : terminée**
  - manuel intégré ;
  - explication courte de chaque rubrique ;
  - parcours de démarrage ;
  - vocabulaire essentiel ;
  - accès direct au README.

- **v6.5.0 — Objectifs & bilan hebdomadaire : terminée**
  - objectifs personnalisables ;
  - progression et badges ;
  - comparaison hebdomadaire ;
  - export JSON ;
  - commande assistant et sauvegarde.

- **v6.4.2 — Menu PC sur une seule ligne : terminée**
  - libellés non coupés ;
  - aucune mise à la ligne sur ordinateur ;
  - défilement horizontal de secours ;
  - correctif iOS et tri récent conservés.

- **v6.4.1 — Correctif iOS : terminée**
  - navigation Pour toi et Statistiques ;
  - cache PWA renforcé ;
  - tri Modifiées récemment par défaut ;
  - préférences de bibliothèque persistantes.

- **v6.4.0 — Tableau de bord musical complet : terminée**

- **v6.3.0 — Statistiques d’écoute avancées : terminée**
  - tableau de bord local ;
  - durées potentielles et confirmées ;
  - graphiques par jour et moment ;
  - export CSV/JSON ;
  - commande assistant dédiée.

- **v6.2.0 — Recommandations personnalisées : terminée**
  - onglet Pour toi ;
  - classement local ;
  - évaluations et masquage ;
  - commande assistant ;
  - sauvegarde et synchronisation.

- **v6.1.0 — Assistant vocal : terminée**
  - reconnaissance vocale française ;
  - confirmation des actions sensibles ;
  - réponses vocales et retour haptique ;
  - intégration Assistant, Rapide et Conduite.

- **v6.0.0 — Assistant musical local : terminée**
  - commandes en français analysées localement ;
  - lancement, préparation, transition et programmation ;
  - réglages de scènes par langage naturel ;
  - historique sauvegardé et synchronisé.

- **v5.6.0 — Planificateur intelligent : terminée**
  - routines mix ou scènes ;
  - priorités et rattrapage ;
  - calendrier des prochaines occurrences ;
  - routines conseillées.

- **v5.5.0 — Transitions progressives : terminée**
  - transition entre scènes sans toucher aux titres déjà envoyés ;
  - aperçu, application et annulation ;
  - courbe d’énergie configurable ;
  - réglages sauvegardés et synchronisés.

- **v5.3.1 — Visual Polish & Accessibility : terminée**
  - stabilisation responsive ;
  - contraste renforcé optionnel ;
  - navigation mobile améliorée ;
  - accessibilité des statuts et commandes.

- **v5.3.0 — Interface Dynamique & Musicale : terminée**
  - violet par défaut et couleurs personnalisables ;
  - design sombre et immersif ;
  - navigation mobile façon application musicale ;
  - préférences d’apparence synchronisées.

- **v5.1.1 — Correctif iPhone : terminée**
  - alignement responsive des panneaux et cartes ;
  - prise en charge des zones de sécurité iOS ;
  - confirmation flash après copie d’un lien iOS.

- **v5.1.0 — Mix Studio : terminée**
  - générateur de mix multi-sources ;
  - ambiances rapides ;
  - durée cible et diversité ;
  - aperçu, sauvegarde et association Adaptive DJ ;
  - synchronisation serveur des mix.
- **v5.2.0 — Mix Studio avancé : terminée**
  - modèles réutilisables ;
  - pondération des sources ;
  - comparaison et aperçu de plusieurs variantes.
- **v5.2.1 — Stabilisation Mix Studio : prévue**
  - retours d’usage et optimisation de la pondération ;
  - édition directe des modèles existants.
- **v5.3 — Collaboration privée : étude**
  - partage chiffré d’un mix entre espaces autorisés.


## v5.4.0 — Adaptive DJ 2.0

- scènes musicales configurables ;
- URL iOS par scène ;
- scène active ;
- intégration backup/import-export.


## v6.5.1 — Mode voiture iPhone

- interface Safari sur une seule page ;
- hauteur dynamique et zones sûres ;
- portrait et paysage compacts.


## v6.5.2 — Fiabilité Wake Lock

- état réel actif/en attente/erreur ;
- réacquisition après visibilité, focus, pageshow et interaction ;
- messages Safari explicites.
