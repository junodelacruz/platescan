# PlateScan — System Architecture

## Overview

PlateScan is a calorie-tracking mobile app (Expo / React Native) that lets users photograph a plate of food and get an AI-generated calorie estimate. It builds to native (iOS/Android via Expo) and to web, self-hosted via Docker + NGINX.

## Tech Stack

| Layer         | Library                                   | Version  |
| ------------- | ----------------------------------------- | -------- |
| Framework     | Expo                                      | ~54.0.0  |
|               | React Native                              | 0.81.5   |
|               | React                                     | 19.1.0   |
| Web target    | react-native-web                          | ^0.21.0  |
| Navigation    | @react-navigation/native                  | ^6.1.0   |
|               | @react-navigation/native-stack            | ^6.9.0   |
|               | @react-navigation/bottom-tabs             | ^6.6.1   |
| Camera/Photos | expo-image-picker                         | ~17.0.11 |
| Storage       | @react-native-async-storage/async-storage | 2.2.0    |
| Graphics      | react-native-svg                          | 15.12.1  |
|               | react-native-gesture-handler              | ~2.28.0  |
|               | react-native-screens                      | ~4.16.0  |
|               | react-native-safe-area-context            | ~5.6.0   |
|               | expo-status-bar                           | ~3.0.9   |

Dev environment: Windows (win32), VS Code, working dir `c:\Users\junod\Desktop\Personal Projects\platescan`.

## Folder Structure

```
platescan/
├── App.js                          ← navigation entry point (nested Bottom Tab + Stack)
├── app.json                        ← Expo config (camera/photo permissions)
├── docker-compose.yml              ← NGINX deployment
├── dist/                           ← web build output (uploaded to server)
├── memory-bank/
│   ├── product-context.md          ← why / features
│   ├── system-architecture.md      ← this file
│   ├── active-context.md           ← current focus / blocks
│   └── progress.md                 ← task checklist
├── src/
│   ├── config.js                   ← AI provider config
│   ├── theme.js                    ← colors + typography tokens
│   ├── components/
│   │   └── PlateRing.js            ← circular SVG progress ring (thinned font weight)
│   ├── screens/
│   │   ├── HomeScreen.js           ← today's log + plate ring + dynamic date dropdown
│   │   ├── ScanScreen.js           ← camera/photo picker → AI call
│   │   ├── ResultScreen.js         ← AI results display, editable, save
│   │   ├── PlateDetailScreen.js    ← plate image + calorie details + delete action (redesigned)
│   │   ├── HistoryScreen.js        ← calendar / past-days view (redesigned log list)
│   │   ├── SettingsScreen.js       ← user-adjustable daily calorie goal (card-based layout)
│   │   └── WeightTrackerScreen.js  ← NEW — weight logs list + custom SVG chart
│   └── services/
│       ├── aiService.js            ← AI provider abstraction
│       └── storageService.js       ← AsyncStorage (metadata) + IndexedDB (images)
```

## Navigation

`App.js` registers a nested navigation setup:

- A `Stack.Navigator` acts as the root navigator.
- The `MainTabs` (`BottomTab.Navigator`) is loaded as the first screen of the stack, keeping the bottom tab bar visible across Home, History, Weight, and Settings.
- Full-screen overlays (`Scan`, `Result`, and `PlateDetail`) are sibling screens in the Stack navigator, meaning pushing them slides over and hides the bottom tab bar.

```
Stack
  ├── MainTabs (BottomTab)
  │     ├── Home        (HomeScreen)
  │     ├── History     (HistoryScreen)
  │     ├── Weight      (WeightTrackerScreen)
  │     └── Settings    (SettingsScreen)
  ├── Scan              (ScanScreen)
  ├── Result            (ResultScreen)
  └── PlateDetail       (PlateDetailScreen)
```

- Unicode text glyphs (`⊙`, `◫`, `⧖`, `◎`) are configured as tab icons.

## Data / Storage Layer

**Hybrid persistence** — metadata via AsyncStorage, image blobs via IndexedDB:

| Storage          | Key / Name                                  | Purpose                                   | Default | Functions                                                                                  |
| ---------------- | ------------------------------------------- | ----------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| **AsyncStorage** | `platescan:foodLog`                         | Array of food-entry objects               | `[]`    | `getFoodLog()`, `addFoodEntry()`, `deleteFoodEntry()`, `getTodayEntries()`, `groupByDay()` |
| **AsyncStorage** | `platescan:dailyCalorieGoal`                | User's daily calorie target               | `2000`  | `getCalorieGoal()`, `setCalorieGoal()`                                                     |
| **AsyncStorage** | `weightLog`                                 | Array of weight-entry objects             | `[]`    | Managed within `WeightTrackerScreen.js`                                                    |
| **IndexedDB**    | `platescan-db` (object store: `foodImages`) | Binary image blobs keyed by food entry ID | new DB  | `saveImage()`, `loadImage()`, `deleteImage()`                                              |

## Design Theme & Typography

- Font style on web targets loads `'Inter'` dynamically from Google Fonts.
- Font weights are customized component-side to utilize regular/thin weights (`500`/`400`/`300`/`200`) instead of default heavy bolds.
- Meal category badges display with a translucent tint background (`rgba(..., 0.15)`) and text colored directly matching category color.
