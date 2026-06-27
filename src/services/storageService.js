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
  const updated = [...log, entry];
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
