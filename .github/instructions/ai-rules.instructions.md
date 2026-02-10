---
applyTo: "**"
---

# 🔧 AI EDITING RULES & PATTERNS

> **FOR AI**: Follow these rules strictly to avoid breaking the codebase.

---

## ⛔ NEVER DO THESE

1. **NEVER use TypeScript syntax** - This is a JavaScript-only project
2. **NEVER hardcode text** - Always use translation keys
3-**NEVER BRAG TOO MUCH** - Show Minimum of you thinking and processing Thoughts
3. **NEVER leave TODO/FIXME incomplete** - Complete them or remove
4. **NEVER leave commented-out code**
5. **NEVER delete multiple files at once** - Make minimal changes
6. **NEVER use `var`** - Use `const` or `let`
7. **NEVER use class components** - Use functional components with hooks

---

## ✅ ALWAYS DO THESE

1. **Use translation keys** for ALL user-visible text:

   ```javascript
   // ❌ BAD
   <Text>Hello World</Text>

   // ✅ GOOD
   <Text>{t('common.helloWorld')}</Text>
   ```

2. **Use responsive utilities** for sizing:

   ```javascript
   import { wp, hp, normalize } from '../utils/responsive';

   // ❌ BAD
   width: 300, fontSize: 16

   // ✅ GOOD
   width: wp(80), fontSize: normalize(16)
   ```

3. **Follow existing patterns** in each file

4. **Import from design tokens** for colors:

   ```javascript
   import { lightColors, darkColors } from "../theme/designTokens";
   ```

5. **Use the useTranslation hook**:
   ```javascript
   const { t } = useTranslation();
   ```

---

## 📁 FILE PATTERNS

### Component File Pattern

```javascript
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { useAppSettings } from "../context/AppSettingsContext";
import { wp, hp, normalize } from "../utils/responsive";

const ComponentName = ({ prop1, prop2 }) => {
  const { t } = useTranslation();
  const { theme, colors } = useAppSettings();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {t("component.text")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: wp(4),
  },
  text: {
    fontSize: normalize(16),
  },
});

export default ComponentName;
```

### Screen File Pattern

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';

const ScreenName = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useAppSettings();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    // ...
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    // ...
  );
};

export default ScreenName;
```

### Database Function Pattern

```javascript
import { databases, DATABASE_ID, COLLECTION_ID } from "./config";
import { Query, ID } from "appwrite";

export const functionName = async (param1, param2) => {
  try {
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        field1: param1,
        field2: param2,
      },
    );
    return result;
  } catch (error) {
    throw error;
  }
};
```

---

## 🔄 TRANSLATION KEY CONVENTIONS

When adding new translations:

1. **Add to ALL 3 locale files**: `en.js`, `ar.js`, `ku.js`
2. **Use nested structure**:

   ```javascript
   // locales/en.js
   export default {
     screenName: {
       title: "Screen Title",
       subtitle: "Screen subtitle",
       buttons: {
         save: "Save",
         cancel: "Cancel",
       },
     },
   };
   ```

3. **Naming conventions**:
   - `auth.*` - Authentication related
   - `posts.*` - Post related
   - `chats.*` - Chat related
   - `settings.*` - Settings related
   - `common.*` - Shared/common text
   - `errors.*` - Error messages
   - `validation.*` - Form validation

---

## 🎨 STYLING CONVENTIONS

1. **Use theme colors from context**:

   ```javascript
   const { colors } = useAppSettings();
   style={{ backgroundColor: colors.background }}
   ```

2. **Use responsive sizing**:
   - `wp(percent)` - Width percentage
   - `hp(percent)` - Height percentage
   - `normalize(size)` - Font size scaling

3. **Use spacing tokens from designTokens.js**:
   ```javascript
   import { spacing } from "../theme/designTokens";
   padding: spacing.md;
   ```

---

## 🗄️ DATABASE PATTERNS

### Appwrite Collections Used

- `USERS_COLLECTION_ID` - User profiles
- `POSTS_COLLECTION_ID` - Posts
- `REPLIES_COLLECTION_ID` - Post replies
- `CHATS_COLLECTION_ID` - Chat rooms
- `MESSAGES_COLLECTION_ID` - Chat messages
- `NOTIFICATIONS_COLLECTION_ID` - Notifications

### Common Query Patterns

```javascript
import { Query } from 'appwrite';

// Pagination
Query.limit(20),
Query.offset(page * 20),

// Ordering
Query.orderDesc('$createdAt'),

// Filtering
Query.equal('userId', userId),
Query.search('content', searchTerm),
```

---

## ⚠️ COMMON MISTAKES TO AVOID

1. **Editing wrong file** - Always verify file location first
2. **Missing translations** - Add to ALL 3 locale files
3. **Hardcoded colors** - Use `colors` from context
4. **Hardcoded sizes** - Use responsive utils
5. **Not handling loading states** - Always show loading indicator
6. **Not handling errors** - Always try/catch database calls
7. **Forgetting navigation params** - Check `route.params`

---

## 🔍 BEFORE MAKING CHANGES

1. **Identify the correct file(s)** using project-map.instructions.md
2. **Read the existing code** to understand patterns
3. **Check related files** that might need updates
4. **Plan minimal changes** - don't refactor unnecessarily
5. **Consider translations** - add keys if new text needed

---

## 📝 AFTER MAKING CHANGES

1. **Verify no console.log left**
2. **Verify no TODO/FIXME left incomplete**
3. **Verify no commented-out code**
4. **Verify translations added to all 3 locales**
5. **Verify responsive sizing used**
6. **Verify error handling added**
