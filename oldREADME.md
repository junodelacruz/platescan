# Platescan

Platescan is a personal calorie tracking and nutritional app. Take a picture of a plate of food, and recieve an AI estimated breakdown of the calories and macros. Log plates, track weight, and view progress! 

## How it's structured

```
App.js                       navigation entry point
src/
  config.js                  AI provider config
  theme.js                   colors/typography tokens (persisted per-device)
  components/PlateRing.js    the circular daily-progress ring
  screens/
    HomeScreen.js             today's log + the plate ring
    ScanScreen.js             camera / photo picker -> sends to AI
    ResultScreen.js           shows AI's read, editable, then saves
    HistoryScreen.js          past days, grouped
    PlateDetailScreen.js      per-plate item breakdown, editable
    WeightTrackerScreen.js    weight log, synced across devices
  services/
    aiService.js              the only file that talks to an AI provider
    storageService.js         API client — all data lives on the backend now

platescan-api/                Node/Express + SQLite backend (separate Docker service)
  routes/plates.js            plate CRUD, image upload + WebP optimization
  routes/weight.js            weight entries
  routes/settings.js          single-row settings (calorie goal)
  routes/auth.js              login, issues a long-lived JWT
  middleware/auth.js          requireAuth, guards all data + image routes
  db.js                       better-sqlite3 connection
```

The AI call is isolated in `src/services/aiService.js` behind one function,
`analyzeFoodImage(base64Image)` — currently wired to Gemini. Nothing else
in the app cares which provider answers it, so switching providers later
only touches `src/config.js`.

## Backend

Everything the app stores — plates (with nested items), images, weight
entries, and the calorie goal — lives server-side now, not on-device. This
came out of losing all local data (AsyncStorage/IndexedDB) on a reinstall;
a device losing its local storage no longer means losing history.

- **API**: Node/Express + SQLite (`better-sqlite3`), deployed via Docker
  Compose (`platescan-api` service) alongside the frontend (`platescan-web`)
- **Storage**: SQLite DB + image files on a host bind mount, so data
  survives container rebuilds
- **Images**: uploaded photos are converted to WebP on upload — a
  1600px full-size version and a 400px thumbnail — to keep storage and
  load times down; thumbnails are used in list views, full-size in the
  detail screen
- **Auth**: single-user login (bcrypt password hash + JWT), long-lived
  session so you're not re-logging in constantly; all data and image
  routes sit behind `requireAuth`. Images also accept a `?token=` query
  param, since `<img>` tags on web can't send an Authorization header
- **Remote access**: reachable both on the home LAN and remotely via
  Tailscale
- **Reverse proxy**: NGINX Proxy Manager fronts the whole thing —
  `platescan.duckdns.org` proxies `/api/*` to the backend and serves the
  PWA otherwise, with long-lived cache headers on images

Theme (dark/light) is the one setting kept intentionally local rather
than synced — it's a per-device display preference, not data you'd want
forced identical across devices.

## Setup

```bash
npx create-expo-app platescan --template blank
# then copy these files into that project, overwriting App.js,
# and replacing app.json/babel.config.js, adding everything under src/

cd platescan
npx expo install expo-image-picker expo-status-bar react-native-svg \
  react-native-gesture-handler react-native-screens react-native-safe-area-context \
  @react-navigation/native @react-navigation/native-stack \
  @react-native-async-storage/async-storage

npx expo start
```

Using `npx expo install` (rather than the versions pinned in
`package.json`) ensures you get builds compatible with your Expo SDK.

The default config in `src/config.js` is set to use **Google Gemini's
free tier** — no card needed, no spend at all for personal use:

- go to aistudio.google.com, sign in, create an API key
- paste it into `apiKey` in `src/config.js`
- double-check `model` matches a current free-tier Flash model name at
  ai.google.dev/gemini-api/docs/models — Google renames/rotates these
  fairly often, so the value in this file may be slightly stale by the
  time you read it

For the backend, bring up `platescan-api` via `docker compose up -d` from
`~/docker/platescan`; it needs `PASSWORD_HASH` and `JWT_SECRET` env vars
set in `docker-compose.yml` for auth to work (escape any `$` in the
bcrypt hash as `$$`, since Compose otherwise interprets it as variable
interpolation).

Scan with Expo Go on your phone, or build a dev client for camera access
on a simulator.

## Known rough edges

- Portion estimation is still just a photo-based guess — depth, hidden
  oil/sauce, and unseen ingredients can't be fully judged from an image.
  The Result screen lets you edit the AI's numbers before saving; treat
  it as a fast first guess, not a lab measurement.
- Single-user only — one login, one dataset. Not built for multiple
  people sharing one instance.
- No retry/backoff on AI calls — a failed scan just shows an alert.
