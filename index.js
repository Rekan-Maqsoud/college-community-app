import { registerRootComponent } from 'expo';
import React, { useState, useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { setGlobalFontScale } from './app/utils/responsive';
import safeStorage from './app/utils/safeStorage';

console.log('[startup:index] module loaded');

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
      console.log('[startup:index] bootstrap:start');
      try {
        console.log('[startup:index] bootstrap:fontScale:read:start');
        const saved = await safeStorage.getItem('fontScale');
        console.log('[startup:index] bootstrap:fontScale:read:done', { hasSavedScale: !!saved, saved });
        if (saved) {
          const scale = parseFloat(saved);
          if (!isNaN(scale) && scale >= 0.85 && scale <= 1.3) {
            setGlobalFontScale(scale);
            console.log('[startup:index] bootstrap:fontScale:applied', { scale });
          } else {
            console.log('[startup:index] bootstrap:fontScale:skipped_invalid', { saved });
          }
        }
      } catch (e) {
        console.error('[startup:index] bootstrap:fontScale:error', e);
        // Use default scale
      }

      // Require ensures App module + all its dependencies (including
      // StyleSheet.create calls) evaluate AFTER font scale is initialized.
      try {
        console.log('[startup:index] bootstrap:requireApp:start');
        const AppModule = require('./app/App');
        console.log('[startup:index] bootstrap:requireApp:moduleKeys', Object.keys(AppModule || {}));
        const AppComponent = AppModule?.default;
        console.log('[startup:index] bootstrap:requireApp:defaultType', typeof AppComponent);
        if (!AppComponent) {
          throw new Error('App module default export is undefined');
        }

        setApp(() => AppComponent);
        setIsReady(true);
        console.log('[startup:index] bootstrap:ready');
      } catch (error) {
        console.error('[startup:index] bootstrap:requireApp:error', error);
        throw error;
      }
    };

    bootstrap();
  }, []);

  if (!isReady || !App) {
    console.log('[startup:index] render:waiting', { isReady, hasApp: !!App });
    return null; // Or a splash screen / loading indicator
  }

  console.log('[startup:index] render:app');
  return <App />;
};

registerRootComponent(RootWrapper);
