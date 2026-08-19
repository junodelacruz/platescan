import { getToken } from './authService';
import { publish } from './eventBus';

const API_BASE = 'https://platescan.duckdns.org/api';

/**
 * POST /gemini/analyze — calls the backend's Gemini endpoint.
 *
 * The backend expects multipart/form-data with:
 *   - "image"  → a File/Blob
 *   - "notes"  → optional text
 *
 * Returns the pre-parsed JSON the backend produces:
 *   { items: [{ name, estimatedGrams, calories, protein, carbs, fat, confidence }], totalCalories, notes }
 */
export async function analyzeFoodImage(imageBase64, description = '') {
  // expo-image-picker's asset.base64 is raw base64 with NO data-URI prefix.
  // Handle a prefixed string too, in case the caller ever passes one.
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('image', blob, 'plate.jpg');
  if (description) {
    formData.append('notes', description);
  }

  const token = await getToken();
  const res = await fetch(`${API_BASE}/gemini/analyze`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (res.status === 401) {
    await (await import('./authService')).clearToken();
    publish('logout');
    throw new Error('Authentication expired');
  }

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`AI analysis failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // Normalise return shape so callers always get { items, notes }
  return {
    items: data.items || [],
    notes: data.notes || '',
  };
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}