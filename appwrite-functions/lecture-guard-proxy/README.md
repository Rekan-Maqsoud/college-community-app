Lecture Guard Proxy (Appwrite Function)

Purpose:

- Enforce lecture permission-critical mutations on server side.

Supported actions:

- update_membership_status
- update_channel_settings
- add_manager
- remove_manager
- pin_asset

Required env vars:

- APPWRITE_ENDPOINT
- APPWRITE_PROJECT_ID
- APPWRITE_API_KEY
- APPWRITE_DATABASE_ID
- APPWRITE_LECTURE_CHANNELS_COLLECTION_ID
- APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID
- APPWRITE_LECTURE_ASSETS_COLLECTION_ID

Client app env:

- EXPO_PUBLIC_LECTURE_GUARD_ENDPOINT

Auth:

- Requires `Authorization: Bearer <JWT>` from signed-in user.
