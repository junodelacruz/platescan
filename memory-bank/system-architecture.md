# PlateScan — System Architecture

## Overview
PlateScan is a calorie-tracking mobile app (Expo / React Native) that lets users photograph a plate of food and get an AI-generated calorie estimate. It builds to native (iOS/Android via Expo) and to web, self-hosted via Docker + NGINX.

## Tech Stack
| Layer | Library | Version |
|---|---|---|
| Framework | Expo | ~54.0.0 |
| | React Native | 0.81.5 |
| | React | 19.1.0 |
| Web target | react-native-web | ^0.21.0 |
| Navigation | @react-navigation/native | ^6.1.0 |
| | @react-navigation/native-stack | ^6.9.0 |
| Camera/Photos | expo-image-picker | ~17.0.11 |
| Storage | @react-native-async-storage/async-storage | 2.2.0 |
| Graphics | react-native-svg | 15.12.1 |
| | react-native-gesture-handler | ~2.28.0 |
| | react-native-screens | ~4.16.0 |
| | react-native-safe-area-context | ~5.6.0 |
| | expo-status-bar | ~3.0.9 |

Dev environment: Windows (win32), VS Code, working dir `c:\Users\junod\Desktop\Personal Projects\platescan`. Coding agent used: Cline.

## Folder Structure
```
platescan/
├── App.js                          ← navigation entry point (Stack Navigator)
├── app.json                        ← Expo config (camera/photo permissions)
├── docker-compose.yml              ← NGINX deployment
├── dist/                           ← web build output (uploaded to server)
│   ├── index.html
│   ├── metadata.json
│   ├── _expo/static/js/web/AppEntry-*.js
│   └── assets/node_modules/...
├── memory-bank/
│   ├── product-context.md          ← why / features
│   ├── system-architecture.md      ← this file
│   ├── active-context.md           ← current focus / blocks
│   └── progress.md                 ← task checklist
├── src/
│   ├── config.js                   ← AI provider config
│   ├── theme.js                    ← colors + typography tokens
│   ├── components/
│   │   └── PlateRing.js            ← circular SVG progress ring
│   ├── screens/
│   │   ├── HomeScreen.js           ← today's log + plate ring + header links
│   │   ├── ScanScreen.js           ← camera/photo picker → AI call
│   │   ├── ResultScreen.js         ← AI results display, editable, save
│   │   ├── PlateDetailScreen.js    ← NEW (v2) — full-screen plate image + calorie details + delete
│   │   ├── HistoryScreen.js        ← calendar / past-days view
│   │   └── SettingsScreen.js       ← user-adjustable daily calorie goal
│   └── services/
│       ├── aiService.js            ← AI provider abstraction
│       └── storageService.js       ← AsyncStorage (metadata) + IndexedDB (images)
```

## Navigation
`App.js` registers a `Stack.Navigator` (`headerShown: false`, dark `contentStyle` background) with 6 screens:

`Home → Scan → Result → PlateDetail → History → Settings`

- `Home` is the initial route.
- `Result` → `PlateDetail` via "View Full" button (taps on scan thumbnail).
- `PlateDetail` → back via `BackButton` (goBack).
- `Settings` is reached from Home's header ("Settings | Calendar" links) and returns via `navigation.goBack()`.

## AI Provider Architecture
`aiService.js` exposes one function, `analyzeFoodImage(base64Image)`, that branches on `AI_CONFIG.provider`:

| Provider | Notes |
|---|---|
| `gemini` (default) | Google Gemini free tier, `generateContent` endpoint w/ `responseSchema` |
| `odysseus` | Self-hosted OpenAI-compatible endpoint; phone needs LAN IP or a tunnel (e.g. Tailscale) to reach it |
| `openai-compatible` | Any OpenAI-style `/v1/chat/completions` vision endpoint |
| `anthropic` | Anthropic Messages API (~$0.01/scan, strongest multi-item reads) |

`src/config.js` shape:
```js
export const AI_CONFIG = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  apiKey: '<a real key is currently hardcoded here — redacted in this doc>',
  model: 'gemini-2.5-flash',
};
export const DAILY_CALORIE_GOAL = 1900; // legacy fallback constant
```

⚠️ **Security note:** an actual Gemini API key is hardcoded in plaintext in `config.js`. It is intentionally not reproduced in these memory files. If this repo is ever pushed to a public remote, move the key to an env var or a `.gitignore`d local file and rotate it.

