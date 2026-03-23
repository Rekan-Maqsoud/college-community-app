---
applyTo: "**"
---

# COLLEGE COMMUNITY - MODERN AI CODING GUIDE (2026)

Use this as the default execution guide for AI edits in this repository.

## Source of Truth Priority

When instructions overlap, apply this order:

1. `ai-rules.instructions.md` (hard constraints)
2. `database-schema.instructions.md` (live data contract)
3. `project-map.instructions.md` (edit routing)
4. Local file patterns in touched feature

## External ECC Bridge (Do Not Edit Source)

The repository includes an external ECC pack under `.agent/.agents/` that is primarily for Antigravity.

1. Never modify files inside `.agent/` unless the user explicitly asks.
2. Reuse ECC skills by reading the relevant `SKILL.md` only when the task matches.
3. Keep ECC usage selective to avoid context/token bloat.

### Conditional Skill Routing

- Feature/bug/refactor work: `.agent/.agents/skills/tdd-workflow/SKILL.md`
- Final quality gate before handoff: `.agent/.agents/skills/verification-loop/SKILL.md`
- Security-sensitive changes (auth/input/secrets/endpoints): `.agent/.agents/skills/security-review/SKILL.md`
- General JS/React quality alignment: `.agent/.agents/skills/coding-standards/SKILL.md`
- Library/API behavior questions requiring fresh docs: `.agent/.agents/skills/documentation-lookup/SKILL.md`
- Long multi-phase sessions nearing context pressure: `.agent/.agents/skills/strategic-compact/SKILL.md`

### Token Efficiency Policy

1. Default to zero ECC skills for trivial edits.
2. Load at most one primary skill per task phase; add a second only when clearly needed.
3. Read only the minimum required section first, then expand if gaps remain.
4. Prefer local repo instructions over generic ECC guidance if there is any conflict.
5. If ECC guidance conflicts with `ai-rules.instructions.md`, always follow `ai-rules.instructions.md`.

## Target Architecture Direction

- Runtime target: Expo SDK 55 + New Architecture + Hermes V1.
- Storage target: MMKV-backed caching for low-latency hydration.
- i18n target: `react-i18next` with lazy-loaded language resources.
- Lists target: FlashList v2 for high-volume feeds/chats.
- Media target: `expo-video` and `expo-audio` instead of `expo-av`.
- Crypto target: native-backed crypto in E2EE paths.
- Realtime target: resilient reconnects with exponential backoff + jitter.

## Execution Workflow for AI

1. Identify the exact feature area via `project-map.instructions.md`.
2. Read touched files fully enough to preserve local conventions.
3. Apply minimal changes that improve correctness/performance without broad rewrites.
4. Keep user-visible text translated and language parity maintained.
5. Keep telemetry traces in loading windows.
6. Validate schema compatibility before changing Appwrite payload fields.
7. Add or update tests for behavior changes.

## Appwrite Best Practices (Mandatory)

1. Use object-based SDK arguments in all new or modified calls.
2. Add explicit pagination + ordering for collection reads.
3. Avoid N+1 loops; batch read related entities.
4. Scope realtime subscriptions to active screens/channels.
5. Implement reconnect backoff with jitter in subscription wrappers.

## State, Caching, and Offline-First

1. Use centralized cache wrappers instead of ad hoc persistence in feature files.
2. Prefer synchronous reads for startup-critical paths.
3. Keep optimistic updates explicit and reconcile on server/realtime response.
4. Prevent duplicate timeline/chat entries during optimistic + realtime double updates.

## UI and Rendering Performance

1. Prefer recycled list rendering for heavy feeds and chat histories.
2. Keep item renderers stable: memoize expensive selectors and callbacks.
3. Avoid creating new inline objects/functions in high-frequency render trees.
4. Preserve scroll and interaction continuity during incremental updates.
5. For glass UI: never place a second opaque/solid card background on top of a `GlassContainer`/`GlassModalCard` surface; use transparent inner wrappers and a single surface layer.

## Internationalization Strategy

1. New work should be compatible with `react-i18next` migration.
2. Maintain `en`, `ar`, and `ku` key parity.
3. Preserve RTL correctness for Arabic/Kurdish.
4. Avoid partial i18n migrations inside one file.

## Definition of Done for AI Changes

- No hardcoded user-visible text.
- No positional Appwrite arguments in touched code.
- No new AsyncStorage usage.
- Queries are bounded and ordered.
- Error/loading states are present in touched data flows.
- Telemetry instrumentation in loading paths remains intact.
- Tests updated or a clear testing note is provided.

## Current Stack Snapshot

- React Native + Expo app
- Appwrite backend (Auth, DB, Storage, Realtime)
- React Navigation (stack + tabs)
- Context-driven state
- Multilingual app (`en`, `ar`, `ku`)
- Jest (`jest-expo`) tests
