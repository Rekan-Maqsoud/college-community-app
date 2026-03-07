// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const reactNativePlugin = require('eslint-plugin-react-native');
const reactPerfPlugin = require('eslint-plugin-react-perf');

const baseConfig = Array.isArray(expoConfig) ? expoConfig : [expoConfig];

module.exports = defineConfig([
  ...baseConfig,
  {
    ignores: ['dist/**'],
  },
  {
    files: ['app/**/*.{js,jsx}'],
    plugins: {
      'react-native': reactNativePlugin,
      'react-perf': reactPerfPlugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',

      // Stage render-hygiene rules as warnings first to surface hotspots without
      // turning existing UI debt into an immediate repo-wide blocker.
      'react-native/no-inline-styles': 'warn',
      'react-native/no-unused-styles': 'warn',
      'react-perf/jsx-no-new-object-as-prop': 'warn',
      'react-perf/jsx-no-new-function-as-prop': 'warn',
    },
  },
]);
