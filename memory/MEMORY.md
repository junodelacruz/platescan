# PlateScan — Project Memory

## 1. CURRENT PROJECT GOAL
Building **PlateScan**, a calorie-tracking mobile app that lets users photograph plates of food and get AI-based calorie estimates. The web build (`dist/`) is deployed on a separate server via Docker/NGINX.

**Immediate status:** Web build (`dist/`) is the latest deployed artifact. All critical bugs in `HomeScreen.js` have been fixed and the web bundle rebuilt. PWA viewport fixes applied to `dist/index.html` (viewport-fit=cover, PWA meta tags, status bar override).

### Recent Feature: User-Configurable Daily Calorie Goal
- Added `SettingsScreen.js` — new screen with +/- adjustment buttons and save
- `storageService.js` — added `getCalorieGoal()` / `setCalorieGoal(goal)` with AsyncStorage key `platescan:dailyCalorieGoal`, default 1900
- `HomeScreen.js` — replaced hardcoded `DAILY_CALORIE_GOAL` import with local state loaded from AsyncStorage; added Settings link in header (Settings | Calendar)
- `App.js` — added `Settings` route to Stack Navigator
- User can now change their daily calorie goal from the Settings screen; changes persist in AsyncStorage

---

## 2. TECH STACK & ARCHITECTURE

### Framework & Dependencies
| Package | Version |
|---|---|
| Expo | ~54.0.0 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| react-native-web | ^0.21.0 |
| @react-navigation/native | ^6.1.0 |
| @react-navigation/native-stack | ^6.9.0 |
| expo-image-picker | ~17.0.11 |
| @react-native-async-storage/async-storage | 2.2.0 |
| react-native-svg | 15.12.1 |
| react-native-gesture-handler | ~2.28.0 |
| react-native-screens | ~4.16.0 |
| react-native-safe-area-context | ~5.6.0 |
| expo-status-bar | ~3.0.9 |

### Deployment (Web)

- **Build command:** `npx expo export --platform web --output-dir dist`
- **Server:** NGINX (nginx:alpine) via docker-compose
- **Mount:** `./dist:/usr/share/nginx/html:ro`
- **Port:** 8085 (host) -> 80 (container)
- **docker-compose.yml** is at project root

### Folder Structure
```
platescan/
├── App.js                          ← navigation entry point (Stack Navigator)
├── app.json                        ← Expo config (camera/photo permissions)
├── docker-compose.yml              ← NGINX deployment
├── dist/                           ← web build (upload to server)
│   ├── index.html
│   ├── metadata.json
│   ├── _expo/static/js/web/AppEntry-*.js
│   └── assets/node_modules/...
├── src/
│   ├── config.js                   ← AI provider config + DAILY_CALORIE_GOAL (1900)
│   ├── theme.js                    ← colors (dark warm theme) + typography tokens
│   ├── components/
│   │   └── PlateRing.js            ← circular SVG progress ring component
│   ├── screens/
│   │   ├── HomeScreen.js           ← today's log + plate ring
│   │   ├── ScanScreen.js           ← camera/photo picker -> AI call
│   │   ├── ResultScreen.js         ← AI results display + editable + save
│   │   └── HistoryScreen.js        ← past days calendar view
│   └── services/
│       ├── aiService.js            ← AI provider abstraction (analyzeFoodImage)
│       └── storageService.js       ← AsyncStorage wrapper (getFoodLog, addFoodEntry, etc.)
```

### AI Provider Architecture
`aiService.js` has a single entry `analyzeFoodImage(base64Image)` that switches by provider:

| Provider | Notes |
|---|---|
| `gemini` (default) | Google Gemini, free tier, uses `generateContent` endpoint with responseSchema |
| `odysseus` | Self-hosted OpenAI-compatible endpoint, LAN IP needed |
| `openai-compatible` | Any OpenAI-style `/v1/chat/completions` |
| `anthropic` | Anthropic Messages API |

`src/config.js` controls all AI settings:
```js
export const AI_CONFIG = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  apiKey: '<key>',
  model: 'gemini-2.5-flash',
};
export const DAILY_CALORIE_GOAL = 1900;
```

