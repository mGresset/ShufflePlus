# Validation terrain Shuffle+ v12.0.1

## Conditions obligatoires

1. Lancer un profil sur un compte Spotify Premium et confirmer la lecture.
2. Installer la PWA sur iPhone, fermer, rouvrir et tester une mise à jour.
3. Vérifier la synchronisation Railway entre deux sessions ou appareils.
4. Exporter puis restaurer une sauvegarde JSON, puis vérifier l’historique local.
5. Tester le mode conduite : verrouillage, file, commandes et maintien d’écran.
6. Mettre Shuffle+ en arrière-plan plus de 15 secondes puis revenir et vérifier la resynchronisation unique.
7. Dans **Réglages > Centre de fiabilité**, vérifier que **Shell PWA essentiel** indique toutes les ressources essentielles en cache.
8. Exécuter `npm.cmd run validate` sans échec.
9. Installer Chromium/WebKit Playwright puis exécuter `npm.cmd run test:e2e` sans échec.
10. Vérifier que `check-release-cleanup.mjs` ne détecte aucun reliquat d’interface historique critique actif.
11. Dans la recherche globale, chercher un titre Spotify et vérifier **Lire**, **Lire ensuite** et l’ajout aux priorités d’un profil personnalisé.
12. Sur GitHub Actions, confirmer que Chromium desktop, WebKit/iPhone et le scénario Service Worker PWA sont verts.
13. Vérifier que l’Assistant musical et le partage/import de profils se chargent au premier usage sans erreur et restent disponibles hors ligne après préchauffage PWA.

## Validation iPhone préféré (v12)

14. Après la mise à jour, la carte **Appareil Spotify préféré** affiche ton iPhone sans reconfiguration.
15. Raccourci normal : Spotify fermé → raccourci → lecture confirmée sur l’iPhone, résultat Railway `success`.
16. Spotify Connect lent : l’écran de lancement affiche « Réveil de Spotify Connect… » puis l’iPhone retrouvé.
17. Mode strict : iPhone en mode Avion et Spotify ouvert sur le Mac → raccourci → échec propre `PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE`, **aucune** lecture sur le Mac, iPhone toujours enregistré.
18. **Tester** sur la carte ne coupe pas la musique en cours.
19. **Oublier** demande une confirmation ; un refus ne supprime rien.
20. Ouvrir deux fois la même URL de raccourci (même `requestId`) : un seul lancement.
21. Laisser Shuffle+ en arrière-plan plusieurs heures puis lancer : session renouvelée sans action.

## Ce que signifie la branche V11

La V11 consolide les mécanismes devenus stables pendant la V10 au lieu d’ajouter une nouvelle couche de comportement Spotify. Les contrats de validation et de nettoyage ne dépendent plus d’un numéro de branche historique, la documentation de finalisation porte un nom pérenne et les libellés actifs de l’interface ne présentent plus V10 comme la version courante.

Les mécanismes éprouvés restent conservés : Lecture en cours, reprise iPhone, sauvegardes versionnées, rollback PWA, mode conduite, raccourcis iOS et serveur Railway (v5.3.0 recommandé, v5.2.1 compatible). Dynamic Lyrics est volontairement retiré de l’UI/runtime depuis la 12.0.1 ; ses anciens champs restent seulement tolérés pour compatibilité. Les mentions V10.1 encore présentes dans la section de migration désignent uniquement l’ancien format de raccourci à migrer et ne constituent pas un numéro de version active.
