# PlateScan — Progress

## Build Checklist

- [x] Settings UI — dedicated screen implemented
- [x] Calorie goal persistence — AsyncStorage with `platescan:dailyCalorieGoal` key
- [x] Goal range validation — 500–10000 kcal enforced
- [x] Macros per plate entry — protein, carbs, fat (grams) stored per entry
- [x] Image persistence — images copied to `plates/` directory
- [x] **Shared BackButton component** — `src/components/BackButton.js` created, used by PlateDetailScreen, ScanScreen, HistoryScreen, SettingsScreen
- [x] **Standardized back button** — "← Back" in white text, fontSize 16, fontWeight '600' across all 4 screens
