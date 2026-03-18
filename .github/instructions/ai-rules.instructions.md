---
applyTo: "**"
---

# COLLEGE COMMUNITY - AI ENGINEERING RULES (2026)

This file is the enforcement layer for AI edits. If a rule here conflicts with older docs, follow this file.

## Non-Negotiable Constraints

1. JavaScript-only codebase. Do not introduce TypeScript syntax.
2. Never hardcode user-visible strings in components/screens. Use translation keys.
3. Never remove telemetry coverage in loading paths. Preserve `telemetry.startTrace` and `telemetry.recordEvent` for init/fetch/refresh flows.
4. Never leave TODO/FIXME or commented-out dead code in committed edits.
5. Never use `var` or class components.
6. Never use positional Appwrite SDK arguments in new or touched code. Use object arguments only.
7. Never add new `AsyncStorage` usage in app logic. Use MMKV-based storage wrappers for persistent local cache.
8. Never introduce new `expo-av` usage. Use `expo-video` and `expo-audio` patterns.
9. Never add legacy JavaScript crypto polyfills for E2EE flows. Use native-backed crypto modules.
10. Never ship unbounded list/document queries. Use explicit limits and pagination strategy.
11. never make native android and ios folders 
## Required Coding Standards

1. Keep changes minimal, local, and reversible.
2. Follow existing file-local patterns unless modernizing that file end-to-end.
3. Add robust error handling for all async data operations.
4. Prefer batch reads to avoid N+1 query patterns.
5. For high-frequency lists/chats, favor stable references (`useMemo`, `useCallback`, `React.memo`) and avoid inline object/function recreation in render.
6. Keep optimistic UI + server reconciliation explicit in realtime flows.
7. Validate user permissions and ownership before destructive writes.

## Internationalization Standards

Target architecture is `react-i18next` with lazy-loaded resources.

1. Use `useTranslation` from `react-i18next` in migrated files.
2. Use namespaced keys (`common.*`, `auth.*`, `posts.*`, `chats.*`, `settings.*`, `errors.*`, `validation.*`).
3. Maintain key parity across English, Arabic, and Kurdish resources.
4. During migration windows, do not mix incompatible i18n patterns in the same file. Either:
   - keep file-local existing i18n API unchanged, or
   - migrate that file fully to the new pattern.

## UI, Theme, and Responsiveness

1. Use theme/context colors and design tokens, not hardcoded color literals.
2. Use responsive utilities for dimensions and font scaling where existing screens expect them.
3. Keep RTL-safe layout behavior for Arabic/Kurdish screens.
4. Ensure loading, empty, and error states are present for data-driven screens.

## Data and Realtime Guardrails

1. For `listDocuments`, always define pagination (`limit` + cursor/offset strategy) and ordering.
2. Keep Appwrite writes and reads schema-aligned with `database-schema.instructions.md`.
3. Realtime reconnect logic must use exponential backoff with jitter for large reconnect storms.
4. Prefer querying historical data on demand and reserve live subscriptions for active channels.

## Media, Storage, and Performance Defaults

1. Local persistence default: MMKV wrappers for sync access and low-latency hydration.
2. List rendering default: FlashList v2 for large/interactive feeds and chat histories.
3. Video/audio default: `expo-video` / `expo-audio` split usage.
4. Keep navigation and heavy screens resilient to background update pressure.

## Testing and Verification

1. Update or add tests when behavior changes in data, caching, auth, chat, or notifications flows.
2. Run targeted test files for touched areas when feasible.
3. Do not silently change public behavior without documenting it in the PR/summary.

## Quick Anti-Patterns Checklist

- Hardcoded visible text.
- Appwrite positional parameter calls.
- New AsyncStorage usage.
- Unbounded queries.
- Inline heavy closures in item renderers.
- Missing telemetry in loading paths.
- Missing translation parity across `en/ar/ku`.
