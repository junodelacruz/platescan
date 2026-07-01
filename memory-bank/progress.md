# PlateScan — Progress
## ⛔ IRREPLACEABLE BUILD RULE — READ BEFORE BUILDING

> **Always use `npm run build:web` to build the web app.**
>
> Never run `npx expo export --platform web --output-dir dist` directly. The Expo export command **overwrites** `dist/index.html` with a bare template, **destroying** all PWA/viewport/status-bar fixes. The patched command `npm run build:web` runs the Expo export **and** then `node scripts/patch-index.js` which restores the template from `web/public/index.html` (viewport, PWA tags, status-bar CSS, background color) and injects the correct bundle reference.
>
> If you run the raw Expo export command, `dist/index.html` will have **no** PWA support, **no** `viewport-fit=cover`, **no** dark background on `<html>/<body>`, and the white bar will return.
## Build Checklist

- [x] Settings UI — dedicated screen implemented
- [x] Calorie goal persistence — AsyncStorage with `platescan:dailyCalorieGoal` key
- [x] Goal range validation — 500–10000 kcal enforced
- [x] Macros per plate entry — protein, carbs, fat (grams) stored per entry
- [x] Image persistence — images copied to `plates/` directory
- [x] **Shared BackButton component** — `src/components/BackButton.js` created, used by PlateDetailScreen, ScanScreen, HistoryScreen, SettingsScreen
- [x] **Standardized back button** — "← Back" in white text, fontSize 16, fontWeight '600' across all 4 screens
- [x] **Web image persistence fix** — ResultScreen.js now converts `imageBase64` to a `data:image/jpeg;base64,...` URI on web (lines 65–68), stored in AsyncStorage via `addFoodEntry`. Native platforms keep the existing `copyAsync` → `FileSystem.documentDirectory` approach. No changes needed in storageService.js.
- [x] **ResultScreen macro display** — Per-item macro line (P: Xg · C: Xg · F: Xg) added below each item's confidence text using `colors.inkMuted` + `typography.label`. Plate-level macro totals row added below calorie total, showing aggregate P/C/F computed from items array.
- [x] **Silent failure fix** — handleSave wrapped in try/catch with Alert.alert, addFoodEntry wrapped with size guard (400KB), aiService max_tokens raised to 2000.