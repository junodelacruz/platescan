import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getFoodLog } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MEAL_TYPE_COLORS = {
  Breakfast: '#D9A441',
  Lunch: '#4E7C62',
  Dinner: '#E05D44',
  Snack: '#7A6EA0',
};

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function MealEntryRow({ entry, navigation, colors, typography }) {
  const proteinColor = '#4E7C62';
  const carbsColor = '#D9A441';
  const fatColor = '#E05D44';
  const pVal = Math.round(entry.macros?.protein ?? entry.items?.reduce((s, i) => s + (i.protein || 0), 0) ?? 0);
  const cVal = Math.round(entry.macros?.carbs ?? entry.items?.reduce((s, i) => s + (i.carbs || 0), 0) ?? 0);
  const fVal = Math.round(entry.macros?.fat ?? entry.items?.reduce((s, i) => s + (i.fat || 0), 0) ?? 0);

  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => navigation.navigate('PlateDetail', { entry })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '600', flexShrink: 1 }}>
            {entry.label}
          </Text>
          {entry.mealType && (
            <View style={{
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: MEAL_TYPE_COLORS[entry.mealType] ?? colors.border,
            }}>
              <Text style={{
                fontSize: 10,
                fontWeight: '700',
                color: colors.background,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {entry.mealType}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: colors.inkMuted, marginTop: 3 }}>
          {entry.totalCalories} kcal
        </Text>
        <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
          <Text style={{ color: proteinColor }}>P: {pVal}g</Text>
          {' · '}
          <Text style={{ color: carbsColor }}>C: {cVal}g</Text>
          {' · '}
          <Text style={{ color: fatColor }}>F: {fVal}g</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const DAILY_CALORIE_GOAL = 2000;

export default function HistoryScreen({ navigation }) {
  const { colors, typography, isDark } = useTheme();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(dateKey(today));
  const [entriesByDay, setEntriesByDay] = useState({});

  const styles = {
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 8,
    },
    screenTitle: { fontSize: 24, color: colors.ink, ...typography.display },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      marginBottom: 10,
    },
    navBtn: { padding: 8 },
    navArrow: { fontSize: 28, color: colors.ink, lineHeight: 30 },
    monthLabel: { fontSize: 17, color: colors.ink, ...typography.display },
    dowRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
    dowLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      color: colors.inkMuted,
      ...typography.label,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    cell: {
      width: '14.2857%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 50,
      marginVertical: 2,
    },
    cellSelected: { backgroundColor: colors.tomato },
    cellToday: { borderWidth: 1.5, borderColor: colors.forest },
    dayText: { fontSize: 14, color: colors.ink, fontWeight: '500' },
    dayTextSelected: { color: colors.background, fontWeight: '700' },
    dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
    detail: { flex: 1, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    detailContent: { padding: 20, paddingBottom: 40 },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 14,
    },
    detailDate: { fontSize: 15, color: colors.ink, fontWeight: '600', flexShrink: 1 },
    detailTotal: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
    emptyText: { color: colors.inkMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
  };

  const refresh = useCallback(async () => {
    const log = await getFoodLog();
    const map = {};
    for (const entry of log) {
      const key = dateKey(new Date(entry.timestamp));
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    setEntriesByDay(map);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEntries = entriesByDay[selectedKey] || [];
  const selectedTotal = selectedEntries.reduce((s, e) => s + (e.totalCalories || 0), 0);
  const selectedDate = new Date(
    parseInt(selectedKey.slice(0, 4)),
    parseInt(selectedKey.slice(5, 7)) - 1,
    parseInt(selectedKey.slice(8, 10)),
  );
  const selectedLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Calendar</Text>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dowRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={styles.dowLabel}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`blank-${idx}`} style={styles.cell} />;
          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEntries = entriesByDay[key] || [];
          const hasEntries = dayEntries.length > 0;
          const dayTotal = dayEntries.reduce((s, e) => s + (e.totalCalories || 0), 0);
          const isOver = dayTotal > DAILY_CALORIE_GOAL;
          const isSelected = key === selectedKey;
          const isToday = key === dateKey(today);

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.cell,
                isSelected && styles.cellSelected,
                isToday && !isSelected && styles.cellToday,
              ]}
              onPress={() => setSelectedKey(key)}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                {day}
              </Text>
              {hasEntries && (
                <View style={[styles.dot, { backgroundColor: isOver ? colors.tomato : colors.forest }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailDate}>{selectedLabel}</Text>
          {selectedEntries.length > 0 && (
            <Text style={[
              styles.detailTotal,
              { color: selectedTotal > DAILY_CALORIE_GOAL ? colors.tomato : colors.forest },
            ]}>
              {selectedTotal} / {DAILY_CALORIE_GOAL} kcal
            </Text>
          )}
        </View>

        {selectedEntries.length === 0 ? (
          <Text style={styles.emptyText}>No meals logged on this day.</Text>
        ) : (
          selectedEntries.map((entry) => (
            <MealEntryRow
              key={entry.id}
              entry={entry}
              navigation={navigation}
              colors={colors}
              typography={typography}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}