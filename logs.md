rekan@Rekan:~$ cd /mnt/c/Users/rekan/OneDrive/Desktop/college-community
rekan@Rekan:/mnt/c/Users/rekan/OneDrive/Desktop/college-community$ eas build --local --profile development
✔ Select platform › Android
Resolved "development" environment for the build. Learn more: https://docs.expo.dev/eas/environment-variables/#setting-the-environment-for-your-builds
Environment variables with visibility "Plain text" and "Sensitive" loaded from the "development" environment on EAS: APPWRITE_API_KEY, APPWRITE_SUGGESTIONS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_AI_FUNCTION_ENDPOINT, EXPO_PUBLIC_APPWRITE_AI_FUNCTION_ID, EXPO_PUBLIC_APPWRITE_BUCKET_ID, EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_DATABASE_ID, EXPO_PUBLIC_APPWRITE_ENDPOINT, EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_LECTURE_CHANNELS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_LECTURE_STORAGE_ID, EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_PROJECT_ID, EXPO_PUBLIC_APPWRITE_PROJECT_NAME, EXPO_PUBLIC_APPWRITE_PUSH_PROVIDER_ID_ANDROID, EXPO_PUBLIC_APPWRITE_PUSH_PROVIDER_ID_IOS, EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_REP_ELECTIONS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_REP_VOTES_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_STORAGE_ID, EXPO_PUBLIC_APPWRITE_SUGGESTIONS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_VOICE_MESSAGES_STORAGE_ID, EXPO_PUBLIC_GIPHY_API_KEY, EXPO_PUBLIC_GIPHY_API_KEY_IOS, EXPO_PUBLIC_IMGBB_API_KEY, EXPO_PUBLIC_LECTURE_GUARD_ENDPOINT, EXPO_PUBLIC_REPORT_REVIEW_ENDPOINT, EXPO_PUBLIC_YOUTUBE_API_KEY.