---

## 3. SYSTEM CONVENTIONS

### Naming
- **Files:** kebab-case (e.g., `HomeScreen.js`, `storageService.js`)
- **Components:** PascalCase (e.g., `PlateRing`, `HomeScreen`)
- **Functions:** camelCase (e.g., `analyzeFoodImage`, `getFoodLog`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DAILY_CALORIE_GOAL`, `MEAL_TYPE_COLORS`)

### Code Style
- React function components with `export default`
- Inline `StyleSheet.create()` at bottom of each screen file
- All screens import `colors` and `typography` from `../theme`
- AI call is isolated in `aiService.js` — screens never call providers directly
- Data persistence via `AsyncStorage` — **never** use `localStorage` in React Native

### Import Pattern (every screen must have these)
```js
import React, { useCallback, useState } from 'react';
import { View, Text, ... } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography } from '../theme';
// + component/service/config imports as needed
```

### Design Theme
- Dark mode warm charcoal palette (`#1C1814` base)
- Colors: `tomato` (accent), `forest` (confirm), `gold` (tertiary), `ink` (text), `inkMuted` (secondary), `surface` (cards), `border` (separators)
- System fonts (zero extra setup)

---

## 4. RECENT PROBLEMS & SOLUTIONS

### Bug 1: `HomeScreen.js` — missing imports
**Symptom:** Runtime error `"property colors doesn't exist"` / `"undefined is not an object"`

**Root cause:** The import section of `HomeScreen.js` was stripped to a single line. Missing imports:
- `React`, `useState`, `useCallback` from `'react'`
- `useFocusEffect` from `'@react-navigation/native'`
- `AsyncStorage` from `'@react-native-async-storage/async-storage'`
- `PlateRing` from `'../components/PlateRing'` (default import)
- `getFoodLog`, `getTodayEntries`, `deleteFoodEntry` from `'../services/storageService'`
- `DAILY_CALORIE_GOAL` from `'../config'`
- `colors`, `typography` from `'../theme'`

**Fix:** Added all 8 import lines to match other screens' conventions.

### Bug 2: `localStorage.setItem` in HomeScreen.js
**Symptom:** Would crash in React Native — `localStorage` doesn't exist.

**Fix:** Changed to `AsyncStorage.setItem('DAILY_CALORIE_GOAL', goal.toString())`.

### Web Viewport Fix: White bar at top of Safari PWA
**Symptom:** White bar visible at top when viewed in Safari on iOS.

**Root cause:** Missing PWA/viewport meta tags and no background color on body.

**Fix applied to `dist/index.html`:**
1. Added `viewport-fit=cover, user-scalable=no` to viewport meta
2. Added `apple-mobile-web-app-capable: yes` (iOS PWA mode)
3. Added `apple-mobile-web-app-status-style: black-translucent` (transparent status bar)
4. Added `mobile-web-app-capable: yes` (Android PWA)
5. Added `background-color: #1C1814` to `html, body` (matches app theme, prevents white flash)
6. Added CSS override to hide/status bar elements:
   ```css
   .rn-status-bar, [data-testid="statusBar"], [class*="statusBar"] {
     background-color: #1C1814 !important;
     display: none;
   }
   ```

**Note:** iOS `apple-mobile-web-app-*` meta tags only activate when the app is **launched from the home screen** (after "Add to Home Screen"). Safari address bar mode will still show browser chrome.

---

## 5. USER PREFERENCES

### Development Workflow
- Codes locally on **Windows 11** using Antigravity IDE
- **Upload workflow:** Build `dist/` locally -> upload to separate server -> Docker-compose handles deployment
- Server runs **nginx:alpine** container mounting `./dist:/usr/share/nginx/html:ro`
- Server port: 8085 mapped to container port 80
- Context management: User proactively resets by asking for MEMORY.md generation

### Communication
- Prefers concise, direct answers
- Values actionable output (code ready to paste/deploy)
- Cares about end-to-end correctness (verifies dist folder before upload)