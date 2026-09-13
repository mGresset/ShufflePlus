# Validation terrain Shuffle+ v10.9.0

## Conditions obligatoires

1. Lancer un profil sur un compte Spotify Premium et confirmer la lecture.
2. Installer la PWA sur iPhone, fermer, rouvrir et tester une mise à jour.
3. Vérifier la synchronisation Railway entre deux sessions ou appareils.
4. Exporter puis restaurer une sauvegarde JSON.
5. Tester le mode conduite : verrouillage, file, commandes et maintien d’écran.
6. Exécuter `npm.cmd run validate` sans échec.
7. Vérifier que le garde-fou `check-v10-cleanup.mjs` ne détecte aucun reliquat d’interface historique critique.

## Ce que « final » signifie

La v10.0.0 a constitué la première branche V10 stable du code ; la v10.9.0 renforce désormais la reprise iPhone et les sessions longues avec une resynchronisation Spotify dédupliquée après suspension ou reconnexion. Les sauvegardes versionnées 10.8.0, les optimisations de démarrage 10.7.0 et la logique Spotify stabilisée en 10.5.2 restent inchangées, tout comme l’UX mobile 10.6, le rollback PWA, la fiabilité Spotify Connect et Railway v5.2.0. La validation terrain reste indispensable avant de considérer une installation donnée comme pleinement validée pour l’usage quotidien. Elle restera maintenable : une version finale n’exclut pas de futurs correctifs de sécurité ou de compatibilité imposés par Spotify, iOS, GitHub Pages ou Railway.
