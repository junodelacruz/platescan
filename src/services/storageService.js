import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'foodLog';
const GOAL_KEY = 'calorieGoal';
const DEFAULT_GOAL = 2000;

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
  const raw = await AsyncStorage.getItem(LOG_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addFoodEntry(entry) {
  const log = await getFoodLog();

  // Aggregate macros from items if not already present on the entry
  const macros = entry.macros
    ? entry.macros
    : entry.items && entry.items.length > 0
      ? entry.items.reduce(
        (acc, item) => ({
          protein: (acc.protein || 0) + (Number(item.protein) || 0),
          carbs: (acc.carbs || 0) + (Number(item.carbs) || 0),
          fat: (acc.fat || 0) + (Number(item.fat) || 0),
        }),
        { protein: 0, carbs: 0, fat: 0 }
      )
      : { protein: 0, carbs: 0, fat: 0 };

  const updatedEntry = { ...entry, macros };

  // Part B: Save image to IndexedDB, strip imageUri from AsyncStorage
  try {
    if (updatedEntry.imageUri && updatedEntry.imageUri.startsWith('data:')) {
      await saveImage(updatedEntry.id, updatedEntry.imageUri);
    }
  } catch (err) {
    console.warn('saveImage to IndexedDB failed (non-fatal):', err);
  }
  const entryForStorage = { ...updatedEntry, imageUri: null };

  try {
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify([...log, entryForStorage]));
  } catch (err) {
    throw err;
  }

  return [...log, updatedEntry];
}

export async function deleteFoodEntry(id) {
  // Part C: Also delete image from IndexedDB
  try {
    await deleteImage(id);
  } catch (err) {
    console.warn('deleteImage failed (non-fatal):', err);
  }

  const log = await getFoodLog();
  const updated = log.filter((e) => e.id !== id);
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
  return updated;
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
  const log = await getFoodLog();
  const index = log.findIndex(e => e.id === id);
  if (index === -1) return log;
  log[index] = { ...log[index], ...updatedFields };
  // Recompute macros from items if items was updated
  if (updatedFields.items && updatedFields.items.length > 0) {
    log[index].macros = updatedFields.items.reduce(
      (acc, item) => ({
        protein: (acc.protein || 0) + (Number(item.protein) || 0),
        carbs: (acc.carbs || 0) + (Number(item.carbs) || 0),
        fat: (acc.fat || 0) + (Number(item.fat) || 0),
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
  }
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log));
  return log;
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
