# 📱 InvestPro PWA - Progressive Web App

## 🚀 Installation de l'application

InvestPro peut être installé comme une application native sur votre appareil !

### 📱 Sur iPhone (iOS Safari)
1. Ouvrez InvestPro dans Safari
2. Appuyez sur l'icône de partage 📤 en bas de l'écran
3. Sélectionnez "Sur l'écran d'accueil"
4. Confirmez en appuyant sur "Ajouter"
5. L'application apparaîtra sur votre écran d'accueil

### 🤖 Sur Android (Chrome)
1. Ouvrez InvestPro dans Chrome
2. Appuyez sur le bouton "Installer InvestPro" qui apparaît automatiquement
3. Ou utilisez le menu ⋮ → "Installer l'application"
4. Confirmez l'installation
5. L'application sera ajoutée à votre écran d'accueil

### 💻 Sur Windows/Mac/Linux (Chrome/Edge)
1. Ouvrez InvestPro dans votre navigateur
2. Cliquez sur l'icône d'installation dans la barre d'adresse
3. Ou utilisez le menu → "Installer InvestPro"
4. L'application sera ajoutée à votre menu Démarrer/Applications

## ✨ Avantages de l'installation

- **Accès rapide** : Lancez l'app directement depuis votre écran d'accueil
- **Mode hors ligne** : Consultez vos données même sans connexion
- **Notifications push** : Recevez des alertes importantes
- **Interface native** : Expérience utilisateur optimisée
- **Pas de barre d'adresse** : Interface épurée et immersive

## 🔧 Génération des icônes

### Windows (PowerShell)
```powershell
.\generate-icons.ps1
```

### Mac/Linux (Bash)
```bash
chmod +x generate-icons.sh
./generate-icons.sh
```

### Manuellement
Si vous n'avez pas ImageMagick, créez manuellement les icônes aux tailles suivantes :
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

Placez-les dans `public/icons/` avec le nom `icon-{taille}x{taille}.png`

## 📋 Fichiers PWA

- `manifest.json` : Configuration de l'application
- `sw.js` : Service Worker pour le cache et mode hors ligne
- `public/icons/` : Icônes de l'application
- `PWAInstallButton.tsx` : Composant pour l'installation

## 🎨 Personnalisation

### Couleurs du thème
- Couleur principale : `#2563eb` (bleu)
- Couleur d'arrière-plan : `#ffffff` (blanc)
- Couleur du texte : personnalisable via Tailwind

### Icônes
Modifiez les scripts de génération pour personnaliser :
- Logo
- Couleurs
- Forme
- Texte

## 🔍 Test de la PWA

1. **Lighthouse** : Utilisez Chrome DevTools → Lighthouse → PWA
2. **Installation** : Testez l'installation sur différents appareils
3. **Hors ligne** : Désactivez la connexion et testez la navigation
4. **Performance** : Vérifiez les temps de chargement

## 📱 Compatibilité

- ✅ iOS Safari 11.3+
- ✅ Android Chrome 40+
- ✅ Windows Edge 17+
- ✅ macOS Safari 11.1+
- ✅ Desktop Chrome 40+

## 🛠️ Développement

Pour ajouter de nouvelles fonctionnalités PWA :

1. Modifiez `manifest.json` pour les métadonnées
2. Mettez à jour `sw.js` pour le cache
3. Ajoutez des raccourcis dans `shortcuts`
4. Créez de nouvelles icônes si nécessaire

## 📞 Support

Si vous rencontrez des problèmes d'installation :
1. Vérifiez que votre navigateur supporte les PWA
2. Assurez-vous d'être en HTTPS
3. Videz le cache du navigateur
4. Réessayez l'installation
