import { registerRootComponent } from 'expo';
import React, { useState, useEffect } from 'react';
import { setGlobalFontScale } from './app/utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

// A wrapper component to load font scale before rendering the main App
const RootWrapper = () => {
  const [isReady, setIsReady] = useState(false);
  const [App, setApp] = useState(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const saved = await AsyncStorage.getItem('fontScale');
        if (saved) {
          const scale = parseFloat(saved);
          if (!isNaN(scale) && scale >= 0.85 && scale <= 1.3) {
            setGlobalFontScale(scale);
          }
        }
      } catch (e) {
        // Use default scale
      }

      // Require ensures App module + all its dependencies (including
      // StyleSheet.create calls) evaluate AFTER font scale is initialized.
      const AppComponent = require('./app/App').default;
      setApp(() => AppComponent);
      setIsReady(true);
    };

    bootstrap();
  }, []);

  if (!isReady || !App) {
    return null; // Or a splash screen / loading indicator
  }

  return <App />;
};

registerRootComponent(RootWrapper);
