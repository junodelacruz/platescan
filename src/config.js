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

export const DAILY_CALORIE_GOAL = 1900;
