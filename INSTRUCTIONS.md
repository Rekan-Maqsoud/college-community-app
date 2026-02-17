# College Community – Engineering Instructions

This file reflects the current codebase and gives implementation guidance for future tasks.

## 1) Working Rules

- Use JavaScript only.
- Keep user-facing text in translation keys (`locales/en.js`, `locales/ar.js`, `locales/ku.js`).
- Use existing responsive helpers (`wp`, `hp`, `fontSize`, `spacing`, `moderateScale`).
- Use existing theme/context (`useAppSettings`, `useUser`) and avoid hardcoded styling primitives where context values exist.
- Apply minimal, focused changes; do not refactor unrelated modules.

## 2) Where to Build What

- Auth issues: `app/auth/*`, `database/auth.js`
- Feed/posts/replies: `app/tabs/Home.jsx`, `app/components/PostCard.jsx`, `database/posts.js`, `database/replies.js`
- Chat behavior: `app/screens/ChatRoom.jsx`, `app/screens/chatRoom/useChatRoom.js`, `app/components/MessageInput.jsx`, `app/components/MessageBubble.jsx`, `database/chats.js`, `database/userChatSettings.js`
- Profiles/social graph: `app/screens/UserProfile.jsx`, `app/tabs/Profile.jsx`, `database/users.js`
- Notifications: `app/screens/Notifications.jsx`, `database/notifications.js`, `services/pushNotificationService.js`
- Settings/personalization: `app/screens/settings/*`, `app/context/AppSettingsContext.jsx`

## 3) Core Quality Checklist (before merge)

- Add missing translation keys to all 3 locale files.
- Confirm loading + empty + error state UX in changed screens.
- Validate Appwrite permission model for any new collection/document writes.
- Verify no commented dead code / leftover TODOs.
- Run relevant tests (`npm run test:critical` minimum for risky changes).

## 4) 30 Dev-Ready Critical Updates

### A) 10 New Features

1. **Campus Events Hub**  
   Build an events module (create/list/save RSVP/reminders) with event categories and department targeting.  
   **Files:** `app/screens/events/*` (new), `database/events.js` (new), `app/App.js` navigation, `locales/*`.  
   **Acceptance:** users can create events, RSVP, see upcoming events, and receive reminders.

2. **Student Marketplace**  
   Add buy/sell listings (books/devices/services) with chat-to-seller entry and moderation flags.  
   **Files:** `app/screens/marketplace/*` (new), `database/marketplace.js` (new), `database/notifications.js`.  
   **Acceptance:** users can post listings, browse/filter, and contact seller via existing chat.

3. **Study Buddy Matching**  
   Implement matching by department/stage/course tags and availability windows.  
   **Files:** `app/screens/studyBuddy/*` (new), `database/studyBuddy.js` (new), `app/screens/chats/NewChat.jsx`.  
   **Acceptance:** user can create profile, discover matches, and start a private chat.

4. **Club/Community Spaces**  
   Add club entities with membership, announcements, and role-based posting.  
   **Files:** `app/screens/clubs/*` (new), `database/clubs.js` (new), `database/chats.js` integration.  
   **Acceptance:** users can join/leave clubs and receive club announcement notifications.

5. **Course Channels**  
   Add course-specific channels (ex: “Data Structures – Stage 2”) with auto-suggest based on profile.  
   **Files:** `app/screens/courses/*` (new), `database/courses.js` (new), `database/chatHelpers.js`.  
   **Acceptance:** users can discover/join course channels and see course-scoped content.

6. **Post Polls**  
   Extend posts with poll options and vote tracking (single vote per user, editable by owner pre-close).  
   **Files:** `app/tabs/Post.jsx`, `app/components/PostCard.jsx`, `database/posts.js`, `locales/*`.  
   **Acceptance:** poll creation/voting/results work in feed and post details.
✅✅
7. **Anonymous Ask Mode (Scoped)**  
   Add optional anonymous posting for question-type posts with abuse guardrails.  
   **Files:** `app/tabs/Post.jsx`, `database/posts.js`, moderation flow in `database/posts.js`.  
   **Acceptance:** anonymous question hides author identity from peers while preserving moderation controls.
✅✅
8. **Opportunity Board**  
   Add internships/scholarships/campus jobs section with deadline metadata and saved alerts.  
   **Files:** `app/screens/opportunities/*` (new), `database/opportunities.js` (new), notifications integration.  
   **Acceptance:** users can browse, save, and get pre-deadline reminders.

9. **Resource Libraries**  
   Add curated resource collections (notes/links) per department/course with contributor attribution.  
   **Files:** `app/screens/resources/*` (new), `database/resources.js` (new).  
   **Acceptance:** resources can be added, searched, and upvoted by peers.

10. **Reputation & Badge System**  
    Implement points/badges from constructive actions (accepted replies, helpful replies, moderation trust).  
    **Files:** `database/users.js`, `database/replies.js`, `app/screens/UserProfile.jsx`, `locales/*`.  
    **Acceptance:** profile shows reputation and badges that update from defined triggers.

### B) 10 UI/UX Improvements

11. **Skeleton Coverage Expansion**  
    Add skeleton states to Chats, Notifications, UserProfile, SavedPosts.  
    **Files:** `app/components/SkeletonLoader.jsx`, corresponding screens.  
    **Acceptance:** no blank content flashes on initial load for these screens.
✅✅
12. **Unified Empty-State System**  
    Standardize empty-state visuals/copy/actions across feed, chats, notifications, saved posts.  
    **Files:** shared component in `app/components/` (new), target screens.  
    **Acceptance:** every major list has consistent actionable empty states.
