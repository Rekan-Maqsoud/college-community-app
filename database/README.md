# Appwrite Database Setup

## Collections to Create

### 1. users

| Attribute       | Type    | Size | Required | Array | Default |
| --------------- | ------- | ---- | -------- | ----- | ------- |
| userId          | String  | 255  | Yes      | No    | -       |
| name            | String  | 255  | Yes      | No    | -       |
| email           | String  | 320  | Yes      | No    | -       |
| bio             | String  | 500  | No       | No    | ''      |
| profilePicture  | String  | 255  | No       | No    | ''      |
| isEmailVerified | Boolean | -    | Yes      | No    | false   |
| university      | String  | 255  | No       | No    | ''      |
| major           | String  | 255  | No       | No    | ''      |
| department      | String  | 255  | No       | No    | ''      |
| year            | Integer | -    | No       | No    | 1       |
| followersCount  | Integer | -    | Yes      | No    | 0       |
| followingCount  | Integer | -    | Yes      | No    | 0       |
| postsCount      | Integer | -    | Yes      | No    | 0       |

**Indexes:** userId (unique), email (unique)

### 2. posts

| Attribute    | Type    | Size | Required | Array |
| ------------ | ------- | ---- | -------- | ----- |
| authorId     | String  | 255  | Yes      | No    |
| authorName   | String  | 255  | Yes      | No    |
| content      | String  | 5000 | Yes      | No    |
| images       | String  | 255  | No       | Yes   |
| likesCount   | Integer | -    | Yes      | No    |
| repliesCount | Integer | -    | Yes      | No    |
| category     | String  | 100  | No       | No    |

**Indexes:** authorId

### 3. replies

| Attribute  | Type    | Size | Required | Array |
| ---------- | ------- | ---- | -------- | ----- |
| postId     | String  | 255  | Yes      | No    |
| authorId   | String  | 255  | Yes      | No    |
| authorName | String  | 255  | Yes      | No    |
| content    | String  | 2000 | Yes      | No    |
| likesCount | Integer | -    | Yes      | No    |

**Indexes:** postId, authorId

### 4. chats

| Attribute    | Type    | Size | Required | Array |
| ------------ | ------- | ---- | -------- | ----- |
| participants | String  | 255  | Yes      | Yes   |
| lastMessage  | String  | 500  | No       | No    |
| isGroupChat  | Boolean | -    | Yes      | No    |
| chatName     | String  | 255  | No       | No    |

**Indexes:** participants

### 5. messages

| Attribute  | Type    | Size | Required | Array |
| ---------- | ------- | ---- | -------- | ----- |
| chatId     | String  | 255  | Yes      | No    |
| senderId   | String  | 255  | Yes      | No    |
| senderName | String  | 255  | Yes      | No    |
| content    | String  | 2000 | Yes      | No    |
| isRead     | Boolean | -    | Yes      | No    |

**Indexes:** chatId, senderId

## Update Collection IDs

After creating collections, update these files:

- `database/auth.js` - Replace `USERS_COLLECTION_ID`
- `database/posts.js` - Replace `POSTS_COLLECTION_ID` and `REPLIES_COLLECTION_ID`
- `database/chats.js` - Replace `CHATS_COLLECTION_ID` and `MESSAGES_COLLECTION_ID`

### 6. follows (for friend system)

| Attribute   | Type     | Size | Required | Array |
| ----------- | -------- | ---- | -------- | ----- |
| followerId  | String   | 255  | Yes      | No    |
| followingId | String   | 255  | Yes      | No    |
| createdAt   | DateTime | -    | Yes      | No    |

**Indexes:**

- followerId (for getting who user follows)
- followingId (for getting user's followers)
- followerId + followingId (unique, compound)

**Friend Definition:** Two users are "friends" when they mutually follow each other (A follows B AND B follows A)

## Email Verification Setup

The app uses Appwrite's built-in email verification:

1. User signs up
2. Verification email sent automatically
3. User clicks link in email
4. Handle verification in app with `confirmEmailVerification(userId, secret)`
5. Update `isEmailVerified` to true in users collection

**Note:** Update the verification URL in `auth.js` from `https://college-community.app/verify-email` to your actual domain/deep link.
