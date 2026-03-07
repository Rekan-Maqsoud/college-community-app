# College Community AI Modernization Plan

## Purpose

This document translates the two audit reports into a practical execution plan for this repository. It is based on the current codebase state, not just the reports.

Use the prompts below as direct inputs to AI agents. Each prompt is scoped to reduce merge conflicts and to keep changes minimal, reversible, and testable.

## Repo Reality Check

The reports are directionally useful, but several major recommendations are already implemented in this repository.

Already implemented:

- Expo SDK 55, React Native 0.83.2, React 19.2.4
- React Activity boundaries in the main tab shell in `app/App.js`
- `expo-video` and `expo-audio` instead of new `expo-av` usage
- `react-native-mmkv` for modern local persistence
- `react-native-quick-crypto` added for native-backed crypto support
- `@shopify/flash-list` v2 in the dependency stack
- `react-i18next` with lazy-loaded language resources in `locales/i18n.js`
- telemetry tracing in critical loading paths
- Hermes V1 guardrails in `app.config.js`

This means the remaining work should focus on hardening, enforcement, and targeted performance fixes instead of large rewrites.

## Highest-Value Remaining Gaps

1. Appwrite React Native SDK alignment
   `database/config.js` imports from `appwrite` and carries web-SDK compatibility patches. This should be reviewed against the React Native SDK path and the current Expo 55 runtime.

2. Weak lint enforcement
   `eslint.config.js` only extends Expo defaults. It does not enforce the repo's desired React Native performance and hooks rules.

3. Inline style churn in high-frequency screens
   Files like `app/screens/ChatRoom.jsx` still contain many `style={{ ... }}` objects that are recreated every render.

4. Sequential N+1 chat participant updates
   `database/chatHelpers.js` still loops through chats and awaits `ensureChatParticipant` one item at a time during user group initialization.

5. Crypto path is only partially modernized
   `database/chats/chatsShared.js` uses `react-native-quick-crypto` for random bytes, but core encryption still relies on `tweetnacl` and `tweetnacl-util`. This needs a careful audit, not a blind rewrite.

6. Documentation drift
   `README.md` still describes an older runtime stack and does not reflect the current Expo 55 and React Native 0.83 baseline.

## Execution Order

Recommended order:

1. Guardrails first: ESLint hardening
2. Runtime correctness: Appwrite SDK audit
3. Hot-path performance: ChatRoom inline style extraction and memoization audit
4. Data efficiency: chat initialization N+1 fix
5. Security and performance: E2EE crypto path audit
6. Documentation sync

## Shared Constraints For Every Agent

Every agent prompt below assumes these repository rules:

- JavaScript only. Do not introduce TypeScript.
- Do not hardcode user-visible strings. Use existing translation patterns.
- Preserve telemetry coverage in loading and refresh paths.
- Do not add new AsyncStorage usage.
- Do not add new `expo-av` usage.
- Use Appwrite object-argument calls only.
- Keep queries bounded and ordered.
- Keep changes minimal, local, and reversible.
- Add or update targeted tests when behavior changes.
- Do not broad-rewrite architecture unless the prompt explicitly says to.

## Agent Prompt 1: ESLint Guardrails Hardening

Goal: turn the current light ESLint setup into a meaningful enforcement layer for React Native performance, hooks correctness, and AI-generated anti-patterns.

Target files:

- `eslint.config.js`
- `package.json`
- any small supporting config files only if truly necessary

Prompt:

