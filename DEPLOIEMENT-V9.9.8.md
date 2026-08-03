# Déploiement Shuffle+ v9.9.8

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.8 - runtime PWA propre et Pause stable"
git push origin main
```

Après la publication GitHub Pages :

1. ouvrir la PWA avec Internet actif ;
2. accepter la recharge automatique éventuelle ;
3. vérifier la version 9.9.8 ;
4. tester Pause sans actualisation manuelle.

Le fichier `bootstrap-9.9.8.js` effectue une purge unique des anciens caches et Service Workers lors du passage à ce build.
