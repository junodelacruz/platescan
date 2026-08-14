# Progress

## Task: Bottom Tab Bar + Weight Tracker Screen (New)

- [x] Installed `@react-navigation/bottom-tabs@^6.6.1` to match peer dependency versioning
- [x] Created `WeightTrackerScreen.js` featuring:
  - Custom SVG line chart plotting weight trends with dynamic date/weight gridlines and coordinate dots using `react-native-svg`
  - Range selector buttons for 7, 30, and 90 day lookback views
  - Big current weight display and delta weight change calculations from previous log
  - Decimal weight input field with "Log" saving action and a successful check-mark status transition
  - Storage logging tied to AsyncStorage under `weightLog` key
- [x] Nest Bottom Tabs in `App.js` Navigator:
  - Main tab bar contains: Home (`Home`), History/Calendar (`History`), Weight (`Weight`), and Settings (`Settings`)
  - Icons rendered as styled unicode text glyphs matching active/inactive theme colors
  - Tab bar styled with `colors.surface` background, `colors.border` top edge, and height adjustment
  - Stack navigator now retains `MainTabs` as the core wrapper, allowing full-screen overlays like `Scan`, `Result`, and `PlateDetail` to hide the tab bar
- [x] Clean up `HomeScreen.js` header:
  - Removed old left/right Settings gear and Calendar icon buttons from header layout
  - Cleaned up unused styles and layout containers
- [x] Redesign PlateRing:
  - Changed central calorie count `fontWeight` from `'700'` to `'200'` for a thinned, lightweight, modern typeface

## Task: Modernize Design Systems, Transparent Badges, & Inter Font Refinements

- [x] Implemented transparent badge styling on Home / History entries:
  - Background set to `rgba(category_color, 0.15)`
  - Border set to `rgba(category_color, 0.35)`
  - Text color matches category color directly instead of static white
- [x] Dynamic Inter Font loading:
  - Injected Google Fonts `<link>` stylesheet on web environments inside components
  - Updated font-family references to point to `Inter` for clean display typography
- [x] Reduced font weight across general UI components:
  - Changed headers, list cards, text items, and buttons from heavy bold (`700`/`600`) to regular/medium weights (`500`/`400`/`300`)
- [x] Refactored `PlateDetailScreen.js`:
  - Updated hero image component container (fully rounded 20px corners, no border)
  - Centered calorie metric in a card with a light 42px `fontWeight: '300'` text color of `colors.tomato`
  - Redesigned macro columns using light-weight labels and correct accent colors
  - Changed delete action style to a danger-themed light outline/fill pill
- [x] Refactored `SettingsScreen.js`:
  - Section categories formatted as cards using `colors.surface`
  - Calorie goal input changed to a large 52px lightweight input centered with a bottom underline
  - Save button transforms to success state (`✓ Saved`) on complete

## Key Architectural Updates

- Nav flow now centers on a bottom-tab bar for main views.
- Emojis/unicode glyphs (`⊙`, `◫`, `⧖`, `◎`) serve as the main icons for Home, History, Weight, and Settings.
- Inter font injected on web targets for consistent style.
- Weight tracking logic persists logs locally in AsyncStorage under `weightLog`.

## Task: Fix PlateDetailScreen → HomeScreen Edit Sync

- [x] Created `src/services/eventBus.js` — minimal publish/subscribe module for cross-screen communication
- [x] `HomeScreen.js` — subscribes to `'plate-updated'` event; on receipt, re-fetches entries from AsyncStorage and updates state
- [x] `PlateDetailScreen.js` — publishes `'plate-updated'` after `updateFoodEntry()` (inline item save) and `deleteFoodEntry()` (plate delete)

## Task: Add Removable "Export Data" Feature

- [x] Created `src/services/exportService.js` — encapsulates all export logic (`getExportData()` + `triggerExport()`)
  - Reads foodLog, calorieGoal, weightLog from AsyncStorage
  - Reads all image blobs from IndexedDB `platescan-images`
  - Returns structured JSON object with `exportedAt`, `plates`, `settings`, `weights`, `images`
  - Triggers file download via `Blob` + `<a download>` element
- [x] Added "Export My Data" button to `src/screens/SettingsScreen.js`
  - Styled consistently with the Save Goal button (tomato color, same layout)
  - Shows "✓ Exported" success feedback for 2 seconds
  - Error handling: sets error message on failure
- Removal plan: delete `exportService.js` and the button block from SettingsScreen — no other files reference them
