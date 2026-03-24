# College Community — UI/UX Audit Report (50 Issues)

> All proposed fixes are **pure JavaScript / React Native / Expo-compatible** — no native module changes or new library installations required.

---

## 🎨 Hardcoded Colors (Design Token Violations)

### ✅ 1. Hardcoded gradient colors across all screens

**Files:** `Home.jsx:L~440`, `Post.jsx:L441`, `Profile.jsx:L340,722`, `Lecture.jsx:L851-853`, `Chats.jsx`
**Issue:** Dark and light gradient arrays (`['#1a1a2e','#16213e','#0f3460']` / `['#e3f2fd','#bbdefb','#90caf9']`) are **hardcoded in every screen** instead of referencing `designTokens.js`.
**Fix:** Add `gradient.dark` and `gradient.light` arrays to `designTokens.js` and reference them as `theme.gradient.background` in every screen.

---

### ✅ 2. ActivityIndicator fallback uses hardcoded `#007AFF`

**File:** `Post.jsx:L431`
**Issue:** The loading fallback when `appSettings` is null renders `<ActivityIndicator color="#007AFF" />` instead of using the theme's primary color.
**Fix:** Replace with `colors?.primary || designTokens.light.primary` or move the guard above the `const theme = …` assignment so the theme is always available.

---

### ✅ 3. Hardcoded white `#FFFFFF` on all button labels

**Files:** `Lecture.jsx:L818,821,822,989-990,1318,1353`, `Post.jsx:L458,1103`
**Issue:** Button text colors like `joinBtnText`, `emptyCreateBtnText`, and `postButtonText` are hardcoded to `#FFFFFF` instead of using a theme token (e.g., `theme.buttonText`).
**Fix:** Add a `buttonText` or `onPrimary` token to `designTokens.js` (white for dark, white for light) and use it everywhere.

---

### ✅ 4. Hardcoded success / error / warning colors in tag & link chips

**File:** `Post.jsx:L832-834,889,902-904,959,1219,1234,1251`
**Issue:** Colors like `#8B5CF6` (purple for tags), `#3B82F6` (blue for links), `#10b981` (green for joined badges), `#ef4444` (red for validation) are scattered as raw hex values.
**Fix:** Define semantic tokens `theme.tag`, `theme.link`, `theme.success`, `theme.error` in `designTokens.js` and reference them.

---

### ✅ 5. Hardcoded dark scrim colors in modals

**Files:** `Lecture.jsx:L1366,1526`, `Post.jsx:L1447`
**Issue:** Modal backdrop scrim colors like `rgba(7, 12, 26, 0.40)` and `rgba(0, 0, 0, 0.9)` are not theme-aware. Dark mode vs light mode should have different scrim opacities.
**Fix:** Add `theme.overlay` and `theme.scrim` tokens with appropriate opacity for each mode.

---

## ♿ Accessibility Issues

### ✅ 6. Missing `accessibilityLabel` on most interactive elements

**Files:** `Home.jsx`, `Lecture.jsx`, `Post.jsx`, `Chats.jsx`
**Issue:** The vast majority of `TouchableOpacity` buttons across the app lack `accessibilityLabel` props. Screen readers can't convey action intent.
**Fix:** Add descriptive `accessibilityLabel={t('...')}` to all interactive elements (search buttons, filter tabs, join buttons, post creation buttons, image pickers, etc.).

---

### ✅ 7. Missing `accessibilityRole` on interactive elements

**Files:** All tab screens and components
**Issue:** Interactive items like filter chips, post type selectors, toggle buttons, and navigation icons don't declare `accessibilityRole="button"`. The `GlassIconButton` component does set it when `onPress` is provided (line 325), but many manual `TouchableOpacity` wrappers don't.
**Fix:** Add `accessibilityRole="button"` (or `"link"`, `"checkbox"`, `"switch"` as appropriate) to all interactive components.

---

### ✅ 8. Poll choices lack `accessibilityState` for selection indication

**File:** `PostCard.jsx:L438-443`
**Issue:** Poll option buttons don't communicate their selected/checked state to assistive technologies.
**Fix:** Add `accessibilityState={{ checked: isSelected }}` and `accessibilityRole="radio"` (or `"checkbox"` for multi-select) to poll option `TouchableOpacity`.

---

### ✅ 9. Image thumbnails have no alt-text content description

**Files:** `Post.jsx:L978`, `PostCard.jsx:L536-541`
**Issue:** `<Image>` components for post images and image previews have no `accessibilityLabel` or `accessible` prop, making them invisible to screen readers.
**Fix:** Add `accessible accessibilityLabel={t('post.imageAlt', { index: index + 1 })}` to all image elements.

