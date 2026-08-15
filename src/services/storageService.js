import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'foodLog';
const GOAL_KEY = 'calorieGoal';
const DEFAULT_GOAL = 2000;
const API_BASE = 'http://100.98.211.95:3001';

// ── IndexedDB image store ──
const DB_NAME = 'platescan-images';
const DB_STORE = 'images';

function openImageDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function saveImage(entryId, base64DataUri) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put({ id: String(entryId), data: base64DataUri });
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function loadImage(entryId) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(String(entryId));
    req.onsuccess = (e) => resolve(e.target.result?.data ?? null);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteImage(entryId) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(String(entryId));
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getCalorieGoal() {
  const raw = await AsyncStorage.getItem(GOAL_KEY);
  return raw ? parseInt(raw, 10) : DEFAULT_GOAL;
}

export async function setCalorieGoal(goal) {
  await AsyncStorage.setItem(GOAL_KEY, goal.toString());
}

export async function getFoodLog() {
  try {
    const res = await fetch(`${API_BASE}/plates`);
    if (!res.ok) return [];
    const data = await res.json();
    return data || [];
  } catch (err) {
    console.warn('getFoodLog (plate) fetch failed:', err);
    return [];
  }
  // OLD - AsyncStorage version, kept for rollback
  // const raw = await AsyncStorage.getItem(LOG_KEY);
  // return raw ? JSON.parse(raw) : [];
}

export async function addFoodEntry(entry) {
  // Round item-level macros and calories before sending to API
  const roundedItems = (entry.items || []).map(item => ({
    ...item,
    calories: Math.round(item.calories || 0),
    protein: Math.round(item.protein || 0),
    carbs: Math.round(item.carbs || 0),
    fat: Math.round(item.fat || 0),
  }));

  // Aggregate macros from items if not already present on the entry
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

  // Round macros and entry-level calories
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

  // Part B: Save image to IndexedDB locally (keep existing behavior)
  try {
    if (updatedEntry.imageUri && updatedEntry.imageUri.startsWith('data:')) {
      await saveImage(updatedEntry.id, updatedEntry.imageUri);
    }
  } catch (err) {
    console.warn('saveImage to IndexedDB failed (non-fatal):', err);
  }

  try {
    const res = await fetch(`${API_BASE}/plates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEntry),
    });
    if (!res.ok) {
      throw new Error(`addFoodEntry POST failed: ${res.status}`);
    }
    const created = await res.json();
    // Return the created entry with local imageUri stripped
    const result = { ...created, imageUri: null };
    return result;
  } catch (err) {
    throw err;
  }
  // OLD - AsyncStorage version, kept for rollback
  // const log = await getFoodLog();
  // const updatedEntry = { ...entry, macros: roundedMacros, calories: Math.round(entry.calories || 0), items: roundedItems };
  // const entryForStorage = { ...updatedEntry, imageUri: null };
  // await AsyncStorage.setItem(LOG_KEY, JSON.stringify([...log, entryForStorage]));
  // return [...log, updatedEntry];
}

export async function deleteFoodEntry(id) {
  // Part C: Also delete image from IndexedDB (keep existing behavior)
  try {
    await deleteImage(id);
  } catch (err) {
    console.warn('deleteImage failed (non-fatal):', err);
  }

  try {
    const res = await fetch(`${API_BASE}/plates/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`deleteFoodEntry DELETE failed: ${res.status}`);
    }
    // Return updated list from server
    const listRes = await fetch(`${API_BASE}/plates`);
    if (!listRes.ok) return [];
    return await listRes.json();
  } catch (err) {
    throw err;
  }
  // OLD - AsyncStorage version, kept for rollback
  // const log = await getFoodLog();
  // const updated = log.filter((e) => e.id !== id);
  // await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
  // return updated;
}

// Part D: Clear legacy AsyncStorage data on app load
export async function clearLegacyData() {
  const FLAG = 'platescan-idb-v1';
  try {
    const done = await AsyncStorage.getItem(FLAG);
    if (done) return;
    await AsyncStorage.removeItem(LOG_KEY);
    await AsyncStorage.setItem(FLAG, '1');
    console.log('platescan: legacy foodLog cleared for IndexedDB migration');
  } catch (e) {
    console.warn('clearLegacyData failed (non-fatal):', e);
  }
}

export async function updateFoodEntry(id, updatedFields) {
  // Round item-level macros and calories if items were updated
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

  // Recompute macros from items if items were updated
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

  // Round entry-level calories and macros before sending
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
    const res = await fetch(`${API_BASE}/plates/${id}`, {
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
  // OLD - AsyncStorage version, kept for rollback
  // const log = await getFoodLog();
  // const index = log.findIndex(e => e.id === id);
  // if (index === -1) return log;
  // log[index] = { ...log[index], ...updatedFields, items: roundedItems || log[index].items };
  // if (roundedItems && roundedItems.length > 0) { ... }
  // await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log));
  // return log;
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
