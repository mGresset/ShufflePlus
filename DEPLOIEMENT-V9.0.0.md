# Déploiement Shuffle+ v9.0.0

## 1. Validation locale

```powershell
npm.cmd install
npm.cmd run validate
```

## 2. Test local

```powershell
npm.cmd start
```

Ouvrir ensuite l’adresse indiquée par le terminal.

## 3. Publication statique

Le build prêt à publier se trouve dans `dist/` après :

```powershell
npm.cmd run build
npm.cmd run check:dist
```

Publier le contenu de `dist/` sur GitHub Pages ou le service statique utilisé actuellement.

## 4. Mise à jour PWA

La v9 utilise un nouveau cache `shuffleplus-v9.0.0`. Après publication :

1. ouvrir Shuffle+ dans Safari ;
2. accepter le bandeau de mise à jour ;
3. si l’ancienne version reste affichée, fermer puis rouvrir la PWA ;
4. utiliser « Réparer Shuffle+ » uniquement si le cache reste bloqué.

## 5. Spotify Developer

L’adresse de redirection configurée dans Spotify Developer doit rester identique à l’adresse publique exacte de Shuffle+.

Ne jamais ajouter de Client Secret dans l’application ou dans le dépôt.
