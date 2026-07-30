# Déployer Shuffle+ v7.3.2

La v7.3.2 est un correctif d’interface construit sur la v7.3.1.

## Installation du patch

Décompresser `ShufflePlus-v7.3.2-patch.zip` à la racine du dépôt ShufflePlus en autorisant le remplacement des fichiers.

L’ancien fichier `startup-recovery-7.3.1.js` peut être supprimé après application du patch. Il n’est plus référencé par l’application.

## Validation locale

```powershell
npm run validate
npm start
```

Ouvrir ensuite :

```text
http://127.0.0.1:5500/
```

À vérifier en priorité avec une largeur mobile :

1. l’en-tête connecté tient sur une seule ligne ;
2. le bouton de déconnexion reste à droite ;
3. le message de bienvenue se tronque si nécessaire ;
4. le bandeau de mise à jour apparaît au-dessus du menu inférieur ;
5. les boutons « Mettre à jour » et « Plus tard » sont cliquables.

## Publication

```powershell
git switch main
git pull origin main
git switch -c hotfix/7.3.2

git add .
git commit -m "Hotfix Shuffle+ v7.3.2"
git push -u origin hotfix/7.3.2

gh pr create --base main --head hotfix/7.3.2 --title "Shuffle+ v7.3.2" --body "Correctifs du bandeau de mise à jour et de l’en-tête sur iPhone."
gh pr merge --squash --delete-branch
```

Après déploiement :

```powershell
git switch main
git pull origin main
git tag -a v7.3.2 -m "Shuffle+ v7.3.2"
git push origin v7.3.2
```

Sur iPhone, fermer complètement Shuffle+ puis la rouvrir. Si le bandeau de mise à jour de l’ancienne version est encore présent, toucher « Mettre à jour » après son repositionnement ou utiliser « Connexion bloquée ? → Réparer Shuffle+ ».
