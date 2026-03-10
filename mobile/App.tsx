import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your actual website URL
const WEB_URL = __DEV__ 
  ? 'http://localhost:3000' // Development URL
  : 'https://your-production-url.com'; // Production URL

interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  url: string;
  title: string;
}

const App: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const [navigationState, setNavigationState] = useState<NavigationState>({
    canGoBack: false,
    canGoForward: false,
    loading: true,
    url: WEB_URL,
    title: 'MarketLab',
  });

  // Handle Android back button
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationState.canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [navigationState.canGoBack]);

  const handleNavigationStateChange = (navState: any) => {
    setNavigationState({
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      loading: navState.loading,
      url: navState.url,
      title: navState.title || 'MarketLab',
    });
  };

  const handleGoBack = () => {
    if (webViewRef.current && navigationState.canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webViewRef.current && navigationState.canGoForward) {
      webViewRef.current.goForward();
    }
  };

  const handleReload = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleHome = () => {
    if (webViewRef.current) {
      webViewRef.current.loadUrl(WEB_URL);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Message from WebView:', data);
      
      // Handle messages from web app
      if (data.type === 'STORAGE') {
        // Sync storage between web and native
        if (data.action === 'SET') {
          AsyncStorage.setItem(data.key, data.value);
        } else if (data.action === 'GET') {
          AsyncStorage.getItem(data.key).then((value) => {
            webViewRef.current?.postMessage(
              JSON.stringify({ type: 'STORAGE_RESPONSE', key: data.key, value })
            );
          });
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error: ', nativeEvent);
    Alert.alert(
      'Erreur de chargement',
      'Impossible de charger la page. Vérifiez votre connexion internet.',
      [
        { text: 'Réessayer', onPress: handleReload },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    if (nativeEvent.statusCode >= 400) {
      Alert.alert(
        'Erreur HTTP',
        `Erreur ${nativeEvent.statusCode}: ${nativeEvent.description || 'Erreur de chargement'}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navButton, !navigationState.canGoBack && styles.navButtonDisabled]}
          onPress={handleGoBack}
          disabled={!navigationState.canGoBack}
        >
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, !navigationState.canGoForward && styles.navButtonDisabled]}
          onPress={handleGoForward}
          disabled={!navigationState.canGoForward}
        >
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={handleReload}>
          <Text style={styles.navButtonText}>↻</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={handleHome}>
          <Text style={styles.navButtonText}>⌂</Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {navigationState.title}
          </Text>
        </View>
      </View>

      {/* Loading Indicator */}
      {navigationState.loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        onError={handleError}
        onHttpError={handleHttpError}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        // Enable debugging in development
        webviewDebuggingEnabled={__DEV__}
        // User agent to identify as mobile app
        userAgent={`MarketLab-Mobile/${Platform.OS} 1.0.0`}
        // Handle file uploads
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        // Cache settings
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        // Injected JavaScript for better integration
        injectedJavaScript={`
          (function() {
            // Override console.log to send messages to React Native
            const originalLog = console.log;
            console.log = function(...args) {
              originalLog.apply(console, args);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'CONSOLE',
                message: args.join(' ')
              }));
            };

            // Add mobile app indicator
            document.body.setAttribute('data-mobile-app', 'true');
            
            // Prevent zoom on double tap
            let lastTouchEnd = 0;
            document.addEventListener('touchend', function(event) {
              const now = Date.now();
              if (now - lastTouchEnd <= 300) {
                event.preventDefault();
              }
              lastTouchEnd = now;
            }, false);

            // Notify React Native that script is injected
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'READY',
              message: 'WebView ready'
            }));
          })();
        `}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 8,
    height: 56,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 20,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
