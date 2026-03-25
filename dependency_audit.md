# Future-Proof Dependency Report — 2026-2027

> Strategy: One EAS build with all native changes, then ship everything else via EAS Update.

---

## 🔴 DEPRECATION RISKS — Fix Now or Break Later

These are **currently installed** dependencies heading toward removal or abandonment.

---

### 1. `react-native-fs` → Remove (abandoned)

| | |
|---|---|
| **Status** | ⛔ **Abandoned.** Last release May 2022 (RN 0.68). You're on RN 0.83. |
| **Risk** | Will eventually fail to compile on newer RN/Android/iOS versions. |
| **You already have** | `expo-file-system` (v55) — same functionality, actively maintained. |
| **Action** | Migrate any `react-native-fs` usages → `expo-file-system`, then `npm uninstall react-native-fs` |

---

### 2. `expo-linear-gradient` → Planned deprecation (SDK 56+)

| | |
|---|---|
| **Status** | ⚠️ **Deprecation announced.** Expo recommends migrating to React Native's built-in `experimental_backgroundImage` style property, which supports CSS `linear-gradient()` syntax natively. |
| **Risk** | Will be removed in SDK 56 or 57. You use this in **every screen** (~15+ files). |
| **Action now** | Keep it for this build — the replacement API is still `experimental_`. But **plan the migration**: when `backgroundImage` drops the "experimental" prefix (likely SDK 56), do a bulk find-and-replace. No new dep needed. |
| **No install needed** | Built into React Native core. |

---

### 3. `@expo/vector-icons` → Soft deprecation path

| | |
|---|---|
| **Status** | ⚠️ Expo now recommends `expo-symbols` (SF Symbols) for iOS and custom icon fonts. `@expo/vector-icons` still works but is no longer the "first choice." |
| **Risk** | Low short-term. It bundles ALL icon sets (~50MB raw), which hurts initial load. Won't break, but will feel increasingly outdated. |
| **Action** | No urgency. Keep using Ionicons. When you do a larger redesign, consider migrating to custom SVG icons via `react-native-svg` (see additions below). |

---

### 4. `@react-native-async-storage/async-storage` → Superseded

| | |
|---|---|
| **Status** | ⚠️ Expo recommends `expo-sqlite` as the default for local data persistence. AsyncStorage still works but is slower and less capable. |
| **You already have** | `react-native-mmkv` — which is **better** than both for simple key-value storage (synchronous, JSI-based, 30x faster). |
| **Risk** | None immediate. AsyncStorage is still maintained. |
| **Action** | Migrate any `AsyncStorage` usages → `react-native-mmkv` (already installed). Then `npm uninstall @react-native-async-storage/async-storage` to remove the redundant dep. |

---

### 5. `@react-native-community/slider` → Stale

| | |
|---|---|
| **Status** | ⚠️ Last major update was 2023. The RN community package is maintained but slow. |
| **Risk** | Low. Still works on new architecture. |
| **Action** | No urgency. Keep for now. |

---

## 🟢 RECOMMENDED ADDITIONS — Best Practice for 2026-2027

### Tier 1: Must-Have (high impact, industry standard)

| Library | Why | Native? |
|---|---|---|
| **`expo-image`** | Replaces `<Image>` globally. Disk caching, blurhash placeholders, progressive loading, AVIF/WebP support. The single biggest UX win. | ✅ Yes |
| **`react-native-svg`** | Custom vector graphics: role badges, onboarding illustrations, empty states, charts. Industry standard since 2019, actively maintained, New Architecture ready. | ✅ Yes |

```bash
npx expo install expo-image react-native-svg
```

---

### Tier 2: Strong Recommendations (meaningful UX/DX improvement)

| Library | Why | Native? |
|---|---|---|
| **`@gorhom/bottom-sheet`** | Unified gesture-driven bottom sheets. Replaces your 6+ different modal patterns. Uses reanimated + gesture-handler (already installed). | ✅ Yes |
| **`expo-local-authentication`** | Biometric app lock (fingerprint/Face ID). Valuable for teacher/admin accounts with sensitive content. | ✅ Yes |
| **`expo-screen-capture`** | Prevent screenshots in private/E2E encrypted chats. Privacy-first approach. | ✅ Yes |
| **`expo-calendar`** | Lecture scheduling integration — let users add lecture times to their device calendar. Works cross-platform. | ✅ Yes |

```bash
npx expo install @gorhom/bottom-sheet expo-local-authentication expo-screen-capture expo-calendar
```

---

### Tier 3: Nice-to-Have (future-proofs specific areas)

| Library | Why | Native? |
|---|---|---|
| **`expo-network`** | Reliable native network detection (WiFi vs cellular, actual reachability). Better than JS-based checks for offline banners + message queuing. | ✅ Yes |
| **`burnt`** | Native toast notifications (iOS 17 style). Lightweight, looks premium. Great for success/error feedback instead of custom Alert modals. | ✅ Yes |
| **`zeego`** | Native context menus (iOS long-press menus, Android popup menus). Would replace your custom `PostCardMenu` with native-feeling menus. | ✅ Yes |

```bash
npx expo install expo-network burnt zeego
```

---

## 🔵 THINGS THAT DON'T NEED NEW DEPS

| Feature/Improvement | Why no new dep |
|---|---|
| Guest role + UI | Pure JS context/conditional rendering |
| Teacher role + UI | Pure JS context/conditional rendering |
| Onboarding tutorial | `react-native-reanimated` (v4.2 installed) + `react-native-mmkv` for "seen" flags |
| Settings guide/help | Modal overlays with existing animation libs |
| Remaining 24 UI/UX audit fixes | All JS-only (tokens, a11y, spacing, RTL) |
| RTL improvements | Already have `expo-localization` + `i18next` |
| Dark/Light theme polish | Already have design token system |
| TypeScript migration | Dev dependency only — `typescript` already in devDeps |
| Hermes v1 opt-in | Config change in `expo-build-properties` — no install |

---

## 📦 CLEANUP — Remove Before Build

| Remove | Reason |
|---|---|
| `react-native-fs` | Abandoned. Replaced by `expo-file-system` (already installed). |
| `@react-native-async-storage/async-storage` | Redundant. `react-native-mmkv` (already installed) is faster. |

```bash
npm uninstall react-native-fs @react-native-async-storage/async-storage
```

---

## 🎯 Final Install Command — One Build

```bash
# Tier 1 (must-have)
npx expo install expo-image react-native-svg

# Tier 2 (recommended)
npx expo install @gorhom/bottom-sheet expo-local-authentication expo-screen-capture expo-calendar

# Tier 3 (nice-to-have)
npx expo install expo-network burnt zeego

# Cleanup
npm uninstall react-native-fs @react-native-async-storage/async-storage

# Verify
npx expo-doctor
```

### After this build:
- All future JS-only work ships via **EAS Update** (`eas update --branch native-app`)
- No new native builds needed until **Expo SDK 56** (estimated Q4 2026)

---

## ⏰ Upcoming SDK 56 Heads-Up (plan for later, not now)

| Change | Impact |
|---|---|
| `expo-linear-gradient` removal | Migrate to `backgroundImage` CSS gradients (built-in) |
| Hermes v1 becomes default | Better performance, no action needed |
| `expo-video-thumbnails` removal | Already replaced by `expo-video`'s `generateThumbnailsAsync` |
| Possible `@expo/vector-icons` sunset | Consider SVG icon migration (you'll have `react-native-svg` by then) |
