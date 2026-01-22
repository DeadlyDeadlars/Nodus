import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { storageInitPromise } from './services/storage';
import { getColors } from './theme';
import { initCore } from './core';
import App from './App';

const AppWrapper = () => {
  const [storageReady, setStorageReady] = useState(false);
  const [coreReady, setCoreReady] = useState(false);
  const colors = getColors('dark'); // Use default theme for loading

  useEffect(() => {
    // Initialize storage and E2EE core in parallel
    Promise.all([
      storageInitPromise,
      initCore(),
    ])
      .then(([_, fingerprint]) => {
        setStorageReady(true);
        setCoreReady(!!fingerprint);
        if (fingerprint) {
          console.log('E2EE initialized, fingerprint:', fingerprint.slice(0, 8) + '...');
        }
      })
      .catch((error) => {
        console.error('Initialization failed:', error);
        // Still allow app to continue
        setStorageReady(true);
        setCoreReady(true);
      });
  }, []);

  if (!storageReady || !coreReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.text, marginTop: 16 }}>
          {!storageReady ? 'Initializing...' : 'Setting up encryption...'}
        </Text>
      </View>
    );
  }

  return <App />;
};

export default AppWrapper;
