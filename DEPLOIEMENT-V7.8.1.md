# Déploiement de Shuffle+ v7.8.1

## 1. Base requise

Utilise la **v7.8.0 stable** comme base.

Décompresse `ShufflePlus-v7.8.1-patch.zip` à la racine du dépôt.

Supprime l’ancien bootstrap de récupération pour garder le dépôt propre :

```powershell
Remove-Item .\startup-recovery-7.8.0.js -ErrorAction SilentlyContinue
```

Le build exclut automatiquement cet ancien fichier s’il reste présent.

## 2. Créer la branche

```powershell
git switch main
git pull origin main
git switch -c hotfix/7.8.1
```

## 3. Valider localement

```powershell
npm run validate
npm start
```

Ouvre :

```text
http://127.0.0.1:5500/
```

Pour tester le mode conduite depuis un ordinateur :

```text
http://127.0.0.1:5500/?debug_ios=1
```

## 4. Contrôler les thèmes

Dans **Réglages → Apparence** :

1. essaie plusieurs couleurs prédéfinies ;
2. sélectionne une couleur personnalisée ;
3. vérifie que l’aperçu change avant le clic sur Appliquer ;
4. applique une couleur très claire et vérifie le contraste ;
5. recharge l’application et confirme que le thème est conservé ;
6. utilise **Revenir au violet**.

## 5. Contrôler le mode conduite

Avec `?debug_ios=1` ou sur l’iPhone :

1. ouvre **Raccourcis → Conduite** ;
2. vérifie que le bouton principal reprend la couleur active ;
3. vérifie les boutons actifs, Liste de lecture et maintien de l’écran ;
4. change de thème puis rouvre Conduite ;
5. vérifie que le fond reste sombre et lisible.

## 6. Contrôler la rubrique Créer

Dans **Créer**, vérifie que :

```text
Raccourcis iOS
```

est présenté en premier et que son panneau apparaît avant le studio de mélange.

## 7. Publier

```powershell
git add .
git commit -m "Hotfix Shuffle+ v7.8.1"
git push -u origin hotfix/7.8.1
```

```powershell
gh pr create --base main --head hotfix/7.8.1 --title "Shuffle+ v7.8.1" --body "Synchronisation du mode conduite avec le thème, couleurs étendues et Raccourcis iOS placé en premier."

gh pr merge --squash --delete-branch
```

## 8. Finaliser

```powershell
git switch main
git pull origin main
git tag -a v7.8.1 -m "Shuffle+ v7.8.1"
git push origin v7.8.1
```

Sur iPhone, ferme complètement Shuffle+ puis rouvre-la après le déploiement afin de charger le cache PWA v7.8.1.
