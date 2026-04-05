import { registerRootComponent } from 'expo';
import React, { useState, useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { setGlobalFontScale } from './app/utils/responsive';
import safeStorage from './app/utils/safeStorage';

// Constrain system font scaling
if (Text.defaultProps) {
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.maxFontSizeMultiplier = 1.2;
} else {
  Text.defaultProps = {};
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.maxFontSizeMultiplier = 1.2;
}

if (TextInput.defaultProps) {
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.maxFontSizeMultiplier = 1.2;
} else {
  TextInput.defaultProps = {};
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.maxFontSizeMultiplier = 1.2;
}

// A wrapper component to load font scale before rendering the main App
const RootWrapper = () => {
  const [isReady, setIsReady] = useState(false);
  const [App, setApp] = useState(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const saved = await safeStorage.getItem('fontScale');
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
      try {
        const AppModule = require('./app/App');
        const AppComponent = AppModule?.default;
        if (!AppComponent) {
          throw new Error('App module default export is undefined');
        }

        setApp(() => AppComponent);
        setIsReady(true);
      } catch (error) {
        throw error;
      }
    };

    bootstrap();
  }, []);

  if (!isReady || !App) {
    return null; // Or a splash screen / loading indicator
  }

  return <App />;
};

registerRootComponent(RootWrapper);
