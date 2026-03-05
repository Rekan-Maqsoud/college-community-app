---
applyTo: "**"
---

# COLLEGE COMMUNITY - DATABASE SCHEMA

Auto-generated from live Appwrite API on 2026-03-05.
Source snapshot: `scripts/live-schema-snapshot.json`.

## Database

- `databaseId`: `68fc78fd0030f049a781`
- `documentSecurity`: `true` for all collections
- Live collections: 15

## Collection Overview

| Collection Name | Collection ID | Config Key |
| --- | --- | --- |
| users | `68fc7b42001bf7efbba3` | `usersCollectionId` |
| posts | `68ff7914000948dbd572` | `postsCollectionId` |
| replies | `68ff7b8f000492463724` | `repliesCollectionId` |
| chats | `chats` | `chatsCollectionId` |
| messages | `messages` | `messagesCollectionId` |
| userChatSettings | `69500c9c000bd955c984` | `userChatSettingsCollectionId` |
| notifications | `69554fd5001d447c8c1c` | `notificationsCollectionId` |
| pushTokens | `pushtokens` | `pushTokensCollectionId` |
| Lecture Channels | `699733ee001cbf86e7a4` | `lectureChannelsCollectionId` |
| Lecture Memberships | `699734170003f998b862` | `lectureMembershipsCollectionId` |
| Lecture Assets | `6997342b0012ee32448b` | `lectureAssetsCollectionId` |
| lectureComments | `69973f680024de7fd9fe` | `lectureCommentsCollectionId` |
| repElections | `6999f9de00313552a9c9` | `repElectionsCollectionId` |
| repVotes | `6999fed2001ac021d056` | `repVotesCollectionId` |
| Suggestions | `suggestions` | `suggestionsCollectionId` |

## Collection Permissions

- users: `create("users")`, `read("users")`, `update("users")`
- posts: `create("users")`, `read("users")`, `update("users")`
- replies: `create("users")`, `read("users")`, `update("users")`
- chats: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- messages: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- userChatSettings: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- notifications: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- pushTokens: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- Lecture Channels: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- Lecture Memberships: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- Lecture Assets: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- lectureComments: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- repElections: `create("users")`, `read("users")`, `update("users")`
- repVotes: `create("users")`, `read("users")`, `update("users")`, `delete("users")`
- Suggestions: `create("users")`, `read("team:admins")`, `update("team:admins")`, `delete("team:admins")`

## Attributes By Collection

### users (`68fc7b42001bf7efbba3`)

- `name` string(255) required
- `email` string(320) required
- `bio` string(500)
- `profilePicture` string(255)
- `isEmailVerified` boolean required
- `university` string(255)
- `major` string(255)
- `year` integer default `1` min `1` max `6`
- `followersCount` integer default `0`
- `followingCount` integer default `0`
- `postsCount` integer default `0`
- `department` string(16384)
- `lastAcademicUpdate` datetime
- `following` string[] size `999999`
- `followers` string[] size `999999`
- `blockedUsers` string[] size `999999`
- `gender` string(30)
- `isActive` boolean default `true`
- `isPrivateProfile` boolean default `false`
- `coverPhoto` string(500)
- `lastSeen` datetime
- `profileViews` string(16384)
- `publicKey` string(16384)
- `userId` string(255) required
- `bookmarkedPostIds` string[] size `5000`

### posts (`68ff7914000948dbd572`)

- `userId` string(500) required
- `text` string(16384)
- `topic` string(255)
- `department` string(16384) required
- `stage` string(16384) required
- `postType` string(255) required
- `images` string[] size `16384`
- `imageDeleteUrls` string[] size `16384`
- `isResolved` boolean default `false`
- `viewCount` integer default `0`
- `likeCount` integer default `0`
- `replyCount` integer default `0`
- `isEdited` boolean default `false`
- `tags` string[] size `16384`
- `links` string[] size `16384`
- `likedBy` string[] size `999999`
- `viewedBy` string[] size `999999`
- `isHiddenFromProfile` boolean default `false`
- `semester` string(20)
- `canOthersRepost` boolean default `true`
- `isRepost` boolean default `false`
- `repostCount` integer
- `reportCount` integer
- `isHidden` boolean default `false`
- `originalPostId` string(255)

### replies (`68ff7b8f000492463724`)

- `postId` string(128) required
- `userId` string(128) required
- `text` string(500) required
- `isAccepted` boolean
- `images` string[] size `16384`
- `imageDeleteUrls` string[] size `16384`
- `likeCount` integer default `0`
- `isEdited` boolean default `false`
- `parentReplyId` string(255)
- `upCount` integer default `0`
- `downCount` integer default `0`
- `upvotedBy` string[] size `50000`
- `downvotedBy` string[] size `50000`
- `links` string[] size `16384`

### chats (`chats`)

