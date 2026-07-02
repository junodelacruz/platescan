1 | # Progress
2 |
3 | ## Task: Move image storage from AsyncStorage to IndexedDB
4 |
5 | - [x] Part A: Added IndexedDB helpers (`saveImage`, `loadImage`, `deleteImage`) to `storageService.js`
6 | - [x] Part B: Updated `addFoodEntry` — saves image to IndexedDB, strips `imageUri` from AsyncStorage write
7 | - [x] Part C: Updated `deleteFoodEntry` — also deletes image from IndexedDB
8 | - [x] Part D: Added `clearLegacyData()` function and called it in App.js via useEffect
9 | - [x] Part E: Updated PlateDetailScreen.js to load images from IndexedDB via `loadImage()`
10 | - [x] Fix: String key consistency — all IndexedDB operations use `String(entryId)` to prevent type mismatch
11 | - [x] Memory bank updated
12 |
13 | - [x] SettingsScreen: Replace calorie increment buttons with TextInput + Save Goal
14 |
15 | ## Task: Make calories and macros editable on PlateDetailScreen
16 |
17 | - [x] Add state: editingField, draftValue, items
18 | - [x] Compute display values: calories from totalCalories, macros from items array reduction
19 | - [x] Implement handleSaveField for calories (update totalCalories)
20 | - [x] Implement handleSaveField for macros (proportional distribution across items)
21 | - [x] Make calories editable: Text → TextInput + ✓ on tap
22 | - [x] Make protein editable: same pattern
23 | - [x] Make carbs editable: same pattern
24 | - [x] Make fat editable: same pattern
25 | - [x] Import updateFoodEntry from storageService, TextInput from react-native
26 | - [x] Style matches existing screen theme tokens
27 | - [x] Web build: dist folder generated successfully
28 | - [x] Memory bank updated
29 |
30 | ## Key changes
31 |
32 | - DB name: `platescan-images`, store: `images`
33 | - Existing AsyncStorage image data is cleared on app load (one-time migration)
34 | - Images now stored in IndexedDB (bypasses 10MB AsyncStorage quota limit)
35 | - PlateDetailScreen loads images asynchronously on entry open
36 |
37 | ## SettingsScreen changes
38 |
39 | - Removed +10, +50, -10, -50 increment buttons
40 | - Added TextInput (number-pad, pre-filled with saved goal, large 56px display style)
41 | - Save Goal button validates 500–10000 range, saves via setCalorieGoal(), shows "✓ Saved" confirmation
42 | - Error text displayed below input for invalid/empty values
43 | - Uses existing theme tokens (colors.tomato, colors.forest, etc.)
44 |
45 | ## PlateDetailScreen editable fields
46 |
47 | - Calories, protein, carbs, fat are now inline editable
48 | - Macro distribution: proportional scaling — `ratio = newValue / oldTotal`, each item's value multiplied by ratio
49 | - `items` state tracks latest values for accurate sequential edits
50 | - Web build output: `dist/` with bundled JS, HTML, and metadata
