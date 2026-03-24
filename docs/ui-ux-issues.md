# College Community — UI/UX Issues Audit

**Date:** March 23, 2026  
**Reviewer:** GitHub Copilot (Claude Sonnet 4.6)  
**Scope:** All screens, shared components, navigation flows, theming, accessibility, RTL, and interaction patterns.

---

## How to read this document

Each issue includes:

- **File** — the exact file where the issue lives.
- **Location** — function or code area within the file.
- **Problem** — the specific UI/UX defect observed.
- **Recommended Fix** — the actionable correction.






3- on replies window try to merge the plus and send icons with the input field and make a cool and usefull design and also avoid the button on smaller screens it will be overrided by the navigation buttons of android 






## Group P — External Library Recommendations

### Issue 48 — `RepVotingScreen.jsx` — iOS receives a blocking `Alert.alert` for toast-style messages

**File:** `app/screens/representatives/RepVotingScreen.jsx`  
**Location:** `showToast` callback

**Problem:**

```js
const showToast = useCallback((message) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("", message);
  }
}, []);
```

On iOS, transient informational messages (e.g., "Voting time has expired", "Election seat started") are displayed as a modal `Alert` that blocks the entire UI and requires explicit user dismissal. This is disruptive during time-sensitive voting flows.

**Recommended Fix:**  
Use a cross-platform toast library (e.g., `react-native-toast-message`) or the existing `CustomAlert` with `type: 'info'` and auto-dismiss. Remove the `Alert.alert` iOS fallback.

---

### Issue 49 — `PersonalizationSettings.jsx` — Dark mode schedule uses a free-text input for time

**File:** `app/screens/settings/PersonalizationSettings.jsx`  
**Location:** `openTimePicker` modal — `TextInput` with regex validation

**Problem:**  
Dark mode schedule start/end times are entered via a raw `TextInput` requiring the user to type `HH:MM` format manually. Validation only fires on save (`/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/`). No native time picker is shown, no initial placeholder hint (e.g., "e.g. 22:00") is visible, and there's no visual feedback on invalid input during typing.

**Recommended Fix:**  
Use `@react-native-community/datetimepicker` for a native time picker on both platforms, or at minimum add real-time validation highlighting and a visible format hint.

---

### Issue 50 — `NotificationSettings.jsx` — Quiet hours uses the same free-text time input

**File:** `app/screens/settings/NotificationSettings.jsx`  
**Location:** `openTimePicker` modal — same `TextInput` pattern as `PersonalizationSettings`

**Problem:**  
Same issue as Issue 49 — time is entered as free text in a `TextInput`. Given that quiet hours are a safety-relevant feature (missing a 24h time format causes the feature to silently not work), this is higher-impact than the theme schedule case.

**Recommended Fix:**  
Use a native time picker or a well-validated masked input with visible `HH:MM` format guidance and in-line error coloring.

---

## Summary Table

| #   | Area                 | File                                                      | Severity |
| --- | -------------------- | --------------------------------------------------------- | -------- |
| 1   | Touch target         | `SavedPosts.jsx`                                          | Medium   |
| 2   | Platform consistency | Multiple settings screens                                 | Low      |
| 3   | Navigation           | `EditPost.jsx`                                            | High     |
| 4   | Navigation           | `Post.jsx`                                                | Medium   |
| 5   | Navigation           | `ChangePassword.jsx`                                      | Low      |
| 6   | Form auto-focus      | `PostDetails.jsx`                                         | High     |
| 7   | Form UX              | `SignUp.jsx`                                              | Medium   |
| 8   | Form UX              | `ChangePassword.jsx`                                      | Low      |
| 9   | Bug                  | `AccountSettings.jsx`                                     | High     |
| 10  | Accessibility        | `FilterSortModal.jsx`                                     | Medium   |
| 11  | Accessibility        | `PostCard.jsx`                                            | High     |
| 12  | Accessibility        | `ChatListItem.jsx`                                        | High     |
| 13  | Accessibility        | `UnifiedEmptyState.jsx`                                   | Low      |
| 14  | RTL                  | `NotificationSettings.jsx`, `PersonalizationSettings.jsx` | Medium   |
| 15  | RTL                  | `FollowList.jsx`                                          | Medium   |
| 16  | RTL                  | `ChatListItem.jsx`                                        | High     |
| 17  | Error state          | `Profile.jsx`                                             | High     |
| 18  | Error state          | `SavedPosts.jsx`                                          | High     |
| 19  | Error state          | `FollowList.jsx`                                          | High     |
| 20  | Feedback             | `Home.jsx`                                                | Medium   |
| 21  | Error state          | `Notifications.jsx`                                       | Medium   |
| 22  | Visual consistency   | `ChangePassword.jsx`                                      | Low      |
| 23  | Visual consistency   | `FollowList.jsx`                                          | Low      |
| 24  | Visual consistency   | `Profile.jsx`                                             | Low      |
| 25  | Visual consistency   | `Profile.jsx`                                             | Low      |
| 26  | Animation            | `Chats.jsx`                                               | Low      |
| 27  | Visual clarity       | `ChatSettings.jsx`                                        | Low      |
| 28  | Post creation        | `Post.jsx`                                                | Medium   |
| 29  | Post creation        | `Post.jsx`                                                | Low      |
| 30  | Reply UX             | `PostDetails.jsx`                                         | Medium   |
| 31  | Form UX              | `EditPost.jsx`                                            | Medium   |
| 32  | Profile UX           | `FollowList.jsx`                                          | Low      |
| 33  | Settings UX          | `BlockList.jsx`                                           | Medium   |
| 34  | Profile UX           | `UserProfile.jsx`                                         | Low      |
| 35  | Chat UX              | `ChatRoom.jsx`                                            | High     |
| 36  | Chat UX              | `Chats.jsx`                                               | Medium   |
| 37  | Chat UX              | `Chats.jsx`                                               | Medium   |
| 38  | Elections            | `RepVotingScreen.jsx`                                     | Medium   |
| 39  | Elections            | `RepVotingScreen.jsx`                                     | Medium   |
| 40  | Search               | `SearchBar.jsx`                                           | High     |
| 41  | Search               | `SearchBar.jsx`                                           | Low      |
| 42  | Lecture              | `Lecture.jsx`                                             | Low      |
| 43  | Lecture              | `Lecture.jsx`, `LectureChannelView.jsx`                   | High     |
| 44  | Notifications        | `Home.jsx`                                                | High     |
| 45  | Notifications        | `Notifications.jsx`                                       | Low      |
| 46  | Notifications        | `Home.jsx`                                                | Medium   |
| 47  | Accessibility        | `PersonalizationSettings.jsx`                             | Medium   |
| 48  | iOS UX               | `RepVotingScreen.jsx`                                     | High     |
| 49  | Form UX              | `PersonalizationSettings.jsx`                             | Medium   |
| 50  | Form UX              | `NotificationSettings.jsx`                                | Medium   |

---

_All issues in this document are based on direct code inspection of the repository files. No assumptions were made about runtime behavior that was not directly observable in the source._