- `name` string(128) required
- `department` string(16384)
- `type` string(255) required
- `stage` string(16384)
- `requiresRepresentative` boolean default `false`
- `representatives` string[] size `16384`
- `description` string(16384)
- `lastMessage` string(16384)
- `messageCount` integer min `0`
- `lastMessageAt` datetime
- `participants` string[] size `999999`
- `chatKey` string(255)
- `admins` string[] size `16384`
- `settings` string(16384)
- `groupPhoto` string(16384)
- `pinnedMessages` string[] size `16384`
- `typingUsers` string(16384)
- `course` string(200)
- `isStudyGroup` boolean default `false`
- `lastMessageSenderId` string(255)

### messages (`messages`)

- `chatId` string(255) required
- `senderId` string(255) required
- `senderName` string(255) required
- `content` string(16384)
- `images` string[] size `16384`
- `type` string(50)
- `imageUrl` string(16384)
- `readBy` string[] size `99999`
- `replyToId` string(255)
- `replyToContent` string(200)
- `replyToSender` string(255)
- `isPinned` boolean default `false`
- `pinnedBy` string(255)
- `pinnedAt` datetime
- `mentionsAll` boolean default `false`
- `mentions` string[] size `16384`
- `reactions` string(16384)
- `status` string(20) default `sent`
- `deliveredTo` string[] size `50000`

### userChatSettings (`69500c9c000bd955c984`)

- `userId` string(255) required
- `chatId` string(255) required
- `isMuted` boolean default `false`
- `muteExpiresAt` datetime
- `muteType` string(50) default `none`
- `bookmarkedMsgs` string[] size `16384`
- `notifyOnMention` boolean default `true`
- `notifyOnAll` boolean default `true`
- `clearedAt` datetime
- `hiddenMessageIds` string[] size `99999`
- `isArchived` boolean default `false`
- `archivedAt` datetime
- `reactionDefaults` string(5000)

### notifications (`69554fd5001d447c8c1c`)

- `senderId` string(255) required
- `senderName` string(255)
- `postId` string(255)
- `userId` string(255) required
- `senderProfilePicture` string(999)
- `type` string(255)
- `postPreview` string(16384)
- `isRead` boolean default `false`
- `new_follower` string(16384)

### pushTokens (`pushtokens`)

- `userId` string(36) required
- `token` string(255) required
- `platform` string(10)

### Lecture Channels (`699733ee001cbf86e7a4`)

- `name` string(255) required
- `description` string(16384)
- `channelType` string required
- `accessType` string required
- `ownerId` string(255) required
- `managerIds` string(255)
- `linkedChatId` string(255)
- `isActive` boolean required
- `membersCount` integer
- `pendingCount` integer
- `notificationsDefaultOn` boolean default `true`
- `settingsJson` string(16384)
- `tags` string[] size `5000`
- `coverImageUrl` string(2000)

### Lecture Memberships (`699734170003f998b862`)

- `channelId` string(255) required
- `userId` string(255) required
- `joinStatus` string required
- `role` string required
- `requestedAt` datetime required
- `approvedAt` datetime
- `notificationsEnabled` boolean default `true`
- `settingsJson` string(5000)
- `pinnedChannelsJson` string(5000)

### Lecture Assets (`6997342b0012ee32448b`)

- `channelId` string(255) required
- `title` string(255) required
- `description` string(16384)
- `uploadType` string required
- `uploaderId` string(255) required
- `youtubeUrl` string(16384)
- `externalUrl` string(16384)
- `fileUrl` string(16384)
- `fileId` string(255)
- `fileName` string(255)
- `fileSize` integer
- `mimeType` string(255)
- `isPinned` boolean default `false`
- `isActive` boolean default `true`
- `viewsCount` integer default `0`
- `opensCount` integer default `0`
- `downloadsCount` integer default `0`
- `tags` string[] size `5000`
- `viewedBy` string[] size `640`
- `openedBy` string[] size `640`
- `downloadedBy` string[] size `640`

### lectureComments (`69973f680024de7fd9fe`)

- `commentId` string(640)
- `channelId` string(640)
- `assetId` string(640)
- `userId` string(640)
- `text` string(16384)
- `parentCommentId` string(640)
- `mentions` string

### repElections (`6999f9de00313552a9c9`)

- `seatNumber` integer default `1` min `1` max `3`
- `totalStudents` integer default `0`
- `reselectionThreshold` integer default `0`
- `startedAt` datetime
- `endedAt` datetime
- `department` string(255) required
- `stage` string(255) required
- `status` string(255) required
- `winner` string(255)
- `reselectionVoters` string[] size `255`

### repVotes (`6999fed2001ac021d056`)

- `electionId` string(255) required
- `department` string(255) required
- `stage` string(255) required
- `voterId` string(255) required
- `candidateId` string(255) required

### Suggestions (`suggestions`)

- `userId` string(255) required
- `userName` string(255)
- `userEmail` string(320)
- `category` string(32) required
- `title` string(120) required
- `message` string(16384) required
- `status` string(32) required
- `appVersion` string(64)
- `platform` string(32)

## Notes

- String sizes are live values; many fields were upgraded to `16384`.
- `Suggestions` is admin-readable only at collection permission level.
- Use `database/config.js` as source of runtime config-key naming.
