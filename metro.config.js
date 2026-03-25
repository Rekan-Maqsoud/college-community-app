const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('bin')) {
  config.resolver.assetExts.push('bin');
}

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@react-native-async-storage/async-storage': path.resolve(
    __dirname,
    'app/utils/tfjsAsyncStorageShim.js'
  ),
};

module.exports = config;
