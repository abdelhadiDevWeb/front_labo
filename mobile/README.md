# MarketLab Mobile App

Application React Native avec WebView pour afficher le site web MarketLab.

## Prérequis

- Node.js >= 18
- React Native CLI
- Android Studio (pour Android)
- Xcode (pour iOS - macOS uniquement)

## Installation

1. Installer les dépendances :
```bash
cd mobile
npm install
```

2. Pour iOS (macOS uniquement) :
```bash
cd ios
pod install
cd ..
```

## Configuration

Modifiez l'URL dans `App.tsx` :
```typescript
const WEB_URL = __DEV__ 
  ? 'http://localhost:3000' // URL de développement
  : 'https://your-production-url.com'; // URL de production
```

Pour tester sur un appareil physique, remplacez `localhost` par l'IP de votre machine :
```typescript
const WEB_URL = 'http://192.168.1.XXX:3000';
```

## Exécution

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

### Démarrer le serveur Metro
```bash
npm start
```

## Fonctionnalités

- ✅ Navigation web complète
- ✅ Boutons de navigation (retour, avant, recharger, accueil)
- ✅ Gestion du bouton retour Android
- ✅ Indicateur de chargement
- ✅ Gestion des erreurs
- ✅ Synchronisation du stockage avec AsyncStorage
- ✅ Support des fichiers et médias
- ✅ Mode plein écran pour les vidéos
- ✅ Prévention du zoom sur double-tap

## Structure

```
mobile/
├── App.tsx              # Composant principal avec WebView
├── index.js             # Point d'entrée
├── package.json         # Dépendances
├── android/             # Configuration Android
├── ios/                 # Configuration iOS (à générer)
└── README.md            # Documentation
```

## Notes

- Assurez-vous que votre serveur Next.js est accessible depuis l'appareil
- Pour le développement, utilisez l'IP locale au lieu de localhost
- Activez le mode développeur dans les paramètres Android pour le débogage
