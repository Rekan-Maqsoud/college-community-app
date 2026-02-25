# Appwrite ACL Checklist (Exact Console Roles)

Use only these role types from the Appwrite UI role picker:

- Any
- All guests
- All users
- Select users
- Select teams
- Label
- Custom permission

## Important mapping

There is no built-in role literally named owner or participant.

- Owner means the specific user IDs added to each row ACL at create time.
- Participant means the specific participant user IDs added to each row ACL at create time.

In code, this is generated with Appwrite permissions such as:

- read("user:USER_ID")
- update("user:USER_ID")
- delete("user:USER_ID")

So in Console:

- table-level settings stay minimal
- per-row access is enforced by the row permissions payload sent by the app

## Table-level settings (what to set)

For each table, turn Row security ON.

### Sensitive tables

- chats
- messages
- notifications
- userChatSettings
- pushTokens
- repVotes
- lectureMemberships

Table permissions:

- Keep one row: All users => Create only
- Read OFF
- Update OFF
- Delete OFF
- Do not add Any
- Do not add All guests

### Public/community tables

- posts
- replies
- users
- repElections
- lectureChannels
- lectureAssets
- lectureComments

Table permissions:

- Keep one row: All users => Create only
- Read OFF
- Update OFF
- Delete OFF

Notes:

- Public visibility should come from row ACL created by app code, not broad table Read.
- If you intentionally want public read at table level, do it only for posts/replies and verify there is no data leak.

## Row ACL intent by table

- chats: read for chat participants, update/delete for chat managers/admins.
- messages: read for chat participants, update/delete for sender or allowed manager path.
- notifications: read/update/delete only for notification recipient.
- userChatSettings: read/update/delete only for owner user.
- pushTokens: read/update/delete only for owner user (or server function account).
- users: usually read for all users, update/delete owner only.
- posts/replies: usually read for all users, update/delete owner (plus moderation path if needed).

## Manual UI audit

For each table:

1. Open table Settings.
2. Confirm Row security toggle is ON.
3. In Permissions section, remove broad table read/update/delete.
4. Keep only Create for All users.
5. Save.

For each row sample in each table:

1. Open row permissions.
2. Confirm no read("any"), read("users"), read("guests") for sensitive tables.
3. Confirm no update("users"), delete("users"), update("any"), delete("any").
4. Confirm row has explicit user-based ACL entries.

## Scripted audit

Run:

npm run audit:acl

Required env for script:

- APPWRITE_API_KEY (required)
- APPWRITE_ENDPOINT (or EXPO_PUBLIC_APPWRITE_ENDPOINT)
- APPWRITE_PROJECT_ID (or EXPO_PUBLIC_APPWRITE_PROJECT_ID)
- APPWRITE_DATABASE_ID (or EXPO_PUBLIC_APPWRITE_DATABASE_ID)
- collection IDs via APPWRITE*\*\_COLLECTION_ID or EXPO_PUBLIC*\*\_COLLECTION_ID

The script prints:

- Row security status
- Broad table-level read/update/delete findings
- Sample risky row IDs and permissions
- Summary totals