android.versionCode field in app config is ignored when version source is set to remote, but this value will still be in the manifest available via expo-constants. It's recommended to remove this value from app config.
✔ Using remote Android credentials (Expo server)
✔ Using Keystore from configuration: Build Credentials doM9LDdnjy (default)
✔ Compressed project files 29s (8.8 MB)
⌛️ Computing the project fingerprint is taking longer than expected...
⏩ To skip this step, set the environment variable: EAS_SKIP_AUTO_FINGERPRINT=1
✔ Computed project fingerprint
ANDROID_NDK_HOME environment variable was not specified, continuing build without NDK
[SETUP_WORKINGDIR] Preparing workingdir /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065
[START_BUILD] Starting build
  "job": {
    "type": "managed",
    "platform": "android",
    "projectRootDirectory": ".",
    "projectArchive": {
      "type": "PATH",
      "path": "/tmp/rekan/eas-cli-nodejs/a76fba87-b4af-4a92-a85a-3cba65173cc8.tar.gz"
    },
    "builderEnvironment": {
      "env": {}
    },
    "cache": {
      "disabled": false,
      "paths": [],
      "clear": false
    },
    "updates": {},
    "developmentClient": true,
    "buildType": "apk",
    "username": "rekankoye",
    "version": {
      "versionCode": "10"
    },
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
    "appVersionSource": "remote"
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
      "autoIncrement": true,
      "env": {
        "NODE_ENV": "production",
        "SENTRY_DISABLE_AUTO_UPLOAD": "true"
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
    "publish:prod": "eas update --branch native-app --channel production",
    "audit:acl": "node scripts/appwriteAclAudit.js",
    "fix:users-acl": "node scripts/fixUsersReadAcl.js",
    "fix:lectures-acl": "node scripts/fixLectureAcl.js",
    "fix:interactive-acl": "node scripts/fixInteractiveAcl.js",
    "fix:chat-acl": "node scripts/fixChatAcl.js",
    "setup:suggestions-collection": "node scripts/createSuggestionsCollection.js",
    "prebuild": "node scripts/incrementVersionCode.js",
    "lint": "expo lint"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@giphy/js-fetch-api": "^5.7.0",
    "@react-native-community/slider": "5.1.2",
    "@react-native-picker/picker": "2.11.4",
    "@react-navigation/bottom-tabs": "^7.4.9",
    "@react-navigation/native": "^7.1.18",
    "@react-navigation/stack": "^7.4.10",
    "@shopify/flash-list": "^2.1.0",
    "@sentry/react-native": "^8.2.0",
    "appwrite": "^21.5.0",
    "expo": "^55.0.0",
    "expo-asset": "~55.0.8",
    "expo-audio": "~55.0.8",
    "expo-auth-session": "~55.0.7",
    "expo-blur": "~55.0.8",
    "expo-build-properties": "~55.0.9",
    "expo-clipboard": "~55.0.8",
    "expo-constants": "~55.0.7",
    "expo-crypto": "~55.0.9",
    "expo-dev-client": "~55.0.11",
    "expo-device": "~55.0.9",
    "expo-document-picker": "~55.0.8",
    "expo-file-system": "~55.0.10",
    "expo-font": "~55.0.4",
    "expo-haptics": "~55.0.8",
    "expo-image-manipulator": "~55.0.9",
    "expo-image-picker": "~55.0.11",
    "expo-intent-launcher": "~55.0.8",
    "expo-linear-gradient": "~55.0.8",
    "expo-linking": "~55.0.7",
    "expo-localization": "~55.0.8",
    "expo-location": "~55.1.2",
    "expo-media-library": "~55.0.9",
    "expo-notifications": "~55.0.11",
    "expo-secure-store": "~55.0.8",
    "expo-sharing": "~55.0.11",
    "expo-status-bar": "~55.0.4",
    "expo-updates": "~55.0.12",
    "expo-video": "^55.0.10",
    "expo-web-browser": "~55.0.9",
    "i18next": "^25.5.2",
    "i18next-resources-to-backend": "^1.2.1",
    "react": "19.2.0",
    "react-i18next": "^16.2.4",
    "react-native": "0.83.2",
    "react-native-draggable-flatlist": "^4.0.3",
    "react-native-gesture-handler": "~2.30.0",
    "react-native-quick-crypto": "^1.0.16",
    "react-native-mmkv": "^4.1.2",
    "react-native-reanimated": "4.2.1",
    "react-native-safe-area-context": "^5.6.1",
    "react-native-screens": "~4.23.0",
    "react-native-view-shot": "^4.0.3",
    "react-native-webview": "13.16.0",
    "react-native-worklets": "0.7.2",
    "tweetnacl": "^1.0.3",
    "tweetnacl-util": "^0.15.1"
  },
  "devDependencies": {
    "babel-preset-expo": "~55.0.8",
    "eslint": "^9.0.0",
    "eslint-config-expo": "~55.0.0",
    "jest": "^29.7.0",
    "jest-expo": "~55.0.9",
    "react-test-renderer": "^19.2.0"
  },
  "overrides": {
    "glob": "^13.0.0",
    "tar": "^7.5.9",
    "rimraf": "^5.0.10",
    "@xmldom/xmldom": "^0.8.11",
    "hermes-compiler": "250829098.0.4",
    "minimatch": "^10.2.4",
    "@tootallnate/once": "^3.0.1"
  },
  "resolutions": {
    "hermes-compiler": "250829098.0.4"
  },
  "private": true,
  "expo": {
    "install": {
      "exclude": [
        "typescript",
        "@types/react",
        "@sentry/react-native"
      ]
    },
    "scheme": "college-community"
  }
}
[INSTALL_DEPENDENCIES] Running "npm ci --include=dev" in /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build directory
[INSTALL_DEPENDENCIES] npm warn deprecated whatwg-encoding@2.0.0: Use @exodus/bytes instead for a more spec-conformant and faster implementation
[INSTALL_DEPENDENCIES] npm warn deprecated abab@2.0.6: Use your platform's native atob() and btoa() methods instead
[INSTALL_DEPENDENCIES] npm warn deprecated domexception@4.0.0: Use your platform's native DOMException instead
[INSTALL_DEPENDENCIES] added 1017 packages, and audited 1018 packages in 22s
[INSTALL_DEPENDENCIES]
[INSTALL_DEPENDENCIES] 184 packages are looking for funding
[INSTALL_DEPENDENCIES]   run `npm fund` for details
[INSTALL_DEPENDENCIES] found 0 vulnerabilities
The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set.
Proceeding without mode-specific .env
› [@sentry/react-native/expo] Missing config for organization, project. Environment variables will be used as a fallback during the build. https://docs.sentry.io/platforms/react-native/manual-setup/
[READ_APP_CONFIG] Using app configuration:
[READ_APP_CONFIG] {
  "name": "College Community",
  "slug": "college-community",
  "scheme": [
    "collegecommunity",
    "appwrite-callback-69a46b6f0020cf0d5e4b"
  ],
  "version": "1.1.0",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "userInterfaceStyle": "automatic",
  "splash": {
    "image": "./assets/splash-icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#1a1a2e"
  },
  "ios": {
    "supportsTablet": true,
    "buildNumber": "9",
    "googleServicesFile": "./GoogleService-Info.plist",
    "bundleIdentifier": "com.college.community",
    "infoPlist": {
      "CFBundleURLTypes": [
        {
          "CFBundleURLSchemes": [
            "appwrite-callback-69a46b6f0020cf0d5e4b"
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
    "versionCode": 9,
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
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
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
            "scheme": "appwrite-callback-69a46b6f0020cf0d5e4b"
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
        "buildReactNativeFromSource": true,
        "useHermesV1": true,
        "android": {
          "ndkVersion": "26.1.10909125",
          "extraProguardRules": "",
          "extraMavenRepos": []
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
        "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to share images.",
        "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to capture and share images."
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
    "@sentry/react-native/expo",
    "expo-secure-store",
    "expo-sharing"
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
    "url": "https://u.expo.dev/d0af52e7-8e63-4426-9e92-30f0e835652d",
    "enableBsdiffPatchSupport": true
  },
  "sdkVersion": "55.0.0",
  "platforms": [
    "ios",
    "android"
  ]
}
[RUN_EXPO_DOCTOR] Running "expo doctor"
[RUN_EXPO_DOCTOR] › [@sentry/react-native/expo] Missing config for organization, project. Environment variables will be used as a fallback during the build. https://docs.sentry.io/platforms/react-native/manual-setup/
[RUN_EXPO_DOCTOR] Running 17 checks on your project...
[RUN_EXPO_DOCTOR] 15/17 checks passed. 2 checks failed. Possible issues detected:
[RUN_EXPO_DOCTOR] Use the --verbose flag to see more details about passed checks.
[RUN_EXPO_DOCTOR]
[RUN_EXPO_DOCTOR] ✖ Validate packages against React Native Directory package metadata
[RUN_EXPO_DOCTOR] Directory check failed with unexpected server response
[RUN_EXPO_DOCTOR]
[RUN_EXPO_DOCTOR] ✖ Check that packages match versions required by installed Expo SDK
[RUN_EXPO_DOCTOR]
[RUN_EXPO_DOCTOR] ⚠️ Minor version mismatches
[RUN_EXPO_DOCTOR] package              expected  found
[RUN_EXPO_DOCTOR] @shopify/flash-list  2.0.2     2.3.0
[RUN_EXPO_DOCTOR]
[RUN_EXPO_DOCTOR]
[RUN_EXPO_DOCTOR]
[RUN_EXPO_DOCTOR] 1 package out of date.
[RUN_EXPO_DOCTOR] Advice:
[RUN_EXPO_DOCTOR] Use 'npx expo install --check' to review and upgrade your dependencies.
[RUN_EXPO_DOCTOR] To ignore specific packages, add them to "expo.install.exclude" in package.json. Learn more: https://expo.fyi/dependency-validation
[RUN_EXPO_DOCTOR] 2 checks failed, indicating possible issues with the project.
[RUN_EXPO_DOCTOR] Command "expo doctor" failed.
Error: npx -y expo-doctor exited with non-zero code: 1
    at ChildProcess.completionListener (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/spawn-async/build/spawnAsync.js:42:23)
    at Object.onceWrapper (node:events:634:26)
    at ChildProcess.emit (node:events:519:28)
    at maybeClose (node:internal/child_process:1101:16)
    at ChildProcess._handle.onexit (node:internal/child_process:304:5)
    ...
    at spawnAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/spawn-async/build/spawnAsync.js:7:23)
    at spawn (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/turtle-spawn/dist/index.js:16:47)
    at runExpoDoctor (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/common/setup.js:143:52)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async /home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/common/setup.js:122:17
    at async BuildContext.runBuildPhase (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/context.js:123:28)
    at async setupAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/common/setup.js:120:9)
    at async buildAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/builders/android.js:41:5)
    at async runBuilderWithHooksAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/builders/common.js:12:13)
    at async Object.androidBuilder (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/builders/android.js:28:16)
[PREBUILD] › [@sentry/react-native/expo] Missing config for organization, project. Environment variables will be used as a fallback during the build. https://docs.sentry.io/platforms/react-native/manual-setup/
[PREBUILD] - Creating native directory (./android)
[PREBUILD] ✔ Created native directory
[PREBUILD] - Updating package.json
[PREBUILD] ✔ Updated package.json
[PREBUILD] - Running prebuild
[PREBUILD] » android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.
[PREBUILD] - Running prebuild
[PREBUILD] ✔ Finished prebuild
[PREBUILD] Running "npm install" in /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build directory
[PREBUILD] up to date, audited 1018 packages in 2s
[PREBUILD] 184 packages are looking for funding
[PREBUILD]   run `npm fund` for details
[PREBUILD] found 0 vulnerabilities
[RESTORE_CACHE] Local builds do not support restoring cache
[CALCULATE_EXPO_UPDATES_RUNTIME_VERSION] Resolved runtime version: 1.1.0
[PREPARE_CREDENTIALS] Writing secrets to the project's directory
[PREPARE_CREDENTIALS] Injecting signing config into build.gradle
[RUN_GRADLEW] Running 'gradlew :app:assembleDebug' in /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/android
[RUN_GRADLEW] Downloading https://services.gradle.org/distributions/gradle-9.0.0-bin.zip
[RUN_GRADLEW] 10%.
[RUN_GRADLEW] 20%.
[RUN_GRADLEW] 30%.
[RUN_GRADLEW] 40%.
[RUN_GRADLEW] 50%.
[RUN_GRADLEW] 60%.
[RUN_GRADLEW] 70%
[RUN_GRADLEW] 80%.
[RUN_GRADLEW] 90%.
[RUN_GRADLEW] 100%
[RUN_GRADLEW] Welcome to Gradle 9.0.0!
[RUN_GRADLEW] Here are the highlights of this release:
[RUN_GRADLEW] - Configuration Cache is the recommended execution mode
[RUN_GRADLEW]  - Gradle requires JVM 17 or higher to run
[RUN_GRADLEW] - Build scripts use Kotlin 2.2 and Groovy 4.0
[RUN_GRADLEW]  - Improved Kotlin DSL script compilation avoidance
[RUN_GRADLEW] For more details see https://docs.gradle.org/9.0.0/release-notes.html
[RUN_GRADLEW] Starting a Gradle Daemon (subsequent builds will be faster)
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :gradle-plugin:shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin-shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-settings-plugin:processResources
[RUN_GRADLEW] > Task :gradle-plugin:settings-plugin:processResources
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin-shared:processResources NO-SOURCE
[RUN_GRADLEW] > Task :gradle-plugin:shared:processResources NO-SOURCE
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
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-max-sdk-override-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-updates-gradle-plugin:processResources
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:processResources
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:processResources
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-max-sdk-override-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-max-sdk-override-plugin:processResources
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:processResources
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-max-sdk-override-plugin:compileKotlin
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-max-sdk-override-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-max-sdk-override-plugin:classes
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-max-sdk-override-plugin:jar
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:compileKotlin
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:classes
[RUN_GRADLEW] > Task :expo-gradle-plugin:expo-autolinking-plugin:jar
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:processResources
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:classes
[RUN_GRADLEW] > Task :gradle-plugin:react-native-gradle-plugin:jar
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:compileKotlin
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:compileJava NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:classes
[RUN_GRADLEW] > Task :expo-dev-launcher-gradle-plugin:jar
[RUN_GRADLEW] > Task :expo-module-gradle-plugin:compileKotlin
[RUN_GRADLEW] w: file:///tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt:9:24 'var targetSdk: Int?' is deprecated. Will be removed from library DSL in v9.0. Use testOptions.targetSdk or/and lint.targetSdk instead.
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
[RUN_GRADLEW]   - kotlin:      2.1.20
[RUN_GRADLEW] - ksp:         2.1.20-2.0.1
[RUN_GRADLEW] > Configure project :app
[RUN_GRADLEW] ℹ️  Applying gradle plugin 'expo-max-sdk-override-plugin'
[RUN_GRADLEW]   [expo-max-sdk-override-plugin] This plugin will find all permissions declared with `android:maxSdkVersion`. If there exists a declaration with the `android:maxSdkVersion` annotation and another one without, the plugin will remove the annotation from the final merged manifest. In order to see a log with the changes run a clean build of the app.
[RUN_GRADLEW] ℹ️  Applying gradle plugin 'expo-dev-launcher-gradle-plugin'
[RUN_GRADLEW]  ℹ️  Applying gradle plugin 'expo-updates-gradle-plugin'
[RUN_GRADLEW] > Configure project :expo
[RUN_GRADLEW] Using expo modules
[RUN_GRADLEW] - expo-log-box (55.0.7)
[RUN_GRADLEW] - expo-constants (55.0.7)
[RUN_GRADLEW] - expo-dev-client (55.0.11)
[RUN_GRADLEW] - expo-dev-launcher (55.0.12)
[RUN_GRADLEW] - expo-dev-menu (55.0.11)
[RUN_GRADLEW] - expo-dev-menu-interface (55.0.1)
[RUN_GRADLEW] - expo-eas-client (55.0.2)
[RUN_GRADLEW] - expo-json-utils (55.0.0)
[RUN_GRADLEW] - expo-manifests (55.0.9)
[RUN_GRADLEW] > Configure project :expo-modules-core
[RUN_GRADLEW] Linking react-native-worklets native libs into expo-modules-core build tasks
[RUN_GRADLEW] task ':react-native-worklets:mergeDebugNativeLibs'
[RUN_GRADLEW] task ':react-native-worklets:mergeReleaseNativeLibs'
[RUN_GRADLEW] > Configure project :expo
[RUN_GRADLEW]   - expo-modules-core (55.0.14)
[RUN_GRADLEW] - expo-structured-headers (55.0.0)
[RUN_GRADLEW] > Configure project :expo-updates
[RUN_GRADLEW] Checking the license for package NDK (Side by side) 27.0.12077973 in /home/rekan/android_sdk/licenses
[RUN_GRADLEW] License for package NDK (Side by side) 27.0.12077973 accepted.
[RUN_GRADLEW] Preparing "Install NDK (Side by side) 27.0.12077973 v.27.0.12077973".
[RUN_GRADLEW] "Install NDK (Side by side) 27.0.12077973 v.27.0.12077973" ready.
[RUN_GRADLEW] Installing NDK (Side by side) 27.0.12077973 in /home/rekan/android_sdk/ndk/27.0.12077973
[RUN_GRADLEW] "Install NDK (Side by side) 27.0.12077973 v.27.0.12077973" complete.
[RUN_GRADLEW] "Install NDK (Side by side) 27.0.12077973 v.27.0.12077973" finished.
[RUN_GRADLEW] > Configure project :expo
[RUN_GRADLEW]   - expo-updates (55.0.12)
[RUN_GRADLEW] - expo-updates-interface (55.1.3)
[RUN_GRADLEW] - [📦] expo-dom-webview (55.0.3)
[RUN_GRADLEW]   - [📦] expo-application (55.0.8)
[RUN_GRADLEW]   - [📦] expo-asset (55.0.8)
[RUN_GRADLEW]   - [📦] expo-audio (55.0.8)
[RUN_GRADLEW]   - [📦] expo-blur (55.0.8)
[RUN_GRADLEW]   - [📦] expo-clipboard (55.0.8)
[RUN_GRADLEW]   - [📦] expo-crypto (55.0.9)
[RUN_GRADLEW]   - [📦] expo-device (55.0.9)
[RUN_GRADLEW]   - [📦] expo-document-picker (55.0.8)
[RUN_GRADLEW]   - [📦] expo-file-system (55.0.10)
[RUN_GRADLEW]   - [📦] expo-font (55.0.4)
[RUN_GRADLEW]   - [📦] expo-haptics (55.0.8)
[RUN_GRADLEW]   - [📦] expo-image-loader (55.0.0)
[RUN_GRADLEW]   - [📦] expo-image-manipulator (55.0.9)
[RUN_GRADLEW]   - [📦] expo-image-picker (55.0.11)
[RUN_GRADLEW]   - [📦] expo-intent-launcher (55.0.8)
[RUN_GRADLEW]   - [📦] expo-keep-awake (55.0.4)
[RUN_GRADLEW]   - [📦] expo-linear-gradient (55.0.8)
[RUN_GRADLEW] - [📦] expo-linking (55.0.7)
[RUN_GRADLEW]   - [📦] expo-localization (55.0.8)
[RUN_GRADLEW]   - [📦] expo-location (55.1.2)
[RUN_GRADLEW]   - [📦] expo-media-library (55.0.9)
[RUN_GRADLEW]   - [📦] expo-notifications (55.0.11)
[RUN_GRADLEW]   - [📦] expo-secure-store (55.0.8)
[RUN_GRADLEW]   - [📦] expo-sharing (55.0.11)
[RUN_GRADLEW]   - [📦] expo-video (55.0.10)
[RUN_GRADLEW]   - [📦] expo-web-browser (55.0.9)
[RUN_GRADLEW] > Configure project :react-native-mmkv
[RUN_GRADLEW] [NitroModules] 🔥 NitroMmkv is boosted by nitro!
[RUN_GRADLEW] > Configure project :react-native-nitro-modules
[RUN_GRADLEW] [NitroModules] 🔥 Your app is boosted by nitro modules!
[RUN_GRADLEW] > Configure project :react-native-quick-crypto
[RUN_GRADLEW] [NitroModules] 🔥 QuickCrypto is boosted by nitro!
[RUN_GRADLEW] [QuickCrypto] Has libsodium disabled!
[RUN_GRADLEW] > Task :expo-dev-launcher:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-client:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-eas-client:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-log-box:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo:generatePackagesList
[RUN_GRADLEW] > Task :expo-json-utils:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-manifests:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-structured-headers:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-modules-core:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo:preBuild
[RUN_GRADLEW] > Task :expo-updates:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates-interface:preBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-constants:createExpoConfig
[RUN_GRADLEW] The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set. Using only .env.local and .env
[RUN_GRADLEW] > Task :react-native-community_slider:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-mmkv:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-nitro-modules:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] No modules to process in combine-js-to-schema-cli. If this is unexpected, please check if you set up your NativeComponent correctly. See combine-js-to-schema.js for how codegen finds modules.
[RUN_GRADLEW] > Task :react-native-picker_picker:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:installCMake
[RUN_GRADLEW] > Task :react-native-mmkv:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-mmkv:preBuild
[RUN_GRADLEW] > Task :react-native-community_slider:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-community_slider:preBuild
[RUN_GRADLEW] > Task :react-native-picker_picker:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-picker_picker:preBuild
[RUN_GRADLEW] > Task :react-native-nitro-modules:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-gesture-handler:preBuild
[RUN_GRADLEW] > Task :expo-constants:createExpoConfig
[RUN_GRADLEW] > Task :expo-constants:preBuild
[RUN_GRADLEW] › [@sentry/react-native/expo] Missing config for organization, project. Environment variables will be used as a fallback during the build. https://docs.sentry.io/platforms/react-native/manual-setup/
[RUN_GRADLEW] > Task :react-native-reanimated:assertMinimalReactNativeVersionTask
[RUN_GRADLEW] > Task :react-native-reanimated:assertNewArchitectureEnabledTask SKIPPED
[RUN_GRADLEW] > Task :react-native-reanimated:assertWorkletsVersionTask
[RUN_GRADLEW] > Task :react-native-quick-base64:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] No modules to process in combine-js-to-schema-cli. If this is unexpected, please check if you set up your NativeComponent correctly. See combine-js-to-schema.js for how codegen finds modules.
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-nitro-modules:prepareHeaders
[RUN_GRADLEW] > Task :react-native-quick-crypto:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-nitro-modules:preBuild
[RUN_GRADLEW] No modules to process in combine-js-to-schema-cli. If this is unexpected, please check if you set up your NativeComponent correctly. See combine-js-to-schema.js for how codegen finds modules.
[RUN_GRADLEW] > Task :react-native-screens:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-reanimated:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-safe-area-context:preBuild
[RUN_GRADLEW] > Task :react-native-quick-base64:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-quick-base64:preBuild
[RUN_GRADLEW] > Task :react-native-view-shot:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-worklets:assertMinimalReactNativeVersionTask
[RUN_GRADLEW] > Task :react-native-worklets:assertNewArchitectureEnabledTask SKIPPED
[RUN_GRADLEW] > Task :react-native-quick-crypto:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-quick-crypto:preBuild
[RUN_GRADLEW] > Task :react-native-screens:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-screens:preBuild
[RUN_GRADLEW] > Task :expo:preDebugBuild
[RUN_GRADLEW] > Task :react-native-reanimated:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-webview:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-worklets:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native-view-shot:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-view-shot:preBuild
[RUN_GRADLEW] > Task :expo-constants:preDebugBuild
[RUN_GRADLEW] > Task :sentry_react-native:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :expo:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-dev-client:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-constants:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-dev-launcher:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-launcher:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-dev-menu:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-client:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-reanimated:prepareReanimatedHeadersForPrefabs
[RUN_GRADLEW] > Task :react-native-reanimated:preBuild
[RUN_GRADLEW] > Task :expo-eas-client:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-json-utils:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-log-box:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:installCMake
Loading local repository...ge information...
[RUN_GRADLEW] Warning: This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered. This can happen if you use versions of Android Studio and the command-line tools that were released at different times.
[RUN_GRADLEW] > Task :expo-eas-client:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-manifests:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-manifests:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-modules-core:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-log-box:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-structured-headers:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-webview:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native-webview:preBuild
[RUN_GRADLEW] > Task :expo-updates:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-worklets:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :expo-updates:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-updates-interface:preDebugBuild UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-community_slider:preDebugBuild
[RUN_GRADLEW] > Task :expo-structured-headers:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-gesture-handler:preDebugBuild
[RUN_GRADLEW] > Task :expo-updates-interface:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-mmkv:preDebugBuild
[RUN_GRADLEW] > Task :react-native-community_slider:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-nitro-modules:preDebugBuild
[RUN_GRADLEW] > Task :react-native-mmkv:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-picker_picker:preDebugBuild
[RUN_GRADLEW] > Task :sentry_react-native:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :sentry_react-native:preBuild
[RUN_GRADLEW] > Task :react-native-worklets:prepareWorkletsHeadersForPrefabs
[RUN_GRADLEW] > Task :react-native-quick-base64:preDebugBuild
[RUN_GRADLEW] > Task :react-native-worklets:preBuild
[RUN_GRADLEW] > Task :react-native-gesture-handler:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-reanimated:preDebugBuild
[RUN_GRADLEW] > Task :react-native-quick-crypto:preDebugBuild
[RUN_GRADLEW] > Task :react-native-picker_picker:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-quick-base64:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-safe-area-context:preDebugBuild
[RUN_GRADLEW] > Task :react-native-nitro-modules:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-screens:preDebugBuild
[RUN_GRADLEW] > Task :react-native-view-shot:preDebugBuild
[RUN_GRADLEW] > Task :react-native-reanimated:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-webview:preDebugBuild
[RUN_GRADLEW] > Task :react-native-quick-crypto:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-worklets:preDebugBuild
[RUN_GRADLEW] > Task :react-native-view-shot:writeDebugAarMetadata
[RUN_GRADLEW] > Task :sentry_react-native:preDebugBuild
[RUN_GRADLEW] > Task :expo-modules-core:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-webview:writeDebugAarMetadata
[RUN_GRADLEW] > Task :sentry_react-native:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo:generateDebugResValues
[RUN_GRADLEW] > Task :expo-constants:generateDebugResValues
[RUN_GRADLEW] > Task :expo-dev-client:generateDebugResValues
[RUN_GRADLEW] > Task :expo-constants:generateDebugResources
[RUN_GRADLEW] > Task :expo:generateDebugResources
[RUN_GRADLEW] > Task :expo-dev-client:generateDebugResources
[RUN_GRADLEW] > Task :expo-dev-client:packageDebugResources
[RUN_GRADLEW] > Task :expo-constants:packageDebugResources
[RUN_GRADLEW] > Task :expo:packageDebugResources
[RUN_GRADLEW] > Task :expo-dev-launcher:generateDebugResValues
[RUN_GRADLEW] > Task :expo-dev-menu:generateDebugResValues
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateDebugResValues
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateDebugResources
[RUN_GRADLEW] > Task :expo-dev-menu:generateDebugResources
[RUN_GRADLEW] > Task :expo-dev-launcher:generateDebugResources
[RUN_GRADLEW] > Task :expo-dev-menu-interface:packageDebugResources
[RUN_GRADLEW] > Task :expo-eas-client:generateDebugResValues
[RUN_GRADLEW] > Task :expo-eas-client:generateDebugResources
[RUN_GRADLEW] > Task :expo-eas-client:packageDebugResources
[RUN_GRADLEW] > Task :expo-json-utils:generateDebugResValues
[RUN_GRADLEW] > Task :expo-json-utils:generateDebugResources
[RUN_GRADLEW] > Task :expo-json-utils:packageDebugResources
[RUN_GRADLEW] > Task :expo-log-box:generateDebugResValues
[RUN_GRADLEW] > Task :expo-log-box:generateDebugResources
[RUN_GRADLEW] > Task :expo-dev-launcher:packageDebugResources
[RUN_GRADLEW] > Task :expo-dev-menu:packageDebugResources
[RUN_GRADLEW] > Task :expo-log-box:packageDebugResources
[RUN_GRADLEW] > Task :expo-structured-headers:generateDebugResValues
[RUN_GRADLEW] > Task :expo-manifests:generateDebugResValues
[RUN_GRADLEW] > Task :expo-modules-core:generateDebugResValues
[RUN_GRADLEW] > Task :expo-manifests:generateDebugResources
[RUN_GRADLEW] > Task :expo-structured-headers:generateDebugResources
[RUN_GRADLEW] > Task :expo-modules-core:generateDebugResources
[RUN_GRADLEW] > Task :expo-manifests:packageDebugResources
[RUN_GRADLEW] > Task :expo-structured-headers:packageDebugResources
[RUN_GRADLEW] > Task :expo-modules-core:packageDebugResources
[RUN_GRADLEW] > Task :expo-updates:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-community_slider:generateDebugResValues
[RUN_GRADLEW] > Task :expo-updates-interface:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-community_slider:generateDebugResources
[RUN_GRADLEW] > Task :expo-updates:generateDebugResources
[RUN_GRADLEW] > Task :expo-updates-interface:generateDebugResources
[RUN_GRADLEW] > Task :expo-updates-interface:packageDebugResources
[RUN_GRADLEW] > Task :expo-updates:packageDebugResources
[RUN_GRADLEW] > Task :react-native-community_slider:packageDebugResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-mmkv:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-nitro-modules:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateDebugResources
[RUN_GRADLEW] > Task :react-native-mmkv:generateDebugResources
[RUN_GRADLEW] > Task :react-native-nitro-modules:generateDebugResources
[RUN_GRADLEW] > Task :react-native-mmkv:packageDebugResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:packageDebugResources
[RUN_GRADLEW] > Task :react-native-picker_picker:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-nitro-modules:packageDebugResources
[RUN_GRADLEW] > Task :react-native-quick-base64:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-quick-crypto:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-picker_picker:generateDebugResources
[RUN_GRADLEW] > Task :react-native-quick-base64:generateDebugResources
[RUN_GRADLEW] > Task :react-native-quick-crypto:generateDebugResources
[RUN_GRADLEW] > Task :react-native-quick-crypto:packageDebugResources
[RUN_GRADLEW] > Task :react-native-quick-base64:packageDebugResources
[RUN_GRADLEW] > Task :react-native-picker_picker:packageDebugResources
[RUN_GRADLEW] > Task :expo-json-utils:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-reanimated:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-screens:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateDebugResources
[RUN_GRADLEW] > Task :react-native-reanimated:generateDebugResources
[RUN_GRADLEW] > Task :react-native-reanimated:packageDebugResources
[RUN_GRADLEW] > Task :react-native-safe-area-context:packageDebugResources
[RUN_GRADLEW] > Task :react-native-screens:generateDebugResources
[RUN_GRADLEW] > Task :react-native-view-shot:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-webview:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-webview:generateDebugResources
[RUN_GRADLEW] > Task :react-native-view-shot:generateDebugResources
[RUN_GRADLEW] > Task :react-native-view-shot:packageDebugResources
[RUN_GRADLEW] > Task :react-native-webview:packageDebugResources
[RUN_GRADLEW] > Task :react-native-worklets:generateDebugResValues
[RUN_GRADLEW] > Task :sentry_react-native:generateDebugResValues
[RUN_GRADLEW] > Task :react-native-screens:packageDebugResources
[RUN_GRADLEW] > Task :react-native-worklets:generateDebugResources
[RUN_GRADLEW] > Task :sentry_react-native:generateDebugResources
[RUN_GRADLEW] > Task :expo:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-worklets:packageDebugResources
[RUN_GRADLEW] > Task :sentry_react-native:packageDebugResources
[RUN_GRADLEW] > Task :expo-dev-client:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-constants:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-safe-area-context:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-screens:writeDebugAarMetadata
[RUN_GRADLEW] > Task :react-native-worklets:writeDebugAarMetadata
[RUN_GRADLEW] > Task :expo-dev-client:processDebugManifest
[RUN_GRADLEW] > Task :expo-dev-launcher:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-dev-menu:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-dev-menu-interface:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-dev-menu:processDebugManifest
[RUN_GRADLEW] > Task :expo-eas-client:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-dev-menu-interface:processDebugManifest
[RUN_GRADLEW] > Task :expo-json-utils:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-json-utils:processDebugManifest
[RUN_GRADLEW] > Task :expo-log-box:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-manifests:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-constants:processDebugManifest
[RUN_GRADLEW] > Task :expo:processDebugManifest
[RUN_GRADLEW] > Task :expo-modules-core:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-manifests:processDebugManifest
[RUN_GRADLEW] > Task :expo-structured-headers:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-updates:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-log-box:processDebugManifest
[RUN_GRADLEW] > Task :expo-dev-launcher:processDebugManifest
[RUN_GRADLEW] > Task :expo-updates-interface:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-community_slider:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-eas-client:processDebugManifest
[RUN_GRADLEW] > Task :react-native-gesture-handler:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-structured-headers:processDebugManifest
[RUN_GRADLEW] > Task :react-native-mmkv:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-updates:processDebugManifest
[RUN_GRADLEW] > Task :react-native-community_slider:processDebugManifest
[RUN_GRADLEW] package="com.reactnativecommunity.slider" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/@react-native-community/slider/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="com.reactnativecommunity.slider" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/@react-native-community/slider/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-nitro-modules:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-modules-core:processDebugManifest
[RUN_GRADLEW] /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
[RUN_GRADLEW]   meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
[RUN_GRADLEW] > Task :react-native-picker_picker:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-quick-base64:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-quick-crypto:extractDeepLinksDebug
[RUN_GRADLEW] > Task :expo-updates-interface:processDebugManifest
[RUN_GRADLEW] > Task :react-native-mmkv:processDebugManifest
[RUN_GRADLEW] > Task :react-native-reanimated:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-safe-area-context:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-quick-base64:processDebugManifest
[RUN_GRADLEW] > Task :react-native-nitro-modules:processDebugManifest
[RUN_GRADLEW] > Task :react-native-quick-crypto:processDebugManifest
[RUN_GRADLEW] > Task :react-native-gesture-handler:processDebugManifest
[RUN_GRADLEW] > Task :react-native-webview:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-view-shot:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-worklets:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:installCMake
[=                                      ] 3% Fetch remote repository...         ory...
[RUN_GRADLEW] > Task :react-native-screens:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-picker_picker:processDebugManifest
[RUN_GRADLEW] package="com.reactnativecommunity.picker" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/@react-native-picker/picker/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="com.reactnativecommunity.picker" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/@react-native-picker/picker/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :sentry_react-native:extractDeepLinksDebug
[RUN_GRADLEW] > Task :react-native-reanimated:processDebugManifest
[RUN_GRADLEW] > Task :react-native-screens:processDebugManifest
[RUN_GRADLEW] > Task :react-native-safe-area-context:processDebugManifest
[RUN_GRADLEW] package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-worklets:processDebugManifest
[RUN_GRADLEW] > Task :react-native-webview:processDebugManifest
[RUN_GRADLEW] > Task :sentry_react-native:processDebugManifest
[RUN_GRADLEW] package="io.sentry.react" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/@sentry/react-native/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="io.sentry.react" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/@sentry/react-native/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :react-native-view-shot:processDebugManifest
[RUN_GRADLEW] package="fr.greweb.reactnativeviewshot" found in source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/react-native-view-shot/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
[RUN_GRADLEW] Recommendation: remove package="fr.greweb.reactnativeviewshot" from the source AndroidManifest.xml: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/react-native-view-shot/android/src/main/AndroidManifest.xml.
[RUN_GRADLEW] > Task :expo:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-constants:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-dev-client:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-dev-launcher:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-dev-menu:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-dev-menu-interface:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-eas-client:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:installCMake
[==                                     ] 7% Computing updates...ory...         ry...
[==============                         ] 37% Unzipping... bin/cpack
[===============                        ] 39% Unzipping... bin/ctest            ck
[RUN_GRADLEW] [===============                        ] 40% Unzipping... bin/ctest
[================                       ] 42% Unzipping... bin/ctest            st
[=================                      ] 45% Unzipping... bin/ctest            st
[===================                    ] 48% Unzipping... bin/cmake            st
[====================                   ] 51% Unzipping... bin/cmake            ke
[RUN_GRADLEW] [====================                   ] 52% Unzipping... bin/cmake
[====================                   ] 52% Unzipping... share/cmake-3.30/Tempim/vimfiles/sy
[=====================                  ] 53% Unzipping... share/cmake-3.30/Modumake-3.30/incl
[RUN_GRADLEW] > Task :expo-dev-client:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-dev-menu-interface:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-constants:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-dev-menu:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-dev-launcher:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-dev-launcher:generateDebugRFile
[RUN_GRADLEW] > Task :expo:generateDebugRFile
[RUN_GRADLEW] > Task :expo-dev-client:generateDebugRFile
[RUN_GRADLEW] > Task :expo-dev-menu:generateDebugRFile
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateDebugRFile
[RUN_GRADLEW] > Task :expo-manifests:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-modules-core:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-constants:generateDebugRFile
[RUN_GRADLEW] > Task :expo-eas-client:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-json-utils:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-json-utils:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-manifests:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-modules-core:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-modules-core:generateDebugRFile
[RUN_GRADLEW] > Task :expo-json-utils:generateDebugRFile
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:installCMake
[=======================================] 100% Unzipping... share/cmake-3.30/Modmake-3.30/Modu
[RUN_GRADLEW] > Task :expo-structured-headers:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-manifests:generateDebugRFile
[RUN_GRADLEW] > Task :expo-eas-client:generateDebugRFile
[RUN_GRADLEW] > Task :expo-log-box:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-log-box:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-structured-headers:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-updates:parseDebugLocalResources
[RUN_GRADLEW] > Task :expo-structured-headers:generateDebugRFile
[RUN_GRADLEW] > Task :expo-updates-interface:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-community_slider:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-updates:generateDebugRFile
[RUN_GRADLEW] > Task :expo-log-box:generateDebugRFile
[RUN_GRADLEW] > Task :expo-updates-interface:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-community_slider:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-community_slider:generateDebugRFile
[RUN_GRADLEW] > Task :expo-updates-interface:generateDebugRFile
[RUN_GRADLEW] > Task :react-native-mmkv:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-nitro-modules:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-nitro-modules:generateDebugRFile
[RUN_GRADLEW] > Task :react-native-nitro-modules:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-picker_picker:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-picker_picker:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-picker_picker:generateDebugRFile
[RUN_GRADLEW] > Task :expo-updates:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-quick-base64:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-mmkv:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateDebugRFile
[RUN_GRADLEW] > Task :react-native-mmkv:generateDebugRFile
[RUN_GRADLEW] > Task :react-native-gesture-handler:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-reanimated:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-safe-area-context:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-safe-area-context:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-reanimated:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-quick-base64:generateDebugRFile
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateDebugRFile
[RUN_GRADLEW] > Task :react-native-quick-crypto:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-screens:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-quick-crypto:generateDebugRFile
[RUN_GRADLEW] > Task :react-native-quick-base64:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-view-shot:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-quick-crypto:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-view-shot:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-webview:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-screens:generateDebugRFile
[RUN_GRADLEW] > Task :react-native-worklets:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-worklets:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-view-shot:generateDebugRFile
[RUN_GRADLEW] > Task :sentry_react-native:compileDebugLibraryResources
[RUN_GRADLEW] > Task :react-native-webview:generateDebugRFile
[RUN_GRADLEW] > Task :expo:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :sentry_react-native:parseDebugLocalResources
[RUN_GRADLEW] > Task :react-native-worklets:generateDebugRFile
[RUN_GRADLEW] > Task :expo-constants:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-constants:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-modules-core:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-worklets:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-modules-core:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-webview:compileDebugLibraryResources
[RUN_GRADLEW] > Task :expo-constants:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-worklets:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-dev-client:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-dev-launcher:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-reanimated:generateDebugRFile
[RUN_GRADLEW] > Task :expo-dev-menu:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-dev-menu:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-dev-menu-interface:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-dev-menu-interface:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-json-utils:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-json-utils:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-json-utils:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-manifests:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-manifests:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-manifests:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:downloadHermes
[RUN_GRADLEW] > Task :react-native-screens:compileDebugLibraryResources
[RUN_GRADLEW] > Task :sentry_react-native:generateDebugRFile
[RUN_GRADLEW] > Task :expo-modules-core:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-dev-client:dataBindingMergeDependencyArtifactsDebug
[RUN_GRADLEW] > Task :expo-dev-launcher:dataBindingMergeDependencyArtifactsDebug
[RUN_GRADLEW] > Task :expo-updates-interface:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-updates-interface:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-updates-interface:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-eas-client:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-eas-client:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-dev-menu:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-log-box:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-log-box:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-log-box:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-structured-headers:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-structured-headers:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-structured-headers:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-updates:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :expo-updates:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-community_slider:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-community_slider:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-gesture-handler:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-reanimated:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-reanimated:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-gesture-handler:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-mmkv:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-mmkv:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-nitro-modules:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-nitro-modules:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-nitro-modules:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-mmkv:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-picker_picker:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-picker_picker:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-quick-base64:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-quick-base64:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-eas-client:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-quick-crypto:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-quick-crypto:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-safe-area-context:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-updates:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-quick-base64:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-quick-crypto:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-safe-area-context:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-screens:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-screens:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-screens:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-dev-client:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-dev-client:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-view-shot:generateDebugBuildConfig
[RUN_GRADLEW] > Task :react-native-view-shot:javaPreCompileDebug
[RUN_GRADLEW] > Task :react-native-webview:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native-webview:generateDebugBuildConfig
[RUN_GRADLEW] > Task :sentry_react-native:generateDebugBuildConfig
[RUN_GRADLEW] > Task :sentry_react-native:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-constants:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-webview:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-constants:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-constants:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-dev-menu:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-constants:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-dev-menu:mergeDebugAssets
[RUN_GRADLEW] > Task :expo:mergeDebugShaders
[RUN_GRADLEW] > Task :expo:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-dev-menu-interface:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-log-box:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-log-box:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-log-box:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-log-box:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-json-utils:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-json-utils:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-json-utils:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-eas-client:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-eas-client:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-manifests:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-eas-client:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-manifests:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-manifests:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-eas-client:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-manifests:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-json-utils:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-structured-headers:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-modules-core:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-structured-headers:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-structured-headers:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-modules-core:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-modules-core:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates-interface:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-dev-client:dataBindingGenBaseClassesDebug
[RUN_GRADLEW] > Task :expo-updates-interface:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-structured-headers:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-updates-interface:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-modules-core:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-dev-client:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-updates-interface:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-dev-client:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-client:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-community_slider:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-community_slider:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-community_slider:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-gesture-handler:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-gesture-handler:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-client:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-mmkv:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-nitro-modules:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-nitro-modules:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-nitro-modules:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-mmkv:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-mmkv:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-community_slider:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-picker_picker:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-picker_picker:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-mmkv:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-quick-base64:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-reanimated:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-quick-base64:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-quick-base64:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-safe-area-context:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-safe-area-context:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-reanimated:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-reanimated:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-nitro-modules:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-screens:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-reanimated:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-view-shot:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-screens:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-screens:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-view-shot:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-view-shot:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-quick-base64:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-quick-crypto:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-view-shot:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-quick-crypto:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-quick-crypto:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-webview:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-webview:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-webview:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-screens:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-quick-crypto:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-picker_picker:processDebugJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-community_slider:processDebugJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :sentry_react-native:mergeDebugShaders
[RUN_GRADLEW] > Task :sentry_react-native:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :react-native-view-shot:processDebugJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-reanimated:processDebugJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :sentry_react-native:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :react-native-worklets:mergeDebugShaders
[RUN_GRADLEW] > Task :react-native-worklets:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :sentry_react-native:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-webview:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-worklets:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :sentry_react-native:processDebugJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :react-native-worklets:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-dev-client:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-worklets:processDebugJavaRes NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-client:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-constants:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-constants:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-worklets:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-dev-menu:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-client:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-menu-interface:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-constants:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-menu-interface:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-dev-menu:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-eas-client:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-eas-client:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-json-utils:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-json-utils:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-modules-core:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-log-box:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-eas-client:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-manifests:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-json-utils:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-manifests:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-log-box:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-structured-headers:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-updates-interface:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-community_slider:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-log-box:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-updates-interface:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-structured-headers:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-community_slider:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-manifests:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-gesture-handler:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-structured-headers:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-community_slider:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-updates-interface:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-quick-base64:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-picker_picker:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-quick-crypto:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-mmkv:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-reanimated:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-safe-area-context:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native-picker_picker:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-screens:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-safe-area-context:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native-nitro-modules:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-webview:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-view-shot:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-webview:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :sentry_react-native:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :react-native-view-shot:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :sentry_react-native:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:buildCodegenCLI
[RUN_GRADLEW] > Task :react-native-view-shot:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-updates:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-updates:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-updates:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-updates:mergeDebugAssets
[RUN_GRADLEW] > Task :react-native-webview:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :expo-updates:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :sentry_react-native:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:generateCodegenSchemaFromJavaScript
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:generateCodegenArtifactsFromSchema
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:createNativeDepsDirectories UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-launcher:generateDebugBuildConfig
[RUN_GRADLEW] > Task :expo-dev-launcher:checkApolloVersions
[RUN_GRADLEW] > Task :expo-dev-launcher:generateServiceApolloOptions
[RUN_GRADLEW] > Task :expo-dev-launcher:generateServiceApolloSources
[RUN_GRADLEW] w: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/expo-dev-launcher/android/src/debug/graphql/GetBranches.graphql: (21, 11): Apollo: Use of deprecated field `runtimeVersion`
[RUN_GRADLEW] w: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/expo-dev-launcher/android/src/debug/graphql/GetBranches.graphql: (34, 3): Apollo: Variable `platform` is unused
[RUN_GRADLEW] w: /tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/node_modules/expo-dev-launcher/android/src/debug/graphql/GetUpdates.graphql: (14, 11): Apollo: Use of deprecated field `runtimeVersion`
[RUN_GRADLEW] > Task :expo-dev-launcher:javaPreCompileDebug
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeDebugShaders
[RUN_GRADLEW] > Task :expo-dev-launcher:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-launcher:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeDebugAssets
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :expo-dev-launcher:mergeDebugNativeLibs NO-SOURCE
[RUN_GRADLEW] > Task :expo-dev-launcher:copyDebugJniLibsProjectOnly
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:downloadFastFloat
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:downloadBoost
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:downloadDoubleConversion
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:downloadFmt
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:downloadFolly
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:prepareFastFloat
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:prepareFmt
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:downloadGlog
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:prepareGlog
[RUN_GRADLEW] > Task :app:copySentryJsonConfiguration
[RUN_GRADLEW] sentry.options.json not found in app root (/tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build)
[RUN_GRADLEW] > Task :app:generateAutolinkingNewArchitectureFiles
[RUN_GRADLEW] > Task :app:generateAutolinkingPackageList
[RUN_GRADLEW] > Task :app:generateCodegenSchemaFromJavaScript SKIPPED
[RUN_GRADLEW] > Task :app:generateCodegenArtifactsFromSchema SKIPPED
[RUN_GRADLEW] > Task :app:generateReactNativeEntryPoint
[RUN_GRADLEW] > Task :app:preBuild
[RUN_GRADLEW] > Task :app:preDebugBuild
[RUN_GRADLEW] > Task :app:mergeDebugNativeDebugMetadata NO-SOURCE
[RUN_GRADLEW] > Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
[RUN_GRADLEW] > Task :app:generateDebugBuildConfig
[RUN_GRADLEW] > Task :app:generateDebugResValues
[RUN_GRADLEW] > Task :app:processDebugGoogleServices
[RUN_GRADLEW] > Task :app:generateDebugResources
[RUN_GRADLEW] > Task :app:packageDebugResources
[RUN_GRADLEW] > Task :app:createDebugCompatibleScreenManifests
[RUN_GRADLEW] > Task :app:parseDebugLocalResources
[RUN_GRADLEW] > Task :app:extractDeepLinksDebug
[RUN_GRADLEW] > Task :app:javaPreCompileDebug
[RUN_GRADLEW] > Task :app:mergeDebugShaders
[RUN_GRADLEW] > Task :app:compileDebugShaders NO-SOURCE
[RUN_GRADLEW] > Task :app:createDebugUpdatesResources
[RUN_GRADLEW] > Task :app:generateDebugAssets UP-TO-DATE
[RUN_GRADLEW] > Task :app:desugarDebugFileDependencies
[RUN_GRADLEW] › [@sentry/react-native/expo] Missing config for organization, project. Environment variables will be used as a fallback during the build. https://docs.sentry.io/platforms/react-native/manual-setup/
[RUN_GRADLEW] > Task :app:checkDebugDuplicateClasses
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:prepareFolly
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:prepareDoubleConversion
[RUN_GRADLEW] > Task :app:mergeDebugJniLibFolders
[RUN_GRADLEW] > Task :app:validateSigningDebug
[RUN_GRADLEW] > Task :app:writeDebugAppMetadata
[RUN_GRADLEW] > Task :app:writeDebugSigningConfigVersions
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:unzipHermes
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:configureBuildForHermes
[RUN_GRADLEW] CMake Error at CMakeLists.txt:638 (message):
[RUN_GRADLEW]   Unable to find ICU.
[RUN_GRADLEW] > Task :react-native:packages:react-native:ReactAndroid:hermes-engine:configureBuildForHermes FAILED
[RUN_GRADLEW] [Incubating] Problems report is available at: file:///tmp/rekan/eas-build-local-nodejs/b09ed68f-0c0b-4df1-89b5-fc84db755065/build/android/build/reports/problems/problems-report.html
[RUN_GRADLEW] Deprecated Gradle features were used in this build, making it incompatible with Gradle 10.
[RUN_GRADLEW] You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
[RUN_GRADLEW] For more on this, please refer to https://docs.gradle.org/9.0.0/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
[RUN_GRADLEW] 527 actionable tasks: 527 executed
[RUN_GRADLEW] FAILURE: Build failed with an exception.
[RUN_GRADLEW] * What went wrong:
[RUN_GRADLEW] Execution failed for task ':react-native:packages:react-native:ReactAndroid:hermes-engine:configureBuildForHermes'.
[RUN_GRADLEW] > Process 'command '/home/rekan/android_sdk/cmake/3.30.5/bin/cmake'' finished with non-zero exit value 1
[RUN_GRADLEW] * Try:
[RUN_GRADLEW] > Run with --stacktrace option to get the stack trace.
[RUN_GRADLEW] > Run with --info or --debug option to get more log output.
[RUN_GRADLEW] > Run with --scan to generate a Build Scan (Powered by Develocity).
[RUN_GRADLEW] > Get more help at https://help.gradle.org.
[RUN_GRADLEW] BUILD FAILED in 13m 22s
[RUN_GRADLEW] Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.

