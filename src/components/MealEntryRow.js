import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function MealEntryRow({ entry, onPress }) {
  const { colors, typography, isDark } = useTheme();

  const proteinColor = isDark ? '#4E7C62' : '#3D6B52';
  const carbsColor = isDark ? '#D9A441' : '#B8860B';
  const fatColor = isDark ? '#E05D44' : '#C0392B';

  const pVal = Math.round(entry.macros?.protein ?? entry.items?.reduce((s, i) => s + (i.protein || 0), 0) ?? 0);
  const cVal = Math.round(entry.macros?.carbs ?? entry.items?.reduce((s, i) => s + (i.carbs || 0), 0) ?? 0);
  const fVal = Math.round(entry.macros?.fat ?? entry.items?.reduce((s, i) => s + (i.fat || 0), 0) ?? 0);

  const MEAL_TYPE_COLORS = {
    Breakfast: isDark ? '#D9A441' : '#B8860B',
    Lunch: isDark ? '#4E7C62' : '#3D6B52',
    Dinner: isDark ? '#E05D44' : '#C0392B',
    Snack: '#7A6EA0',
  };

  const styles = {
    row: {
      paddingVertical: 8,
      marginBottom: 4,
      backgroundColor: colors.cardBg ?? colors.background,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      flexShrink: 1,
    },
    sub: {
      fontSize: 13,
      marginTop: 3,
    },
    macroSummary: {
      fontSize: 12,
      marginTop: 2,
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  };

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: colors.ink }]}>{entry.label}</Text>
        {entry.mealType ? (
          <View style={[styles.badge, { backgroundColor: MEAL_TYPE_COLORS[entry.mealType] ?? colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.background }]}>{entry.mealType}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.sub, { color: colors.inkMuted }]}>{entry.totalCalories} kcal</Text>
      <Text style={[styles.macroSummary, { color: colors.inkMuted }]}>
        <Text style={{ color: proteinColor }}>P: {pVal}g</Text>
        {' · '}
        <Text style={{ color: carbsColor }}>C: {cVal}g</Text>
        {' · '}
        <Text style={{ color: fatColor }}>F: {fVal}g</Text>
      </Text>
    </TouchableOpacity>
  );
}

