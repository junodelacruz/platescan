# PlateScan — Active Context

## ⛔ IRREPLACEABLE BUILD RULE — READ BEFORE BUILDING

> **Always use `npm run build:web` to build the web app.**
>
> Never run `npx expo export --platform web --output-dir dist` directly. The Expo export command **overwrites** `dist/index.html` with a bare template, **destroying** all PWA/viewport/status-bar fixes. The patched command `npm run build:web` runs the Expo export **and** then `node scripts/patch-index.js` which restores the template from `web/public/index.html` (viewport, PWA tags, status-bar CSS, background color) and injects the correct bundle reference.
>
> If you run the raw Expo export command, `dist/index.html` will have **no** PWA support, **no** `viewport-fit=cover`, **no** dark background on `<html>/<body>`, and the white bar will return.

## What was just being worked on
Created a shared **`BackButton`** component (`src/components/BackButton.js`) and migrated all 4 screens (PlateDetailScreen, ScanScreen, HistoryScreen, SettingsScreen) to use it, standardizing the back button to: "← Back" in white text, fontSize 16, fontWeight '600'. Added `colors.white` token to theme.js.

## Immediate next step (recommended)
No immediate next steps. All 4 screens now share the BackButton component. The `npm run build:web` build completed successfully into the `dist` folder.

Pending future work: Consider wrapping ScanScreen in `useSafeAreaInsets` for dynamic status-bar padding on notched devices (currently relies on SafeAreaView padding).

## Resolved decisions from this session
- Settings UI approach: a **dedicated screen**, not a modal/popup, not a PlateRing long-press.
- Goal storage key: `platescan:dailyCalorieGoal` (separate from the food-log key `platescan:foodLog`).
- Valid goal range: **500–10000 kcal**, enforced both on the ±buttons (clamped) and on save (rejected outside range with an Alert).
- Each plate entry now persists a `macros` object with `protein`, `carbs`, `fat` (grams) aggregated from items.
- Images are copied to a persistent `plates/` directory via `expo-file-system` instead of relying on temp URIs.

## Things to double-check if resuming cold
- Confirm `HomeScreen.js` doesn't still have the duplicate-`handleDelete` bug that was introduced and fixed mid-session.
- `config.js` has a real, unredacted Gemini API key checked into the file — not a blocker, but worth keeping in mind before sharing.
- `storageService.js` line 40 writes `updatedEntry` (with `macros`) to AsyncStorage — verify existing entries get the `macros` field on next save when they are re-saved.