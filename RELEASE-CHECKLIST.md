# Validation terrain Shuffle+ v11.0.0

## Conditions obligatoires

1. Lancer un profil sur un compte Spotify Premium et confirmer la lecture.
2. Installer la PWA sur iPhone, fermer, rouvrir et tester une mise à jour.
3. Vérifier la synchronisation Railway entre deux sessions ou appareils.
4. Exporter puis restaurer une sauvegarde JSON, puis vérifier l’historique local.
5. Tester le mode conduite : verrouillage, file, commandes et maintien d’écran.
6. Mettre Shuffle+ en arrière-plan plus de 15 secondes puis revenir et vérifier la resynchronisation unique.
7. Exécuter `npm.cmd run validate` sans échec.
8. Vérifier que `check-release-cleanup.mjs` ne détecte aucun reliquat d’interface historique critique actif.

## Ce que signifie la branche V11

La V11 consolide les mécanismes devenus stables pendant la V10 au lieu d’ajouter une nouvelle couche de comportement Spotify. Les contrats de validation et de nettoyage ne dépendent plus d’un numéro de branche historique, la documentation de finalisation porte un nom pérenne et les libellés actifs de l’interface ne présentent plus V10 comme la version courante.

Les mécanismes éprouvés restent conservés : Lecture en cours, reprise iPhone, sauvegardes versionnées, rollback PWA, Dynamic Lyrics, mode conduite, raccourcis iOS et serveur Railway v5.2.0. Les mentions V10.1 encore présentes dans la section de migration désignent uniquement l’ancien format de raccourci à migrer et ne constituent pas un numéro de version active.
