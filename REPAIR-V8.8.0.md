# Correctif complet Shuffle+ v8.8.0

Ce paquet remet ensemble les fichiers du chargement modulaire v8.8.0.
Il corrige notamment :
- l'import statique résiduel de universal-search.js dans app.js ;
- les styles Conduite résiduels dans design-system.css ;
- les feuilles spécialisées et leur chargeur ;
- les scripts et tests de validation associés.

Après extraction à la racine du dépôt, supprimer startup-recovery-8.7.1.js puis lancer npm.cmd run validate.
