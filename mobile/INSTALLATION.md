# Guide d'installation - MarketLab Mobile App

## Prérequis

### Pour Android
1. **Node.js** (version 18 ou supérieure)
   - Télécharger depuis: https://nodejs.org/
   
2. **Java Development Kit (JDK)** version 17
   - Télécharger depuis: https://adoptium.net/
   - Configurer JAVA_HOME dans les variables d'environnement

3. **Android Studio**
   - Télécharger depuis: https://developer.android.com/studio
   - Installer Android SDK (API 33 minimum)
   - Installer Android SDK Platform-Tools
   - Configurer ANDROID_HOME dans les variables d'environnement

4. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

### Pour iOS (macOS uniquement)
1. **Xcode** (dernière version)
   - Télécharger depuis: App Store
   - Installer les outils de ligne de commande:
     ```bash
     xcode-select --install
     ```

2. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

## Installation

### 1. Installer les dépendances

```bash
cd mobile
npm install
```

### 2. Configuration Android

#### a. Créer le fichier local.properties
Créez le fichier `android/local.properties` avec le chemin vers votre SDK Android:

**Windows:**
```
sdk.dir=C\:\\Users\\VOTRE_NOM\\AppData\\Local\\Android\\Sdk
```

**macOS/Linux:**
```
sdk.dir=/Users/VOTRE_NOM/Library/Android/sdk
```

#### b. Générer la clé de signature (optionnel pour le développement)
Pour le développement, une clé de debug est déjà configurée.

### 3. Configuration iOS (macOS uniquement)

```bash
cd ios
pod install
cd ..
```

### 4. Configuration de l'URL

Modifiez l'URL dans `App.tsx`:

```typescript
const WEB_URL = __DEV__ 
  ? 'http://VOTRE_IP_LOCALE:3000' // Ex: http://192.168.1.100:3000
  : 'https://your-production-url.com';
```

**Important:** Pour tester sur un appareil physique ou émulateur:
- Remplacez `localhost` par l'IP locale de votre machine
- Assurez-vous que votre serveur Next.js est accessible depuis le réseau local
- Vérifiez que le pare-feu autorise les connexions sur le port 3000

### 5. Démarrer le serveur Metro

Dans un terminal:
```bash
cd mobile
npm start
```

### 6. Lancer l'application

#### Android
```bash
npm run android
```

Ou depuis Android Studio:
1. Ouvrir `android/` dans Android Studio
2. Attendre la synchronisation Gradle
3. Cliquer sur "Run"

#### iOS (macOS uniquement)
```bash
npm run ios
```

Ou depuis Xcode:
1. Ouvrir `ios/MarketLab.xcworkspace` dans Xcode
2. Sélectionner un simulateur
3. Cliquer sur "Run"

## Dépannage

### Erreur: "SDK location not found"
- Créez le fichier `android/local.properties` avec le chemin correct vers votre SDK Android

### Erreur: "Unable to resolve module"
```bash
cd mobile
rm -rf node_modules
npm install
```

### Erreur: "Metro bundler failed"
```bash
cd mobile
npm start -- --reset-cache
```

### L'application ne charge pas le site web
- Vérifiez que votre serveur Next.js est démarré
- Vérifiez l'URL dans `App.tsx`
- Pour un appareil physique, utilisez l'IP locale au lieu de localhost
- Vérifiez que l'appareil et l'ordinateur sont sur le même réseau Wi-Fi

### Erreur de build Android
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Structure du projet

```
mobile/
├── App.tsx                    # Composant principal
├── index.js                   # Point d'entrée
├── package.json              # Dépendances npm
├── android/                  # Configuration Android
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/marketlab/
│   │   │   └── res/
│   │   └── build.gradle
│   └── build.gradle
├── ios/                      # Configuration iOS (à générer)
└── README.md                # Documentation
```

## Commandes utiles

```bash
# Démarrer Metro bundler
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios

# Nettoyer le cache
npm start -- --reset-cache

# Nettoyer Android
cd android && ./gradlew clean && cd ..

# Voir les logs Android
adb logcat *:S ReactNative:V ReactNativeJS:V

# Voir les logs iOS
react-native log-ios
```

## Prochaines étapes

1. Configurer les icônes de l'application
2. Configurer le splash screen
3. Ajouter les permissions nécessaires (caméra, fichiers, etc.)
4. Configurer les notifications push
5. Optimiser les performances
6. Publier sur Google Play Store / App Store
