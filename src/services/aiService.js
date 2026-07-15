import { AI_CONFIG, USDA_CONFIG } from '../config';

// Supported AI_CONFIG.provider values:
//   'gemini'             -> Google Gemini API (has a genuine free tier)
//   'anthropic'          -> Anthropic's Messages API
//   'odysseus'           -> a self-hosted Odysseus instance (OpenAI-style endpoint)
//   'openai-compatible'  -> any other OpenAI-style vision endpoint
//
// Instructs the model to return strict JSON we can parse reliably,
// regardless of which provider is answering.
const SYSTEM_PROMPT = `You are an expert nutrition analyst estimating the caloric and macronutrient content of a meal from a photo.

ACCURACY RULES — follow these strictly:
1. PORTION SIZES: Assume restaurant and takeout portions are significantly larger than home-cooked portions. A restaurant bowl of rice is typically 200-250g, not 100g. A restaurant protein serving is typically 150-200g. Fast food portions (Chipotle, McDonald's, etc.) are always large — do not underestimate.
2. HIDDEN CALORIES: Always account for cooking oils, butter, sauces, dressings, and marinades even when not visible. Stir-fry dishes contain significant oil. Salads with dressing add 150-300 kcal. Creamy sauces double the fat content of a dish.
3. ESTIMATION BIAS: When uncertain, err on the side of OVERESTIMATING calories and fat. It is better to slightly overestimate than underestimate. Never round down.
4. BRANDED FOODS: If you can identify a dish as likely from a specific restaurant chain (e.g. Chipotle burrito bowl, McDonald's burger, Subway sandwich), use that restaurant's known nutritional values as your reference, not generic home-cooked estimates. Note this in the notes field.
5. MIXED DISHES: For complex dishes (stir-fries, curries, pasta dishes, bowls), estimate the total as a whole rather than trying to separate every ingredient — combined estimates are more accurate than summing uncertain parts.
6. CONFIDENCE: Use "high" only when the food is clearly identifiable and portion size is obvious. Use "low" for anything partially obscured, mixed together, or difficult to distinguish. Default to "medium".
7. MACROS: Protein and carbs are 4 kcal/g, fat is 9 kcal/g. Your per-item calories must be approximately consistent with your protein/carbs/fat values. Cross-check before responding.

Return ONLY valid JSON (no markdown fences, no commentary) in exactly this shape:

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
  "notes": "string — mention if restaurant/branded food was detected, and flag any items with high uncertainty"
}`;

async function lookupUSDA(foodName) {
  try {
    const query = encodeURIComponent(foodName);
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${query}&api_key=${USDA_CONFIG.apiKey}&dataType=SR%20Legacy,Survey%20(FNDDS)&pageSize=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const food = data?.foods?.[0];
    if (!food) return null;

    const nutrients = food.foodNutrients || [];
    const get = (name) => nutrients.find(n => n.nutrientName === name)?.value ?? null;

    const caloriesPer100g = get('Energy');
    const proteinPer100g = get('Protein');
    const carbsPer100g = get('Carbohydrate, by difference');
    const fatPer100g = get('Total lipid (fat)');

    // Return null if we couldn't get the key macros
    if (caloriesPer100g === null || proteinPer100g === null) return null;

    return { caloriesPer100g, proteinPer100g, carbsPer100g: carbsPer100g ?? 0, fatPer100g: fatPer100g ?? 0 };
  } catch (e) {
    console.warn('USDA lookup failed for:', foodName, e.message);
    return null;
  }
}

async function enrichWithUSDA(analysisResult) {
  // For each item, attempt a USDA lookup and replace macros if found
  // Run lookups in parallel for speed
  const enriched = await Promise.all(
    analysisResult.items.map(async (item) => {
      const usda = await lookupUSDA(item.name);
      if (!usda) {
        // No USDA match — keep AI values as-is
        return item;
      }
      const grams = item.estimatedGrams || 100;
      const ratio = grams / 100;
      const calories = Math.round(usda.caloriesPer100g * ratio);
      const protein = Math.round(usda.proteinPer100g * ratio);
      const carbs = Math.round(usda.carbsPer100g * ratio);
      const fat = Math.round(usda.fatPer100g * ratio);
      return {
        ...item,
        calories,
        protein,
        carbs,
        fat,
        // Upgrade confidence since we have a database source
        confidence: 'high',
      };
    })
  );

  // Recompute totalCalories from enriched items
  const totalCalories = enriched.reduce((s, i) => s + i.calories, 0);

  return {
    ...analysisResult,
    items: enriched,
    totalCalories,
    notes: (analysisResult.notes || '') + ' Macros cross-referenced with USDA FoodData Central where available.',
  };
}

export async function analyzeFoodImage(base64Image, description = '') {
  let result;
  switch (AI_CONFIG.provider) {
    case 'odysseus':
    case 'openai-compatible':
      result = await callOpenAICompatible(base64Image, description);
      break;
    case 'anthropic':
      result = await callAnthropic(base64Image, description);
      break;
    case 'gemini':
      result = await callGemini(base64Image, description);
      break;
    default:
      throw new Error(`Unknown AI provider: ${AI_CONFIG.provider}`);
  }
  return enrichWithUSDA(result);
}

async function callOpenAICompatible(base64Image, description = '') {
  const userText = [
    { type: 'text', text: 'Identify the food on this plate and estimate calories.' },
    ...(description ? [{ type: 'text', text: `Additional context from the user: ${description}` }] : []),
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
  ];
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
        { role: 'user', content: userText },
      ],
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}): ${await safeText(res)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return parseModelJson(text);
}

async function callAnthropic(base64Image, description = '') {
  const contentParts = [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
    { type: 'text', text: 'Identify the food on this plate and estimate calories.' },
  ];
  if (description) {
    contentParts.push({ type: 'text', text: `Additional context from the user: ${description}` });
  }
  const res = await fetch(`${AI_CONFIG.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': AI_CONFIG.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: contentParts,
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

async function callGemini(base64Image, description = '') {
  let lastError = null;

  const parts = [
    { text: 'Identify the food on this plate and estimate calories.' },
    ...(description ? [{ text: `Additional context from the user: ${description}` }] : []),
    { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
  ];

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
              parts: parts,
            },
          ],
          generationConfig: {
            maxOutputTokens: 4000,
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
