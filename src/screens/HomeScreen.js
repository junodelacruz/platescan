import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, TextInput } from 'react-native';
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

  const totalProtein = Math.round(todayEntries.reduce((s, e) => s + (e.items?.reduce((si, i) => si + (Number(i.protein) || 0), 0) ?? 0), 0) ?? 0);
  const totalCarbs = Math.round(todayEntries.reduce((s, e) => s + (e.items?.reduce((si, i) => si + (Number(i.carbs) || 0), 0) ?? 0), 0) ?? 0);
  const totalFat = Math.round(todayEntries.reduce((s, e) => s + (e.items?.reduce((si, i) => si + (Number(i.fat) || 0), 0) ?? 0), 0) ?? 0);

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

      <View style={styles.macroRow}>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{totalProtein}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{totalCarbs}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{totalFat}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>

      <FlatList
        data={todayEntries.slice().reverse()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nothing logged yet. Scan a plate to get started.</Text>
        }
        renderItem={({ item }) => (
          <EntryRow
            item={item}
            onDelete={() => handleDelete(item.id)}
            navigation={navigation}
          />
        )}
      />

      <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('Scan')}>
        <Text style={styles.scanButtonText}>Scan a Plate</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function EntryRow({ item, onDelete, navigation }) {
  const proteinColor = '#4E7C62';
  const carbsColor = '#D9A441';
  const fatColor = '#E05D44';
  const pVal = Math.round(item.macros?.protein ?? item.items?.reduce((s, i) => s + (i.protein || 0), 0) ?? 0);
  const cVal = Math.round(item.macros?.carbs ?? item.items?.reduce((s, i) => s + (i.carbs || 0), 0) ?? 0);
  const fVal = Math.round(item.macros?.fat ?? item.items?.reduce((s, i) => s + (i.fat || 0), 0) ?? 0);

  return (
    <View style={styles.entryRow}>
      <View style={styles.entryTopSection}>
        <TouchableOpacity
          style={styles.rowContent}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('PlateDetail', { entry: item })}
        >
          <View style={styles.entryTopRow}>
            <Text style={styles.entryName}>{item.label}</Text>
            {item.mealType ? (
              <View style={[styles.badge, { backgroundColor: MEAL_TYPE_COLORS[item.mealType] ?? colors.border }]}>
                <Text style={styles.badgeText}>{item.mealType}</Text>
              </View>
            ) : null}
          </View>
            <Text style={styles.entrySub}>{item.totalCalories} kcal</Text>
          <Text style={styles.macroSummary}>
            <Text style={{ color: proteinColor }}>P: {pVal}g</Text>
            {' · '}
            <Text style={{ color: carbsColor }}>C: {cVal}g</Text>
            {' · '}
            <Text style={{ color: fatColor }}>F: {fVal}g</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.remove}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryTopSection: {
    width: '100%',
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowContent: { flex: 1 },
  macroSummary: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  deleteBtn: { marginTop: 6 },
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
  macroRow: { flexDirection: 'row', paddingVertical: 12, marginHorizontal: 24, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 24 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 16, color: colors.ink, fontWeight: '700' },
  macroLabel: { fontSize: 11, color: colors.inkMuted, ...typography.label },
  macroDivider: { width: 1, height: 28, backgroundColor: colors.border },
});
