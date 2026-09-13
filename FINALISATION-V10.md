# Validation terrain Shuffle+ v10.5.1

## Conditions obligatoires

1. Lancer un profil sur un compte Spotify Premium et confirmer la lecture.
2. Installer la PWA sur iPhone, fermer, rouvrir et tester une mise à jour.
3. Vérifier la synchronisation Railway entre deux sessions ou appareils.
4. Exporter puis restaurer une sauvegarde JSON.
5. Tester le mode conduite : verrouillage, file, commandes et maintien d’écran.
6. Exécuter `npm.cmd run validate` sans échec.
7. Vérifier que le garde-fou `check-v10-cleanup.mjs` ne détecte aucun reliquat d’interface historique critique.

## Ce que « final » signifie

La v10.0.0 a constitué la première branche V10 stable du code ; la v10.5.1 ajoute un assistant iPhone plus simple et un Auto‑Sync Dynamic Lyrics déclenché par les changements de morceau observés par Shuffle+, tout en conservant le rollback PWA, la fiabilité Spotify Connect et Railway v5.2.0. La validation terrain reste indispensable avant de considérer une installation donnée comme pleinement validée pour l’usage quotidien. Elle restera maintenable : une version finale n’exclut pas de futurs correctifs de sécurité ou de compatibilité imposés par Spotify, iOS, GitHub Pages ou Railway.