---

### ✅ 10. `Switch` components missing accessibility labels

**Files:** `Post.jsx:L696-702,710-716,1001-1007`
**Issue:** Toggle switches for poll options (`multiAnswer`, `showVoters`) and `canOthersRepost` have no `accessibilityLabel`.
**Fix:** Add `accessibilityLabel={t('post.poll.multiAnswer')}` etc. to each `<Switch>`.

---

## 📱 Touch Target & Interaction Issues

### ✅ 11. Search clear button has no `hitSlop`

**Files:** `Lecture.jsx:L902`, `SearchBar.jsx:L426`
**Issue:** The clear-search icon (`close-circle`, 16px) is a 16×16 tap target — well below the 44×44pt minimum.
**Fix:** Add `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` to the clear button.

---

### ✅ 12. PostCard "See More" / "See Less" button has a tiny tap target

**File:** `PostCard.jsx:L732-741`
**Issue:** The `seeMoreButton` style has minimal padding, making it hard to tap on mobile.
**Fix:** Increase `paddingVertical` to at least `spacing.sm` (8pt) in the `seeMoreButton` style.

---

### ✅ 13. Poll choice remove button is too small on smaller screens

**File:** `Post.jsx:L639-645`
**Issue:** The poll choice trash icon button is `moderateScale(40)` but the icon inside is only 18px. On small screens the touchable area around the icon is adequate, but the visual target is small and may confuse users.
**Fix:** Add a subtle border tint when the button is interactive and dim the icon when `disabled`. Consider using `hitSlop` as a safety margin.

---

### ✅ 14. Channel card 3-dot menu button has no `hitSlop`

**File:** `Lecture.jsx:L770-772`
**Issue:** The more-options button (`ellipsis-horizontal`) on channel cards has no `hitSlop`, relying only on the icon size for the tap area.
**Fix:** Add `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` to the `TouchableOpacity`.

---

## 🔄 Loading & Empty State Issues

### ✅ 15. No skeleton loader on Lecture screen initial load

**File:** `Lecture.jsx:L968-971`
**Issue:** When `loading` is true and the list is empty, only a plain `ActivityIndicator` is shown — unlike the Home screen which uses `SkeletonLoader`. This is an inconsistent loading experience.
**Fix:** Use the existing `ChatListSkeleton` or create a `ChannelListSkeleton` component to show placeholder cards during initial load.

---

### ✅ 16. No retry mechanism on Lecture channel load failure

**File:** `Lecture.jsx:L967-994`
**Issue:** If `loadChannels` fails, the empty state shows a "create channel" button but no "retry" or "try again" option.
**Fix:** Add a retry button in the empty state that calls `loadChannels({ showLoading: true })`, similar to how the Profile screen uses `UnifiedEmptyState` with `onAction`.

---

### ✅ 17. Profile posts error state uses different pattern than other screens

**File:** `Profile.jsx:L690-704`
**Issue:** The Profile error state uses `UnifiedEmptyState` (good!) but the error message shows `postsError` raw, which could be an untranslated technical string.
**Fix:** Wrap the error message in a user-friendly translation: `t('errors.postsLoadFailed')` with a fallback.

---

### ✅ 18. Post creation success auto-navigates too quickly

**File:** `Post.jsx:L395-397`
**Issue:** After successful post creation, a 1600ms timeout navigates to Home. Users may not register the success alert before being navigated away.
**Fix:** Increase the timeout to 2200ms, or better, navigate on alert dismissal rather than a fixed timer.

---

## 📐 Layout & Spacing Inconsistencies

### ✅ 19. Mixed spacing values: raw numbers vs `spacing` tokens

**Files:** `Post.jsx:L1074,1079,1163,1196`, `Lecture.jsx:L1196,1210,1275,1295`
**Issue:** Many `StyleSheet` values use raw numbers (e.g., `gap: 3`, `marginTop: 2`, `paddingVertical: 3`) alongside the `spacing` token system. This creates visual inconsistency.
**Fix:** Replace raw pixel values with `spacing.xs` (4), `spacing.xxs` (2), etc. Define a `spacing.xxs` if not already available.

---

### ✅ 20. Inconsistent `borderRadius` usage: raw numbers vs tokens

**Files:** `Post.jsx:L1092,1176-1177,1205-1206,1229-1230,1280`, `PostCard.jsx` styles
**Issue:** Some borders use `borderRadius: 10`, `borderRadius: 12`, `borderRadius: 14` while others use `borderRadius.sm`, `borderRadius.md`, `borderRadius.lg`.
**Fix:** Replace all hardcoded border radius values with the appropriate design token from `designTokens.js`.

