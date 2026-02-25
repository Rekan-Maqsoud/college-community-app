rekan@Rekan:~$ cd /mnt/c/Users/rekan/OneDrive/Desktop/college-community
rekan@Rekan:/mnt/c/Users/rekan/OneDrive/Desktop/college-community$ eas build --local
★ eas-cli@18.0.5 is now available.
To upgrade, run:
npm install -g eas-cli
Proceeding with outdated version.

✔ Select platform › Android
Resolved "production" environment for the build. Learn more: https://docs.expo.dev/eas/environment-variables/#setting-the-environment-for-your-builds
Environment variables with visibility "Plain text" and "Sensitive" loaded from the "production" environment on EAS: EXPO_PUBLIC_APPWRITE_AI_FUNCTION_ENDPOINT, EXPO_PUBLIC_APPWRITE_AI_FUNCTION_ID, EXPO_PUBLIC_APPWRITE_BUCKET_ID, EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_DATABASE_ID, EXPO_PUBLIC_APPWRITE_ENDPOINT, EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_LECTURE_CHANNELS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_LECTURE_STORAGE_ID, EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_PROJECT_ID, EXPO_PUBLIC_APPWRITE_PROJECT_NAME, EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_REP_ELECTIONS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_REP_VOTES_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_STORAGE_ID, EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_VOICE_MESSAGES_STORAGE_ID, EXPO_PUBLIC_GIPHY_API_KEY, EXPO_PUBLIC_GIPHY_API_KEY_IOS, EXPO_PUBLIC_IMGBB_API_KEY, EXPO_PUBLIC_LECTURE_GUARD_ENDPOINT, EXPO_PUBLIC_REPORT_REVIEW_ENDPOINT.
Environment variables loaded from the "production" build profile "env" configuration: NODE_ENV, GRADLE_OPTS, ORG_GRADLE_PROJECT_reactNativeArchitectures.

You set NODE_ENV=production in the build profile or environment variables. Remember that it will be available during the entire build process. In particular, it will make yarn/npm install only production packages.

✔ Using remote Android credentials (Expo server)
✔ Using Keystore from configuration: Build Credentials doM9LDdnjy (default)
✔ Compressed project files 8s (8.6 MB)
⌛️ Computing the project fingerprint is taking longer than expected...
⏩ To skip this step, set the environment variable: EAS_SKIP_AUTO_FINGERPRINT=1
✔ Computed project fingerprint
ANDROID_NDK_HOME environment variable was not specified, continuing build without NDK
[SETUP_WORKINGDIR] Preparing workingdir /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6
[START_BUILD] Starting build
  "job": {
    "type": "managed",
    "platform": "android",
    "projectRootDirectory": ".",
    "projectArchive": {
      "type": "PATH",
      "path": "/tmp/rekan/eas-cli-nodejs/31ba90ea-a30e-4cef-aae6-1443a0bdd429.tar.gz"
    },
    "builderEnvironment": {
      "env": {
        "NODE_ENV": "production",
        "GRADLE_OPTS": "-Xmx4g -XX:MaxMetaspaceSize=512m -Dorg.gradle.daemon=false -Dorg.gradle.workers.max=2 -Dorg.gradle.parallel=false",
        "ORG_GRADLE_PROJECT_reactNativeArchitectures": "arm64-v8a,armeabi-v7a"
      }
    },
    "cache": {
      "disabled": false,
      "paths": [],
      "clear": false
    },
    "updates": {
      "channel": "production"
    },
    "buildType": "app-bundle",
    "username": "rekankoye",
    "experimental": {},
    "mode": "build",
    "triggeredBy": "EAS_CLI",
    "appId": "d0af52e7-8e63-4426-9e92-30f0e835652d",
    "initiatingUserId": "50b3b76a-7fcb-4001-82e8-4507502316e6"
  }
Local build, skipping project archive refresh
[READ_EAS_JSON] Using eas.json:
[READ_EAS_JSON] {
  "cli": {
    "version": ">= 13.2.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "channel": "production",
      "env": {
        "NODE_ENV": "production",
        "GRADLE_OPTS": "-Xmx4g -XX:MaxMetaspaceSize=512m -Dorg.gradle.daemon=false -Dorg.gradle.workers.max=2 -Dorg.gradle.parallel=false",
        "ORG_GRADLE_PROJECT_reactNativeArchitectures": "arm64-v8a,armeabi-v7a"
      },
      "android": {
        "buildType": "app-bundle"
      }
    },
    "development-simulator": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "environment": "development"
    }
  },
  "submit": {
    "production": {}
  }
}

