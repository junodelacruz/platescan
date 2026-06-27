import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PlateRing from '../components/PlateRing';
import { getFoodLog, getTodayEntries, deleteFoodEntry } from '../services/storageService';
import { getCalorieGoal } from '../services/storageService';
import { colors, typography } from '../theme';

const MEAL_TYPE_COLORS = {
  Breakfast: '#D9A441',
  Lunch: '#4E7C62',
  Dinner: '#E05D44',
  Snack: '#7A6EA0',
};

export default function HomeScreen({ navigation }) {
  const [todayEntries, setTodayEntries] = useState([]);
  const [goal, setGoal] = useState(1900);

  const refresh = useCallback(async () => {
    const log = await getFoodLog();
    setTodayEntries(getTodayEntries(log));
  }, []);

  useFocusEffect(
    useCallback(() => {
      Promise.all([refresh(), getCalorieGoal().then(g => setGoal(g))]);
    }, [refresh])
  );

  const totalCalories = todayEntries.reduce((sum, e) => sum + (e.totalCalories || 0), 0);

  const handleDelete = async (id) => {
    await deleteFoodEntry(id);
    refresh();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Plate</Text>
        <View style={styles.links}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.link}>Settings</Text>
          </TouchableOpacity>
          <Text style={[styles.link, styles.linkSeparator]}>|</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.link}>Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ringWrap}>
        <PlateRing consumed={totalCalories} goal={goal} />
      </View>

      <FlatList
        data={todayEntries.slice().reverse()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nothing logged yet. Scan a plate to get started.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.entryRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.entryTopRow}>
                <Text style={styles.entryName}>{item.label}</Text>
                {item.mealType ? (
                  <View style={[styles.badge, { backgroundColor: MEAL_TYPE_COLORS[item.mealType] ?? colors.border }]}>
                    <Text style={styles.badgeText}>{item.mealType}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.entrySub}>{item.totalCalories} kcal</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('Scan')}>
        <Text style={styles.scanButtonText}>Scan a Plate</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  title: { fontSize: 24, color: colors.ink, ...typography.display },
  links: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { fontSize: 14, color: colors.forest, ...typography.label },
  linkSeparator: { color: colors.inkMuted },
  ringWrap: { alignItems: 'center', marginVertical: 20 },
  list: { paddingHorizontal: 24, paddingBottom: 110 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 20 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryName: { fontSize: 16, color: colors.ink, fontWeight: '600', flexShrink: 1 },
  entrySub: { fontSize: 13, color: colors.inkMuted, marginTop: 3 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remove: { color: colors.tomato, fontSize: 13, ...typography.label },
  scanButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: colors.tomato,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  scanButtonText: { color: colors.ink, fontSize: 16, ...typography.label, letterSpacing: 1 },
});