✅✅
13. **Wire Real Haptics**  
    Current setting exists; implement tactile feedback on key actions (like, send, save, destructive confirm).  
    **Files:** action handlers in `Home.jsx`, `PostDetails.jsx`, `ChatRoom.jsx`, settings context hook.  
    **Acceptance:** haptic fires only when enabled and never blocks interactions.
✅✅
14. **Accessibility Pass (A11y Labels + HitSlop)**  
    Add accessibility labels/roles and minimum touch targets on icon-heavy actions.  
    **Files:** `app/components/*`, `app/screens/*`, `app/tabs/*`.  
    **Acceptance:** VoiceOver/TalkBack can identify and trigger all primary actions.
✅✅
15. **Virtualization Tuning for Long Lists**  
    Tune `FlatList` props (`windowSize`, `maxToRenderPerBatch`, `removeClippedSubviews`, key extractor consistency).  
    **Files:** `Home.jsx`, `Chats.jsx`, `Notifications.jsx`, `ChatRoom.jsx`.  
    **Acceptance:** smooth scrolling under large datasets on low-end Android.
✅✅
16. **Composer Draft Restore in Chat**  
    Persist unsent message drafts per chat and restore on reopen.  
    **Files:** `app/components/MessageInput.jsx`, `app/utils/safeStorage.js`.  
    **Acceptance:** draft text returns after navigation/app resume for same chat.

17. **Undo Snackbar for Destructive Actions**  
    Add temporary undo for delete/hide actions before final commit where feasible.  
    **Files:** `ChatRoom` handlers, `PostDetails` delete reply flow, reusable snackbar component.  
    **Acceptance:** user can undo within timeout and state remains consistent.

18. **Mentions UX Upgrade**  
    Improve mention suggestion ranking (friends first, recent interactions) and keyboard behavior.  
    **Files:** `MessageInput.jsx`, `database/users.js` query support.  
    **Acceptance:** faster mention insertion with fewer false matches.

19. **Reply Context Preview Improvements**  
    Make reply previews in chat/post details jump reliably to origin and highlight source message/reply.  
    **Files:** `MessageBubble.jsx`, `ChatRoom.jsx`, `PostDetails.jsx`.  
    **Acceptance:** tapping preview consistently navigates/scrolls to original context.

20. **Visual Consistency Audit**  
    Normalize spacing/typography/icon sizing across settings/auth/feed cards.  
    **Files:** `app/theme/designTokens.js`, affected screen styles.  
    **Acceptance:** no major spacing/font inconsistencies across primary flows.

### C) 10 Security & Performance Fixes

21. **Document Permission Hardening**  
    Apply strict create/read/update/delete permissions for chats/messages/notifications/user settings (owner/participants only).  
    **Files:** `database/chats.js`, `database/notifications.js`, `database/userChatSettings.js`, Appwrite console rules.  
    **Acceptance:** unauthorized users cannot read or mutate foreign data via direct API calls.

22. **Server-Side Authorization for Social Actions**  
    Enforce actor identity for follow/like/report/reaction in one trusted backend path (function or secured rules).  
    **Files:** `database/users.js`, `database/posts.js`, `database/chats.js`, optional Appwrite Functions.  
    **Acceptance:** spoofed client payloads cannot mutate another user’s state.

23. **Rate Limiting + Abuse Guardrails**  
    Add per-user throttles for message send, posting, replies, reports, and follow/unfollow bursts.  
    **Files:** Appwrite function layer + client retry messaging.  
    **Acceptance:** abusive spikes are blocked with user-friendly cooldown feedback.

24. **Blocklist Enforcement Completeness**  
    Apply block/chat-block checks consistently in notifications delivery, mentions, and profile visibility.  
    **Files:** `database/notifications.js`, `database/users.js`, chat mention logic in `MessageInput.jsx`.  
    **Acceptance:** blocked relationships never produce notifications or mention suggestions.

25. **E2EE Key Rotation & Recovery Strategy**  
    Add key versioning, participant re-key logic, and secure fallback when device keys are lost.  
    **Files:** `database/chats.js`, user key storage flow in `database/users.js`.  
    **Acceptance:** chats remain decryptable for valid participants after membership/key changes.

26. **Polling Reduction in Realtime Screens**  
    Replace fixed polling loops with health-checked realtime fallback and adaptive intervals.  
    **Files:** `useChatRoom.js`, `Home.jsx`, realtime hooks in `useRealtimeSubscription.js`.  
    **Acceptance:** lower background/network usage while preserving message/feed freshness.

27. **Cursor Pagination Migration**  
    Move heavy list APIs from offset-based pagination to cursor-based (`$id`/`$createdAt`) for large datasets.  
    **Files:** `database/posts.js`, `database/chats.js`, `database/notifications.js`, list screens.  
    **Acceptance:** stable pagination without duplicate/missing items under concurrent writes.

28. **Upload Queue with Retry/Backoff**  
    Centralize media upload queue (posts/chat/voice) with resumable retries and failure states.  
    **Files:** `services/imgbbService.js`, `database/chats.js`, post creation/edit flows.  
    **Acceptance:** transient network errors don’t silently lose uploads.

29. **Performance Instrumentation + Alerting**  
    Add production telemetry for crashes, API latency, and realtime reconnect failures.  
    **Files:** app bootstrap (`app/App.js`), API wrappers (`database/*`), logging utility.  
    **Acceptance:** measurable traces exist for top 10 critical flows.

30. **Test Coverage Expansion (Critical Flows)**  
    Add tests for auth OTP edge cases, chat send/retry, block logic, and notifications routing.  
    **Files:** `__tests__/` new specs + mocks for Appwrite/Expo modules.  
    **Acceptance:** CI covers high-risk flows and prevents regressions in security-sensitive logic.