[READ_PACKAGE_JSON] Using package.json:
[READ_PACKAGE_JSON] {
  "name": "college-community",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "count": "node count-code.js",
    "test": "jest",
    "test:core-utils": "jest --runInBand __tests__/networkErrorHandler.test.js __tests__/onlineStatus.test.js __tests__/safeStorage.test.js __tests__/cacheManager.test.js __tests__/postRanking.test.js __tests__/feedCategories.test.js",
    "test:realtime": "jest --runInBand __tests__/realtimeEvents.test.js __tests__/chatRealtimeMessages.test.js",
    "test:chat-files": "jest --runInBand __tests__/chatFileUtils.test.js __tests__/appwriteFileUpload.test.js",
    "test:moderation": "jest --runInBand __tests__/postsModerationRepost.test.js",
    "test:lectures": "jest --runInBand __tests__/lectureUtils.test.js",
    "test:phase4": "jest --runInBand __tests__/lectureUtils.test.js __tests__/appwriteFileUpload.test.js __tests__/chatFileUtils.test.js",
    "test:critical": "jest --runInBand __tests__/realtimeEvents.test.js __tests__/chatRealtimeMessages.test.js __tests__/postsModerationRepost.test.js __tests__/networkErrorHandler.test.js __tests__/onlineStatus.test.js __tests__/safeStorage.test.js __tests__/cacheManager.test.js __tests__/postRanking.test.js __tests__/feedCategories.test.js",
    "publish:prod": "eas update --branch native-app --channel production"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@giphy/js-fetch-api": "^5.7.0",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-native-community/slider": "5.0.1",
    "@react-native-firebase/app": "^23.8.6",
    "@react-native-firebase/auth": "^23.8.6",
    "@react-native-firebase/database": "^23.8.6",
    "@react-native-picker/picker": "2.11.1",
    "@react-navigation/bottom-tabs": "^7.4.9",
    "@react-navigation/native": "^7.1.18",
    "@react-navigation/stack": "^7.4.10",
    "appwrite": "^21.5.0",
    "expo": "~54.0.33",
    "expo-asset": "~12.0.12",
    "expo-audio": "~1.1.1",
    "expo-auth-session": "~7.0.10",
    "expo-blur": "~15.0.8",
    "expo-build-properties": "~1.0.10",
    "expo-clipboard": "~8.0.8",
    "expo-constants": "~18.0.13",
    "expo-crypto": "~15.0.8",
    "expo-dev-client": "~6.0.20",
    "expo-device": "~8.0.10",
    "expo-document-picker": "^14.0.8",
    "expo-file-system": "~19.0.21",
    "expo-font": "~14.0.11",
    "expo-haptics": "^15.0.8",
    "expo-image-manipulator": "~14.0.8",
    "expo-image-picker": "~17.0.10",
    "expo-intent-launcher": "~13.0.7",
    "expo-linear-gradient": "~15.0.8",
    "expo-linking": "~8.0.11",
    "expo-localization": "~17.0.8",
    "expo-location": "~19.0.8",
    "expo-media-library": "~18.2.1",
    "expo-notifications": "~0.32.16",
    "expo-secure-store": "~15.0.8",
    "expo-sharing": "~14.0.8",
    "expo-status-bar": "~3.0.9",
    "expo-updates": "~29.0.16",
    "expo-web-browser": "~15.0.10",
    "i18n-js": "^4.5.1",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "^5.6.1",
    "react-native-screens": "~4.16.0",
    "react-native-view-shot": "^4.0.3",
    "react-native-webview": "13.15.0",
    "react-native-worklets": "0.5.1",
    "react-native-youtube-iframe": "^2.4.1",
    "tweetnacl": "^1.0.3",
    "tweetnacl-util": "^0.15.1"
  },
  "devDependencies": {
    "babel-preset-expo": "~54.0.10",
    "jest": "^29.7.0",
    "jest-expo": "~54.0.0",
    "react-test-renderer": "19.1.0"
  },
  "overrides": {
    "glob": "^13.0.0",
    "tar": "^7.5.9",
    "rimraf": "^5.0.10",
    "@xmldom/xmldom": "^0.8.11"
  },
  "private": true,
  "expo": {
    "install": {
      "exclude": [
        "typescript",
        "@types/react"
      ]
    },
    "scheme": "college-community"
  }
}
[INSTALL_DEPENDENCIES] Running "npm ci --include=dev" in /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build directory
[INSTALL_DEPENDENCIES] npm warn deprecated whatwg-encoding@2.0.0: Use @exodus/bytes instead for a more spec-conformant and faster implementation
[INSTALL_DEPENDENCIES] npm warn deprecated abab@2.0.6: Use your platform's native atob() and btoa() methods instead
[INSTALL_DEPENDENCIES] npm warn deprecated domexception@4.0.0: Use your platform's native DOMException instead
[INSTALL_DEPENDENCIES] added 941 packages, and audited 942 packages in 17s
[INSTALL_DEPENDENCIES] 97 packages are looking for funding
[INSTALL_DEPENDENCIES]   run `npm fund` for details
[INSTALL_DEPENDENCIES] found 0 vulnerabilities
[READ_APP_CONFIG] Using app configuration:
[READ_APP_CONFIG] {
  "name": "College Community",
  "slug": "college-community",
  "scheme": [
    "collegecommunity",
    "appwrite-callback-6973c51d0000bdd71f7a"
  ],
  "version": "1.0.3",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "userInterfaceStyle": "automatic",
  "newArchEnabled": true,
  "splash": {
    "image": "./assets/splash-icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#1a1a2e"
  },
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "com.college.community",
    "googleServicesFile": "./GoogleService-Info.plist",
    "infoPlist": {
      "CFBundleURLTypes": [
        {
          "CFBundleURLSchemes": [
            "appwrite-callback-6973c51d0000bdd71f7a"
          ]
        }
      ],
      "UIBackgroundModes": [
        "remote-notification"
      ]
    }
  },
  "android": {
    "package": "com.collegecommunity",
    "versionCode": 3,
    "googleServicesFile": "./google-services.json",
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#1a1a2e"
    },
    "permissions": [
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.VIBRATE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
      "android.permission.ACCESS_MEDIA_LOCATION",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_MEDIA_AUDIO",
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS"
    ],
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "collegecommunity"
          },
          {
            "scheme": "appwrite-callback-6973c51d0000bdd71f7a"
          }
        ],
        "category": [
          "BROWSABLE",
          "DEFAULT"
        ]
      }
    ]
  },
  "web": {
    "favicon": "./assets/favicon.png"
  },
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "extraProguardRules": "",
          "extraMavenRepos": [],
          "abiFilters": [
            "arm64-v8a",
            "armeabi-v7a"
          ]
        }
      }
    ],
    "expo-localization",
    "expo-font",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        "icon": "./assets/adaptive-icon.png",
        "color": "#007AFF",
        "sounds": [],
        "mode": "production"
      }
    ],
    [
      "expo-media-library",
      {
        "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to save images.",
        "savePhotosPermission": "Allow $(PRODUCT_NAME) to save images to your photo library.",
        "isAccessMediaLocationEnabled": true
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to share images."
      }
    ],
    [
      "expo-audio",
      {
        "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone.",
        "recordAudioAndroid": true
      }
    ],
    "expo-asset",
    "@react-native-firebase/app",
    "@react-native-firebase/auth"
  ],
  "extra": {
    "eas": {
      "projectId": "d0af52e7-8e63-4426-9e92-30f0e835652d"
    }
  },
  "runtimeVersion": {
    "policy": "appVersion"
  },
  "updates": {
    "url": "https://u.expo.dev/d0af52e7-8e63-4426-9e92-30f0e835652d"
  },
  "sdkVersion": "54.0.0",
  "platforms": [
    "ios",
    "android"
  ]
}
[RUN_EXPO_DOCTOR] Running "expo doctor"
[RUN_EXPO_DOCTOR] Running 17 checks on your project...
[RUN_EXPO_DOCTOR] 17/17 checks passed. No issues detected!
[PREBUILD] - Creating native directory (./android)
[PREBUILD] ✔ Created native directory
[PREBUILD] - Updating package.json
[PREBUILD] ✔ Updated package.json
[PREBUILD] - Running prebuild
[PREBUILD] » android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.
[PREBUILD] - Running prebuild
[PREBUILD] ✔ Finished prebuild
[PREBUILD] Running "npm install" in /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build directory
[PREBUILD] up to date, audited 798 packages in 1s
[PREBUILD] 79 packages are looking for funding
[PREBUILD]   run `npm fund` for details
[PREBUILD] found 0 vulnerabilities
[RESTORE_CACHE] Local builds do not support restoring cache
[CALCULATE_EXPO_UPDATES_RUNTIME_VERSION] Resolved runtime version: 1.0.3
[PREPARE_CREDENTIALS] Writing secrets to the project's directory
[PREPARE_CREDENTIALS] Injecting signing config into build.gradle
[CONFIGURE_EXPO_UPDATES] Setting the update request headers in 'AndroidManifest.xml' to '{"expo-channel-name":"production"}'
[EAGER_BUNDLE] Starting Metro Bundler
[EAGER_BUNDLE] Android ./index.js ▓▓░░░░░░░░░░░░░░ 16.0% ( 32/317)
[EAGER_BUNDLE] Android ./index.js ▓▓░░░░░░░░░░░░░░ 16.0% (209/565)
[EAGER_BUNDLE] Android ./index.js ▓▓▓░░░░░░░░░░░░░ 22.2% (367/779)
[EAGER_BUNDLE] Android ./index.js ▓▓▓▓▓▓▓▓░░░░░░░░ 52.5% ( 860/1187)
[EAGER_BUNDLE] Android ./index.js ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 78.1% (1294/1468)
[EAGER_BUNDLE] Android ./index.js ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 91.9% (1835/1918)
[EAGER_BUNDLE] Android Bundled 20876ms index.js (2011 modules)
[EAGER_BUNDLE] Writing bundle output to: /tmp/xaqoi7l8jl7/index.js
[EAGER_BUNDLE] Copying 40 asset files
[EAGER_BUNDLE] Done writing bundle output
[RUN_GRADLEW] Running 'gradlew :app:bundleRelease' in /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android
[RUN_GRADLEW] To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.14.3/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
[RUN_GRADLEW] Daemon will be stopped at the end of the build
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin-shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :gradle-plugin:shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin-shared:processResources NO-SOURCE
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:processResources
[RUN_GRADLEW] > Task :gradle-plugin:shared:processResources NO-SOURCE
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:processResources
[RUN_GRADLEW] > Task :gradle-plugin:shared:compileKotlin
[RUN_GRADLEW] > Task :gradle-plugin:shared:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :gradle-plugin:shared:classes UP-TO-DATE
[RUN_GRADLEW] > Task :gradle-plugin:shared:jar
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileKotlin
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin-shared:classes UP-TO-DATE
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin-shared:jar
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:compileKotlin
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:classes
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:jar
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileKotlin
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:classes
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:jar
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
[RUN_GRADLEW] SKIPPED
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
[RUN_GRADLEW] SKIPPED
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:processResources
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:checkKotlinGradlePluginConfigurationErrors
[RUN_GRADLEW] SKIPPED
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:processResources
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:processResources
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:processResources
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:processResources
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:compileKotlin
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:classes
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:jar
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:classes
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:jar
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:compileKotlin
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:classes
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:jar
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:compileKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt:9:24 'var targetSdk: Int?' is deprecated. Will be removed from library DSL in v9.0. Use testOptions.targetSdk or/and lint.targetSdk instead.
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:classes
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:jar
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:compileKotlin
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:classes
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:jar
[RUN_GRADLEW] > Configure project :
[RUN_GRADLEW] [ExpoRootProject] Using the following versions:
[RUN_GRADLEW]   - buildTools:  36.0.0
[RUN_GRADLEW]   - minSdk:      24
[RUN_GRADLEW]   - compileSdk:  36
[RUN_GRADLEW]   - targetSdk:   36
[RUN_GRADLEW]   - ndk:         27.1.12297006
[RUN_GRADLEW] - kotlin:      2.1.20
[RUN_GRADLEW]   - ksp:         2.1.20-2.0.1
[RUN_GRADLEW] > Configure project :app
[RUN_GRADLEW]  ℹ️  Applying gradle plugin 'expo-dev-launcher-gradle-plugin'
[RUN_GRADLEW] ℹ️  Applying gradle plugin 'expo-updates-gradle-plugin'
[RUN_GRADLEW] > Configure project :expo
[RUN_GRADLEW] Using expo modules
[RUN_GRADLEW]   - expo-constants (18.0.13)
[RUN_GRADLEW] - expo-dev-client (6.0.20)
[RUN_GRADLEW]   - expo-dev-launcher (6.0.20)
[RUN_GRADLEW]   - expo-dev-menu (7.0.18)
[RUN_GRADLEW] - expo-dev-menu-interface (2.0.0)
[RUN_GRADLEW] - expo-eas-client (1.0.8)
[RUN_GRADLEW] - expo-json-utils (0.15.0)
[RUN_GRADLEW] - expo-manifests (1.0.10)
[RUN_GRADLEW] - expo-modules-core (3.0.29)
[RUN_GRADLEW] - expo-structured-headers (5.0.0)
[RUN_GRADLEW] - expo-updates (29.0.16)
[RUN_GRADLEW] - expo-updates-interface (2.0.0)
[RUN_GRADLEW] - [📦] expo-application (7.0.8)
[RUN_GRADLEW]   - [📦] expo-asset (12.0.12)
[RUN_GRADLEW]   - [📦] expo-audio (1.1.1)
[RUN_GRADLEW]   - [📦] expo-blur (15.0.8)
[RUN_GRADLEW] - [📦] expo-clipboard (8.0.8)
[RUN_GRADLEW]   - [📦] expo-crypto (15.0.8)
[RUN_GRADLEW]   - [📦] expo-device (8.0.10)
[RUN_GRADLEW]   - [📦] expo-document-picker (14.0.8)
[RUN_GRADLEW]   - [📦] expo-file-system (19.0.21)
[RUN_GRADLEW]   - [📦] expo-font (14.0.11)
[RUN_GRADLEW]   - [📦] expo-haptics (15.0.8)
[RUN_GRADLEW]   - [📦] expo-image-loader (6.0.0)
[RUN_GRADLEW]   - [📦] expo-image-manipulator (14.0.8)
[RUN_GRADLEW]   - [📦] expo-image-picker (17.0.10)
[RUN_GRADLEW]   - [📦] expo-intent-launcher (13.0.8)
[RUN_GRADLEW]   - [📦] expo-keep-awake (15.0.8)
[RUN_GRADLEW]   - [📦] expo-linear-gradient (15.0.8)
[RUN_GRADLEW] - [📦] expo-linking (8.0.11)
[RUN_GRADLEW]   - [📦] expo-localization (17.0.8)
[RUN_GRADLEW]   - [📦] expo-location (19.0.8)
[RUN_GRADLEW]   - [📦] expo-media-library (18.2.1)
[RUN_GRADLEW]   - [📦] expo-notifications (0.32.16)
[RUN_GRADLEW]   - [📦] expo-secure-store (15.0.8)
[RUN_GRADLEW]   - [📦] expo-sharing (14.0.8)
[RUN_GRADLEW]   - [📦] expo-web-browser (15.0.10)
[RUN_GRADLEW] > Configure project :react-native-firebase_app
[RUN_GRADLEW] :react-native-firebase_app package.json found at /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/app/package.json
[RUN_GRADLEW] :react-native-firebase_app:firebase.bom using default value: 34.8.0
[RUN_GRADLEW] :react-native-firebase_app:play.play-services-auth using default value: 21.4.0
[RUN_GRADLEW] :react-native-firebase_app package.json found at /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/app/package.json
[RUN_GRADLEW] :react-native-firebase_app:version set from package.json: 23.8.6 (23,8,6 - 23008006)
[RUN_GRADLEW] :react-native-firebase_app:android.compileSdk using custom value: 36
[RUN_GRADLEW] :react-native-firebase_app:android.targetSdk using custom value: 36
[RUN_GRADLEW] :react-native-firebase_app:android.minSdk using custom value: 24
[RUN_GRADLEW] :react-native-firebase_app:reactNativeAndroidDir /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native
[RUN_GRADLEW] > Configure project :react-native-firebase_auth
[RUN_GRADLEW] :react-native-firebase_auth package.json found at /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/auth/package.json
[RUN_GRADLEW] :react-native-firebase_app package.json found at /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/app/package.json
[RUN_GRADLEW] :react-native-firebase_auth:firebase.bom using default value: 34.8.0
[RUN_GRADLEW] :react-native-firebase_auth package.json found at /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/auth/package.json
[RUN_GRADLEW] :react-native-firebase_auth:version set from package.json: 23.8.6 (23,8,6 - 23008006)
[RUN_GRADLEW] :react-native-firebase_auth:android.compileSdk using custom value: 36
[RUN_GRADLEW] :react-native-firebase_auth:android.targetSdk using custom value: 36
[RUN_GRADLEW] :react-native-firebase_auth:android.minSdk using custom value: 24
[RUN_GRADLEW] :react-native-firebase_auth:reactNativeAndroidDir /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native
[RUN_GRADLEW] > Configure project :react-native-firebase_database
[RUN_GRADLEW] :react-native-firebase_database package.json found at /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/database/package.json
[RUN_GRADLEW] :react-native-firebase_app package.json found at /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/app/package.json
[RUN_GRADLEW] :react-native-firebase_database:firebase.bom using default value: 34.8.0
[RUN_GRADLEW] :react-native-firebase_database package.json found at /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/database/package.json
[RUN_GRADLEW] :react-native-firebase_database:version set from package.json: 23.8.6 (23,8,6 - 23008006)
[RUN_GRADLEW] :react-native-firebase_database:android.compileSdk using custom value: 36
[RUN_GRADLEW] :react-native-firebase_database:android.targetSdk using custom value: 36
[RUN_GRADLEW] :react-native-firebase_database:android.minSdk using custom value: 24
[RUN_GRADLEW] :react-native-firebase_database:reactNativeAndroidDir /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native
[RUN_GRADLEW] > Task :app:createBundleReleaseJsAndAssets
[RUN_GRADLEW] Starting Metro Bundler
[RUN_GRADLEW] warning: Bundler cache is empty, rebuilding (this may take a minute)
[RUN_GRADLEW] Android ./index.js ▓▓░░░░░░░░░░░░░░ 16.0% ( 32/317)
[RUN_GRADLEW] Android ./index.js ▓▓░░░░░░░░░░░░░░ 16.0% (210/565)
[RUN_GRADLEW] Android ./index.js ▓▓▓░░░░░░░░░░░░░ 22.2% (367/779)
[RUN_GRADLEW] Android ./index.js ▓▓▓▓▓▓▓▓░░░░░░░░ 52.5% ( 851/1174)
[RUN_GRADLEW] Android ./index.js ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 78.9% (1326/1493)
[RUN_GRADLEW] Android ./index.js ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ 96.0% (1935/1975)
[RUN_GRADLEW] Android Bundled 20948ms index.js (2011 modules)
[RUN_GRADLEW] Writing bundle output to: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle
[RUN_GRADLEW] Writing sourcemap output to: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map
[RUN_GRADLEW] Copying 40 asset files
[RUN_GRADLEW] Done writing bundle output
[RUN_GRADLEW] Done writing sourcemap output
[RUN_GRADLEW] > Task :app:generateAutolinkingNewArchitectureFiles
[RUN_GRADLEW] > Task :app:generateAutolinkingPackageList
[RUN_GRADLEW] > Task :app:generateCodegenSchemaFromJavaScript SKIPPED
[RUN_GRADLEW] > Task :app:generateCodegenArtifactsFromSchema SKIPPED
[RUN_GRADLEW] > Task :app:generateReactNativeEntryPoint
[RUN_GRADLEW] > Task :expo:generatePackagesList
[RUN_GRADLEW] > Task :expo:preBuild
[RUN_GRADLEW] > Task :expo-constants:createExpoConfig
[RUN_GRADLEW] > Task :expo-constants:preBuild
[RUN_GRADLEW] > Task :expo-dev-client:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-launcher:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-eas-client:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-json-utils:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-manifests:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-modules-core:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-structured-headers:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates-interface:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:preBuild
[RUN_GRADLEW] > Task :react-native-community_slider:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-community_slider:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-community_slider:preBuild
[RUN_GRADLEW] > Task :react-native-firebase_app:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-firebase_auth:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-firebase_database:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-gesture-handler:preBuild
[RUN_GRADLEW] > Task :react-native-picker_picker:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-picker_picker:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-picker_picker:preBuild
[RUN_GRADLEW] > Task :react-native-reanimated:assertMinimalReactNativeVersionTask
[RUN_GRADLEW] > Task :react-native-reanimated:assertNewArchitectureEnabledTask SKIPPED
[RUN_GRADLEW] > Task :react-native-reanimated:assertWorkletsVersionTask
[RUN_GRADLEW] > Task :react-native-reanimated:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-reanimated:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-reanimated:prepareReanimatedHeadersForPrefabs
[RUN_GRADLEW] > Task :react-native-reanimated:preBuild
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-safe-area-context:preBuild
[RUN_GRADLEW] > Task :react-native-screens:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-screens:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-screens:preBuild
[RUN_GRADLEW] > Task :react-native-view-shot:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-view-shot:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-view-shot:preBuild
[RUN_GRADLEW] > Task :react-native-webview:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-webview:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-webview:preBuild
[RUN_GRADLEW] > Task :react-native-worklets:assertMinimalReactNativeVersionTask
[RUN_GRADLEW] > Task :react-native-worklets:assertNewArchitectureEnabledTask SKIPPED
[RUN_GRADLEW] > Task :react-native-worklets:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-worklets:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-worklets:prepareWorkletsHeadersForPrefabs
[RUN_GRADLEW] > Task :react-native-worklets:preBuild
[RUN_GRADLEW] > Task :app:preBuild
[RUN_GRADLEW] > Task :app:preReleaseBuild
[RUN_GRADLEW] > Task :app:generateReleaseResValues
[RUN_GRADLEW] > Task :app:processReleaseGoogleServices
[RUN_GRADLEW] > Task :expo:preReleaseBuild
[RUN_GRADLEW] > Task :expo:generateReleaseResValues
[RUN_GRADLEW] > Task :expo:generateReleaseResources
[RUN_GRADLEW] > Task :expo:packageReleaseResources
[RUN_GRADLEW] > Task :expo-constants:preReleaseBuild
[RUN_GRADLEW] > Task :expo-constants:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-constants:generateReleaseResources
[RUN_GRADLEW] > Task :expo-constants:packageReleaseResources
[RUN_GRADLEW] > Task :expo-dev-client:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-client:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-dev-client:generateReleaseResources
[RUN_GRADLEW] > Task :expo-dev-client:packageReleaseResources
[RUN_GRADLEW] > Task :expo-dev-launcher:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-launcher:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-dev-launcher:generateReleaseResources
[RUN_GRADLEW] > Task :expo-dev-launcher:packageReleaseResources
[RUN_GRADLEW] > Task :expo-dev-menu:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-dev-menu:generateReleaseResources
[RUN_GRADLEW] > Task :expo-dev-menu:packageReleaseResources
[RUN_GRADLEW] > Task :expo-dev-menu-interface:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateReleaseResources
[RUN_GRADLEW] > Task :expo-dev-menu-interface:packageReleaseResources
[RUN_GRADLEW] > Task :expo-eas-client:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-eas-client:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-eas-client:generateReleaseResources
[RUN_GRADLEW] > Task :expo-eas-client:packageReleaseResources
[RUN_GRADLEW] > Task :expo-json-utils:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-json-utils:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-json-utils:generateReleaseResources
[RUN_GRADLEW] > Task :expo-json-utils:packageReleaseResources
[RUN_GRADLEW] > Task :expo-manifests:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-manifests:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-manifests:generateReleaseResources
[RUN_GRADLEW] > Task :expo-manifests:packageReleaseResources
[RUN_GRADLEW] > Task :expo-modules-core:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-modules-core:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-modules-core:generateReleaseResources
[RUN_GRADLEW] > Task :expo-modules-core:packageReleaseResources
[RUN_GRADLEW] > Task :expo-structured-headers:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-structured-headers:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-structured-headers:generateReleaseResources
[RUN_GRADLEW] > Task :expo-structured-headers:packageReleaseResources
[RUN_GRADLEW] > Task :expo-updates:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-updates:generateReleaseResources
[RUN_GRADLEW] > Task :expo-updates:packageReleaseResources
[RUN_GRADLEW] > Task :expo-updates-interface:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates-interface:generateReleaseResValues
[RUN_GRADLEW] > Task :expo-updates-interface:generateReleaseResources
[RUN_GRADLEW] > Task :expo-updates-interface:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-community_slider:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-community_slider:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-community_slider:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-community_slider:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-firebase_app:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-firebase_app:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-firebase_app:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-firebase_app:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-firebase_auth:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-firebase_auth:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-firebase_auth:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-firebase_auth:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-firebase_database:preReleaseBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-firebase_database:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-firebase_database:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-firebase_database:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-picker_picker:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-picker_picker:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-picker_picker:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-picker_picker:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-reanimated:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-reanimated:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-reanimated:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-reanimated:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-safe-area-context:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-safe-area-context:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-screens:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-screens:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-screens:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-screens:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-view-shot:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-view-shot:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-view-shot:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-view-shot:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-webview:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-webview:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-webview:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-webview:packageReleaseResources
[RUN_GRADLEW] > Task :react-native-worklets:preReleaseBuild
[RUN_GRADLEW] > Task :react-native-worklets:generateReleaseResValues
[RUN_GRADLEW] > Task :react-native-worklets:generateReleaseResources
[RUN_GRADLEW] > Task :react-native-worklets:packageReleaseResources
[RUN_GRADLEW] > Task :app:mapReleaseSourceSetPaths
[RUN_GRADLEW] > Task :app:generateReleaseResources
[RUN_GRADLEW] > Task :app:createReleaseCompatibleScreenManifests
[RUN_GRADLEW] > Task :app:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo:processReleaseManifest
[RUN_GRADLEW] > Task :expo-constants:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-constants:processReleaseManifest
[RUN_GRADLEW] > Task :expo-dev-client:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-dev-client:processReleaseManifest
[RUN_GRADLEW] > Task :expo-dev-launcher:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:processReleaseManifest
[RUN_GRADLEW] > Task :expo-dev-menu:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-dev-menu:processReleaseManifest
[RUN_GRADLEW] > Task :expo-dev-menu-interface:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-dev-menu-interface:processReleaseManifest
[RUN_GRADLEW] > Task :app:mergeReleaseResources
[RUN_GRADLEW] > Task :expo-eas-client:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-json-utils:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-eas-client:processReleaseManifest
[RUN_GRADLEW] > Task :expo-manifests:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-json-utils:processReleaseManifest
[RUN_GRADLEW] > Task :expo-modules-core:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-manifests:processReleaseManifest
[RUN_GRADLEW] > Task :expo-structured-headers:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-modules-core:processReleaseManifest
[RUN_GRADLEW] /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
[RUN_GRADLEW]   meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
[RUN_GRADLEW] > Task :expo-updates:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-structured-headers:processReleaseManifest
[RUN_GRADLEW] > Task :expo-updates-interface:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-updates:processReleaseManifest
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:extractDeepLinksRelease
[RUN_GRADLEW] > Task :expo-updates-interface:processReleaseManifest
[RUN_GRADLEW] > Task :react-native-community_slider:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:processReleaseManifest
[RUN_GRADLEW] package="com.reactnativecommunity.asyncstorage" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="com.reactnativecommunity.asyncstorage" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-firebase_app:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-community_slider:processReleaseManifest
[RUN_GRADLEW] package="com.reactnativecommunity.slider" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-community/slider/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="com.reactnativecommunity.slider" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-community/slider/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-firebase_auth:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-firebase_app:processReleaseManifest
[RUN_GRADLEW] package="io.invertase.firebase" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/app/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="io.invertase.firebase" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/app/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-firebase_database:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-firebase_auth:processReleaseManifest
[RUN_GRADLEW] package="io.invertase.firebase.auth" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/auth/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="io.invertase.firebase.auth" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/auth/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-gesture-handler:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-firebase_database:processReleaseManifest
[RUN_GRADLEW] package="io.invertase.firebase.database" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/database/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="io.invertase.firebase.database" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/database/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-gesture-handler:processReleaseManifest
[RUN_GRADLEW] > Task :react-native-picker_picker:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-reanimated:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-picker_picker:processReleaseManifest
[RUN_GRADLEW] package="com.reactnativecommunity.picker" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-picker/picker/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="com.reactnativecommunity.picker" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-picker/picker/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-reanimated:processReleaseManifest
[RUN_GRADLEW] > Task :react-native-safe-area-context:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-screens:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-safe-area-context:processReleaseManifest
[RUN_GRADLEW] package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-screens:processReleaseManifest
[RUN_GRADLEW] > Task :react-native-view-shot:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-webview:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-view-shot:processReleaseManifest
[RUN_GRADLEW] package="fr.greweb.reactnativeviewshot" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-view-shot/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="fr.greweb.reactnativeviewshot" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-view-shot/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-worklets:extractDeepLinksRelease
[RUN_GRADLEW] > Task :react-native-webview:processReleaseManifest
[RUN_GRADLEW] > Task :react-native-worklets:processReleaseManifest
[RUN_GRADLEW] > Task :expo:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :app:processReleaseMainManifest
[RUN_GRADLEW] /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/app/src/main/AndroidManifest.xml Warning:
[RUN_GRADLEW]   provider#expo.modules.filesystem.FileSystemFileProvider@android:authorities was tagged at AndroidManifest.xml:0 to replace other declarations but no other declaration present
[RUN_GRADLEW] /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/app/src/main/AndroidManifest.xml Warning:
[RUN_GRADLEW]   activity#expo.modules.imagepicker.ExpoCropImageActivity@android:exported was tagged at AndroidManifest.xml:0 to replace other declarations but no other declaration present
[RUN_GRADLEW] > Task :app:processReleaseManifest
[RUN_GRADLEW] > Task :app:processApplicationManifestReleaseForBundle
[RUN_GRADLEW] > Task :expo-constants:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-dev-client:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-dev-launcher:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-dev-menu:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-dev-menu-interface:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-eas-client:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-json-utils:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-manifests:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-modules-core:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-structured-headers:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-updates:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :expo-updates-interface:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-community_slider:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-firebase_app:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-firebase_auth:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-firebase_database:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-gesture-handler:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-picker_picker:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-reanimated:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-safe-area-context:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-screens:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-view-shot:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-webview:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :react-native-worklets:writeReleaseAarMetadata
[RUN_GRADLEW] > Task :app:packageReleaseResources
[RUN_GRADLEW] > Task :app:checkReleaseAarMetadata
[RUN_GRADLEW] > Task :app:processReleaseManifestForPackage
[RUN_GRADLEW] > Task :expo:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo:parseReleaseLocalResources
[RUN_GRADLEW] > Task :app:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-constants:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-constants:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-constants:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-dev-client:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-dev-client:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-dev-launcher:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-dev-client:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-dev-launcher:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-dev-menu:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-dev-launcher:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-dev-menu:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-dev-menu-interface:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-dev-menu:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-dev-menu-interface:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-eas-client:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-eas-client:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-json-utils:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-eas-client:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-json-utils:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-manifests:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-json-utils:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-manifests:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-modules-core:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-manifests:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-modules-core:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-structured-headers:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-modules-core:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-structured-headers:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-updates:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-structured-headers:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-updates:parseReleaseLocalResources
[RUN_GRADLEW] > Task :expo-updates-interface:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-updates:generateReleaseRFile
[RUN_GRADLEW] > Task :expo-updates-interface:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :expo-updates-interface:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-community_slider:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-community_slider:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-firebase_app:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-community_slider:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-firebase_app:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-firebase_auth:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-firebase_app:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-firebase_auth:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-firebase_database:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-firebase_auth:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-firebase_database:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-firebase_database:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-gesture-handler:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-picker_picker:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-picker_picker:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-reanimated:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-picker_picker:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-reanimated:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-safe-area-context:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-reanimated:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-safe-area-context:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-screens:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-screens:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-view-shot:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-screens:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-view-shot:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-webview:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-view-shot:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-webview:parseReleaseLocalResources
[RUN_GRADLEW] > Task :react-native-worklets:compileReleaseLibraryResources
[RUN_GRADLEW] > Task :react-native-webview:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-worklets:parseReleaseLocalResources
[RUN_GRADLEW] > Task :app:extractReleaseVersionControlInfo
[RUN_GRADLEW] > Task :react-native-gesture-handler:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-worklets:generateReleaseRFile
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-reanimated:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-reanimated:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-worklets:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-worklets:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-worklets:compileReleaseJavaWithJavac
[RUN_GRADLEW] Note: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-worklets/android/src/main/java/com/swmansion/worklets/WorkletsPackage.java uses unchecked or unsafe operations.
[RUN_GRADLEW] Note: Recompile with -Xlint:unchecked for details.
[RUN_GRADLEW] > Task :app:processReleaseResources
[RUN_GRADLEW] > Task :react-native-worklets:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-reanimated:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-reanimated:bundleLibCompileToJarRelease
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] Note: Some input files use unchecked or unsafe operations.
[RUN_GRADLEW] Note: Recompile with -Xlint:unchecked for details.
[RUN_GRADLEW] > Task :app:bundleReleaseResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-safe-area-context:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-safe-area-context:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaView.kt:59:23 'val uiImplementation: UIImplementation!' is deprecated. Deprecated in Java.
[RUN_GRADLEW] > Task :react-native-safe-area-context:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-safe-area-context:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-safe-area-context:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :react-native-screens:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-screens:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-gesture-handler:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/react/RNGestureHandlerRootView.kt:41:43 The corresponding parameter in the supertype 'ReactViewGroup' is named 'ev'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] > Task :react-native-gesture-handler:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-gesture-handler:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :react-native-screens:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-webview:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-webview:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-webview:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:22:8 'object MapBuilder : Any' is deprecated. Use Kotlin's built-in collections extensions.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:82:18 'var allowFileAccessFromFileURLs: Boolean' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:83:18 'var allowUniversalAccessFromFileURLs: Boolean' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:125:21 'fun allowScanningByMediaScanner(): Unit' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:162:36 'var systemUiVisibility: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:301:14 'object MapBuilder : Any' is deprecated. Use Kotlin's built-in collections extensions.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:351:34 Condition is always 'true'.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:370:38 'var allowUniversalAccessFromFileURLs: Boolean' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:431:51 Unchecked cast of 'Any?' to 'HashMap<String, String>'.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:487:23 'var savePassword: Boolean' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:488:23 'var saveFormData: Boolean' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:558:23 'var allowFileAccessFromFileURLs: Boolean' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:603:52 'static field FORCE_DARK_ON: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:603:89 'static field FORCE_DARK_OFF: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:604:35 'static fun setForceDark(p0: @NonNull() WebSettings, p1: Int): Unit' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:613:35 'static fun setForceDarkStrategy(p0: @NonNull() WebSettings, p1: Int): Unit' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:615:39 'static field DARK_STRATEGY_PREFER_WEB_THEME_OVER_USER_AGENT_DARKENING: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:659:65 Unchecked cast of 'ArrayList<Any?>' to 'List<Map<String, String>>'.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt:680:23 'var saveFormData: Boolean' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopCustomMenuSelectionEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopCustomMenuSelectionEvent.kt:11:3 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopCustomMenuSelectionEvent.kt:22:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopCustomMenuSelectionEvent.kt:22:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopCustomMenuSelectionEvent.kt:23:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopHttpErrorEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopHttpErrorEvent.kt:11:3 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopHttpErrorEvent.kt:22:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopHttpErrorEvent.kt:22:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopHttpErrorEvent.kt:23:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingErrorEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingErrorEvent.kt:11:3 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingErrorEvent.kt:22:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingErrorEvent.kt:22:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingErrorEvent.kt:23:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingFinishEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingFinishEvent.kt:11:3 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingFinishEvent.kt:22:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingFinishEvent.kt:22:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingFinishEvent.kt:23:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingProgressEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingProgressEvent.kt:11:3 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingProgressEvent.kt:22:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingProgressEvent.kt:22:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingProgressEvent.kt:23:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingStartEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingStartEvent.kt:11:3 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingStartEvent.kt:22:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingStartEvent.kt:22:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopLoadingStartEvent.kt:23:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopMessageEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopMessageEvent.kt:10:75 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopMessageEvent.kt:21:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopMessageEvent.kt:21:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopMessageEvent.kt:22:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopNewWindowEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopNewWindowEvent.kt:11:3 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopNewWindowEvent.kt:22:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopNewWindowEvent.kt:22:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopNewWindowEvent.kt:23:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopRenderProcessGoneEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopRenderProcessGoneEvent.kt:12:3 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopRenderProcessGoneEvent.kt:23:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopRenderProcessGoneEvent.kt:23:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopRenderProcessGoneEvent.kt:24:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopShouldStartLoadWithRequestEvent.kt:5:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopShouldStartLoadWithRequestEvent.kt:10:89 'constructor<T : Event<T>>(viewTag: Int): Event<T>' is deprecated. Use constructor with explicit surfaceId instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopShouldStartLoadWithRequestEvent.kt:27:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopShouldStartLoadWithRequestEvent.kt:27:42 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/events/TopShouldStartLoadWithRequestEvent.kt:28:21 'fun receiveEvent(targetTag: Int, eventName: String, params: WritableMap?): Unit' is deprecated. Use [RCTModernEventEmitter.receiveEvent] instead.
[RUN_GRADLEW] > Task :react-native-webview:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-webview:compileReleaseJavaWithJavac
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] > Task :react-native-webview:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:compileReleaseJavaWithJavac
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] Note: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-async-storage/async-storage/android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java uses unchecked or unsafe operations.
[RUN_GRADLEW] Note: Recompile with -Xlint:unchecked for details.
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :react-native-community_slider:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-community_slider:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-community_slider:compileReleaseJavaWithJavac
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] > Task :react-native-community_slider:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :react-native-firebase_app:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-firebase_app:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-firebase_app:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-firebase_app:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_auth:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-firebase_auth:javaPreCompileRelease
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] > Task :react-native-firebase_auth:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-firebase_auth:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] Note: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/auth/android/src/main/java/io/invertase/firebase/auth/ReactNativeFirebaseAuthModule.java uses unchecked or unsafe operations.
[RUN_GRADLEW] Note: Recompile with -Xlint:unchecked for details.
[RUN_GRADLEW] > Task :react-native-firebase_database:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-firebase_database:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-firebase_database:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-firebase_database:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] Note: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/@react-native-firebase/database/android/src/reactnative/java/io/invertase/firebase/database/ReactNativeFirebaseDatabaseCommon.java uses unchecked or unsafe operations.
[RUN_GRADLEW] Note: Recompile with -Xlint:unchecked for details.
[RUN_GRADLEW] > Task :react-native-screens:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:56:9 The corresponding parameter in the supertype 'BaseReactPackage' is named 'name'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:57:9 The corresponding parameter in the supertype 'BaseReactPackage' is named 'reactContext'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:70:17 'constructor(name: String, className: String, canOverrideExistingModule: Boolean, needsEagerInit: Boolean, hasConstants: Boolean, isCxxModule: Boolean, isTurboModule: Boolean): ReactModuleInfo' is deprecated. This constructor is deprecated and will be removed in the future. Use ReactModuleInfo(String, String, boolean, boolean, boolean, boolean)].
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:48:77 Unchecked cast of '(CoordinatorLayout.Behavior<View!>?..CoordinatorLayout.Behavior<*>?)' to 'BottomSheetBehavior<Screen>'.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:383:36 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:402:36 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:420:36 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:437:36 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:217:31 'var targetElevation: Float' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:220:13 'fun setHasOptionsMenu(p0: Boolean): Unit' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:397:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:404:22 'fun onPrepareOptionsMenu(p0: Menu): Unit' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:407:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:412:22 'fun onCreateOptionsMenu(p0: Menu, p1: MenuInflater): Unit' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfig.kt:435:18 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:203:14 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:220:14 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:237:14 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:246:14 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:55:42 'fun replaceSystemWindowInsets(p0: Int, p1: Int, p2: Int, p3: Int): WindowInsetsCompat' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:56:39 'val systemWindowInsetLeft: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:58:39 'val systemWindowInsetRight: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:59:39 'val systemWindowInsetBottom: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:102:53 'var statusBarColor: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:106:37 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:113:48 'var statusBarColor: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:116:32 'var statusBarColor: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:162:49 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:43 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:72 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:224:16 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:241:55 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:283:13 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:285:13 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:289:13 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:290:13 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:354:42 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:356:48 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:359:57 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:360:63 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:7:8 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:25:13 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:32:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'left'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:33:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'top'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:34:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'right'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:35:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'bottom'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:71:9 The corresponding parameter in the supertype 'RootView' is named 'childView'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:72:9 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:79:46 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:83:9 The corresponding parameter in the supertype 'RootView' is named 'childView'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:84:9 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:95:34 The corresponding parameter in the supertype 'RootView' is named 't'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:63:9 The corresponding parameter in the supertype 'ReactCompoundView' is named 'touchX'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:64:9 The corresponding parameter in the supertype 'ReactCompoundView' is named 'touchY'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:68:9 The corresponding parameter in the supertype 'ReactCompoundViewGroup' is named 'touchX'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:69:9 The corresponding parameter in the supertype 'ReactCompoundViewGroup' is named 'touchY'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/gamma/tabs/TabsHostViewManager.kt:37:9 The corresponding parameter in the supertype 'TabsHostViewManager' is named 'view'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] > Task :react-native-screens:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-firebase_app:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :react-native-screens:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :react-native-picker_picker:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-picker_picker:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-picker_picker:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-picker_picker:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] > Task :expo:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-constants:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-constants:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-modules-core:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-modules-core:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-modules-core:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-constants:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-dev-client:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-dev-client:dataBindingMergeDependencyArtifactsRelease
[RUN_GRADLEW] > Task :expo-dev-client:dataBindingGenBaseClassesRelease
[RUN_GRADLEW] > Task :expo-dev-client:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-dev-client:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-dev-launcher:dataBindingMergeDependencyArtifactsRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:dataBindingGenBaseClassesRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-dev-launcher:checkApolloVersions
[RUN_GRADLEW] > Task :expo-dev-launcher:generateServiceApolloOptions
[RUN_GRADLEW] > Task :expo-dev-launcher:generateServiceApolloSources
[RUN_GRADLEW] w: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/graphql/GetBranches.graphql: (21, 11): Apollo: Use of deprecated field `runtimeVersion`
[RUN_GRADLEW] w: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/graphql/GetBranches.graphql: (34, 3): Apollo: Variable `platform` is unused
[RUN_GRADLEW] w: /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/graphql/GetUpdates.graphql: (14, 11): Apollo: Use of deprecated field `runtimeVersion`
[RUN_GRADLEW] > Task :expo-dev-menu:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-dev-menu:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-dev-menu-interface:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-dev-menu-interface:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-json-utils:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-json-utils:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-json-utils:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-manifests:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-manifests:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-manifests:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-dev-menu:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-updates-interface:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-updates-interface:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-updates-interface:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-eas-client:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-eas-client:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-eas-client:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-structured-headers:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-structured-headers:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-structured-headers:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo-updates:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-updates:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :expo-updates:javaPreCompileRelease
[RUN_GRADLEW] > Task :expo:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-reanimated:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :react-native-view-shot:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-view-shot:javaPreCompileRelease
[RUN_GRADLEW] > Task :react-native-view-shot:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :react-native-view-shot:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] > Task :react-native-worklets:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :app:checkReleaseDuplicateClasses
[RUN_GRADLEW] > Task :app:buildKotlinToolingMetadata
[RUN_GRADLEW] > Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :app:generateReleaseBuildConfig
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-community_slider:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_auth:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_database:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-gesture-handler:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-picker_picker:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-safe-area-context:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-screens:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-view-shot:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :react-native-webview:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :app:javaPreCompileRelease
[RUN_GRADLEW] > Task :app:desugarReleaseFileDependencies
[RUN_GRADLEW] > Task :app:mergeReleaseStartupProfile
[RUN_GRADLEW] > Task :expo-modules-core:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:48:87 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:91:85 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:120:83 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/apploader/AppLoaderProvider.kt:34:52 Unchecked cast of 'Class<*>!' to 'Class<out HeadlessAppLoader>'.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:30:8 'typealias ErrorManagerModule = JSLoggerModule' is deprecated. Use JSLoggerModule instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:253:21 'typealias ErrorManagerModule = JSLoggerModule' is deprecated. Use JSLoggerModule instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:343:21 'val DEFAULT: Int' is deprecated. UIManagerType.DEFAULT will be deleted in the next release of React Native. Use [LEGACY] instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/defaultmodules/NativeModulesProxyModule.kt:16:5 'fun Constants(legacyConstantsProvider: () -> Map<String, Any?>): Unit' is deprecated. Use `Constant` or `Property` instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/PromiseImpl.kt:65:51 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/PromiseImpl.kt:69:22 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewDefinitionBuilder.kt:464:16 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewDefinitionBuilder.kt:464:30 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewManagerDefinition.kt:41:16 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewManagerDefinition.kt:41:30 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
[RUN_GRADLEW] > Task :app:mergeExtDexRelease
[RUN_GRADLEW] > Task :expo-modules-core:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-modules-core:bundleLibCompileToJarRelease
[RUN_GRADLEW] Note: Some input files use or override a deprecated API.
[RUN_GRADLEW] Note: Recompile with -Xlint:deprecation for details.
[RUN_GRADLEW] > Task :expo-modules-core:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-dev-client:compileReleaseKotlin NO-SOURCE
[RUN_GRADLEW] > Task :expo-constants:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-constants/android/src/main/java/expo/modules/constants/ConstantsModule.kt:12:5 'fun Constants(legacyConstantsProvider: () -> Map<String, Any?>): Unit' is deprecated. Use `Constant` or `Property` instead.
[RUN_GRADLEW] > Task :expo-dev-client:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-constants:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-constants:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-dev-client:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-dev-menu-interface:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu-interface/android/src/main/java/expo/interfaces/devmenu/DevMenuInterfacePackage.kt:14:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu-interface/android/src/main/java/expo/interfaces/devmenu/ReactHostWrapper.kt:5:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu-interface/android/src/main/java/expo/interfaces/devmenu/ReactHostWrapper.kt:19:41 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu-interface/android/src/main/java/expo/interfaces/devmenu/ReactHostWrapper.kt:20:33 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] > Task :expo-dev-menu-interface:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-dev-menu-interface:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-json-utils:compileReleaseKotlin
[RUN_GRADLEW] > Task :expo-json-utils:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-json-utils:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-manifests:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/EmbeddedManifest.kt:19:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/EmbeddedManifest.kt:19:86 'fun getLegacyID(): String' is deprecated. Prefer scopeKey or projectId depending on use case.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/ExpoUpdatesManifest.kt:16:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/Manifest.kt:13:3 Deprecations and opt-ins on a method overridden from 'Any' may not be reported.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/Manifest.kt:15:12 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] > Task :expo-manifests:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-manifests:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-updates-interface:compileReleaseKotlin
[RUN_GRADLEW] > Task :expo-updates-interface:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-updates-interface:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-eas-client:compileReleaseKotlin
[RUN_GRADLEW] > Task :expo-eas-client:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-eas-client:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-structured-headers:compileReleaseKotlin NO-SOURCE
[RUN_GRADLEW] > Task :expo-structured-headers:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-structured-headers:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-dev-menu:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu/android/src/main/java/com/facebook/react/devsupport/DevMenuSettingsBase.kt:6:8 'class PreferenceManager : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu/android/src/main/java/com/facebook/react/devsupport/DevMenuSettingsBase.kt:18:51 'class PreferenceManager : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu/android/src/main/java/com/facebook/react/devsupport/DevMenuSettingsBase.kt:18:69 'static fun getDefaultSharedPreferences(p0: Context!): SharedPreferences!' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu/android/src/main/java/com/facebook/react/devsupport/DevMenuSettingsBase.kt:51:13 This code uses error suppression for 'NOTHING_TO_OVERRIDE'. While it might compile and work, the compiler behavior is UNSPECIFIED and WILL NOT BE PRESERVED. Please report your use case to the Kotlin issue tracker instead: https://kotl.in/issue
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu/android/src/main/java/com/facebook/react/devsupport/DevMenuSettingsBase.kt:58:13 This code uses error suppression for 'NOTHING_TO_OVERRIDE'. While it might compile and work, the compiler behavior is UNSPECIFIED and WILL NOT BE PRESERVED. Please report your use case to the Kotlin issue tracker instead: https://kotl.in/issue
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu/android/src/main/java/expo/modules/devmenu/DevMenuPackage.kt:28:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu/android/src/main/java/expo/modules/devmenu/DevMenuPackage.kt:47:78 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-menu/android/src/release/java/expo/modules/devmenu/DevMenuManager.kt:80:43 The corresponding parameter in the supertype 'DevMenuManagerInterface' is named 'shouldAutoLaunch'. This may cause problems when calling this function with named arguments.
[RUN_GRADLEW] > Task :expo-dev-menu:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-dev-menu:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/DevLauncherPackage.kt:15:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/DevLauncherRecentlyOpenedAppsRegistry.kt:33:47 Unchecked cast of 'MutableMap<Any?, Any?>' to 'MutableMap<String, Any>'.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/DevLauncherRecentlyOpenedAppsRegistry.kt:51:27 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:37:23 'constructor(p0: String!, p1: Bitmap!, p2: Int): ActivityManager.TaskDescription' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:63:61 'static field FLAG_TRANSLUCENT_STATUS: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:92:45 'var systemUiVisibility: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:95:68 'static field SYSTEM_UI_FLAG_LIGHT_STATUS_BAR: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:99:67 'static field SYSTEM_UI_FLAG_LIGHT_STATUS_BAR: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:103:67 'static field SYSTEM_UI_FLAG_LIGHT_STATUS_BAR: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:107:15 'var systemUiVisibility: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:115:59 'static field FLAG_FULLSCREEN: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:116:61 'static field FLAG_FORCE_NOT_FULLSCREEN: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:118:59 'static field FLAG_FORCE_NOT_FULLSCREEN: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:119:61 'static field FLAG_FULLSCREEN: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:131:23 'fun replaceSystemWindowInsets(p0: Int, p1: Int, p2: Int, p3: Int): WindowInsets' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:132:25 'val systemWindowInsetLeft: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:134:25 'val systemWindowInsetRight: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:135:25 'val systemWindowInsetBottom: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:150:15 'var statusBarColor: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:160:63 'static field FLAG_TRANSLUCENT_NAVIGATION: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:161:25 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:171:63 'static field FLAG_TRANSLUCENT_NAVIGATION: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:175:33 'var systemUiVisibility: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:176:33 'static field SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:177:21 'var systemUiVisibility: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:190:29 'var systemUiVisibility: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:191:62 'static field SYSTEM_UI_FLAG_HIDE_NAVIGATION: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:191:101 'static field SYSTEM_UI_FLAG_FULLSCREEN: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:192:63 'static field SYSTEM_UI_FLAG_HIDE_NAVIGATION: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:192:102 'static field SYSTEM_UI_FLAG_FULLSCREEN: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:192:136 'static field SYSTEM_UI_FLAG_IMMERSIVE: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:193:70 'static field SYSTEM_UI_FLAG_HIDE_NAVIGATION: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:193:109 'static field SYSTEM_UI_FLAG_FULLSCREEN: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:193:143 'static field SYSTEM_UI_FLAG_IMMERSIVE_STICKY: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/main/java/expo/modules/devlauncher/launcher/configurators/DevLauncherExpoActivityConfigurator.kt:196:17 'var systemUiVisibility: Int' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/release/java/expo/modules/devlauncher/DevLauncherController.kt:111:81 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/release/java/expo/modules/devlauncher/launcher/DevLauncherReactNativeHost.kt:4:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-dev-launcher/android/src/release/java/expo/modules/devlauncher/launcher/DevLauncherReactNativeHost.kt:8:83 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] > Task :expo-dev-launcher:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-dev-launcher:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-dev-menu:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-dev-menu-interface:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-constants:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-dev-client:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-eas-client:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-manifests:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-json-utils:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-structured-headers:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-updates-interface:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :app:mergeReleaseShaders
[RUN_GRADLEW] > Task :app:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates:kspReleaseKotlin
[RUN_GRADLEW] > Task :app:createReleaseUpdatesResources
[RUN_GRADLEW] > Task :app:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-constants:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-constants:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-constants:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-constants:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-dev-client:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-dev-client:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-client:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-client:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-dev-launcher:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-launcher:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-dev-menu:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-dev-menu:compileReleaseShaders
[RUN_GRADLEW] NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-dev-menu-interface:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-eas-client:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-eas-client:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-eas-client:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-eas-client:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-json-utils:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-json-utils:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-json-utils:generateReleaseAssets
[RUN_GRADLEW] UP-TO-DATE
[RUN_GRADLEW] > Task :expo-json-utils:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-manifests:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-manifests:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-manifests:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-manifests:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-modules-core:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-modules-core:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-modules-core:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-modules-core:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-structured-headers:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-structured-headers:compileReleaseShaders
[RUN_GRADLEW] NO-SOURCE
[RUN_GRADLEW] > Task :expo-structured-headers:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-structured-headers:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-updates:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-updates:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates:mergeReleaseAssets
[RUN_GRADLEW] > Task :expo-updates-interface:mergeReleaseShaders
[RUN_GRADLEW] > Task :expo-updates-interface:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates-interface:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates-interface:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-community_slider:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-community_slider:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-community_slider:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-community_slider:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-firebase_app:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-firebase_app:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_app:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-firebase_app:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-firebase_auth:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-firebase_auth:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_auth:generateReleaseAssets
[RUN_GRADLEW] UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-firebase_auth:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-firebase_database:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-firebase_database:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_database:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-firebase_database:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-gesture-handler:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-picker_picker:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-picker_picker:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-reanimated:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-reanimated:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-reanimated:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-reanimated:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-safe-area-context:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-screens:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-screens:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-screens:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-screens:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-view-shot:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-view-shot:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-view-shot:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-view-shot:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-webview:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-webview:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-webview:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-webview:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-worklets:mergeReleaseShaders
[RUN_GRADLEW] > Task :react-native-worklets:compileReleaseShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-worklets:generateReleaseAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-worklets:mergeReleaseAssets
[RUN_GRADLEW] > Task :app:mergeReleaseAssets
[RUN_GRADLEW] > Task :react-native-gesture-handler:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-safe-area-context:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-screens:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-webview:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-community_slider:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_auth:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_database:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_app:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-picker_picker:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-reanimated:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-view-shot:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :react-native-worklets:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-dev-menu:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-dev-menu-interface:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-modules-core:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-updates:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/UpdatesConfiguration.kt:317:13 'fun get(p0: String!): Any?' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/UpdatesController.kt:40:39 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/UpdatesDevLauncherController.kt:195:133 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/UpdatesModule.kt:49:5 'fun Constants(legacyConstantsProvider: () -> Map<String, Any?>): Unit' is deprecated. Use `Constant` or `Property` instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/UpdatesModule.kt:98:38 'fun toString(): String' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/UpdatesPackage.kt:7:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/UpdatesPackage.kt:56:85 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/db/Converters.kt:56:30 Java type mismatch: inferred type is 'ByteArray?', but 'ByteArray' was expected.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/db/DatabaseIntegrityCheck.kt:38:39 Java type mismatch: inferred type is 'String?', but 'String' was expected.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/db/Reaper.kt:50:41 Java type mismatch: inferred type is 'String?', but 'String' was expected.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/db/Reaper.kt:68:41 Java type mismatch: inferred type is 'String?', but 'String' was expected.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/Loader.kt:246:63 Java type mismatch: inferred type is 'String?', but 'String' was expected.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/LoaderTask.kt:360:101 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/manifest/EmbeddedUpdate.kt:33:89 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/manifest/ExpoUpdatesUpdate.kt:37:92 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/CheckForUpdateProcedure.kt:141:100 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/CheckForUpdateProcedure.kt:174:100 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/RelaunchProcedure.kt:137:44 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/RestartReactAppExtensions.kt:25:3 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/StartupProcedure.kt:158:36 'fun getCurrentState(): UpdatesStateValue' is deprecated. Avoid needing to access current state to know how to transition to next state.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/StartupProcedure.kt:192:34 'fun getCurrentState(): UpdatesStateValue' is deprecated. Avoid needing to access current state to know how to transition to next state.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/StateMachineSerialExecutorQueue.kt:64:45 'fun getCurrentState(): UpdatesStateValue' is deprecated. Avoid needing to access current state to know how to transition to next state.
[RUN_GRADLEW] > Task :expo-updates:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo-updates:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :expo:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ExpoModulesPackage.kt:34:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ExpoReactHostFactory.kt:8:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ExpoReactHostFactory.kt:80:22 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:24:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:58:33 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:105:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:105:38 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:113:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:114:21 'val reactInstanceManager: ReactInstanceManager' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:168:36 'constructor(activity: Activity, reactNativeHost: ReactNativeHost?, appKey: String?, launchOptions: Bundle?, fabricEnabled: Boolean): ReactDelegate' is deprecated. Deprecated since 0.81.0, use one of the other constructors instead.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:279:77 'val reactInstanceManager: ReactInstanceManager' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:282:22 'val reactInstanceManager: ReactInstanceManager' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:286:54 'val reactInstanceManager: ReactInstanceManager' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapper.kt:6:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapper.kt:15:9 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapper.kt:47:60 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapperBase.kt:7:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapperBase.kt:16:23 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapperBase.kt:89:16 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapperBase.kt:101:38 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/fetch/ExpoFetchModule.kt:30:39 'constructor(reactContext: ReactContext): ForwardingCookieHandler' is deprecated. Use the default constructor.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/fetch/NativeResponse.kt:42:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/node_modules/expo/android/src/main/java/expo/modules/fetch/NativeResponse.kt:44:11 'fun deallocate(): Unit' is deprecated. Use sharedObjectDidRelease() instead.
[RUN_GRADLEW] > Task :expo:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :expo:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo-updates:bundleLibRuntimeToDirRelease
[RUN_GRADLEW] > Task :expo:bundleLibCompileToJarRelease
[RUN_GRADLEW] > Task :app:compileReleaseKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/app/src/main/java/com/collegecommunity/MainApplication.kt:9:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/app/src/main/java/com/collegecommunity/MainApplication.kt:21:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/app/src/main/java/com/collegecommunity/MainApplication.kt:21:33 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
[RUN_GRADLEW] > Task :app:compileReleaseJavaWithJavac
[RUN_GRADLEW] > Task :app:dexBuilderRelease
[RUN_GRADLEW] > Task :expo:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-updates:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :app:mergeDexRelease
[RUN_GRADLEW] > Task :expo-constants:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-dev-client:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-eas-client:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-manifests:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-json-utils:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-structured-headers:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :expo-updates-interface:bundleLibRuntimeToJarRelease
[RUN_GRADLEW] > Task :app:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-constants:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-dev-client:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-launcher:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-dev-menu:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-dev-menu-interface:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-eas-client:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-json-utils:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-manifests:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-modules-core:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-structured-headers:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates:processReleaseJavaRes
[RUN_GRADLEW] > Task :expo-updates-interface:processReleaseJavaRes
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-community_slider:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_app:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_auth:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_database:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-gesture-handler:processReleaseJavaRes
[RUN_GRADLEW] > Task :react-native-picker_picker:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-reanimated:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-safe-area-context:processReleaseJavaRes
[RUN_GRADLEW] > Task :react-native-screens:processReleaseJavaRes
[RUN_GRADLEW] > Task :react-native-view-shot:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-webview:processReleaseJavaRes
[RUN_GRADLEW] > Task :react-native-worklets:processReleaseJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :app:mergeReleaseGlobalSynthetics
[RUN_GRADLEW] > Task :app:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-worklets:configureCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :react-native-worklets:configureCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :react-native-worklets:generateJsonModelRelease
[RUN_GRADLEW] > Task :react-native-worklets:prefabReleaseConfigurePackage
[RUN_GRADLEW] > Task :react-native-reanimated:configureCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :react-native-reanimated:configureCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :react-native-reanimated:generateJsonModelRelease
[RUN_GRADLEW] > Task :react-native-reanimated:prefabReleaseConfigurePackage
[RUN_GRADLEW] > Task :app:configureCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :react-native-worklets:buildCMakeRelWithDebInfo[arm64-v8a][worklets]
[RUN_GRADLEW] > Task :react-native-worklets:buildCMakeRelWithDebInfo[armeabi-v7a][worklets]
[RUN_GRADLEW] > Task :react-native-worklets:externalNativeBuildRelease
[RUN_GRADLEW] > Task :react-native-worklets:prefabReleasePackage
[RUN_GRADLEW] > Task :react-native-reanimated:buildCMakeRelWithDebInfo[arm64-v8a][reanimated]
[RUN_GRADLEW] > Task :react-native-reanimated:buildCMakeRelWithDebInfo[armeabi-v7a][reanimated]
[RUN_GRADLEW] > Task :react-native-worklets:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-worklets:mergeReleaseNativeLibs
[RUN_GRADLEW] > Task :app:configureCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :app:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo:mergeReleaseNativeLibs
[RUN_GRADLEW] NO-SOURCE
[RUN_GRADLEW] > Task :expo:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-constants:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-constants:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-constants:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-client:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-worklets:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-client:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-reanimated:externalNativeBuildRelease
[RUN_GRADLEW] > Task :react-native-reanimated:prefabReleasePackage
[RUN_GRADLEW] > Task :app:buildCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :app:buildCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :expo-dev-client:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-launcher:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-menu:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-dev-menu:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-eas-client:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-eas-client:mergeReleaseNativeLibs
[RUN_GRADLEW] NO-SOURCE
[RUN_GRADLEW] > Task :expo-eas-client:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-json-utils:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-json-utils:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-json-utils:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-manifests:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-manifests:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-manifests:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-modules-core:configureCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :expo-modules-core:buildCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :expo-modules-core:configureCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :expo-modules-core:buildCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :expo-modules-core:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-structured-headers:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-structured-headers:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-structured-headers:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-updates:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-updates:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-updates-interface:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-updates-interface:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates-interface:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-community_slider:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :expo-modules-core:mergeReleaseNativeLibs
[RUN_GRADLEW] > Task :react-native-community_slider:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-community_slider:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-firebase_app:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-firebase_app:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_app:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-firebase_auth:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-firebase_auth:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_auth:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-firebase_database:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-firebase_database:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_database:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-modules-core:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-gesture-handler:configureCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :react-native-gesture-handler:buildCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :react-native-gesture-handler:configureCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :react-native-gesture-handler:buildCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeReleaseNativeLibs
[RUN_GRADLEW] NO-SOURCE
[RUN_GRADLEW] > Task :react-native-picker_picker:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeReleaseNativeLibs
[RUN_GRADLEW] > Task :react-native-reanimated:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-gesture-handler:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-safe-area-context:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-reanimated:mergeReleaseNativeLibs
[RUN_GRADLEW] > Task :react-native-screens:configureCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :react-native-reanimated:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-screens:buildCMakeRelWithDebInfo[arm64-v8a]
[RUN_GRADLEW] > Task :react-native-screens:configureCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :react-native-screens:buildCMakeRelWithDebInfo[armeabi-v7a]
[RUN_GRADLEW] > Task :react-native-screens:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-view-shot:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-screens:mergeReleaseNativeLibs
[RUN_GRADLEW] > Task :react-native-view-shot:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-view-shot:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-screens:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-webview:mergeReleaseJniLibFolders
[RUN_GRADLEW] > Task :react-native-webview:mergeReleaseNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-webview:copyReleaseJniLibsProjectOnly
[RUN_GRADLEW] > Task :app:writeReleaseAppMetadata
[RUN_GRADLEW] > Task :expo:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-constants:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-dev-client:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-dev-launcher:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-dev-menu:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-dev-menu-interface:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-eas-client:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-json-utils:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-manifests:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-modules-core:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-structured-headers:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-updates:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :expo-updates-interface:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-community_slider:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-firebase_app:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-firebase_auth:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-firebase_database:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-gesture-handler:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-picker_picker:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-reanimated:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-safe-area-context:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-screens:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-view-shot:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-webview:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :react-native-worklets:prepareReleaseArtProfile
[RUN_GRADLEW] > Task :app:mergeReleaseNativeLibs
[RUN_GRADLEW] > Task :app:mergeReleaseArtProfile
[RUN_GRADLEW] > Task :app:stripReleaseDebugSymbols
[RUN_GRADLEW] > Task :app:compileReleaseArtProfile
[RUN_GRADLEW] > Task :app:buildReleasePreBundle
[RUN_GRADLEW] > Task :app:collectReleaseDependencies
[RUN_GRADLEW] > Task :app:configureReleaseDependencies
[RUN_GRADLEW] > Task :app:extractProguardFiles
[RUN_GRADLEW] > Task :expo:createFullJarRelease
[RUN_GRADLEW] > Task :expo:extractProguardFiles
[RUN_GRADLEW] > Task :expo-constants:createFullJarRelease
[RUN_GRADLEW] > Task :expo-constants:extractProguardFiles
[RUN_GRADLEW] > Task :expo-modules-core:createFullJarRelease
[RUN_GRADLEW] > Task :expo-modules-core:extractProguardFiles
[RUN_GRADLEW] > Task :app:extractReleaseNativeSymbolTables
[RUN_GRADLEW] > Task :expo-modules-core:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-modules-core:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-constants:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-constants:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-dev-client:createFullJarRelease
[RUN_GRADLEW] > Task :expo-dev-client:extractProguardFiles
[RUN_GRADLEW] > Task :expo-dev-client:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-dev-client:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-dev-launcher:createFullJarRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:extractProguardFiles
[RUN_GRADLEW] > Task :expo-dev-menu:createFullJarRelease
[RUN_GRADLEW] > Task :expo-dev-menu:extractProguardFiles
[RUN_GRADLEW] > Task :expo-dev-menu-interface:createFullJarRelease
[RUN_GRADLEW] > Task :expo-dev-menu-interface:extractProguardFiles
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-dev-menu-interface:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-json-utils:createFullJarRelease
[RUN_GRADLEW] > Task :expo-json-utils:extractProguardFiles
[RUN_GRADLEW] > Task :expo-json-utils:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-json-utils:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-manifests:createFullJarRelease
[RUN_GRADLEW] > Task :expo-manifests:extractProguardFiles
[RUN_GRADLEW] > Task :expo-manifests:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-manifests:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-dev-menu:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-dev-menu:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-updates-interface:createFullJarRelease
[RUN_GRADLEW] > Task :expo-updates-interface:extractProguardFiles
[RUN_GRADLEW] > Task :expo-updates-interface:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-updates-interface:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-dev-launcher:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-dev-launcher:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-eas-client:createFullJarRelease
[RUN_GRADLEW] > Task :expo-eas-client:extractProguardFiles
[RUN_GRADLEW] > Task :expo-eas-client:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-eas-client:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-structured-headers:createFullJarRelease
[RUN_GRADLEW] > Task :expo-structured-headers:extractProguardFiles
[RUN_GRADLEW] > Task :expo-structured-headers:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-structured-headers:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo-updates:createFullJarRelease
[RUN_GRADLEW] > Task :expo-updates:extractProguardFiles
[RUN_GRADLEW] > Task :expo-updates:generateReleaseLintModel
[RUN_GRADLEW] > Task :expo-updates:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo:prepareLintJarForPublish
[RUN_GRADLEW] > Task :expo:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-community_slider:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-community_slider:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-community_slider:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-community_slider:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-firebase_app:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_app:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_app:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-firebase_app:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-firebase_auth:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_auth:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_auth:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-firebase_auth:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-firebase_database:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-firebase_database:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_database:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-firebase_database:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-gesture-handler:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-gesture-handler:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-reanimated:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-reanimated:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-worklets:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-worklets:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-worklets:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-worklets:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-reanimated:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-reanimated:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-gesture-handler:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-picker_picker:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-picker_picker:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-picker_picker:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-picker_picker:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-safe-area-context:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-safe-area-context:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-safe-area-context:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-screens:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-screens:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-screens:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-screens:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-view-shot:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-view-shot:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-view-shot:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-view-shot:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-webview:createFullJarRelease
[RUN_GRADLEW] > Task :react-native-webview:extractProguardFiles
[RUN_GRADLEW] > Task :react-native-webview:generateReleaseLintModel
[RUN_GRADLEW] > Task :react-native-webview:prepareLintJarForPublish
[RUN_GRADLEW] > Task :react-native-gesture-handler:stripReleaseDebugSymbols
[RUN_GRADLEW] > Task :app:generateReleaseLintVitalReportModel
[RUN_GRADLEW] > Task :react-native-gesture-handler:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-gesture-handler:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-gesture-handler:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-safe-area-context:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-safe-area-context:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-safe-area-context:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-safe-area-context:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-gesture-handler:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-gesture-handler:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-safe-area-context:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-safe-area-context:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-screens:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-screens:stripReleaseDebugSymbols
[RUN_GRADLEW] > Task :react-native-screens:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-screens:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-screens:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-screens:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-webview:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-screens:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-webview:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-screens:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-screens:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-webview:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-webview:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-webview:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-webview:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-webview:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-webview:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-webview:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-community_slider:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-community_slider:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-community_slider:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-community_slider:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-community_slider:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-community_slider:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_auth:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-community_slider:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-firebase_auth:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-community_slider:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-community_slider:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-firebase_auth:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-firebase_auth:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-firebase_auth:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_auth:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_database:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_auth:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-firebase_database:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-firebase_auth:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-firebase_auth:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-firebase_database:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-firebase_database:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-firebase_database:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_database:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_app:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_database:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-firebase_app:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-firebase_database:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-firebase_database:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-firebase_app:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-firebase_app:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-firebase_app:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-firebase_app:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-picker_picker:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-firebase_app:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-picker_picker:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-firebase_app:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-firebase_app:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-picker_picker:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-picker_picker:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-picker_picker:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-picker_picker:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-reanimated:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-reanimated:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-reanimated:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-reanimated:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-reanimated:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-reanimated:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-view-shot:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :react-native-view-shot:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-reanimated:stripReleaseDebugSymbols
[RUN_GRADLEW] > Task :react-native-view-shot:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-reanimated:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-reanimated:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :react-native-view-shot:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-view-shot:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-view-shot:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-worklets:stripReleaseDebugSymbols
[RUN_GRADLEW] > Task :react-native-worklets:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :react-native-worklets:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :react-native-worklets:extractReleaseAnnotations
[RUN_GRADLEW] > Task :react-native-worklets:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :react-native-worklets:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :react-native-worklets:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :react-native-worklets:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-worklets:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-dev-launcher:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-launcher:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-dev-launcher:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-dev-launcher:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-dev-launcher:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-dev-menu:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-dev-menu:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-dev-menu:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-dev-menu:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-dev-menu:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-dev-menu:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-dev-menu:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-dev-menu:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-dev-menu-interface:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-dev-menu-interface:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-dev-menu-interface:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-dev-menu-interface:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-dev-menu-interface:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-modules-core:stripReleaseDebugSymbols
[RUN_GRADLEW] > Task :expo-modules-core:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-modules-core:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-modules-core:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-modules-core:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-modules-core:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-modules-core:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-modules-core:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-modules-core:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-updates:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-updates:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-updates:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-updates:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-updates:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-updates:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-updates:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-updates:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-constants:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-constants:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-constants:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-constants:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-constants:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-constants:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-constants:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-constants:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-constants:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-dev-client:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-client:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-dev-client:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-dev-client:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-dev-client:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-dev-client:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-dev-client:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-dev-client:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-dev-client:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-eas-client:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-eas-client:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-eas-client:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-eas-client:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-eas-client:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-eas-client:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-eas-client:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-eas-client:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-eas-client:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-manifests:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-manifests:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-manifests:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-manifests:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-manifests:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-manifests:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-manifests:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-manifests:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-manifests:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-json-utils:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-json-utils:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-json-utils:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-json-utils:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-json-utils:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-json-utils:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-json-utils:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-json-utils:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-json-utils:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-structured-headers:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-structured-headers:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-structured-headers:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-structured-headers:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-structured-headers:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-structured-headers:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-structured-headers:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-structured-headers:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-structured-headers:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-updates-interface:stripReleaseDebugSymbols NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates-interface:copyReleaseJniLibsProjectAndLocalJars
[RUN_GRADLEW] > Task :expo-updates-interface:extractDeepLinksForAarRelease
[RUN_GRADLEW] > Task :expo-updates-interface:extractReleaseAnnotations
[RUN_GRADLEW] > Task :expo-updates-interface:mergeReleaseGeneratedProguardFiles
[RUN_GRADLEW] > Task :expo-updates-interface:mergeReleaseConsumerProguardFiles
[RUN_GRADLEW] > Task :expo-updates-interface:mergeReleaseJavaResource
[RUN_GRADLEW] > Task :expo-updates-interface:syncReleaseLibJars
[RUN_GRADLEW] > Task :expo-updates-interface:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo-constants:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-dev-client:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-dev-launcher:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-dev-menu:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-dev-menu-interface:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-view-shot:extractReleaseAnnotations
[RUN_GRADLEW] Warning: fr.greweb.reactnativeviewshot.ViewShot.Formats: The typedef annotation should have @Retention(RetentionPolicy.SOURCE)
[RUN_GRADLEW] Warning: fr.greweb.reactnativeviewshot.ViewShot.Results: The typedef annotation should have @Retention(RetentionPolicy.SOURCE)
[RUN_GRADLEW] > Task :expo-eas-client:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-json-utils:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-manifests:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-modules-core:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-structured-headers:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-updates:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-updates-interface:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-view-shot:syncReleaseLibJars
[RUN_GRADLEW] > Task :react-native-view-shot:bundleReleaseLocalLintAar
[RUN_GRADLEW] > Task :expo:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :expo-constants:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-dev-client:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-dev-launcher:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-dev-menu-interface:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-eas-client:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-dev-menu:lintVitalAnalyzeRelease
[RUN_GRADLEW] The Daemon will expire after the build after running out of JVM Metaspace.
[RUN_GRADLEW] The project memory settings are likely not configured or are configured to an insufficient value.
[RUN_GRADLEW] The daemon will restart for the next build, which may increase subsequent build times.
[RUN_GRADLEW] These settings can be adjusted by setting 'org.gradle.jvmargs' in 'gradle.properties'.
[RUN_GRADLEW] The currently configured max heap space is '2 GiB' and the configured max metaspace is '512 MiB'.
[RUN_GRADLEW] For more information on how to set these values, please refer to https://docs.gradle.org/8.14.3/userguide/build_environment.html#sec:configuring_jvm_memory in the Gradle documentation.
[RUN_GRADLEW] To disable this warning, set 'org.gradle.daemon.performance.disable-logging=true'.
[RUN_GRADLEW] > Task :expo-json-utils:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-manifests:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-structured-headers:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-updates:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-updates-interface:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo-modules-core:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-community_slider:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-community_slider:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-firebase_app:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-firebase_app:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-firebase_auth:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-firebase_auth:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-firebase_database:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-reanimated:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-worklets:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-firebase_database:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-gesture-handler:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-picker_picker:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-picker_picker:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-reanimated:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-gesture-handler:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-safe-area-context:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-safe-area-context:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-screens:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-view-shot:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-view-shot:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-webview:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :react-native-webview:writeReleaseLintModelMetadata
[RUN_GRADLEW] > Task :react-native-worklets:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :expo:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-constants:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-dev-client:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-dev-launcher:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-dev-menu:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-eas-client:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-json-utils:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-manifests:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-modules-core:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-structured-headers:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-updates:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :expo-updates-interface:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-async-storage_async-storage:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-community_slider:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-firebase_app:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-firebase_auth:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-firebase_database:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-picker_picker:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-reanimated:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-screens:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-view-shot:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-webview:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :react-native-worklets:generateReleaseLintVitalModel
[RUN_GRADLEW] > Task :app:parseReleaseIntegrityConfig
[RUN_GRADLEW] > Task :app:validateSigningRelease
[RUN_GRADLEW] > Task :react-native-screens:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :app:lintVitalAnalyzeRelease
[RUN_GRADLEW] > Task :app:lintVitalReportRelease
[RUN_GRADLEW] > Task :app:lintVitalRelease
[RUN_GRADLEW] > Task :app:packageReleaseBundle
[RUN_GRADLEW] > Task :app:signReleaseBundle
[RUN_GRADLEW] > Task :app:produceReleaseBundleIdeListingFile
[RUN_GRADLEW] > Task :app:createReleaseBundleListingFileRedirect
[RUN_GRADLEW] > Task :app:bundleRelease
[RUN_GRADLEW] [Incubating] Problems report is available at: file:///tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/build/reports/problems/problems-report.html
[RUN_GRADLEW] Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
[RUN_GRADLEW] You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
[RUN_GRADLEW] For more on this, please refer to https://docs.gradle.org/8.14.3/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
[RUN_GRADLEW] BUILD SUCCESSFUL in 11m 21s
[RUN_GRADLEW] 1106 actionable tasks: 1106 executed
[UPLOAD_APPLICATION_ARCHIVE] Application archives:
[UPLOAD_APPLICATION_ARCHIVE]   - /tmp/rekan/eas-build-local-nodejs/030f0065-1f89-4b7a-a888-f55027a58ea6/build/android/app/build/outputs/bundle/release/app-release.aab (53.1 MB)
[UPLOAD_APPLICATION_ARCHIVE] Uploading application archive...
[PREPARE_ARTIFACTS] Preparing artifacts
[PREPARE_ARTIFACTS] Writing artifacts to /mnt/c/Users/rekan/OneDrive/Desktop/college-community/build-1772013742663.aab
[SAVE_CACHE] Local builds do not support saving cache.

Build successful
You can find the build artifacts in /mnt/c/Users/rekan/OneDrive/Desktop/college-community/build-1772013742663.aab
rekan@Rekan:/mnt/c/Users/rekan/OneDrive/Desktop/college-community$