## Data / Storage Layer
**Hybrid persistence** — metadata via AsyncStorage, image blobs via IndexedDB:

| Storage | Key / Name | Purpose | Default | Functions |
|---|---|---|---|---|
| **AsyncStorage** | `platescan:foodLog` | Array of food-entry objects | `[]` | `getFoodLog()`, `addFoodEntry()`, `deleteFoodEntry()`, `getTodayEntries()`, `groupByDay()` |
| **AsyncStorage** | `platescan:dailyCalorieGoal` | User's daily calorie target | `1900` | `getCalorieGoal()`, `setCalorieGoal()` |
| **IndexedDB** | `platescan-db` (object store: `foodImages`) | Binary image blobs keyed by food entry ID | new DB | `saveImageToIndexedDB(id, blob)`, `loadImageFromIndexedDB(id)`, `deleteImageFromIndexedDB(id)` |

### Image Storage Flow (IndexedDB, web target)
1. `ResultScreen` calls `saveFoodEntry(entry, imageUri)` — `entry.imageId` is `uuid.v4()`.
2. If `imageUri` exists and exceeds **400 KB** (`imageUri.length > 400 * 1024`):
   - A warning toast is shown: *"Image too large for offline storage — saved to log only."*
   - **The imageUri is stripped** (`imageUri = null`) before the entry is saved to AsyncStorage.
3. If under 400 KB, `saveImageToIndexedDB(entry.imageId, imageUri)` stores the blob.
4. On `PlateDetailScreen` load, `loadImage(entry.imageId)` retrieves from IndexedDB.
5. On delete, `deleteImageFromIndexedDB(entry.imageId)` removes the blob in parallel with AsyncStorage deletion.

### Image Storage Flow (native target — iOS/Android)
- Native paths **do not** use IndexedDB (browser-only API).
- When `imageUri` is a `file://` path from expo-image-picker, the file is **copied into the app's Document Directory** via `FileSystemStorageStrategy.copyFile()`, and the stable document path is stored in `entry.imagePath`.
- Load reads from the document path; delete removes the file.

### Storage Strategies (`src/services/strategy/`)
| Strategy | Use | Key methods |
|---|---|---|
| `FileSystemStorageStrategy` | Native (iOS/Android) | `copyFile(src)` → returns stable doc path; `loadFile(path)`; `deleteFile(path)` |
| `IndexedDBStorageStrategy` | Web | `saveImage(id, blob)` → stores in IndexedDB; `loadImage(id)` → returns blob URI; `deleteImage(id)` |
| `InMemoryStorageStrategy` | Dev fallback | Stores in a Map (ephemeral) |

## Design Theme (`src/theme.js`)
Warm dark-mode palette, "late-night kitchen / ember glow":

| Token | Hex | Use |
|---|---|---|
| `background` | `#1C1814` | base |
| `surface` | `#2A241E` | cards / inputs |
| `ink` | `#F5EBE0` | primary text |
| `inkMuted` | `#A3907C` | secondary text |
| `tomato` | `#E05D44` | primary accent / over-goal |
| `forest` | `#4E7C62` | confirm / save / under-goal |
| `gold` | `#D9A441` | tertiary highlight |
| `border` | `#3E342B` | separators |

Typography: system fonts only — `display`, `body`, `label` tokens (see `theme.js` for weights/letter-spacing).

## Conventions
- **Files:** screens & components are PascalCase (`HomeScreen.js`), services are camelCase (`storageService.js`)
- **Components:** PascalCase
- **Functions:** camelCase
- **Constants:** UPPER_SNAKE_CASE
- React function components, `export default`, inline `StyleSheet.create()` at the bottom of the file
- Every screen imports `colors`/`typography` from `../theme`
- AI calls are isolated in `aiService.js` — screens never call providers directly
- Standard screen import block:
```js
import React, { useCallback, useState } from 'react';
import { View, Text, ... } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography } from '../theme';
// + component/service imports as needed
```

## Deployment (Web)
- Build: `npx expo export --platform web --output-dir dist`
- Server: NGINX (`nginx:alpine`) via `docker-compose.yml` at project root
- Mount: `./dist:/usr/share/nginx/html:ro`
- Port: `8085` (host) → `80` (container)
- PWA fixes already baked into `dist/index.html`: `viewport-fit=cover`, PWA meta tags, status-bar override (applied before this session, regenerated by the build step — not hand-edited)