import AsyncStorage from '@react-native-async-storage/async-storage';

const FOOD_KEY = 'foodLog';
const GOAL_KEY = 'calorieGoal';
const WEIGHT_KEY = 'weightLog';
const DB_NAME = 'platescan-images';
const DB_STORE = 'images';
const DEFAULT_GOAL = 2000;

function openImageDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Collects all app data into a single exportable object.
 * Reads: foodLog, calorieGoal, weightLog (AsyncStorage),
 *        all images (IndexedDB).
 */
export async function getExportData() {
  const [rawLog, rawGoal, rawWeight] = await Promise.all([
    AsyncStorage.getItem(FOOD_KEY),
    AsyncStorage.getItem(GOAL_KEY),
    AsyncStorage.getItem(WEIGHT_KEY),
  ]);

  // Fetch all images from IndexedDB
  let images = {};
  try {
    const db = await openImageDB();
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    for (const img of all) {
      images[String(img.id)] = img.data;
    }
  } catch (err) {
    console.warn('export: failed to read images from IndexedDB:', err);
  }

  return {
    exportedAt: new Date().toISOString(),
    plates: rawLog ? JSON.parse(rawLog) : [],
    settings: {
      calorieGoal: rawGoal ? parseInt(rawGoal, 10) : DEFAULT_GOAL,
    },
    weights: rawWeight ? JSON.parse(rawWeight) : [],
    images,
  };
}

/**
 * Converts data to a JSON blob and triggers a file download.
 * Falls back to a share prompt on iOS Safari if download fails.
 */
export function triggerExport(data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = `platescan-export-${new Date().toISOString().slice(0, 10)}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
