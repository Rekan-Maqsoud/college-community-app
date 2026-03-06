const appJson = require('./app.json');

const isTruthy = (value) => value === '1' || value === 'true' || value === 'yes';

const findPluginIndex = (plugins, pluginName) =>
  plugins.findIndex((plugin) => Array.isArray(plugin) && plugin[0] === pluginName);

const expoConfig = JSON.parse(JSON.stringify(appJson.expo || {}));
const plugins = Array.isArray(expoConfig.plugins) ? [...expoConfig.plugins] : [];

// Enable Hermes V1 source builds only when explicitly requested.
const enableHermesV1Android = isTruthy(
  String(process.env.EXPO_ENABLE_HERMES_V1_ANDROID || '').toLowerCase()
);

const buildPropsPluginName = 'expo-build-properties';
const buildPropsPluginIndex = findPluginIndex(plugins, buildPropsPluginName);

if (buildPropsPluginIndex !== -1) {
  const buildPropsEntry = plugins[buildPropsPluginIndex];
  const buildPropsConfig = { ...(buildPropsEntry[1] || {}) };

  if (enableHermesV1Android) {
    buildPropsConfig.buildReactNativeFromSource = true;
    buildPropsConfig.useHermesV1 = true;
  } else {
    delete buildPropsConfig.buildReactNativeFromSource;
    delete buildPropsConfig.useHermesV1;
  }

  plugins[buildPropsPluginIndex] = [buildPropsPluginName, buildPropsConfig];
}

expoConfig.plugins = plugins;
module.exports = expoConfig;
