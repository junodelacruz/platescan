// ---------------------------------------------------------------------------
// AI provider configuration.
//
// provider options:
//   'odysseus'         -> your self-hosted Odysseus instance (OpenAI-style
//                          /chat/completions endpoint with image input)
//   'openai-compatible' -> any other OpenAI-style vision endpoint (OpenAI
//                          itself, a local Ollama/vLLM server, etc.)
//   'anthropic'         -> Anthropic's Messages API directly
//
// IMPORTANT for 'odysseus': Odysseus runs on a computer, your phone is a
// separate device. For the app to reach it, your phone needs network
// access to that machine — either the same Wi-Fi (use the machine's LAN
// IP, not "localhost"), or a tunnel/VPN like Tailscale when you're away
// from home. Odysseus also needs to actually be running and have a
// vision-capable model loaded/connected for this to work.
// ---------------------------------------------------------------------------

export const AI_CONFIG = {
  // Gemini's free tier needs no card and covers vision — the actual
  // "free" answer for getting this running today.
  provider: 'gemini',

  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',

  // Get a free key at aistudio.google.com (no card required).
  apiKey: 'REMOVED',

  // Model naming changes fairly often — confirm the current free-tier
  // Flash model id at ai.google.dev/gemini-api/docs/models before running.
  // 'gemini-3-flash' is the best guess as of this writing.
  model: 'gemini-2.5-flash',
};

// ---------------------------------------------------------------------------
// Alternatives, if you want them instead:
//
// Anthropic (no free tier, ~$0.01/scan, strongest multi-item reads):
//   provider: 'anthropic', baseUrl: 'https://api.anthropic.com',
//   apiKey: 'sk-ant-...', model: 'claude-sonnet-4-6'
//   (or 'claude-haiku-4-5-20251001' for cheaper)
//
// Self-hosted Odysseus, once you have it running:
//   provider: 'odysseus', baseUrl: 'http://<your-machine-LAN-IP>:7000/v1',
//   model: '<your loaded vision model>'
// ---------------------------------------------------------------------------

export const USDA_CONFIG = {
  apiKey: 'rHSpCBJuu0xUI37Uopd1X1nUnfrSoiJ94LZ9y9sI',
};

export const DAILY_CALORIE_GOAL = 1900;
