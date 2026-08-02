# Déploiement Shuffle+ v9.7.0

## GitHub Pages

Depuis le terminal Visual Studio Code, à la racine du dépôt :

```powershell
npm.cmd run validate
git add -A
git commit -m "Release Shuffle+ v9.7.0"
git push origin main
```

GitHub Actions doit construire et publier le dossier `dist`.

## Railway

Le service de synchronisation reste inchangé. Conserver :

```text
Root Directory: /server
```

Laisser les commandes Build et Start vides lorsque Railway utilise `server/Dockerfile`.

## Après publication

1. fermer complètement la PWA ;
2. la rouvrir ;
3. vérifier que la version affichée est `9.7.0` ;
4. ouvrir le mode conduite ;
5. tester le verrouillage, le maintien d’une seconde et la file plein écran.
