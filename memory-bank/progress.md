# PlateScan — Progress

## Completed
- [x] Settings screen: dedicated screen with goal input (500–10000), ±buttons, AsyncStorage persistence (`platescan:dailyCalorieGoal`)
- [x] HomeScreen.js: uses `getCalorieGoal()` instead of hardcoded `DAILY_CALORIE_GOAL`
- [x] Web build fix: persistent template via `web/public/index.html` + `scripts/patch-index.js`
- [x] PlateDetail image navigation: HistoryScreen uses `TouchableOpacity` (not the whole card) to avoid conflicts with delete long-press
- [x] Entry detail image tap: `onPress` on thumb image opens `PlateDetail`
- [x] Macros persistence: `storageService.js` auto-aggregates `macros { protein, carbs, fat }` from items if not already on entry
- [x] Image persistence: `ResultScreen.js` copies temp image to `FileSystem.documentDirectory + 'plates/' + ${entryId}.jpg` before saving

## In Progress
- ~~HistoryScreen DAILY_CALORIE_GOAL migration~~ (deferred to next task — already documented in active-context.md)

## Pending
- Fix HistoryScreen.js to use `getCalorieGoal()` instead of `DAILY_CALORIE_GOAL`
- Run `npm run build:web` and verify

## Files Changed This Session
- `src/services/aiService.js` — **no changes** (AI schema already returns protein/carbs/fat)
- `src/services/storageService.js` — added `macros` aggregation logic (new field: `macros`)
- `src/screens/ResultScreen.js` — added image copy via `FileSystem` before save (new field: `imageUri` points to persistent path)
- `.memory-bank/active-context.md` — updated
- `.memory-bank/progress.md` — updated (this file)