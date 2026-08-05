import React, { useState, useEffect } from 'react';
import './global.css';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import i18n from './src/i18n';
import crashlytics from '@react-native-firebase/crashlytics';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import MainApp from './src/screens/MainApp';

function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#060a12', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ color: '#ff4444', fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>⚠️ System Recovery</Text>
      <Text style={{ color: '#88a0c0', textAlign: 'center', marginBottom: 20 }}>
        Cortex OBD2 Diagnostic Scanner encountered an unexpected UI error. The crash event has been reported.
      </Text>
      <TouchableOpacity
        onPress={resetErrorBoundary}
        style={{ backgroundColor: '#00e5ff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#000000', fontWeight: 'bold' }}>RETRY APPLICATION</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    if (!i18n.isInitialized) {
      const handleInitialized = () => {
        setInitialized(true);
      };
      i18n.on('initialized', handleInitialized);
      return () => {
        i18n.off('initialized', handleInitialized);
      };
    }
  }, []);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00ffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary
        FallbackComponent={RootErrorFallback}
        onError={(error) => {
          try {
            crashlytics().recordError(error);
          } catch (e) {
            console.error('[ErrorBoundary] Failed to log error to Crashlytics:', e);
          }
        }}
      >
        <MainApp />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
