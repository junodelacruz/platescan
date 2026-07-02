# PlateScan — Active Context

## Current state

Scan-to-AI flow enhanced with optional pre-scan description input. Users can now type a description (e.g. "Chipotle bowl, chicken, rice, guac") before scanning. The description is appended to the AI prompt for additional food context and saved to the plate entry. PlateDetailScreen displays the saved description below the macros row.

## Last changes

- `src/screens/ScanScreen.js`: Replaced immediate AI call with a description input UI after photo capture. Shows a multiline TextInput (placeholder: "Add context (optional) — e.g. Chipotle bowl, chicken, rice, guac"), a "Scan" button (sends with description), and a "Skip" button (sends without). Photo preview is shown.
- `src/services/aiService.js`: `analyzeFoodImage` now accepts an optional `description` parameter. When non-empty, appends `Additional context from the user: <description>` to the user message.
- `src/screens/ResultScreen.js`: Passes `description` from route params to `addFoodEntry` as the `description` field in the saved entry.
- `src/services/storageService.js`: No changes needed — the entry shape already supports flexible fields; `description` is saved as a standard entry property.
- `src/screens/PlateDetailScreen.js`: Displays saved `entry.description` below the macros row with a "Note:" label. Renders nothing if empty.

## Next steps

- Test the full flow: photo → description input → scan → AI result → save → plate detail
- Verify description is persisted and displayed correctly across sessions
