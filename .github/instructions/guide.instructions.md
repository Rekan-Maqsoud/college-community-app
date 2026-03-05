---
applyTo: "**"
---

# COLLEGE COMMUNITY - AI CODING GUIDE

Before making any change, consult:
- `project-map.instructions.md` for file ownership/location
- `ai-rules.instructions.md` for code style and editing constraints
- `database-schema.instructions.md` for live Appwrite schema

## Quick Rules

- No hardcoded user-facing text; use translation keys.
- JavaScript only; do not add TypeScript syntax.
- Keep changes minimal and targeted.
- Do not leave TODO/FIXME or commented-out dead code.
- Use functional components and hooks.
- Use responsive utilities (`wp`, `hp`, `normalize`) and theme/context colors.

## Workflow

1. Identify target files using `project-map.instructions.md`.
2. Read existing code and follow existing local patterns.
3. Add translation keys to all locales (`en.js`, `ar.js`, `ku.js`) when needed.
4. Verify behavior and error handling for touched flows.

## Project Stack

- React Native (Expo SDK 54)
- Appwrite backend (Auth/Databases/Storage/Realtime)
- React Navigation (Stack + Bottom Tabs)
- Context API state management
- i18n-js (`en`, `ar`, `ku`)
- Jest (`jest-expo`) test suite
