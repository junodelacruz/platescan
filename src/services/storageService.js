import { getToken, clearToken } from './authService';
import { publish } from './eventBus';

const DEFAULT_GOAL = 2000;
const API_BASE = 'https://platescan.duckdns.org/api';

// ── Auth-aware fetch wrapper ──────────────────────────────────────────────
//
// Every API call goes through apiFetch so the JWT is injected in one place.
// If the server returns 401 (expired / invalid token), the token is cleared
// and a 'logout' event is published so AuthContext can navigate to Login.

async function apiFetch(url, options = {}) {
  const token = await getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    await clearToken();
    publish('logout');
  }

  return res;
}

// ── Image functions — API-backed (replaces IndexedDB) ──

export async function saveImage(entryId, base64DataUri) {
  try {
    const byteString = atob(base64DataUri.split(',')[1]);
    const mimeMatch = base64DataUri.match(/^data:(.*);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });

    const formData = new FormData();
    formData.append('image', blob, 'plate.jpg');

    const res = await apiFetch(`${API_BASE}/plates/${entryId}/image`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`saveImage POST /plates/${entryId}/image failed: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('saveImage API upload failed:', err);
    throw err;
  }
}

export async function loadImage(entryId) {
  try {
    const res = await apiFetch(`${API_BASE}/plates/${entryId}`);
    if (!res.ok) {
      return null;
    }
    const plate = await res.json();
    if (!plate.image_filename) {
      return null;
    }
    const token = await getToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE}/images/${plate.image_filename}${qs}`;
  } catch (err) {
    console.warn('loadImage fetch failed:', err);
    return null;
  }
}

export async function loadThumbUrl(entryId) {
  try {
    const res = await apiFetch(`${API_BASE}/plates/${entryId}`);
    if (!res.ok) {
      return null;
    }
    const plate = await res.json();
    if (!plate.image_filename) {
      return null;
    }
    const token = await getToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE}/images/thumb/${plate.image_filename}${qs}`;
  } catch (err) {
    console.warn('loadThumbUrl fetch failed:', err);
    return null;
  }
}

export async function deleteImage(entryId) {
  try {
    const res = await apiFetch(`${API_BASE}/plates/${entryId}/image`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`deleteImage DELETE /plates/${entryId}/image failed: ${res.status}`);
    }
    return;
  } catch (err) {
    console.warn('deleteImage API failed:', err);
    throw err;
  }
}

// ── Weight functions — API-backed (POST /weight, GET /weight) ──

export async function saveWeight({ date, weight }) {
  const timestamp = date ? new Date(date).getTime() : Date.now();
  try {
    const res = await apiFetch(`${API_BASE}/weight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight, timestamp }),
    });
    if (!res.ok) {
      throw new Error(`saveWeight POST /weight failed: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('saveWeight API upload failed:', err);
    throw err;
  }
}

export async function getWeights() {
  try {
    const res = await apiFetch(`${API_BASE}/weight`);
    if (!res.ok) {
      throw new Error(`getWeights GET /weight failed: ${res.status}`);
    }
    const data = await res.json();
    console.log('RAW API RESPONSE:', JSON.stringify(data, null, 2));
    return data || [];
  } catch (err) {
    console.warn('getWeights fetch failed:', err);
    throw err;
  }
}

export async function deleteWeightEntry(id) {
  try {
    const res = await apiFetch(`${API_BASE}/weight/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`deleteWeightEntry DELETE failed: ${res.status}`);
    }
    const listRes = await apiFetch(`${API_BASE}/weight`);
    if (!listRes.ok) return [];
    return await listRes.json();
  } catch (err) {
    throw err;
  }
}

// ── Settings / Calorie Goal functions — API-backed ──

export async function getCalorieGoal() {
  try {
    const res = await apiFetch(`${API_BASE}/settings`);
    if (!res.ok) {
      return DEFAULT_GOAL;
    }
    const data = await res.json();
    return data.calorie_goal ?? DEFAULT_GOAL;
  } catch (err) {
    console.warn('getCalorieGoal fetch failed, using DEFAULT_GOAL:', err);
    return DEFAULT_GOAL;
  }
}

export async function setCalorieGoal(goal) {
  try {
    const res = await apiFetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calorie_goal: goal }),
    });
    if (!res.ok) {
      throw new Error(`setCalorieGoal PUT /settings failed: ${res.status}`);
    }
  } catch (err) {
    console.warn('setCalorieGoal API failed:', err);
    throw err;
  }
}

export async function getFoodLog() {
  try {
    const res = await apiFetch(`${API_BASE}/plates`);
    if (!res.ok) return [];
    const data = await res.json();
    return data || [];
  } catch (err) {
    console.warn('getFoodLog (plate) fetch failed:', err);
    return [];
  }
}