---

### ✅ 21. Post.jsx header uses pixel values, not responsive utilities

**File:** `Post.jsx:L1074-1077,1083-1085,1090-1095`
**Issue:** The header area uses raw `paddingHorizontal: 16`, `fontSize: 22`, `paddingVertical: 14`, etc., while other areas use `fontSizeUtil()`, `spacing`, and `moderateScale()`.
**Fix:** Replace with responsive equivalents: `paddingHorizontal: spacing.md`, `fontSize: fontSizeUtil(22)`.

---

### ✅ 22. Image preview modal close button uses fixed `top: 50`

**File:** `Post.jsx:L1466`
**Issue:** The close button in the image preview modal has `top: 50` hardcoded, which doesn't account for the safe area inset on devices with notches.
**Fix:** Use `top: insets.top + spacing.md` (requires adding `useSafeAreaInsets` to Post.jsx, or pass it down).

---

### ✅ 23. Channel suggested cards have fixed `minWidth: wp(36)`

**File:** `Lecture.jsx:L1189`
**Issue:** The suggested channel cards use a percentage-based min-width but no `maxWidth`, causing them to stretch awkwardly on tablets.
**Fix:** Add `maxWidth: wp(50)` to constrain the cards on wider screens.

---

## 🌐 RTL & Internationalization Issues

### ✅ 24. Post.jsx missing RTL support on action buttons row

**File:** `Post.jsx:L775`
**Issue:** The `actionButtonsRow` (tags/links/images buttons) reverses via `isRTL && styles.rowReverse`, which is correct, but individual button content (icon + text) does not reverse — icons always appear on the left.
**Fix:** Add `isRTL && styles.rowReverse` inside each action button's style to reverse icon + label order.

---

### ✅ 25. Image preview "remove" button position is not RTL-aware

**File:** `Post.jsx:L1283-1286`
**Issue:** The remove button on image previews is always `top: 6, right: 6`. In RTL layouts, it should be `left: 6`.
**Fix:** Conditionally swap: `[isRTL ? { left: 6 } : { right: 6 }]`.

---

### ✅ 26. PostCard footer doesn't reverse icon order in RTL

**File:** `PostCard.jsx:L790-791`
**Issue:** The footer uses `isRTL && { flexDirection: 'row-reverse' }` at the container level, but the `footerLeft` group (like/reply/bookmark actions) stays in `row` direction internally — icons don't appear in the expected RTL order within each group.
**Fix:** Apply `flexDirection: isRTL ? 'row-reverse' : 'row'` to `footerLeft` as well.

---

### ✅ 27. Chat filter tabs use `marginRight` instead of directional margin

**File:** `Chats.jsx` (inferred from similar patterns)
**Issue:** Several components use `marginRight` for spacing between elements instead of `marginEnd` or `gap`, which doesn't adapt to RTL.
**Fix:** Replace `marginRight` with `marginEnd` or use `gap` in `flexDirection: 'row'` containers.

---

### ✅ 28. SearchBar back button margin doesn't swap

**File:** `SearchBar.jsx:L545-550`
**Issue:** The back button uses `marginRight: spacing.sm` in LTR, and the RTL override only corrects it when `isRTL` is truthy. If `isRTL` is undefined (edge case), the margin won't reset.
**Fix:** Use a ternary: `isRTL ? { marginLeft: spacing.sm, marginRight: 0 } : { marginRight: spacing.sm }`.

---

## 🖼 Visual & UX Polish Issues

### ✅ 29. No visual feedback on post "visibility" cycle button

**File:** `Post.jsx:L513-531`
**Issue:** The visibility toggle button (`cycleVisibility`) simply changes the label text with no animation or transition, making it feel abrupt.
**Fix:** Add a subtle scale animation using `Animated.spring` when the value changes, or flash the icon's color briefly to signal the change.

---

### ✅ 30. Post type and stage selectors have no error state styling

**File:** `Post.jsx:L496-506`
**Issue:** When the user submits without selecting a stage, the alert fires but the dropdown itself doesn't visually indicate the error.
**Fix:** Track validation errors in state and apply `borderColor: theme.error` to the relevant `SearchableDropdownNew` when the field is invalid.

---

### ✅ 31. Lecture channel description truncation inconsistency

