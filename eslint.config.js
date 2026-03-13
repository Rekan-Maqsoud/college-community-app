// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const reactNativePlugin = require('eslint-plugin-react-native');
const reactPerfPlugin = require('eslint-plugin-react-perf');

const baseConfig = Array.isArray(expoConfig) ? expoConfig : [expoConfig];

module.exports = defineConfig([
  ...baseConfig,
  {
    ignores: ['dist/**', 'appwrite-functions/**', 'lecture-guard-proxy/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    files: ['app/**/*.{js,jsx}'],
    plugins: {
      'react-native': reactNativePlugin,
      'react-perf': reactPerfPlugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      'react/display-name': 'warn',

      // Keep lint focused on correctness while legacy UI files are being
      // incrementally modernized; these style/perf rules currently dominate
      // warnings and hide actionable issues.
      'react-native/no-inline-styles': 'off',
      'react-native/no-unused-styles': 'off',
      'react-perf/jsx-no-new-object-as-prop': 'off',
      'react-perf/jsx-no-new-function-as-prop': 'off',
    },
  },
  {
    files: ['__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    files: ['count-code.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
]);
