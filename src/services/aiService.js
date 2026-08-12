import { AI_CONFIG } from '../config';

// Supported AI_CONFIG.provider values:
//   'gemini'             -> Google Gemini API (has a genuine free tier)
//   'anthropic'          -> Anthropic's Messages API
//   'odysseus'           -> a self-hosted Odysseus instance (OpenAI-style endpoint)
//   'openai-compatible'  -> any other OpenAI-style vision endpoint
//
// Instructs the model to return strict JSON we can parse reliably,
// regardless of which provider is answering.
// Pass 1: Vision prompt - identifies foods and weights
const VISION_PROMPT = `You are a food recognition specialist. Your only job is to identify the foods visible in this photo and estimate the weight of each portion in grams.

RULES:
1. REFERENCE OBJECTS: Use any visible reference objects to calibrate portion size — a fork or spoon (18-20cm), a dinner plate (25-28cm diameter), a hand, a cup or glass. If no reference object is visible, assume a standard dinner plate (26cm).
2. PORTION SIZES: Restaurant and takeout portions are significantly larger than home-cooked. A restaurant rice portion is typically 200-250g cooked. A restaurant protein serving is 150-200g. Fast food portions are always large.
3. IDENTIFY PREPARATION: Note how each food is prepared (grilled, fried, steamed, raw, with sauce, etc.) as this affects nutrition in Pass 2.
4. BRANDED FOODS: If you can identify a specific restaurant chain, note it by name — this is critical for accurate nutrition in the next step.

Return ONLY valid JSON in exactly this shape:
{
  "items": [
    {
      "name": "string — specific food name including preparation method e.g. 'steamed white rice', 'grilled chicken breast', 'stir-fried broccoli in oil'",
      "estimatedGrams": number,
      "preparation": "string — brief preparation notes e.g. 'deep fried', 'steamed', 'raw', 'with cream sauce'",
      "confidence": "low" | "medium" | "high"
    }
  ],
  "restaurantChain": "string | null — name of restaurant chain if identifiable, otherwise null",
  "notes": "string — any relevant context about the meal"
}`;

// Pass 2: Nutrition prompt - calculates calories and macros
const NUTRITION_PROMPT = `You are a nutrition expert. You will be given a list of identified food items with their weights in grams. Calculate the calories and macronutrients for each item.

RULES:
1. MACROS MUST BE CONSISTENT: Protein and carbs are 4 kcal/g, fat is 9 kcal/g. Your calories must approximately equal (protein × 4) + (carbs × 4) + (fat × 9). Cross-check every item before responding.
2. PREPARATION MATTERS: Account for cooking method — deep fried adds significant fat, steamed adds none, sauces add both carbs and fat.
3. BRANDED FOODS: If a restaurant chain is provided, use that chain's known nutritional values scaled to the given weight.
4. HIDDEN CALORIES: Account for cooking oils, butter, sauces even when not explicitly listed. Stir-fry = significant oil. Salad dressing = 150-300 kcal extra.
5. DO NOT ROUND DOWN: When uncertain, err toward overestimating fat and calories.

Return ONLY valid JSON in exactly this shape:
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
  "notes": "string"
}`;