**File:** `Lecture.jsx:L786-789`
**Issue:** Channel descriptions use `numberOfLines={2}` but there's no "show more" mechanism. Long descriptions are silently truncated.
**Fix:** Either add a small "more" indicator / ellipsis treatment, or increase `numberOfLines` to 3 for better context.

---

### ✅ 32. Profile QR modal close button is just an `×` with no label

**File:** `Profile.jsx:L779-781`
**Issue:** The QR modal close button is an icon-only `TouchableOpacity` with no `accessibilityLabel`.
**Fix:** Add `accessibilityLabel={t('common.close')}` and `accessibilityRole="button"`.

---

### ✅ 33. PostCard resolved badge has no visual emphasis

**File:** `PostCard.jsx:L72`
**Issue:** The resolved state is tracked (`resolved`) but there's no prominent visual badge or checkmark on the card to indicate a question has been answered.
**Fix:** When `post.postType === 'question' && resolved`, show a small green `checkmark-circle` badge next to the type badge, with label `t('post.resolved')`.

---

### ✅ 34. No character limit feedback on Lecture channel creation

**File:** `Lecture.jsx:L~440-600` (CreateChannelModal)
**Issue:** The channel name and description inputs have max length, but there's no visible character counter (like Post.jsx has).
**Fix:** Add an inline character count (e.g., `{name.length}/50`) below or inside each input, using the same pattern as Post.jsx's `inlineCharCount` style.

---

### ✅ 35. Empty tag chips container visible when tags array is empty

**File:** `Post.jsx:L830`
**Issue:** The tags `chipsContainer` renders even if `tags.length === 0`, leaving an empty gap with `marginBottom: 8`.
**Fix:** Wrap the chips container in `{tags.length > 0 && ...}`.

---

## ⚡ Performance-Impacting UX Issues

### ✅ 36. FlashList on Lecture screen missing `estimatedItemSize`

**Files:** `Lecture.jsx:L920,960`
**Issue:** Both the horizontal suggested channels `FlashList` and the main channels list lack `estimatedItemSize`. FlashList warns about this and falls back to a less optimal layout strategy.
**Fix:** Add `estimatedItemSize={80}` for horizontal list and `estimatedItemSize={130}` for vertical list.

---

### ✅ 37. Image list in Post.jsx uses `ScrollView` instead of `FlashList`

**File:** `Post.jsx:L970`
**Issue:** Image previews use a horizontal `ScrollView`. For consistency and performance (especially with many images), it should match the rest of the app's list approach.
**Fix:** Replace with `FlashList horizontal` with `estimatedItemSize={152}` (140 + 12 margin).

---

### ✅ 38. `postTypeOptions` array is recreated on every render

**File:** `Post.jsx:L140-143`
**Issue:** `postTypeOptions` is declared as a `const` inside the component body, meaning it's recreated every render — including the spread of `POST_TYPE_OPTIONS`.
**Fix:** Wrap in `useMemo(() => [...POST_TYPE_OPTIONS, { value: POST_TYPES.POLL, labelKey: 'post.types.poll' }], [])`.

---

### ✅ 39. Multiple `useEffect` hooks with the same dependency trigger redundant fetches

**File:** `Profile.jsx:L187-191,233-237`
**Issue:** Two separate `useEffect` hooks watch `user?.$id` and `postsLoaded` to call `loadUserPosts()`. Both can fire on mount, causing a potential double-fetch.
**Fix:** Consolidate into a single `useEffect` with both conditions.

---

## 🧩 Component & Pattern Issues

### ✅ 40. Inconsistent modal dismiss patterns

**Files:** `Lecture.jsx:L1010-1018`, `Post.jsx:L1018-1047`, `Profile.jsx:L767-794`
**Issue:** Some modals use `TouchableOpacity` with `activeOpacity={1}` as the backdrop (Lecture, Post), others use `BlurView` scrim (Lecture channel menu), and Profile uses a different structure entirely.
**Fix:** Standardize on a single `ModalBackdrop` wrapper component that handles scrim, blur, and dismiss consistently.

---

### ✅ 41. `SearchBar` search modal gradient differs from other screens in light mode

**File:** `SearchBar.jsx:L376-378`
**Issue:** The SearchBar light mode uses a warm gradient (`['#FFFEF7','#FFF9E6','#FFF4D6']`) while all other screens use cool blue (`['#e3f2fd','#bbdefb','#90caf9']`).
**Fix:** Use the same light-mode gradient palette as the rest of the app, or define the search gradient as a distinct design token.

---

### ✅ 42. `FeedSelector` uses hardcoded button width ratios

