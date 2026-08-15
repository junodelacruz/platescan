import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, Image, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PlateRing from '../components/PlateRing';
import { getFoodLog, getCalorieGoal, loadImage } from '../services/storageService';
import { subscribe } from '../services/eventBus';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEAL_TYPE_COLORS = {
  Breakfast: '#D9A441',
  Lunch: '#4E7C62',
  Dinner: '#E05D44',
  Snack: '#7A6EA0',
};

// Converts a hex color + alpha (0–1) to rgba string for transparent badge backgrounds
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Inject Inter font once on web for a professional, lightweight typeface
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const existing = document.getElementById('inter-font');
  if (!existing) {
    const link = document.createElement('link');
    link.id = 'inter-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
  }
}

const FONT = Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined;

// Helper to format date key in YYYY-MM-DD local format
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HomeScreen({ navigation }) {
  const { colors, typography } = useTheme();
  
  // Selected date management (defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
  const [allEntries, setAllEntries] = useState([]);
  const [goal, setGoal] = useState(2000);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Subscribe to cross-screen edit updates so HomeScreen refreshes
  // when the user saves changes from PlateDetailScreen
  useEffect(() => {
    console.log('[HomeScreen] Subscribing to plate-updated event');
    return subscribe('plate-updated', () => {
      console.log('[HomeScreen] Received plate-updated event, re-fetching...');
      getFoodLog().then(log => {
        console.log('[HomeScreen] Fetched', log.length, 'entries, updating state');
        setAllEntries(log);
      }).catch(err => console.error('[HomeScreen] Error fetching:', err));
    });
  }, []);

  const refresh = useCallback(async () => {
    const log = await getFoodLog();
    setAllEntries(log);
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.setItem('platescan-selected-date', selectedDate.toISOString());
      Promise.all([
        refresh(),
        getCalorieGoal().then(g => setGoal(g)),
      ]);
    }, [refresh, selectedDate])
  );

  // Filter entries to display based on the selectedDate
  const targetDateStr = formatDateKey(selectedDate);
  const dayEntries = allEntries.filter(
    (e) => formatDateKey(new Date(e.timestamp)) === targetDateStr
  );

  console.log('[DEBUG] allEntries.length:', allEntries.length);
  console.log('[DEBUG] targetDateStr:', targetDateStr);
  console.log('[DEBUG] entry dates:', allEntries.map(e => formatDateKey(new Date(e.timestamp))));
  console.log('[DEBUG] dayEntries.length:', dayEntries.length);

  const totalCalories = dayEntries.reduce((sum, e) => sum + (e.total_calories || 0), 0);
  const totalProtein = Math.round(dayEntries.reduce((s, e) => s + (e.items?.reduce((si, i) => si + (Number(i.protein) || 0), 0) ?? 0), 0));
  const totalCarbs = Math.round(dayEntries.reduce((s, e) => s + (e.items?.reduce((si, i) => si + (Number(i.carbs) || 0), 0) ?? 0), 0));
  const totalFat = Math.round(dayEntries.reduce((s, e) => s + (e.items?.reduce((si, i) => si + (Number(i.fat) || 0), 0) ?? 0), 0));

  const pct = Math.min(Math.round((totalCalories / goal) * 100), 100);

  // Generate recent 7 days for the dropdown menu
  const getRecentDays = () => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      list.push(d);
    }
    return list;
  };

  const recentDays = getRecentDays();
  const isTodaySelected = formatDateKey(selectedDate) === formatDateKey(new Date());
  
  // Format the label of the active day
  const getHeaderDateLabel = () => {
    if (isTodaySelected) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (formatDateKey(selectedDate) === formatDateKey(yesterday)) return 'Yesterday';
    return selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setDropdownVisible(false);
    AsyncStorage.setItem('platescan-selected-date', date.toISOString());
  };

  const handleNavigateToScan = () => {
    // Pass selectedDate in params so scanning logic knows what date context we're editing
    navigation.navigate('Scan', { initialDate: selectedDate.toISOString() });
  };

  const styles = {
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      height: 56,
    },
    dropdownSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownSelectorText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      marginRight: 4,
    },
    dropdownArrow: {
      fontSize: 10,
      color: colors.inkMuted,
    },
    
    // Ring area
    ringWrap: { alignItems: 'center', marginTop: 16, marginBottom: 6 },
    percentLabel: { fontSize: 13, color: colors.tomato, marginTop: 8, fontWeight: '400', fontFamily: FONT },

    // Macro card
    macroCard: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    macroCol: { flex: 1, alignItems: 'center' },
    macroDivider: { width: 1, height: 36, backgroundColor: colors.border },
    macroColLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, fontFamily: FONT },
    macroColValue: { fontSize: 22, color: colors.ink, fontWeight: '300', fontFamily: FONT },

    // Section header
    sectionHeader: {
      fontSize: 17,
      color: colors.ink,
      fontWeight: '500',
      fontFamily: FONT,
      paddingHorizontal: 20,
      marginTop: 20,
      marginBottom: 8,
    },

    // Scan button - lowered by adjusting bottom container padding and positioning
    scanButton: {
      position: 'absolute',
      bottom: 8,
      left: 20,
      right: 20,
      backgroundColor: colors.tomato,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    scanButtonText: { color: colors.ink, fontSize: 16, ...typography.label, letterSpacing: 1 },

    emptyText: { textAlign: 'center', color: colors.inkMuted, marginTop: 20, fontSize: 14 },

    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '80%',
      backgroundColor: colors.background,
      borderRadius: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
    },
    modalItem: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalItemText: {
      fontSize: 15,
      color: colors.ink,
      fontWeight: '400',
      fontFamily: FONT,
    },
    modalItemTextActive: {
      fontWeight: '500',
      color: colors.tomato,
    },
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* SECTION 1 — Header: centered date dropdown */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.dropdownSelector} onPress={() => setDropdownVisible(true)}>
          <Text style={styles.dropdownSelectorText}>{getHeaderDateLabel()}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dayEntries.slice().reverse()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 72 }}
        ListHeaderComponent={
          <>
            {/* SECTION 2 — Calorie ring */}
            <View style={styles.ringWrap}>
              <PlateRing consumed={totalCalories} goal={goal} />
              <Text style={styles.percentLabel}>{pct}% of daily goal</Text>
            </View>

            {/* SECTION 3 — Macro summary card */}
            <View style={styles.macroCard}>
              <View style={styles.macroCol}>
                <Text style={[styles.macroColLabel, { color: colors.tomato }]}>Protein</Text>
                <Text style={styles.macroColValue}>{totalProtein}<Text style={{ fontSize: 14, fontWeight: '400' }}>g</Text></Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroCol}>
                <Text style={[styles.macroColLabel, { color: '#D9A441' }]}>Carbs</Text>
                <Text style={styles.macroColValue}>{totalCarbs}<Text style={{ fontSize: 14, fontWeight: '400' }}>g</Text></Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroCol}>
                <Text style={[styles.macroColLabel, { color: '#E05D44' }]}>Fat</Text>
                <Text style={styles.macroColValue}>{totalFat}<Text style={{ fontSize: 14, fontWeight: '400' }}>g</Text></Text>
              </View>
            </View>

            {/* SECTION 4 — Today's Meals header */}
            <Text style={styles.sectionHeader}>
              {isTodaySelected ? "Today's Meals" : `${getHeaderDateLabel()}'s Meals`}
            </Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nothing logged on this day.</Text>
        }
  renderItem={({ item, index }) => (
    <EntryRow
      item={item}
      index={index}
      entries={dayEntries.slice().reverse()}
      navigation={navigation}
    />
  )}
      />

      <TouchableOpacity style={styles.scanButton} onPress={handleNavigateToScan}>
        <Text style={styles.scanButtonText}>Scan a Plate</Text>
      </TouchableOpacity>

      {/* Date Selector Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                {recentDays.map((day, idx) => {
                  const key = formatDateKey(day);
                  const isActive = formatDateKey(selectedDate) === key;
                  
                  let label = day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                  if (idx === 0) label = 'Today';
                  if (idx === 1) label = 'Yesterday';

                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.modalItem}
                      onPress={() => handleSelectDate(day)}
                    >
                      <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                        {label}
                      </Text>
                      {isActive && <Text style={{ color: colors.tomato }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setDropdownVisible(false);
                    navigation.navigate('History');
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.forest, fontWeight: '600' }]}>
                    Choose Custom Date...
                  </Text>
                  <Text style={{ color: colors.forest }}>→</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

// SECTION 5 — Plate card
function EntryRow({ item, index, entries, navigation }) {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(item.id).then(uri => {
      if (!cancelled) setImageUri(uri);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [item.id]);

  const pVal = Math.round(item.macros?.protein ?? item.items?.reduce((s, i) => s + (i.protein || 0), 0) ?? 0);
  const cVal = Math.round(item.macros?.carbs ?? item.items?.reduce((s, i) => s + (i.carbs || 0), 0) ?? 0);
  const fVal = Math.round(item.macros?.fat ?? item.items?.reduce((s, i) => s + (i.fat || 0), 0) ?? 0);

  const cardStyle = {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  };

  const thumbPlaceholder = {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.border,
  };

  const thumbImage = {
    width: 80,
    height: 80,
    borderRadius: 12,
  };

  const contentStyle = { flex: 1, paddingLeft: 12, justifyContent: 'center' };

  const mealColor = MEAL_TYPE_COLORS[item.mealType];
  const badgeStyle = {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: mealColor ? hexToRgba(mealColor, 0.15) : 'transparent',
    borderWidth: 1,
    borderColor: mealColor ? hexToRgba(mealColor, 0.35) : colors.border,
    marginTop: 4,
    marginBottom: 4,
  };

  return (
    <TouchableOpacity
      style={cardStyle}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('PlateDetail', {
        entry: item,
        entries: entries,
        index: index,
      })}
    >
      {/* Thumbnail */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={thumbImage} resizeMode="cover" />
      ) : (
        <View style={thumbPlaceholder} />
      )}

      {/* Content */}
      <View style={contentStyle}>
        {/* Food name */}
        <Text
          style={{ fontSize: 15, fontWeight: '500', color: colors.ink, fontFamily: FONT }}
          numberOfLines={1}
        >
          {item.label}
        </Text>

        {/* Meal type badge */}
        {item.mealType ? (
          <View style={badgeStyle}>
            <Text style={{ fontSize: 10, fontWeight: '500', color: mealColor, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONT }}>
              {item.mealType}
            </Text>
          </View>
        ) : null}

        {/* Calorie count */}
        <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: item.mealType ? 0 : 4 }}>
          {item.totalCalories} kcal
        </Text>

        {/* Macro row */}
        <Text style={{ fontSize: 12, marginTop: 4 }}>
          <Text style={{ color: colors.tomato }}>{pVal}g Protein</Text>
          <Text style={{ color: colors.inkMuted }}> · </Text>
          <Text style={{ color: '#D9A441' }}>{cVal}g Carbs</Text>
          <Text style={{ color: colors.inkMuted }}> · </Text>
          <Text style={{ color: '#E05D44' }}>{fVal}g Fat</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}