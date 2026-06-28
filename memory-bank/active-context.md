# PlateScan — Active Context

## ⛔ IRREPLACEABLE BUILD RULE — READ BEFORE BUILDING

> **Always use `npm run build:web` to build the web app.**
>
> Never run `npx expo export --platform web --output-dir dist` directly. The Expo export command **overwrites** `dist/index.html` with a bare template, **destroying** all PWA/viewport/status-bar fixes. The patched command `npm run build:web` runs the Expo export **and** then `node scripts/patch-index.js` which restores the template from `web/public/index.html` (viewport, PWA tags, status-bar CSS, background color) and injects the correct bundle reference.
>
> If you run the raw Expo export command, `dist/index.html` will have **no** PWA support, **no** `viewport-fit=cover`, **no** dark background on `<html>/<body>`, and the white bar will return.

## What was just being worked on
Web build fix: `npx expo export` regenerates `dist/index.html` from scratch, stripping out PWA/viewport/status-bar fixes that were previously added. Created a persistent template system (`web/public/index.html` + `scripts/patch-index.js`) so the fix survives rebuilds. The Settings screen is fully included in the latest build and verified present in the JS bundle.

## Immediate next step (recommended)
Fix **`HistoryScreen.js`** — it's the one remaining place still importing/using the hardcoded `DAILY_CALORIE_GOAL` from `config.js` instead of the new `getCalorieGoal()` AsyncStorage value. Apply the same pattern already used in `HomeScreen.js`:
1. Replace `import { DAILY_CALORIE_GOAL } from '../config';` with `import { getCalorieGoal } from '../services/storageService';`
2. Add `const [goal, setGoal] = useState(1900);` and load it in the existing `useFocusEffect`/`refresh`, the same way `HomeScreen.js` does: `Promise.all([refresh(), getCalorieGoal().then(g => setGoal(g))])`.
3. Replace the 3 usages of `DAILY_CALORIE_GOAL` in the file (the `isOver` calculation, the over/under color check, and the `{selectedTotal} / {DAILY_CALORIE_GOAL} kcal` display) with `goal`.

After that, run `npm run build:web` to confirm the build succeeds and the patched `dist/index.html` is correct.

## Resolved decisions from this session
- Settings UI approach: a **dedicated screen**, not a modal/popup, not a PlateRing long-press.
- Goal storage key: `platescan:dailyCalorieGoal` (separate from the food-log key `platescan:foodLog`).
- Valid goal range: **500–10000 kcal**, enforced both on the ±buttons (clamped) and on save (rejected outside range with an Alert).

## Things to double-check if resuming cold
- Confirm `HomeScreen.js` doesn't still have the duplicate-`handleDelete` bug that was introduced and fixed mid-session (it was fixed and re-verified, but worth a quick read before building on top of it).
- `config.js` has a real, unredacted Gemini API key checked into the file — not a blocker for the goal feature, but worth keeping in mind before sharing or pushing the repo anywhere.