**File:** `FeedSelector.jsx:L70`
**Issue:** Button ratios `[0.426, 0.273, 0.301]` are hardcoded, meaning any label length change (e.g., from translation) won't adapt.
**Fix:** Measure each label with `onLayout` and compute ratios dynamically, or use `flex` sizing that adapts to content.

---

### ✅ 43. `GlassCard` has a fixed `borderRadius` of 16

**File:** `GlassComponents.jsx:L117`
**Issue:** Unlike `GlassContainer` which accepts a `borderRadius` prop, `GlassCard` always uses `const borderRadius = 16`. This limits reuse in contexts that need different radii.
**Fix:** Accept a `borderRadius` prop with a default of 16, just like `GlassContainer` does.

---

### ✅ 44. Stale closure risk in PostCard bookmark handler

**File:** `PostCard.jsx:L207-218`
**Issue:** `handleBookmark` uses `actionLockRef` for debouncing, but calls `togglePostBookmark(post.$id, ...)` — if the post prop changes during the async operation, `post.$id` may be stale.
**Fix:** Capture `post.$id` in a local variable at the top of the handler: `const postId = post.$id;` and use that in the async call.

---

## 📝 Form & Input UX Issues

### ✅ 45. No maximum length indicator on link input

**File:** `Post.jsx:L916-946`
**Issue:** Tag inputs have a clear limit (`tags.length < 10`) and visual feedback, but link inputs have no max count and no clear visual limit. Users could add unlimited links.
**Fix:** Define a `MAX_LINKS_PER_POST` constant (e.g., 5) and add the same `editable={!loading && links.length < MAX_LINKS_PER_POST}` logic as tags. Display a counter.

---

### ✅ 46. `onChangeText` tag handler's space-trigger behavior is undiscoverable

**File:** `Post.jsx:L853-863`
**Issue:** Tags are added when the user types a space character, which is a hidden interaction pattern. There's no hint telling users to press space to add a tag.
**Fix:** The existing `tagsInputHelper` text is shown, but ensure its content communicates "Press space or Enter to add a tag" clearly. Update the translation key if needed.

---

### ✅ 47. Poll choices don't show validation state before submission

**File:** `Post.jsx:L620-647`
**Issue:** If a user tries to submit with fewer than 2 filled poll choices, they get an alert. But empty choices aren't visually flagged beforehand.
**Fix:** When `postType === POLL` and the submit is pressed, highlight empty choice inputs with `borderColor: theme.error` before showing the alert.

---

### ✅ 48. Quiz mode "correct answer" selection is only available after **all** choices are filled

**File:** `Post.jsx:L723-727`
**Issue:** Empty poll choices are filtered out in the correct answer UI (`if (!choiceLabel) return null`). Users must fill in all options before they can select the correct one — but there's no visual guidance about this.
**Fix:** Show a helper text: `t('post.poll.fillChoicesFirst')` when `isQuizPoll` is true and some choices are still empty.

---

## 🔔 Feedback & Communication Issues

### ✅ 49. Silent error handling in Profile like/resolve actions

**File:** `Profile.jsx:L269-271,285-287`
**Issue:** `handleLike` and `handleMarkResolved` catch errors but do nothing — no toast, no alert, no visual rollback. The user sees the optimistic update but if the network fails, the state silently reverts on next refresh.
**Fix:** Add rollback of the optimistic state in the catch block, along with `showAlert({ type: 'error', ... })`, matching the pattern already used in `handleDeletePost`.

---

### ✅ 50. Lecture join request has no optimistic UI feedback

**File:** `Lecture.jsx:L811-826`
**Issue:** When clicking "Join", the button shows an `ActivityIndicator` during `isJoining`, which is good. However, after joining, the channel card doesn't immediately update to a "Pending" state in the UI — it only updates after a data refresh.
**Fix:** After `handleRequestJoin` resolves successfully, optimistically add the channel ID to the `pendingChannelIdSet` so the card immediately renders a "Pending" badge, before the next server sync.

---

## Summary

| Category              | Count  |
| --------------------- | ------ |
| 🎨 Hardcoded Colors   | 5      |
| ♿ Accessibility      | 5      |
| 📱 Touch Targets      | 4      |
| 🔄 Loading & States   | 4      |
| 📐 Layout & Spacing   | 5      |
| 🌐 RTL & i18n         | 5      |
| 🖼 Visual Polish      | 7      |
| ⚡ Performance        | 4      |
| 🧩 Component Patterns | 5      |
| 📝 Form UX            | 4      |
| 🔔 Feedback           | 2      |
| **Total**             | **50** |
