# Hermes V1 Android Build Guard

This project uses a guarded Hermes V1 setup for Android source builds.

## Why this guard exists

Hermes V1 requires `buildReactNativeFromSource: true` on Android. On hosts without required ICU toolchain support, Gradle fails during Hermes CMake configure with:

`Unable to find ICU.`

To avoid blocking normal development builds, Hermes V1 is disabled by default and can be enabled per-profile.

## How to enable Hermes V1

Use the dedicated EAS profile that sets `EXPO_ENABLE_HERMES_V1_ANDROID=1`:

```bash
eas build --local --platform android --profile development-hermesv1
```

Default profile keeps Hermes V1 disabled:

```bash
eas build --local --platform android --profile development
```

## Config flag behavior

`app.config.js` checks:

- `EXPO_ENABLE_HERMES_V1_ANDROID=1|true|yes`

When enabled, it injects into `expo-build-properties`:

- `buildReactNativeFromSource: true`
- `useHermesV1: true`

When disabled, those keys are removed from config.

## Host prerequisites for Hermes V1 source builds (Linux/WSL)

Install ICU development libraries and common native toolchain dependencies.

Ubuntu/Debian example:

```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake ninja-build pkg-config libicu-dev python3
```

If CMake still cannot find ICU, export paths before building:

```bash
export ICU_ROOT=/usr
export CMAKE_PREFIX_PATH=/usr
```

Then rerun the Hermes V1 profile build.

## Notes

- This guard only changes behavior when explicitly enabled.
- Non-Hermes-V1 profiles stay on Expo defaults for higher build reliability.
