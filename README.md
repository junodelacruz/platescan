# PlateScan

A calorie-tracking app built around one core action: photograph a plate of
food, get an AI estimate of what's on it and how many calories, log it,
watch a daily "plate ring" fill up.

## How it's structured

```
App.js                       navigation entry point
src/
  config.js                  AI provider + daily calorie goal (edit this)
  theme.js                   colors/typography tokens
  components/PlateRing.js    the circular daily-progress ring
  screens/
    HomeScreen.js             today's log + the plate ring
    ScanScreen.js             camera / photo picker -> sends to AI
    ResultScreen.js           shows AI's read, editable, then saves
    HistoryScreen.js          past days, grouped
  services/
    aiService.js              the only file that talks to an AI provider
    storageService.js         local on-device persistence (AsyncStorage)
```

The AI call is isolated in `src/services/aiService.js` behind one function,
`analyzeFoodImage(base64Image)`. Nothing else in the app cares which
provider answers it — that's deliberate, so you can switch later by editing
`src/config.js` only.

## Choosing your AI provider — the actual tradeoffs

**`provider: 'odysseus'`** — point it at your self-hosted Odysseus instance.
Free, private, you control the model. Two practical catches: (1) your phone
and the machine running Odysseus are different devices, so the phone needs
network access to it — use the machine's LAN IP on the same Wi-Fi, or a
tunnel/VPN like Tailscale when you're out; (2) Odysseus has to be running,
with a vision-capable model loaded, every time you want to scan. Accuracy
will track whatever model you have loaded — a small local model will
under-perform a frontier cloud model at this task.

I don't have a verified spec for Odysseus's exact API contract, so
`aiService.js` assumes it exposes a standard OpenAI-style
`/v1/chat/completions` endpoint with image input (a very common convention
for self-hosted model servers). If Odysseus's actual API differs, check its
setup guide and adjust the `callOpenAICompatible` function's URL/payload
shape accordingly — the rest of the app won't need to change.

**`provider: 'anthropic'`** or **`'openai-compatible'`** — call a cloud
vision API directly. Works from anywhere, no dependency on a home machine
being on, generally the strongest food-identification accuracy. You'll
need an API key and there's a small per-scan cost, and the photo leaves
your device to that provider.

Whichever you pick: a calorie count from one photo is always an estimate.
Portion depth, hidden oil/sauce, and unseen ingredients can't be fully
judged from an image. That's why the Result screen lets you edit the
AI's numbers before saving — treat it as a fast first guess, not a lab
measurement.

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

If you outgrow the free tier or want stronger multi-item food reads,
switch `provider` to `'anthropic'` and follow the commented block in
`config.js` (~$0.01/scan, no free tier). If you later set up Odysseus,
switch `provider` to `'odysseus'` and point `baseUrl` at your machine's
LAN IP + port. None of the other files need to change either way.

Also adjust `DAILY_CALORIE_GOAL` if you want something other than 2000.

Scan with Expo Go on your phone, or build a dev client for camera access
on a simulator.

## Known rough edges (intentionally left simple for a first pass)

- No auth/multi-user — it's a single local log on one device.
- No barcode scanning or manual food search — photo-only, as requested.
- No retry/backoff on AI calls — a failed scan just shows an alert.
- Macro fields (protein/carbs/fat) are captured from the AI but only shown
  implicitly via `notes`/calories on this screen — easy to surface them in
  `ResultScreen.js` if you want full macro tracking.
