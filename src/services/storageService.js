import AsyncStorage from '@react-native-async-storage/async-storage';
const LOG_KEY = 'platescan:foodLog';
const GOAL_KEY = 'platescan:dailyCalorieGoal';
const DEFAULT_GOAL = 1900;

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

  const updated = [...log, updatedEntry];
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteFoodEntry(id) {
  const log = await getFoodLog();
  const updated = log.filter((e) => e.id !== id);
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
  return updated;
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
