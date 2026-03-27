# Guest Role — Implementation Plan (Revised)

A new `guest` role for users who sign up with any (non-educational) email. Guests have a restricted but useful experience: public-only feed, 1 post/day, friends-only chat with **students** (but free to chat other guests), community lecture channels accessible, and a tailored tutorial.

---

## Key Decisions from Review

| Topic | Decision |
|---|---|
| DB schema changes | Use Appwrite API key from [.env](file:///c:/CODING%20ZONE/college-community/.env) (`EXPO_PUBLIC_APPWRITE_API_KEY`) to add attributes via script |
| Ranking formula | Apply to **all users**, not just guests; students may have targeted posts boosted |
| Post targeting | For guests only, optional, **only on question posts**, allows up to 3 departments |
| Post limit warning | Clear warning message shown when guest has already posted today |
| Lecture channels | Guests **can** access community lecture channels (not class-specific ones) |
| Guest badge | Shown in the **stage slot** (since guests have no stage) |
| Sign-up entry | **"Not a student? Sign up as Guest"** button on SignIn screen |
| Ghost data prevention | Always **check role first**, then decide what to fetch |
| Comments/replies | Guests can only reply to posts where they are **friends** with the post author |
| Guest ↔ Guest chat | Guests can chat each other **before** being friends |
| Student ↔ Guest chat | Only if mutual-follow (friends) |

---

## Proposed Changes

### 0. Appwrite Schema Migration (Script)

#### [NEW] [scripts/addGuestAttributes.js](file:///c:/CODING%20ZONE/college-community/scripts/addGuestAttributes.js)

A one-time Node.js script that uses the Appwrite server SDK + API key from [.env](file:///c:/CODING%20ZONE/college-community/.env) to add the required attributes:

**Posts collection** — 3 new optional string attributes:

| Attribute | Type | Size | Description |
|---|---|---|---|
| `targetDepartments` | string[] (array) | max 3 items | Departments guest is targeting (for questions only) |
| `isGuestPost` | boolean | — | Flag for easy filtering |

**Users collection** — no schema changes needed. Role `'guest'` is stored in existing `role` attribute. Daily post tracking goes in existing `profileViews` JSON field:
```json
{
  "links": null,
  "visibility": "everyone",
  "academicChangesCount": 0,
  "guestLastPostDate": "2026-03-25",
  "guestPostCountToday": 1
}
```

---

### 1. Role Utility

#### [NEW] [app/utils/guestUtils.js](file:///c:/CODING%20ZONE/college-community/app/utils/guestUtils.js)

```js
export const isGuest = (user) => String(user?.role || '').toLowerCase() === 'guest';

// Guest post limit
export const GUEST_POST_LIMIT_PER_DAY = 1;

// Rate limits (stricter than students)
export const GUEST_FOLLOW_RATE_LIMIT  = { maxActions: 4, windowMs: 60_000 };
export const GUEST_POST_RATE_LIMIT    = { maxActions: 1, windowMs: 60_000 };
export const GUEST_COMMENT_RATE_LIMIT = { maxActions: 3, windowMs: 60_000 };

// Checks if two users can chat freely (guest↔guest = yes, guest↔student = friends only)
export const canInitiateChat = (viewerUser, targetUser) => {
  const viewerIsGuest = isGuest(viewerUser);
  const targetIsGuest = isGuest(targetUser);
  if (viewerIsGuest && targetIsGuest) return true; // guests chat freely
  if (viewerIsGuest && !targetIsGuest) {
    // guest→student: must be friends
    const friends = viewerUser?.following || [];
    const targetFollowsViewer = (targetUser?.followers || []).includes(viewerUser?.$id);
    return friends.includes(targetUser?.$id) && targetFollowsViewer;
  }
  return true; // student→anyone: existing rules apply
};
```

---

### 2. Post Ranking Formula — Universal

#### [NEW] [app/utils/postRanking.js](file:///c:/CODING%20ZONE/college-community/app/utils/postRanking.js)

Applies to **all users**. Guest-specific signals (target departments) simply won't match for students.

```js
/**
 * Compute relevance score for a post relative to the current viewer.
 * Higher = shown first.
 *
 * @param {Object} post - Appwrite post document
 * @param {Object} context
 *   friendIds          string[]  - IDs of people the viewer mutually follows
 *   userDepartment     string    - viewer's own department ('' for guests)
 *   userCollege        string    - viewer's college
 *   userUniversity     string    - viewer's university
 *   targetDepartments  string[]  - departments viewer follows (guest use-case)
 */
export const computePostScore = (post, context = {}) => {
  const {
    friendIds = [],
    userDepartment = '',
    userCollege = '',
    userUniversity = '',
    targetDepartments = [],
  } = context;

  const now = Date.now();
  const createdMs = new Date(post.$createdAt).getTime();
  // $updatedAt is a proxy for last comment/like activity
  const updatedMs = new Date(post.$updatedAt || post.$createdAt).getTime();

  const hoursSinceCreate = Math.max(0.5, (now - createdMs) / 3_600_000);
  const hoursSinceUpdate = Math.max(0.5, (now - updatedMs) / 3_600_000);

  const isFriend          = friendIds.includes(post.userId) ? 1 : 0;
  const isOwnDept         = post.department === userDepartment ? 1 : 0;
  const isTargetedToYou   = (post.targetDepartments || []).some(
    d => d === userDepartment || d === userCollege || d === userUniversity ||
         targetDepartments.includes(d)
  ) ? 1 : 0;

  const likes   = Math.max(0, post.likeCount  || 0);
  const replies = Math.max(0, post.replyCount || 0);

  // Recency: newer posts score higher, but score decays with age
  // Using inverse-square root so a 1h-old post (score=1) >> a 100h-old post (score=0.1)
  const recencyScore    = 20 / Math.sqrt(hoursSinceCreate);
  const freshnessScore  = 10 / Math.sqrt(hoursSinceUpdate);  // recent activity boost

  return (
    isFriend        * 50 +   // friend posts: strong boost
    isTargetedToYou * 40 +   // post explicitly targets you
    isOwnDept       * 20 +   // same department (students)
    Math.log2(1 + likes)   * 5 +
    Math.log2(1 + replies) * 3 +
    recencyScore             +
    freshnessScore
  );
};

export const sortPostsByScore = (posts, context) =>
  [...posts].sort(
    (a, b) => computePostScore(b, context) - computePostScore(a, context)
  );
```

This formula will be applied in [Home.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Home.jsx) after fetching, for all users.

---

### 3. Authentication & Sign-Up

#### [MODIFY] [database/auth.js](file:///c:/CODING%20ZONE/college-community/database/auth.js)

- [completeOAuthSignup()](file:///c:/CODING%20ZONE/college-community/database/auth.js#502-540): Remove edu-email rejection. If `!isEducationalEmail(email)`, set `role: 'guest'`, leave `university/major/department` empty, skip academic fields.
- [createUserDocument()](file:///c:/CODING%20ZONE/college-community/database/auth.js#708-775): Allow `role: 'guest'` with empty academic fields.
- New export `initiateGuestSignup(email, password, name, age)`: Same as [initiateSignup](file:///c:/CODING%20ZONE/college-community/database/auth.js#30-120) but skips edu-email check.

#### [NEW] [app/auth/GuestSignUp.jsx](file:///c:/CODING%20ZONE/college-community/app/auth/GuestSignUp.jsx)

Single-step screen:
- Optional profile picture (same picker as student signup)
- Full name, email (any), age (16–100), password + confirm
- Calls `initiateGuestSignup()` → navigates to `VerifyEmail`
- Same glass-morphism styling as [SignUp.jsx](file:///c:/CODING%20ZONE/college-community/app/auth/SignUp.jsx)

#### [MODIFY] [app/auth/SignIn.jsx](file:///c:/CODING%20ZONE/college-community/app/auth/SignIn.jsx)

- Add **"Not a student? Sign up as Guest"** button/link near the existing sign-up button
- After Google OAuth: if user doc missing AND non-edu email → navigate to `GuestSignUp` (not [SignUp](file:///c:/CODING%20ZONE/college-community/app/auth/SignUp.jsx#61-1815))

#### [MODIFY] [app/auth/SignUp.jsx](file:///c:/CODING%20ZONE/college-community/app/auth/SignUp.jsx)

- Add optional profile picture picker at top of Step 1
- OAuth domain guard: redirect non-edu users to `GuestSignUp` instead of [SignIn](file:///c:/CODING%20ZONE/college-community/app/auth/SignUp.jsx#569-589)

#### [MODIFY] [app/context/UserContext.jsx](file:///c:/CODING%20ZONE/college-community/app/context/UserContext.jsx)

- [normalizeRole()](file:///c:/CODING%20ZONE/college-community/app/context/UserContext.jsx#16-22): recognize `'guest'` as valid (not default-to-student)

---

### 4. Navigation

#### [MODIFY] [app/App.js](file:///c:/CODING%20ZONE/college-community/app/App.js)

- Add `GuestSignUp` to auth stack
- Create `GuestTabNavigator` — **3 tabs**: Home, Post, Profile
  - Chats accessible via profile/friends only (not a bottom tab)
  - Lecture tab hidden (but community channel accessible via deep-link or future notification)
- In [checkSession()](file:///c:/CODING%20ZONE/college-community/app/App.js#443-472): after loading user doc, pass `role` to choose which navigator to render

> [!NOTE]
> Guest lecture access: guests can open individual community lecture channels (e.g. via notification link), but there is no Lecture tab in their navigation. The [Lecture.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Lecture.jsx) screen itself will hide class-specific content and only show community channels.

---

### 5. Home Feed

#### [MODIFY] [app/tabs/Home.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Home.jsx)

**Role-check-first pattern** (no ghost data):
```js
// BEFORE fetching, decide what to load
const isGuestUser = isGuest(user);
const effectiveFeed = isGuestUser ? FEED_TYPES.PUBLIC : selectedFeed;
// Only fetch after role is known
```

- Hide [FeedSelector](file:///c:/CODING%20ZONE/college-community/app/components/FeedSelector.jsx#17-229) for guests at render time (not after fetch)
- Force `selectedFeed = FEED_TYPES.PUBLIC` for all guests
- After fetch, call `sortPostsByScore(posts, buildContext(user, friendIds))` for **all users**
- Guest tutorial: 3 steps (search, notifications, posts)

---

### 6. Post Creation

#### [MODIFY] [app/tabs/Post.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Post.jsx)

**If `isGuest(user)`:**

1. **Daily limit check** — on mount, read `profileViews.guestLastPostDate` and `guestPostCountToday`. If today's date matches and count >= 1: show alert *"You've already posted today. Come back tomorrow!"* and disable the submit button.

2. **Target picker** — visible **only** when `postType === 'question'`. Shows a multi-select dropdown of departments (up to 3). Label: *"Want to ask a specific department? (optional)"*. Uses same `SearchableDropdown` component with `multiSelect` mode.

3. **Forced visibility** — remove visibility toggle entirely, always set `department: 'public'`.

4. **Post types** — allow only `discussion` and `question` (no announcements, no polls).

5. **On success** — update `profileViews` JSON via [updateUser({ profileViews: ... })](file:///c:/CODING%20ZONE/college-community/app/context/UserContext.jsx#293-351).

#### [MODIFY] [database/posts.js](file:///c:/CODING%20ZONE/college-community/database/posts.js)

- Save `targetDepartments: []` and `isGuestPost: true` for guest posts
- Server-side: enforce daily rate limit using `enforceRateLimit` with 24h window for guests

---

### 7. Chat Restrictions

#### [MODIFY] [app/tabs/Chats.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Chats.jsx)

- **Role-check first**: if `isGuest(user)`, skip fetching group chats entirely
- Show only private chats (DMs) for guests; no group creation button
- Guest can see and chat other guests freely

#### [MODIFY] [database/chatHelpers.js](file:///c:/CODING%20ZONE/college-community/database/chatHelpers.js)

- Before creating a DM: check if guest→student; if so, verify [areFriends()](file:///c:/CODING%20ZONE/college-community/database/users.js#482-500) first

#### [MODIFY] [app/screens/UserProfile.jsx](file:///c:/CODING%20ZONE/college-community/app/screens/UserProfile.jsx)

- If viewer is guest + target is student + NOT friends: hide Message button, show locked tooltip

#### [MODIFY] [app/screens/PostDetails.jsx](file:///c:/CODING%20ZONE/college-community/app/screens/PostDetails.jsx)

- Guest can only **see** replies; can only **write** a reply if [areFriends(guest, postAuthor)](file:///c:/CODING%20ZONE/college-community/database/users.js#482-500)

---

### 8. Lecture Channels

#### [MODIFY] [app/tabs/Lecture.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Lecture.jsx)

- If `isGuest(user)`: load only channels where `channelType === 'community'` (not class-specific). Hide the class selector UI.
- Check role before fetching — don't fetch class data for guests at all.

---

### 9. Profile — Guest Badge

#### [MODIFY] [app/components/PostCard.jsx](file:///c:/CODING%20ZONE/college-community/app/components/PostCard.jsx)

- Where the stage badge is rendered: if `authorRole === 'guest'`, show **"Guest"** badge instead of the year badge (same visual slot, different label + color).

#### [MODIFY] [app/screens/UserProfile.jsx](file:///c:/CODING%20ZONE/college-community/app/screens/UserProfile.jsx)

- Show "Guest" in the stage/year display area on the profile header.

---

### 10. Anti-Abuse Rules

| Rule | Enforcement |
|---|---|
| 1 post/day | Client check on mount + 24h server rate limit |
| No group chat creation | UI hidden + `chatHelpers` throws if guest tries |
| Cannot be elected representative | [repElections.js](file:///c:/CODING%20ZONE/college-community/database/repElections.js) filters out guests |
| Stricter rate limits | `GUEST_*_RATE_LIMIT` constants in [securityGuards.js](file:///c:/CODING%20ZONE/college-community/database/securityGuards.js) |
| Cannot change role to student | [updateUser](file:///c:/CODING%20ZONE/college-community/app/context/UserContext.jsx#293-351) rejects role changes |
| Guest reports weighted lower | 0.5× weight in [posts.js](file:///c:/CODING%20ZONE/college-community/database/posts.js) report scoring |
| Cannot reply unless friends | [PostDetails.jsx](file:///c:/CODING%20ZONE/college-community/app/screens/PostDetails.jsx) enforces before submit |
| Cannot access class groups | [Chats.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Chats.jsx) + [chatHelpers.js](file:///c:/CODING%20ZONE/college-community/database/chatHelpers.js) skip non-community chats |

---

### 11. i18n

#### [MODIFY] Locale files — [en](file:///c:/CODING%20ZONE/college-community/locales/en), [ar](file:///c:/CODING%20ZONE/college-community/locales/ar), [ku](file:///c:/CODING%20ZONE/college-community/locales/ku)

New keys:
```
auth.notAStudent, auth.signUpAsGuest
auth.guestSignUpTitle, auth.guestSignUpSubtitle
guest.badge, guest.postLimitReached, guest.postLimitMessage
guest.chatRestricted, guest.becomeFriendsToChat
guest.replyRestricted, guest.targetDeptLabel, guest.targetDeptPlaceholder
tutorial.guest.searchTitle, tutorial.guest.searchDescription
tutorial.guest.notificationsTitle, tutorial.guest.notificationsDescription  
tutorial.guest.postsTitle, tutorial.guest.postsDescription
```

---

## Files Changed Summary

| File | Change Type |
|---|---|
| `scripts/addGuestAttributes.js` | NEW — one-time DB migration script |
| `app/utils/guestUtils.js` | NEW — role helpers + chat permission logic |
| [app/utils/postRanking.js](file:///c:/CODING%20ZONE/college-community/app/utils/postRanking.js) | NEW — universal ranking formula |
| `app/auth/GuestSignUp.jsx` | NEW — single-step guest sign-up screen |
| [database/auth.js](file:///c:/CODING%20ZONE/college-community/database/auth.js) | MODIFY — remove edu-email gate for OAuth, add `initiateGuestSignup` |
| [app/auth/SignIn.jsx](file:///c:/CODING%20ZONE/college-community/app/auth/SignIn.jsx) | MODIFY — add guest signup button, route non-edu OAuth to guest flow |
| [app/auth/SignUp.jsx](file:///c:/CODING%20ZONE/college-community/app/auth/SignUp.jsx) | MODIFY — add optional profile picture, fix OAuth redirect |
| [app/context/UserContext.jsx](file:///c:/CODING%20ZONE/college-community/app/context/UserContext.jsx) | MODIFY — recognize `guest` as valid role |
| [app/App.js](file:///c:/CODING%20ZONE/college-community/app/App.js) | MODIFY — add `GuestTabNavigator`, `GuestSignUp` route |
| [app/tabs/Home.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Home.jsx) | MODIFY — role-check first, hide FeedSelector, apply ranking |
| [app/tabs/Post.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Post.jsx) | MODIFY — daily limit, target picker, guest restrictions |
| [app/tabs/Chats.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Chats.jsx) | MODIFY — role-check first, hide groups for guests |
| [app/tabs/Lecture.jsx](file:///c:/CODING%20ZONE/college-community/app/tabs/Lecture.jsx) | MODIFY — show community channels only for guests |
| [app/screens/PostDetails.jsx](file:///c:/CODING%20ZONE/college-community/app/screens/PostDetails.jsx) | MODIFY — restrict replies for guests |
| [app/screens/UserProfile.jsx](file:///c:/CODING%20ZONE/college-community/app/screens/UserProfile.jsx) | MODIFY — guest badge, hide message button |
| [app/components/PostCard.jsx](file:///c:/CODING%20ZONE/college-community/app/components/PostCard.jsx) | MODIFY — guest badge in stage slot |
| [database/posts.js](file:///c:/CODING%20ZONE/college-community/database/posts.js) | MODIFY — save `targetDepartments`, enforce daily limit |
| [database/chatHelpers.js](file:///c:/CODING%20ZONE/college-community/database/chatHelpers.js) | MODIFY — friend-check for guest→student DMs |
| [database/securityGuards.js](file:///c:/CODING%20ZONE/college-community/database/securityGuards.js) | MODIFY — stricter guest rate limits |
| `locales/en + ar + ku` | MODIFY — add guest translation keys |

---

## Verification Plan

### Automated Tests

```sh
npx jest --config jest.config.js
```

#### New test files
1. `__tests__/guestUtils.test.js` — `isGuest`, `canInitiateChat`
2. [__tests__/postRanking.test.js](file:///c:/CODING%20ZONE/college-community/__tests__/postRanking.test.js) — scoring formula edge cases (`computePostScore`)
3. `__tests__/guestPostRestrictions.test.js` — daily limit logic

### Manual Testing

1. **Guest Sign-Up (email/password)** — Tap "Not a student? Sign up as Guest" → GuestSignUp screen → submit → verify email → 3-tab app
2. **Guest Sign-Up (Google OAuth, non-edu)** — Google sign-in with non-edu email → GuestSignUp → 3-tab app
3. **Student sign-up unchanged** — edu email Google → full 2-step student signup
4. **Guest feed** — Public posts only, no FeedSelector, ranking applied
5. **Guest post** — Post tab → daily limit enforced → question type shows dept target picker (up to 3)
6. **Guest post limit** — Second post attempt same day → friendly warning shown
7. **Guest→Student chat blocked** — Profile of non-friend student: Message hidden
8. **Guest→Guest chat free** — Profile of another guest: Message button visible
9. **Lecture access** — Community channels visible; class channels not shown
10. **Guest badge** — PostCard shows "Guest" in stage slot for guest authors
