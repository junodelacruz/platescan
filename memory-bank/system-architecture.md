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
├── memory/
│   └── memory.md                  ← legacy single-file project memory bank (now being split into these 4 files)
├── src/
│   ├── config.js                   ← AI provider config + legacy DAILY_CALORIE_GOAL constant (see note below)
│   ├── theme.js                    ← colors (dark warm theme) + typography tokens
│   ├── components/
│   │   └── PlateRing.js            ← circular SVG progress ring (consumed vs goal). NOT touched/re-read this session — assume unchanged.
│   ├── screens/
│   │   ├── HomeScreen.js           ← today's log + plate ring + Settings/Calendar header links
│   │   ├── ScanScreen.js           ← camera/photo picker → AI call. NOT touched this session.
│   │   ├── ResultScreen.js         ← AI results display, editable, save. NOT touched this session.
│   │   ├── HistoryScreen.js        ← calendar / past-days view — ⚠️ still on the hardcoded goal, see progress.md
│   │   └── SettingsScreen.js       ← NEW — lets the user view/adjust/save the daily calorie goal
│   └── services/
│       ├── aiService.js            ← AI provider abstraction, single entry analyzeFoodImage(base64Image). NOT touched this session.
│       └── storageService.js       ← AsyncStorage wrapper — now also owns calorie-goal persistence
```

## Navigation
`App.js` registers a `Stack.Navigator` (`headerShown: false`, dark `contentStyle` background) with 5 screens:

`Home → Scan → Result → History → Settings`

- `Home` is the initial route.
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
export const DAILY_CALORIE_GOAL = 1900; // legacy fallback constant — see note in progress.md
```

⚠️ **Security note:** an actual Gemini API key is hardcoded in plaintext in `config.js`. It is intentionally not reproduced in these memory files. If this repo is ever pushed to a public remote, move the key to an env var or a `.gitignore`d local file and rotate it.

## Data / Storage Layer
All persistence goes through `src/services/storageService.js` (AsyncStorage — **never** `localStorage`; this is React Native, not a browser).

| Key | Purpose | Default | Functions |
|---|---|---|---|
| `platescan:foodLog` | Array of food-entry objects (`id`, `label`, `totalCalories`, `mealType`, `timestamp`, ...) | `[]` | `getFoodLog()`, `addFoodEntry(entry)`, `deleteFoodEntry(id)`, `getTodayEntries(log)`, `groupByDay(log)` |
| `platescan:dailyCalorieGoal` | User's daily calorie target (int) | `1900` (a local `DEFAULT_GOAL` const in `storageService.js`, duplicated from — not imported from — `config.js`) | `getCalorieGoal()`, `setCalorieGoal(goal)` |

⚠️ Note: the default `1900` now lives in **two** places — `config.js`'s `DAILY_CALORIE_GOAL` and `storageService.js`'s `DEFAULT_GOAL`. They agree today but aren't linked; changing one won't update the other.

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
### ⛔ BUILD COMMAND — NEVER REPLACE

> **Always build with: `npm run build:web`**
> 
> This runs `expo export --platform web --output-dir dist && node scripts/patch-index.js`.
> 
> The second half (`patch-index.js`) is **non-optional** — it restores `dist/index.html` from `web/public/index.html` which contains all viewport, PWA, and status-bar fixes. Running `expo export` alone will overwrite `index.html` with a bare template and **break** PWA support and the white bar fix.

- Server: NGINX (`nginx:alpine`) via `docker-compose.yml` at project root
- Mount: `./dist:/usr/share/nginx/html:ro`
- Port: `8085` (host) → `80` (container)