```text
You are working in the College Community Expo/React Native repository.

Task: harden the lint setup so the repo automatically rejects common React Native performance and correctness problems that AI-generated code tends to introduce.

Current state to verify first:
- `eslint.config.js` only extends Expo flat config and ignores `dist/*`.
- The repo is JavaScript-only and already uses Expo SDK 55, React 19.2, and React Native 0.83.
- High-frequency screens such as `app/screens/ChatRoom.jsx` still contain multiple inline `style={{ ... }}` objects.

Requirements:
1. Keep the config in flat-config style.
2. Add the smallest useful set of lint plugins and rules for:
   - inline style prevention
   - unused styles detection where practical
   - new object/function literals passed as JSX props
   - React hooks dependency correctness
3. Do not add noisy rules that will create hundreds of unrelated errors immediately unless you also scope or stage them responsibly.
4. If some rules must be warnings first instead of errors, document why in comments or the final summary.
5. Keep the config compatible with Expo and the existing JavaScript-only repo.
6. Run lint or targeted validation after the change.

Suggested rule areas:
- `react-native/no-inline-styles`
- `react-native/no-unused-styles`
- `react-perf/jsx-no-new-object-as-prop`
- `react-perf/jsx-no-new-function-as-prop`
- `react-hooks/exhaustive-deps`

Deliverables:
- updated lint config
- any required `package.json` devDependency additions
- concise summary of which rules were enabled and whether they are warnings or errors
- validation results

Constraints:
- JavaScript only
- no unrelated refactors
- do not remove telemetry or change runtime behavior
```

## Agent Prompt 2: Appwrite React Native SDK Audit And Alignment

Goal: verify that the Appwrite client setup is using the correct React Native SDK path and that legacy web-SDK shims are only kept if still necessary.

Target files:

- `database/config.js`
- any direct Appwrite client consumers if the import change requires follow-up
- relevant tests

Prompt:

```text
You are working in the College Community Expo/React Native repository.

Task: audit and, if appropriate, fix the Appwrite client bootstrap so it is aligned with the correct React Native SDK usage for Expo SDK 55 / React Native 0.83.

Start by inspecting:
- `database/config.js`
- `package.json`
- any Appwrite docs assumptions implied by the current code

Observed repo state:
- `database/config.js` imports `Client`, `Account`, `Databases`, and `Storage` from `appwrite`.
- The file also patches `WebSocket.send`, `window.localStorage`, and realtime message shape to compensate for SDK/runtime mismatches.

Requirements:
1. Determine whether this repo should import from `appwrite/sdk-for-react-native` instead of `appwrite`.
2. If yes, migrate carefully and remove only the compatibility patches that become unnecessary.
3. If no, keep the current import path but document exactly why it must remain and which shims are still required.
4. Preserve existing behavior for realtime, auth, and storage.
5. Do not change public APIs exposed by `database/config.js` unless required.
6. Run the most relevant tests after the change.

Focus on correctness over cleanup. The goal is to remove accidental web-SDK coupling if possible without destabilizing realtime.

Deliverables:
- final SDK import decision with reasoning
- minimal code changes in `database/config.js`
- test results or a clear note if some tests could not be run

Constraints:
- object-argument Appwrite calls only
- no broad refactor of all database modules
- preserve telemetry and realtime resilience
```

## Agent Prompt 3: ChatRoom Render Hygiene And Inline Style Extraction

Goal: remove avoidable render churn from the most performance-sensitive chat UI path.

Target files:

- `app/screens/ChatRoom.jsx`
- any local style modules already paired with ChatRoom
- directly related child components only if needed

Prompt:

```text
You are working in the College Community Expo/React Native repository.

Task: improve render hygiene in the chat screen without changing visible behavior.

Start by inspecting:
- `app/screens/ChatRoom.jsx`
- any chat-room-specific subcomponents and style files
- lint guidance already present in the repo

Observed repo state:
- `app/screens/ChatRoom.jsx` still contains multiple inline style objects in JSX.
- This screen is performance-sensitive and sits on top of FlashList/message rendering and frequent realtime updates.

Requirements:
1. Extract repeated or non-trivial inline style objects into stable style definitions.
2. Keep theme-driven values and dynamic styles working correctly. Use arrays or narrowly scoped dynamic fragments only where truly required.
3. Audit for unstable inline object and function props in hot render paths.
4. If a child component is a strong candidate for `React.memo`, apply it only when the prop shape is stable enough to benefit.
5. Do not introduce wide cosmetic changes.
6. Do not break RTL behavior, translation usage, or chat interactions.
7. Run targeted validation after the edit.

Deliverables:
- cleaned ChatRoom render path
- summary of the main render-stability improvements
- any residual hotspots you intentionally left alone and why

Constraints:
- minimal, local changes only
- preserve all user-visible behavior
- preserve telemetry in any loading paths you touch
```

## Agent Prompt 4: Chat Initialization N+1 Query And Mutation Audit

Goal: remove sequential chat initialization work that scales poorly as users belong to more groups.

Target files:

- `database/chatHelpers.js`
- `database/chats/chatsLifecycle.js`
- any chat bootstrap helpers directly involved
- targeted tests covering chat initialization or chat membership

Prompt:

```text
You are working in the College Community Expo/React Native repository.

Task: audit and optimize the chat bootstrap path for unnecessary sequential work, especially around ensuring group membership.

Start by inspecting:
- `database/chatHelpers.js`
- `database/chats/chatsLifecycle.js`
- tests related to chats, realtime, send retry, and unread behavior

Observed repo state:
- `initializeUserGroups` in `database/chatHelpers.js` loops through `allChats` and awaits `ensureChatParticipant(chat.$id, userId)` one chat at a time.

Requirements:
1. Determine whether this sequential pattern can be reduced or batched safely.
2. Preserve permission checks and ownership rules.
3. Do not create duplicate participants or duplicate writes.
4. Keep Appwrite calls bounded and object-argument based.
5. If batching is unsafe for some paths, still reduce redundant work and explain the tradeoff.
6. Add or update tests for the changed behavior.

Success criteria:
- less sequential initialization work
- no change to returned chat semantics
- no regressions in unread counts, default groups, or private chat flows

Constraints:
- do not rewrite the entire chat architecture
- keep the change narrow and production-safe
```

## Agent Prompt 5: E2EE Crypto Path Hardening Audit

Goal: reduce JavaScript-thread crypto risk in chat encryption flows without destabilizing message compatibility.

Target files:

- `database/chats/chatsShared.js`
- `database/chats/chatsEncryption.js`
- any related tests in `__tests__/`

Prompt:

```text
You are working in the College Community Expo/React Native repository.

Task: audit the end-to-end encryption helpers and make the crypto path more robust and native-backed where feasible, but do not break compatibility with existing encrypted payloads.

Start by inspecting:
- `database/chats/chatsShared.js`
- `database/chats/chatsEncryption.js`
- `package.json`
- relevant chat encryption and send retry tests

Observed repo state:
- the repo already includes `react-native-quick-crypto`
- `database/chats/chatsShared.js` uses it for random byte generation when available
- core encryption primitives still rely on `tweetnacl` and `tweetnacl-util`

Requirements:
1. Do a compatibility-first audit, not a blind rewrite.
2. Identify which crypto operations can safely stay and which should move to native-backed modules.
3. If a full migration would risk message compatibility, implement only the safe improvements now and document the remaining migration plan.
4. Remove weak or unnecessary fallback behavior only if it is clearly safe on Expo 55 / React Native 0.83.
5. Keep existing encrypted message formats readable.
6. Run targeted tests after changes.

Deliverables:
- minimal code hardening if safe
- explicit compatibility notes
- follow-up recommendations if a larger migration is needed later

Constraints:
- no breaking encryption format changes
- no new legacy crypto polyfills
- keep SecureStore and key persistence behavior intact
```

## Agent Prompt 6: Documentation And Reality Sync

Goal: bring project documentation in line with the actual repo state and current modernization status.

Target files:

- `README.md`
- optional: add a short modernization status note under `docs/` if useful

Prompt:

```text
You are working in the College Community Expo/React Native repository.

Task: update project documentation so it reflects the current implementation rather than older audit assumptions.

Start by comparing:
- `README.md`
- `package.json`
- `app.config.js`
- `locales/i18n.js`
- `app/App.js`

Observed repo state:
- README still mentions an older runtime stack
- the repository already uses Expo SDK 55, React Native 0.83, React 19.2, react-i18next, expo-video/audio, MMKV, FlashList v2, and Hermes V1 guardrails

Requirements:
1. Update the tech stack and architecture notes in README.
2. Remove outdated statements that imply the repo is still on SDK 54 or still using i18n-js as the active architecture.
3. Keep the README concise and accurate.
4. Mention the Hermes V1 Android guard behavior if relevant.
5. Do not invent features or workflows not present in the repo.

Deliverables:
- updated README
- optional short modernization status note if that improves clarity

Constraints:
- docs only unless a tiny supporting config comment is absolutely needed
```

## Optional Agent Prompt 7: Bounded Query Verification Pass

Use this only after the higher-priority work above. Most database calls already appear bounded, so this is a verification pass, not a rewrite campaign.

Target files:

- `database/posts.js`
- `database/lectures.js`
- `database/notifications.js`
- `database/users.js`
- `database/replies.js`
- `database/repElections.js`
- `database/repVotes.js`
- `database/userChatSettings.js`

Prompt:

```text
You are working in the College Community Expo/React Native repository.

Task: perform a bounded-query verification pass across the database layer and fix any remaining `listDocuments` call sites that are missing explicit limits or clear ordering.

Context:
- repo rules require bounded Appwrite list queries
- many files already use `Query.limit(...)`, so this should be a targeted audit, not a broad rewrite

Requirements:
1. Audit each touched `listDocuments` call for explicit limit and sensible ordering when ordering matters.
2. Preserve existing behavior, pagination semantics, and cache keys.
3. Do not change unrelated query logic.
4. Keep Appwrite calls in object-argument form.
5. Run targeted tests for touched modules if available.

Deliverables:
- only the call sites that needed correction
- summary of which files were already compliant versus which required changes
```

## Suggested Agent Assignment Matrix

- Agent A: Prompt 1, ESLint Guardrails Hardening
- Agent B: Prompt 2, Appwrite React Native SDK Audit And Alignment
- Agent C: Prompt 3, ChatRoom Render Hygiene And Inline Style Extraction
- Agent D: Prompt 4, Chat Initialization N+1 Query And Mutation Audit
- Agent E: Prompt 5, E2EE Crypto Path Hardening Audit
- Agent F: Prompt 6, Documentation And Reality Sync
- Agent G: Prompt 7 only if the earlier agents do not already cover the needed query fixes

## Notes For The Human Reviewer

- Do not run all prompts at once if agents will touch overlapping chat files.
- The safest parallel bundle is: Prompt 1, Prompt 2, Prompt 6.
- Prompt 3 and Prompt 4 should be coordinated because both affect chat-related behavior.
- Prompt 5 should be treated as compatibility-sensitive.