export async function addFoodEntry(entry) {
  const roundedItems = (entry.items || []).map(item => ({
    ...item,
    calories: Math.round(item.calories || 0),
    protein: Math.round(item.protein || 0),
    carbs: Math.round(item.carbs || 0),
    fat: Math.round(item.fat || 0),
  }));

  const macros = entry.macros
    ? {
        protein: Math.round(entry.macros.protein || 0),
        carbs: Math.round(entry.macros.carbs || 0),
        fat: Math.round(entry.macros.fat || 0),
      }
    : roundedItems.length > 0
      ? roundedItems.reduce(
        (acc, item) => ({
          protein: (acc.protein || 0) + (Number(item.protein) || 0),
          carbs: (acc.carbs || 0) + (Number(item.carbs) || 0),
          fat: (acc.fat || 0) + (Number(item.fat) || 0),
        }),
        { protein: 0, carbs: 0, fat: 0 }
      )
      : { protein: 0, carbs: 0, fat: 0 };

  const roundedMacros = {
    protein: Math.round(macros.protein || 0),
    carbs: Math.round(macros.carbs || 0),
    fat: Math.round(macros.fat || 0),
  };
  const updatedEntry = {
    ...entry,
    macros: roundedMacros,
    calories: Math.round(entry.calories || 0),
    items: roundedItems,
  };

  const { imageUri, ...entryForApi } = updatedEntry;

  let created;
  try {
    const res = await apiFetch(`${API_BASE}/plates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryForApi),
    });
    if (!res.ok) {
      throw new Error(`addFoodEntry POST failed: ${res.status}`);
    }
    created = await res.json();
  } catch (err) {
    throw err;
  }

  try {
    if (updatedEntry.imageUri && updatedEntry.imageUri.startsWith('data:')) {
      await saveImage(updatedEntry.id, updatedEntry.imageUri);
    }
  } catch (err) {
    console.warn('saveImage upload failed (non-fatal):', err);
  }

  const result = { ...created, imageUri: null };
  return result;
}

export async function deleteFoodEntry(id) {
  try {
    await deleteImage(id);
  } catch (err) {
    console.warn('deleteImage failed (non-fatal):', err);
  }

  try {
    const res = await apiFetch(`${API_BASE}/plates/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`deleteFoodEntry DELETE failed: ${res.status}`);
    }
    const listRes = await apiFetch(`${API_BASE}/plates`);
    if (!listRes.ok) return [];
    return await listRes.json();
  } catch (err) {
    throw err;
  }
}

export async function updateFoodEntry(id, updatedFields) {
  let roundedItems = undefined;
  if (updatedFields.items && updatedFields.items.length > 0) {
    roundedItems = updatedFields.items.map(item => ({
      ...item,
      calories: Math.round(item.calories || 0),
      protein: Math.round(item.protein || 0),
      carbs: Math.round(item.carbs || 0),
      fat: Math.round(item.fat || 0),
    }));
  }

  const patch = { ...updatedFields };
  if (roundedItems) {
    patch.items = roundedItems;
  }

  if (roundedItems && roundedItems.length > 0) {
    patch.macros = {
      protein: Math.round(roundedItems.reduce((acc, item) => acc + (Number(item.protein) || 0), 0)),
      carbs: Math.round(roundedItems.reduce((acc, item) => acc + (Number(item.carbs) || 0), 0)),
      fat: Math.round(roundedItems.reduce((acc, item) => acc + (Number(item.fat) || 0), 0)),
    };
    const recalculatedCalories = Math.round(roundedItems.reduce((acc, item) => acc + (Number(item.calories) || 0), 0));
    patch.calories = recalculatedCalories;
    patch.totalCalories = recalculatedCalories;
  }

  if (patch.macros) {
    patch.macros = {
      protein: Math.round(patch.macros.protein || 0),
      carbs: Math.round(patch.macros.carbs || 0),
      fat: Math.round(patch.macros.fat || 0),
    };
  }
  if (patch.calories != null) {
    patch.calories = Math.round(patch.calories);
  }

  try {
    const res = await apiFetch(`${API_BASE}/plates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      throw new Error(`updateFoodEntry PUT failed: ${res.status}`);
    }
    const result = await res.json();
    return result;
  } catch (err) {
    throw err;
  }
}

export function getTodayEntries(log) {
  const today = new Date().toDateString();
  return log.filter((e) => new Date(e.timestamp).toDateString() === today);
}

export function groupByDay(log) {
  const groups = {};
  for (const entry of log) {
    const day = new Date(entry.timestamp).toDateString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(entry);
  }
  return groups;
}