Build failed
Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.
Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.
    at resolveBuildPhaseErrorAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/buildErrors/detectError.js:70:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async BuildContext.handleBuildPhaseErrorAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/context.js:190:28)
    at async BuildContext.runBuildPhase (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/context.js:135:35)
    at async buildAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/builders/android.js:122:5)
    at async runBuilderWithHooksAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/builders/common.js:12:13)
    at async Object.androidBuilder (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/@expo/build-tools/dist/builders/android.js:28:16)
    at async buildAndroidAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/eas-cli-local-build-plugin/dist/android.js:43:12)
    at async buildAsync (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/eas-cli-local-build-plugin/dist/build.js:54:29)
    at async main (/home/rekan/.npm/_npx/9dcdd6ab8c3634c3/node_modules/eas-cli-local-build-plugin/dist/main.js:16:9)
npx -y eas-cli-local-build-plugin@18.0.2 eyJqb2IiOnsidHlwZSI6Im1hbmFnZWQiLCJwbGF0Zm9ybSI6ImFuZHJvaWQiLCJwcm9qZWN0Um9vdERpcmVjdG9yeSI6Ii4iLCJwcm9qZWN0QXJjaGl2ZSI6eyJ0eXBlIjoiUEFUSCIsInBhdGgiOiIvdG1wL3Jla2FuL2Vhcy1jbGktbm9kZWpzL2E3NmZiYTg3LWI0YWYtNGE5Mi1hODVhLTNjYmE2NTE3M2NjOC50YXIuZ3oifSwiYnVpbGRlckVudmlyb25tZW50Ijp7ImVudiI6e319LCJjYWNoZSI6eyJkaXNhYmxlZCI6ZmFsc2UsInBhdGhzIjpbXSwiY2xlYXIiOmZhbHNlfSwic2VjcmV0cyI6eyJidWlsZENyZWRlbnRpYWxzIjp7ImtleXN0b3JlIjp7ImRhdGFCYXNlNjQiOiIvdTMrN1FBQUFBSUFBQUFCQUFBQUFRQWdOREJpWm1SbU9UVm1ORE0xTVRNeU9UYzFZemN6TXpZMU5UQTVOakZrWVRFQUFBR2NQaHo5YmdBQUJRSXdnZ1QrTUE0R0Npc0dBUVFCS2dJUkFRRUZBQVNDQk9wZDk4NDV4SG1odUk4MmQ5cFpySHAzUDlJbHpseDZPdXFmNXY4RkVFK0h4WEdVOEVKZlJWYWJqdUU3NHROVTUxTXk1cVpMSFYzYmtVS29xNXVVWFo4QUFSTUxaTE1zR3RoTzFSdTZKS1Z1TkVpMFIyMThPaHRvL0g5UHFHdnFhQWpmdndyZWtCeTFyd2NOdTNDcng2aFAwKzNLTkgvaTNxaDNGam95Vm14ZHZqUGZNWDRxV0dnNFFHZDFxTkF5K3QyZ1lyNUY0dkIyTTdJeUsrL1F4ZnJjUzRoYURwZjRTL2tuVmw5VVZNRS9FQXhtNWN1OThlVEc2cFpkQkswamZ2Szlkc0JGc3VUQkM5bFd4OXBFS1d4SEhHdUM4QnZDenlSSkFNa21IQUE2UXRTWFNhOCtaeUlmU1kwcG1DRnNQa3VCcWxUdUNTOCtBSjF3Nkt3cGQyWmlzaEFRbEVMUE1TNUFtZUF4dXozc1k5ODJBc3MxalJ6dnU0WTZEMUFGN1JOQ09sRWNYWUZkV1ZRMW9lYUVIS3EvbElISzR6T00zZFljK1laeGI0a01rWHd3SnBpMS9MTnRxZndZZjVCOVpZME9TNXpnNS9qWWo2dTBBZ2I5WGNtaFEwbWFRVk5rQmhUNklvMjJyajNNSkhucnNKYXg2dC84ZWxjMUhMbC9MS2UvRUphZU0zSWZTU2c4SC9DTmZUeW1sR2ZtdWJRT0dWMGVzejhkakUydkhmc3ZXallyVjNGVzdVNWpybndIbkVodkl4U2VINVJGd1lJNGowWXZiNEsyRE9tOFR2cHFUM0ZnSDhveUhRZkcyZkd3ZXFZSmlzSm1YZnRTdGxCK29wR2ozVE5xQ1YrbHdWeGJoZ3lxbFZ6QXdvT1VqNThpd3B3NlRzSUxFbkNzZVFzRzBGSkRPM01janhMaTdEdVVvVlNaRU5SN0JpMGF5UWVsRHpiMEdrZnozT0JNTzkzUkRacVRkSXpGOXJDSWRXL25xQXBTaGR3WHdyYnFpNS9RU04yejNiVkFjbVBaYmNMSXg2VEpBN0RTeFJOOUtUSXBQSXdqN3V1YUxxUk14MlM2KzA4cDFEU3ZiVWZxWER6dWRVdHNEVWhaUlEzZ0JEMm9oazRJcmRTT0ZKVE9mRzNOd2VUNFVGZzJiaGtRLzVJOFk4aWE0dUt2ajZQcXVINnJib3JLMDhFQ3psdURQTjJKTDBwUHJ0a0xDVUVUcHVwVmdPR2YxMG9BZFRLdU8xSkIwZDRVd1F6cWJLUnlwclFta3g5V0dEWnZnK3hzS3BsOEFxdW14UlBzb1Y0ellBeHFzVlJDaEI1Qk1ZM2k1dHFtYTFUa0M1Y2c1R3JXbjl4cUVtY0pRQVZ2cllOVzlpMSszWGVuUmxTNW4xT0ZjSlpyVXRSN3hoOVV4VURXMUJOSTlKc0lMTXMxcWlHeWMxeUV1U1lsMkEzbkYxQXNpQktkOW5HY1o0aXQ1N2VjbENSYmQyb3hSWEQ5MGFFbkFMenZOd0VLNVZobGYwMEZKbFU1SGswUFhmOFFnYTN6cHFDT25JZVRFUzA2NUZOOTdVM2tyQ0x4N29uOG9nMjBMamNqcWx4eHQ1SzBuWGRoam03SFp1VHNmMWFObXo5YWhBZWtIRVNBaGNQUzNCVlFDZ3B1dkxhc1NWQ1A3NyswaTVWUEtqYXUwM0Fwd21xM0VwaEZOWXlGMmFqcEJEUnNOUnZKeGk3NGpBT2FWZWwwSjk1SDgrSXpyMUU2VTRoTHlLUVc4VHd3TnMzckZuVWgvSkppMVF5RUJ4c0d0dWV4NEk4R1Jpb2dpZXhWVmRkemNmRytOc2t6UHBSaGx0UE8yY0pMMEw2THF1b05LVTZyWWtJcy9MUmxIWHVPVjVIbWhsUXhKQnBQbzViT29jL0t2QjNSd1FqeHR0NGZzK0Y0NHQ4bVArcis3aEdlV3dMdEE3VTVaSjV6TnoyWUduKzg5SUZUNzJZN204Z1FpdEpMT094MS92ODVEaTk0TGxwaHF6WWo4YzNLMnNWc0NlRDlqYUczanFOZlUySW0zRncwNkc1OVN5QjFteWd4VklpbjJGNXo4Q251S1ZtUTJNVWhYNjhBTkVtcFRmNG5JdENhQTFjM0dvOFFLZUFEVy9uN3FVZDJ4blVQNjU2bnQ0V0pzRm1qanh1NU5BckJpdTBFWjJBRWpEL3pvS2xjYm5qRDVQb2t3MGRlWVB5Q2xTeDZzMHBHQUFBQUFRQUZXQzQxTURrQUFBTXRNSUlES1RDQ0FoR2dBd0lCQWdJSWY0ZmE2MVk5Vjdzd0RRWUpLb1pJaHZjTkFRRUxCUUF3UWpFSk1BY0dBMVVFQmhNQU1Ra3dCd1lEVlFRSUV3QXhDVEFIQmdOVkJBY1RBREVKTUFjR0ExVUVDaE1BTVFrd0J3WURWUVFMRXdBeENUQUhCZ05WQkFNVEFEQWdGdzB5TmpBeU1EZ3hOak0yTlRKYUdBOHlNRFV6TURZeU5qRTJNelkxTWxvd1FqRUpNQWNHQTFVRUJoTUFNUWt3QndZRFZRUUlFd0F4Q1RBSEJnTlZCQWNUQURFSk1BY0dBMVVFQ2hNQU1Ra3dCd1lEVlFRTEV3QXhDVEFIQmdOVkJBTVRBRENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFNSFVwT00waHdJNzNkM2F3SE9oSWdGVFlQZnZEeG5zUFBzVEEwclFSWnVsZEdZRW43VzBDUFlRREkzRnpzWThOTHNrUlNkRGJFS25CZUdCckdOWU1yeUNjWkdGOCt6L3BsaUhKUGxsMnhDdG1sYnQwNTlhanNRUUhjNWF0QmdGYWxsNnRhcVlEUUJkYUhRd0lBSkVEMmNrbVhpMlYvYWpacktvY1lScVdsSjAzSjNMRFVvT3hxblFlZEp1cUpzUUNhazNmK3ozbzV5NjIxaG9SbEt1T01NVGpBbVhKbEdsTGRDZkEzUTlaYjJkTTVBOWJMTEIwK3h1dVdmdVNjb01PTCtiYVRhQTRpTHJoTjYrVnFobjMrK0U2ZUk2VUdIL3Vpc2Qvdlk4NTEvcktpVEMvVTlmTnhCVHNaYVpXK3QxSmRzTWlwQklSQ3JXMlVzZm10aVlISk1DQXdFQUFhTWhNQjh3SFFZRFZSME9CQllFRkJTcjM4TEErVXl1NXpHS3NHUmNMcUQzV245Q01BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQzErTGx3V1dzaElxZjdRbWZZL041M1BXcWFNMWNMVjFRTUJnL2tSazFZUWE3RE1sK3c2VTJWM2pOT2dPRWliU01qR2dCNTA1WTAvS2dIR05LMnJPOTY1cXNLZGJKVlNXMEtQcXVlbFEwa2FOWnZxdk1Vd1Zxay9YSEZlbWRxS0J5U3V5bGNSdHhqdVJqYnRWOWhpNE9raGZodklFN2NlRWU4eXloNkhqRFh2bDg1bW1yNG0vY2RhaVJrOFdHSEoydGR4VzJMT2JvYVlPL3UrODIzb2ZLWGdqS25QVjZSbUc3c1YrMjFWMzdiNGMvenBPVEpGZUZHTTVFYUlvUnNMaGl6OUhXTXlwb1FWU2pHT0xLdjRMUzdsTjdNWjY2eStxeWVZK2V0Ly9Jc2RLRVFsT2U1OHVPRVJKZjVBZkFsSTNwT1dCcW9aVzBQT2o3dFkzajdLazU5b0FZSGd4bzNSRTllVjdOUmZzWVhKN1B3MFR3PSIsImtleXN0b3JlUGFzc3dvcmQiOiI4ODM1MTg1MWVmMjgyMDY0NDFiZDdlOWQxNzJlNmM3ZSIsImtleUFsaWFzIjoiNDBiZmRmOTVmNDM1MTMyOTc1YzczMzY1NTA5NjFkYTEiLCJrZXlQYXNzd29yZCI6ImRmZGFlMDRjNjRkYmFkMTlkZTMyMDYyZTk2OWNhZjRkIn19fSwidXBkYXRlcyI6e30sImRldmVsb3BtZW50Q2xpZW50Ijp0cnVlLCJidWlsZFR5cGUiOiJhcGsiLCJ1c2VybmFtZSI6InJla2Fua295ZSIsInZlcnNpb24iOnsidmVyc2lvbkNvZGUiOiIxMCJ9LCJleHBlcmltZW50YWwiOnt9LCJtb2RlIjoiYnVpbGQiLCJ0cmlnZ2VyZWRCeSI6IkVBU19DTEkiLCJhcHBJZCI6ImQwYWY1MmU3LThlNjMtNDQyNi05ZTkyLTMwZjBlODM1NjUyZCIsImluaXRpYXRpbmdVc2VySWQiOiI1MGIzYjc2YS03ZmNiLTQwMDEtODJlOC00NTA3NTAyMzE2ZTYifSwibWV0YWRhdGEiOnsidHJhY2tpbmdDb250ZXh0Ijp7InRyYWNraW5nX2lkIjoiNDgwZWRjOTUtNmFmYS00M2Y1LTk5N2EtMWFlNjdjOTFhZjk4IiwicGxhdGZvcm0iOiJhbmRyb2lkIiwic2RrX3ZlcnNpb24iOiI1NS4wLjAiLCJhY2NvdW50X2lkIjoiNmZhMGNkZjgtOTJkNC00ZDVhLTljMDMtMDg2ZmViNjFlYTg5IiwicHJvamVjdF9pZCI6ImQwYWY1MmU3LThlNjMtNDQyNi05ZTkyLTMwZjBlODM1NjUyZCIsInByb2plY3RfdHlwZSI6Im1hbmFnZWQiLCJkZXZfY2xpZW50Ijp0cnVlLCJkZXZfY2xpZW50X3ZlcnNpb24iOiI1NS4wLjExIiwibm9fd2FpdCI6ZmFsc2UsInJ1bl9mcm9tX2NpIjpmYWxzZSwibG9jYWwiOnRydWV9LCJhcHBCdWlsZFZlcnNpb24iOiIxMCIsImFwcFZlcnNpb24iOiIxLjEuMCIsImNsaVZlcnNpb24iOiIxOC4xLjAiLCJ3b3JrZmxvdyI6Im1hbmFnZWQiLCJjcmVkZW50aWFsc1NvdXJjZSI6InJlbW90ZSIsInNka1ZlcnNpb24iOiI1NS4wLjAiLCJydW50aW1lVmVyc2lvbiI6IjEuMS4wIiwiZmluZ2VycHJpbnRIYXNoIjoiNWZlY2Q5ZTJjNTM2OWFjMzU4Yzk1ZTBhOTRlNTE2Y2VkYTgwOGI3MSIsInJlYWN0TmF0aXZlVmVyc2lvbiI6IjAuODMuMiIsImRpc3RyaWJ1dGlvbiI6ImludGVybmFsIiwiYXBwTmFtZSI6IkNvbGxlZ2UgQ29tbXVuaXR5IiwiYXBwSWRlbnRpZmllciI6ImNvbS5jb2xsZWdlY29tbXVuaXR5IiwiYnVpbGRQcm9maWxlIjoiZGV2ZWxvcG1lbnQiLCJnaXRDb21taXRIYXNoIjoiNWM4ZmU3NDQzYTJlOGM2OWQ2YWJkNjNhNDRkZDRmZGQ2ZjNhMGJjYSIsImdpdENvbW1pdE1lc3NhZ2UiOiJPUCAyIiwiaXNHaXRXb3JraW5nVHJlZURpcnR5Ijp0cnVlLCJ1c2VybmFtZSI6InJla2Fua295ZSIsInJ1bldpdGhOb1dhaXRGbGFnIjpmYWxzZSwicnVuRnJvbUNJIjpmYWxzZSwiZGV2ZWxvcG1lbnRDbGllbnQiOnRydWUsInJlcXVpcmVkUGFja2FnZU1hbmFnZXIiOiJucG0iLCJzaW11bGF0b3IiOmZhbHNlfX0= exited with non-zero code: 1
    Error: build command failed.
rekan@Rekan:/mnt/c/Users/rekan/OneDrive/Desktop/college-community$