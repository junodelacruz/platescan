import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getFoodLog, loadImage } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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

function MealEntryRow({ entry, entries = [], navigation }) {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(entry.id).then(uri => {
      if (!cancelled) setImageUri(uri);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [entry.id]);

  const pVal = Math.round(entry.macros?.protein ?? entry.items?.reduce((s, i) => s + (i.protein || 0), 0) ?? 0);
  const cVal = Math.round(entry.macros?.carbs ?? entry.items?.reduce((s, i) => s + (i.carbs || 0), 0) ?? 0);
  const fVal = Math.round(entry.macros?.fat ?? entry.items?.reduce((s, i) => s + (i.fat || 0), 0) ?? 0);

  const entryIndex = entries.indexOf(entry);
  return (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 10,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        overflow: 'hidden',
      }}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('PlateDetail', {
        entry,
        entries: entries,
        index: entryIndex,
      })}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 64, height: 64, borderRadius: 10, marginRight: 12 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.border, marginRight: 12 }} />
      )}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
          {entry.label}
        </Text>
        {entry.mealType ? (
          <View style={{
            alignSelf: 'flex-start',
            borderRadius: 14,
            paddingHorizontal: 8,
            paddingVertical: 2,
            backgroundColor: MEAL_TYPE_COLORS[entry.mealType] ?? colors.border,
            marginTop: 4,
            marginBottom: 4,
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
        ) : null}
        <Text style={{ fontSize: 13, color: colors.inkMuted }}>
          {entry.total_calories} kcal
        </Text>
        <Text style={{ fontSize: 11, marginTop: 2 }}>
          <Text style={{ color: colors.tomato }}>{pVal}g P</Text>
          {' · '}
          <Text style={{ color: '#D9A441' }}>{cVal}g C</Text>
          {' · '}
          <Text style={{ color: '#E05D44' }}>{fVal}g F</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const today = new Date();
  
  // Layout Constants
  const CONTAINER_WIDTH = Math.min(SCREEN_WIDTH, 480);
  const PANEL_HEIGHT = 400;
  const MINIMIZED_HEIGHT = 80;
  const SNAP_EXPANDED = 0;
  const SNAP_MINIMIZED = PANEL_HEIGHT - MINIMIZED_HEIGHT;
  const SNAP_HIDDEN = PANEL_HEIGHT + 24;

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(dateKey(today));
  const [entriesByDay, setEntriesByDay] = useState({});
  const [showPanel, setShowPanel] = useState(true); // default visible minimized
  const [isMinimized, setIsMinimized] = useState(true);

  // Animated values and refs
  const translateYAnim = useRef(new Animated.Value(SNAP_MINIMIZED)).current;
  const translateYRef = useRef(SNAP_MINIMIZED);
  const isMinimizedRef = useRef(true);
  const selectedKeyRef = useRef(dateKey(today));

  // Sync state values with refs for PanResponder
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    const listenerId = translateYAnim.addListener(({ value }) => {
      translateYRef.current = value;
    });
    return () => translateYAnim.removeListener(listenerId);
  }, [translateYAnim]);

  const animateTo = (toValue, callback) => {
    const minimized = toValue !== SNAP_EXPANDED;
    setIsMinimized(minimized);
    isMinimizedRef.current = minimized;

    Animated.spring(translateYAnim, {
      toValue,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start(() => {
      if (toValue === SNAP_HIDDEN) {
        setShowPanel(false);
      }
      if (callback) callback();
    });
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

  const handleDayPress = (key) => {
    setSelectedKey(key);
    setShowPanel(true);
    
    // If the card is hidden, slide it up to minimized. Otherwise keep it where it is
    if (translateYRef.current >= SNAP_HIDDEN - 10) {
      translateYAnim.setValue(SNAP_HIDDEN);
      animateTo(SNAP_MINIMIZED);
    } else {
      animateTo(isMinimizedRef.current ? SNAP_MINIMIZED : SNAP_EXPANDED);
    }
  };

  const handleClosePanel = () => {
    animateTo(SNAP_HIDDEN);
  };

  // Drag Gesture Handling
  const dragStartTranslateY = useRef(SNAP_MINIMIZED);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        dragStartTranslateY.current = translateYRef.current;
      },
      onPanResponderMove: (e, gestureState) => {
        const nextTranslateY = dragStartTranslateY.current + gestureState.dy;
        const clampedTranslateY = Math.max(SNAP_EXPANDED, Math.min(SNAP_HIDDEN, nextTranslateY));
        translateYAnim.setValue(clampedTranslateY);
      },
      onPanResponderRelease: (e, gestureState) => {
        const currentTranslateY = translateYRef.current;
        const dragDist = currentTranslateY - dragStartTranslateY.current;
        
        let target = SNAP_MINIMIZED;

        if (dragStartTranslateY.current === SNAP_EXPANDED) {
          // Started expanded
          if (gestureState.vy > 0.5 || dragDist > (SNAP_MINIMIZED - SNAP_EXPANDED) * 0.4) {
            target = SNAP_MINIMIZED;
          } else {
            target = SNAP_EXPANDED;
          }
        } else if (dragStartTranslateY.current === SNAP_MINIMIZED) {
          // Started minimized
          if (gestureState.vy < -0.5 || dragDist < (SNAP_EXPANDED - SNAP_MINIMIZED) * 0.4) {
            target = SNAP_EXPANDED;
          } else if (gestureState.vy > 0.5 || dragDist > (SNAP_HIDDEN - SNAP_MINIMIZED) * 0.4) {
            target = SNAP_HIDDEN;
          } else {
            target = SNAP_MINIMIZED;
          }
        } else {
          target = SNAP_MINIMIZED;
        }

        animateTo(target);
      },
    })
  ).current;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEntries = entriesByDay[selectedKey] || [];
  const selectedTotal = selectedEntries.reduce((s, e) => s + (e.total_calories || 0), 0);
  const selectedProtein = Math.round(selectedEntries.reduce((s, e) => s + (e.macros?.protein ?? e.items?.reduce((si, i) => si + (Number(i.protein) || 0), 0) ?? 0), 0));
  const selectedCarbs = Math.round(selectedEntries.reduce((s, e) => s + (e.macros?.carbs ?? e.items?.reduce((si, i) => si + (Number(i.carbs) || 0), 0) ?? 0), 0));
  const selectedFat = Math.round(selectedEntries.reduce((s, e) => s + (e.macros?.fat ?? e.items?.reduce((si, i) => si + (Number(i.fat) || 0), 0) ?? 0), 0));

  const selectedDate = new Date(
    parseInt(selectedKey.slice(0, 4)),
    parseInt(selectedKey.slice(5, 7)) - 1,
    parseInt(selectedKey.slice(8, 10)),
  );
  const selectedLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const styles = {
    safe: { flex: 1, backgroundColor: colors.background, position: 'relative', overflow: 'hidden' },
    calendarContainer: {
      width: CONTAINER_WIDTH,
      alignSelf: 'center',
      paddingHorizontal: 16,
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    screenTitle: { fontSize: 24, color: colors.ink, ...typography.display },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 44,
      marginBottom: 8,
    },
    navBtn: { padding: 8 },
    navArrow: { fontSize: 28, color: colors.ink, lineHeight: 30 },
    monthLabel: { fontSize: 17, color: colors.ink, ...typography.display },
    dowRow: { flexDirection: 'row', height: 24, marginBottom: 4 },
    dowCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    dowLabel: {
      fontSize: 11,
      color: colors.inkMuted,
      ...typography.label,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: (CONTAINER_WIDTH - 32) / 7,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellInner: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
    },
    cellSelected: { backgroundColor: colors.tomato },
    cellToday: { borderWidth: 1.5, borderColor: colors.forest },
    dayText: { fontSize: 13, color: colors.ink, fontWeight: '500' },
    dayTextSelected: { color: colors.background, fontWeight: '700' },
    dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
    
    // Draggable panel styles
    panelContainer: {
      position: 'absolute',
      bottom: 16,
      alignSelf: 'center',
      width: CONTAINER_WIDTH - 32,
      height: PANEL_HEIGHT,
      backgroundColor: colors.surface,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    panelHeader: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    panelHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    minimizedHeader: {
      height: MINIMIZED_HEIGHT - 21,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    expandedHeader: {
      height: MINIMIZED_HEIGHT - 21,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      position: 'relative',
    },
    dateLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.ink,
      textAlign: 'center',
    },
    summaryLabelCompact: {
      fontSize: 11,
      color: colors.inkMuted,
      marginTop: 2,
    },
    hintText: {
      fontSize: 9,
      color: colors.inkMuted,
      marginTop: 2,
      opacity: 0.7,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    panelCloseBtn: {
      position: 'absolute',
      top: -2,
      right: 12,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 10,
    },
    panelCloseText: { fontSize: 12, color: colors.ink, fontWeight: '700' },
    panelScroll: { flex: 1 },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      borderRadius: 16,
      backgroundColor: colors.background,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginVertical: 16,
      marginHorizontal: 16,
    },
    summaryCol: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, height: 28, backgroundColor: colors.border },
    summaryValue: { fontSize: 16, fontWeight: '700' },
    summaryLabel: { fontSize: 10, color: colors.inkMuted, marginTop: 2 },
    emptyText: { color: colors.inkMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.calendarContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Calendar</Text>
          <BackButton onPress={() => navigation.goBack()} />
        </View>

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week row */}
        <View style={styles.dowRow}>
          {DAYS_OF_WEEK.map((d) => (
            <View key={d} style={styles.dowCell}>
              <Text style={styles.dowLabel}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Compact calendar grid */}
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`blank-${idx}`} style={styles.cell} />;
            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEntries = entriesByDay[key] || [];
            const hasEntries = dayEntries.length > 0;
            const isSelected = key === selectedKey;
            const isToday = key === dateKey(today);

            return (
              <TouchableOpacity
                key={key}
                style={styles.cell}
                onPress={() => handleDayPress(key)}
              >
                <View style={[
                  styles.cellInner,
                  isSelected && styles.cellSelected,
                  isToday && !isSelected && styles.cellToday,
                ]}>
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                  ]}>
                    {day}
                  </Text>
                  {hasEntries && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? colors.background : colors.tomato }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Floating Draggable Overlay Panel */}
      {showPanel && (
        <Animated.View style={[styles.panelContainer, { transform: [{ translateY: translateYAnim }] }]}>
          <View style={styles.panelHeader} {...panResponder.panHandlers}>
            <View style={styles.panelHandle} />
            {isMinimized ? (
              <TouchableOpacity
                style={styles.minimizedHeader}
                activeOpacity={0.7}
                onPress={() => animateTo(SNAP_EXPANDED)}
              >
                <Text style={styles.dateLabel}>{selectedLabel}</Text>
                <Text style={styles.summaryLabelCompact}>
                  {selectedEntries.length === 0
                    ? 'No meals logged'
                    : `${selectedEntries.length} plate${selectedEntries.length > 1 ? 's' : ''} · ${selectedTotal} kcal`}
                </Text>
                <Text style={styles.hintText}>Tap to expand or drag up</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.expandedHeader}>
                <Text style={styles.dateLabel}>{selectedLabel}</Text>
                <TouchableOpacity style={styles.panelCloseBtn} onPress={handleClosePanel} activeOpacity={0.7}>
                  <Text style={styles.panelCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isMinimized && (
            <ScrollView style={styles.panelScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {selectedEntries.length === 0 ? (
                <Text style={styles.emptyText}>No meals logged.</Text>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCol}>
                      <Text style={[styles.summaryValue, { color: colors.tomato }]}>{selectedTotal}</Text>
                      <Text style={styles.summaryLabel}>kcal</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryCol}>
                      <Text style={[styles.summaryValue, { color: colors.tomato }]}>{selectedProtein}g</Text>
                      <Text style={styles.summaryLabel}>Protein</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryCol}>
                      <Text style={[styles.summaryValue, { color: colors.gold }]}>{selectedCarbs}g</Text>
                      <Text style={styles.summaryLabel}>Carbs</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryCol}>
                      <Text style={[styles.summaryValue, { color: colors.forest }]}>{selectedFat}g</Text>
                      <Text style={styles.summaryLabel}>Fat</Text>
                    </View>
                  </View>
                  <View style={{ paddingHorizontal: 16 }}>
                    {selectedEntries.map((entry) => (
                      <MealEntryRow
                        key={entry.id}
                        entry={entry}
                        entries={selectedEntries}
                        navigation={navigation}
                      />
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}