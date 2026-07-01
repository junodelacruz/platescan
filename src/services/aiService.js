import { AI_CONFIG } from '../config';

// Supported AI_CONFIG.provider values:
//   'gemini'             -> Google Gemini API (has a genuine free tier)
//   'anthropic'          -> Anthropic's Messages API
//   'odysseus'           -> a self-hosted Odysseus instance (OpenAI-style endpoint)
//   'openai-compatible'  -> any other OpenAI-style vision endpoint
//
// Instructs the model to return strict JSON we can parse reliably,
// regardless of which provider is answering.
const SYSTEM_PROMPT = `You are a nutrition assistant analyzing a photo of a plate of food.
Identify each distinct food item, estimate its portion size and calories,
and return ONLY valid JSON (no markdown fences, no commentary) in exactly this shape:

{
  "items": [
    {
      "name": "string",
      "estimatedGrams": number,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "confidence": "low" | "medium" | "high"
    }
  ],
  "totalCalories": number,
  "notes": "string, one short sentence about estimate uncertainty"
}`;

export async function analyzeFoodImage(base64Image) {
  switch (AI_CONFIG.provider) {
    case 'odysseus':
    case 'openai-compatible':
      return callOpenAICompatible(base64Image);
    case 'anthropic':
      return callAnthropic(base64Image);
    case 'gemini':
      return callGemini(base64Image);
    default:
      throw new Error(`Unknown AI provider: ${AI_CONFIG.provider}`);
  }
}

async function callOpenAICompatible(base64Image) {
  const res = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AI_CONFIG.apiKey ? { Authorization: `Bearer ${AI_CONFIG.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identify the food on this plate and estimate calories.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}): ${await safeText(res)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return parseModelJson(text);
}

async function callAnthropic(base64Image) {
  const res = await fetch(`${AI_CONFIG.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': AI_CONFIG.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
            { type: 'text', text: 'Identify the food on this plate and estimate calories.' },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}): ${await safeText(res)}`);
  }
  const data = await res.json();
  const text = data?.content?.find((b) => b.type === 'text')?.text ?? '';
  return parseModelJson(text);
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];

async function callGemini(base64Image) {
  let lastError = null;

  // Try models in order of preferred stability
  const modelsToTry = [AI_CONFIG.model, ...GEMINI_MODELS.filter((m) => m !== AI_CONFIG.model)];

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting food analysis with Gemini model: ${model}`);
      const url = `${AI_CONFIG.baseUrl}/models/${model}:generateContent?key=${AI_CONFIG.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              parts: [
                { text: 'Identify the food on this plate and estimate calories.' },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2000,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                items: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING' },
                      estimatedGrams: { type: 'NUMBER' },
                      calories: { type: 'NUMBER' },
                      protein: { type: 'NUMBER' },
                      carbs: { type: 'NUMBER' },
                      fat: { type: 'NUMBER' },
                      confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
                    },
                    required: ['name', 'estimatedGrams', 'calories', 'protein', 'carbs', 'fat', 'confidence'],
                  },
                },
                totalCalories: { type: 'NUMBER' },
                notes: { type: 'STRING' },
              },
              required: ['items', 'totalCalories', 'notes'],
            },
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`AI request failed (${res.status}): ${await safeText(res)}`);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return parseModelJson(text);
    } catch (err) {
      console.warn(`Gemini model ${model} failed:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to process the request.');
}

function parseModelJson(text) {
  console.log("Raw model response:", text);
  try {
    return JSON.parse(text.trim());
  } catch (err) {
    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Robust fallback: search for JSON block {}
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonCandidate = text.substring(startIdx, endIdx + 1);
        try {
          return JSON.parse(jsonCandidate);
        } catch (e2) {
          console.error("JSON parse error on candidate:", e2, "Candidate text:", jsonCandidate);
        }
      }
      console.error("JSON parse error:", e, "Cleaned text:", cleaned);
      throw new Error('Could not understand the AI response. Try rescanning with better lighting.');
    }
  }
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
