const appBaseJson = require('./app.base.json');
const { spawnSync } = require('child_process');

const isTruthy = (value) => value === '1' || value === 'true' || value === 'yes';

const findPluginIndex = (plugins, pluginName) =>
  plugins.findIndex((plugin) => Array.isArray(plugin) && plugin[0] === pluginName);

const commandSucceeds = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return !result.error && result.status === 0;
};

const hasHermesV1Toolchain = () => {
  const hasCmake = commandSucceeds('cmake', ['--version']);
  const hasIcuViaPkgConfig =
    commandSucceeds('pkg-config', ['--exists', 'icu-i18n']) ||
    commandSucceeds('pkg-config', ['--exists', 'icu-uc']);
  const hasIcuViaEnv = Boolean(process.env.ICU_ROOT || process.env.CMAKE_PREFIX_PATH);

  return hasCmake && (hasIcuViaPkgConfig || hasIcuViaEnv);
};

module.exports = () => {
  const expoConfig = JSON.parse(JSON.stringify(appBaseJson.expo || {}));
  const plugins = Array.isArray(expoConfig.plugins) ? [...expoConfig.plugins] : [];

  // Enable Hermes V1 source builds only when explicitly requested.
  const enableHermesV1Android = isTruthy(
    String(process.env.EXPO_ENABLE_HERMES_V1_ANDROID || '').toLowerCase()
  );
  const forceHermesV1Android = isTruthy(
    String(process.env.EXPO_HERMES_V1_STRICT || '').toLowerCase()
  );
  const hermesV1ToolchainReady = hasHermesV1Toolchain();
  const shouldEnableHermesV1Android =
    enableHermesV1Android && (forceHermesV1Android || hermesV1ToolchainReady);

  if (enableHermesV1Android && !shouldEnableHermesV1Android) {
    // Keep local builds reliable when host prerequisites for Hermes source builds are missing.
    console.warn(
      '[app.config] Hermes V1 Android requested but local toolchain prerequisites were not detected. Falling back to Expo default Hermes. Set EXPO_HERMES_V1_STRICT=1 to force Hermes V1 source build.'
    );
  }

  const buildPropsPluginName = 'expo-build-properties';
  const buildPropsPluginIndex = findPluginIndex(plugins, buildPropsPluginName);

  if (buildPropsPluginIndex !== -1) {
    const buildPropsEntry = plugins[buildPropsPluginIndex];
    const buildPropsConfig = { ...(buildPropsEntry[1] || {}) };

    if (shouldEnableHermesV1Android) {
      buildPropsConfig.buildReactNativeFromSource = true;
      buildPropsConfig.useHermesV1 = true;
    } else {
      delete buildPropsConfig.buildReactNativeFromSource;
      delete buildPropsConfig.useHermesV1;
    }

    plugins[buildPropsPluginIndex] = [buildPropsPluginName, buildPropsConfig];
  }

  expoConfig.plugins = plugins;
  return expoConfig;
};