const SYSTEM_PROMPT = `You are an expert nutrition analyst estimating the caloric and macronutrient content of a meal from a photo.

ACCURACY RULES — follow these strictly:
1. PORTION SIZES: Use any visible reference objects in the image to calibrate portion size — a fork or spoon (typically 18-20cm), a dinner plate (typically 25-28cm diameter), a hand or finger, a cup or glass, or any other object with a known size. Use these to estimate the actual volume and weight of each food item. If no reference object is visible, assume a standard dinner plate (26cm) as the vessel. Restaurant and takeout portions are significantly larger than home-cooked — a restaurant bowl of rice is typically 200-250g cooked, a restaurant protein serving is typically 150-200g. Fast food portions (Chipotle, McDonald's, etc.) are always large.
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

export async function analyzeFoodImage(base64Image, description = '') {
  return twoPassAnalysis(base64Image, description, AI_CONFIG.provider);
}

// ─── TWO-PASS ORCHESTRATOR ───
async function twoPassAnalysis(base64Image, description, provider) {
  // PASS 1: Vision — identify foods and weights from image
  let pass1Result;
  try {
    pass1Result = await runPass1(base64Image, description, provider);
  } catch (err) {
    throw new Error(`Pass 1 (vision) failed: ${err.message}`);
  }

  // Build the text input for Pass 2 from Pass 1 results
  const itemDescriptions = pass1Result.items.map(item =>
    `- ${item.name}: ${item.estimatedGrams}g (preparation: ${item.preparation || 'standard'})`
  ).join('\n');

  const pass2Input = [
    pass1Result.restaurantChain ? `Restaurant: ${pass1Result.restaurantChain}` : null,
    `Foods identified from photo:`,
    itemDescriptions,
    description ? `Additional context: ${description}` : null,
    `Calculate calories and macros for each item listed above.`,
  ].filter(Boolean).join('\n');

  // PASS 2: Nutrition — calculate calories and macros from identified foods (text only, no image)
  let pass2Result;
  try {
    pass2Result = await runPass2(pass2Input, provider);
  } catch (err) {
    // If Pass 2 fails, fall back to Pass 1 with a single-pass attempt
    console.warn('Pass 2 failed, falling back to single-pass:', err.message);
    return callSinglePass(base64Image, description, provider);
  }

  // Merge Pass 1's estimatedGrams into Pass 2's result (Pass 2 may not perfectly preserve them)
  const mergedItems = pass2Result.items.map((item, idx) => ({
    ...item,
    estimatedGrams: pass1Result.items[idx]?.estimatedGrams ?? item.estimatedGrams,
  }));

  return {
    ...pass2Result,
    items: mergedItems,
  };
}

// ─── PASS 1 RUNNER (image + vision prompt) ───
async function runPass1(base64Image, description, provider) {
  switch (provider) {
    case 'gemini':
      return runPass1Gemini(base64Image, description);
    case 'anthropic':
      return runPass1Anthropic(base64Image, description);
    case 'odysseus':
    case 'openai-compatible':
      return runPass1OpenAI(base64Image, description);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function runPass1Gemini(base64Image, description = '') {
  const parts = [
    { text: VISION_PROMPT },
    ...(description ? [{ text: description }] : []),
    { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
  ];

  const modelsToTry = [AI_CONFIG.model, ...GEMINI_MODELS.filter((m) => m !== AI_CONFIG.model)];

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting Pass 1 (vision) with Gemini model: ${model}`);
      const url = `${AI_CONFIG.baseUrl}/models/${model}:generateContent?key=${AI_CONFIG.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: VISION_PROMPT }] },
          contents: [{ parts: parts }],
          generationConfig: {
            maxOutputTokens: 2000,
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
                      preparation: { type: 'STRING' },
                      confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
                    },
                    required: ['name', 'estimatedGrams', 'preparation', 'confidence'],
                  },
                },
                restaurantChain: { type: 'STRING' },
                notes: { type: 'STRING' },
              },
              required: ['items', 'notes'],
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
      console.warn(`Pass 1 Gemini model ${model} failed:`, err.message || err);
    }
  }
  throw new Error('All Pass 1 Gemini models failed.');
}

async function runPass1Anthropic(base64Image, description = '') {
  const contentParts = [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
    { type: 'text', text: VISION_PROMPT },
  ];
  if (description) {
    contentParts.push({ type: 'text', text: description });
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
      max_tokens: 2000,
      system: VISION_PROMPT,
      messages: [{ role: 'user', content: contentParts }],
    }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}): ${await safeText(res)}`);
  }
  const data = await res.json();
  const text = data?.content?.find((b) => b.type === 'text')?.text ?? '';
  return parseModelJson(text);
}

async function runPass1OpenAI(base64Image, description = '') {
  const userText = [
    { type: 'text', text: VISION_PROMPT },
    ...(description ? [{ type: 'text', text: description }] : []),
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
        { role: 'system', content: VISION_PROMPT },
        { role: 'user', content: userText },
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

// ─── PASS 2 RUNNER (text-only, nutrition prompt) ───
async function runPass2(textInput, provider) {
  switch (provider) {
    case 'gemini':
      return runPass2Gemini(textInput);
    case 'anthropic':
      return runPass2Anthropic(textInput);
    case 'odysseus':
    case 'openai-compatible':
      return runPass2OpenAI(textInput);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function runPass2Gemini(textInput) {
  const parts = [{ text: textInput }];

  const modelsToTry = [AI_CONFIG.model, ...GEMINI_MODELS.filter((m) => m !== AI_CONFIG.model)];

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting Pass 2 (nutrition) with Gemini model: ${model}`);
      const url = `${AI_CONFIG.baseUrl}/models/${model}:generateContent?key=${AI_CONFIG.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: NUTRITION_PROMPT }] },
          contents: [{ parts: parts }],
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
      console.warn(`Pass 2 Gemini model ${model} failed:`, err.message || err);
    }
  }
  throw new Error('All Pass 2 Gemini models failed.');
}

async function runPass2Anthropic(textInput) {
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
      system: NUTRITION_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text: textInput }] }],
    }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}): ${await safeText(res)}`);
  }
  const data = await res.json();
  const text = data?.content?.find((b) => b.type === 'text')?.text ?? '';
  return parseModelJson(text);
}

async function runPass2OpenAI(textInput) {
  const res = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AI_CONFIG.apiKey ? { Authorization: `Bearer ${AI_CONFIG.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: NUTRITION_PROMPT },
        { role: 'user', content: textInput },
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

// ─── SINGLE-PASS FALLBACK ───
async function callSinglePass(base64Image, description, provider) {
  switch (provider) {
    case 'odysseus':
    case 'openai-compatible':
      return callOpenAICompatible(base64Image, description);
    case 'anthropic':
      return callAnthropic(base64Image, description);
    case 'gemini':
      return callGemini(base64Image, description);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
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