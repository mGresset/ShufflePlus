# Déploiement Shuffle+ v9.9.28

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.9.28 - résultats asynchrones Railway"
git push origin main
```

Le service Railway doit être redéployé avec le dossier `server/` de cette version. Conserver un volume persistant sur `SHUFFLEPLUS_DATA_DIR` et autoriser l’origine GitHub Pages dans `SHUFFLEPLUS_ALLOWED_ORIGINS`.

Variable facultative :

```text
SHUFFLEPLUS_LAUNCH_RESULT_TTL_MS=900000
```
