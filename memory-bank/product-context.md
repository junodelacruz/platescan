# PlateScan — Product Context

## What it is
PlateScan is a personal calorie-tracking app. The core loop: photograph a plate of food → AI estimates calories/macros → log it → see daily progress against a goal → review history by day.

## Why / for whom
A personal/hobby project (not a commercial product). Built to remove the friction of manual calorie logging by using AI vision instead of a manual food-database search.

## Core user flows
1. **Log a meal:** Home → "Scan a Plate" → camera/photo picker → AI analyzes the image → ResultScreen shows an editable estimate → save → entry appears in today's list on Home.
2. **Track today's progress:** Home shows a circular "PlateRing" (consumed vs. goal) plus a list of today's entries (meal-type badge, calories, a Remove action).
3. **Review history:** Home → "Calendar" → HistoryScreen shows a month grid; days with entries are marked, days over goal are flagged (tomato vs. forest dot); tapping a day shows that day's entries and total.
4. **Adjust the daily goal (new this session):** Home → "Settings" → SettingsScreen shows the current goal with −50/−10/+10/+50 adjustment buttons and a "Save Goal" button (validates a 500–10000 kcal range, shows a "✓ Saved" confirmation). This is the first time the goal has actually been user-configurable — previously it was a hardcoded constant with a dead, non-functional change handler.

## Default behavior
- Default daily calorie goal: **1900 kcal**, until the user changes it in Settings.
- AI provider defaults to Google **Gemini's free tier** (`gemini-2.5-flash`) so the app runs with zero billing setup out of the box. Odysseus (self-hosted), any OpenAI-compatible endpoint, and Anthropic are supported alternatives for users who want a different cost/quality tradeoff.

## Design philosophy
- Warm, dark, "late-night kitchen" aesthetic — deliberately not clinical/sterile like most calorie apps.
- Minimal screens, no onboarding flow, no accounts — local-only (AsyncStorage), single-user.
- Quick-adjust UI patterns (±10/±50 buttons) are preferred over typing numbers, to keep interactions fast on mobile.

## Platforms
- Primary: Expo/React Native (iOS/Android via Expo Go or a dev client; camera permissions configured in `app.json`).
- Secondary: Web export, self-hosted via Docker + NGINX, with PWA-style viewport fixes so it behaves well as an installed PWA on iOS Safari.
