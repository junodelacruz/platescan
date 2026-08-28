import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import Svg, { Polyline, Polygon, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { getWeights, saveWeight, deleteWeightEntry } from '../services/storageService';

const FONT = Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return formatDateKey(new Date());
}

function getRelativeDateKey(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatDateKey(d);
}

function formatDisplayDate(dateStr) {
  const tKey = todayKey();
  const yKey = getRelativeDateKey(1);
  if (dateStr === tKey) return 'Today';
  if (dateStr === yKey) return 'Yesterday';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return dateStr;
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────
function WeightChart({ data, accentColor, borderColor, inkMuted, isDark }) {
  const W = 340;
  const H = 150;
  const PAD = { top: 18, right: 20, bottom: 28, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  if (data.length < 2) {
    return (
      <View style={{ width: '100%', height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: inkMuted, fontSize: 13, fontFamily: FONT }}>
          Log at least 2 entries to see your trend
        </Text>
      </View>
    );
  }

  const weights = data.map(d => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const toX = (i) => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = (w) => PAD.top + chartH - ((w - minW) / range) * chartH;

  const points = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.weight).toFixed(1)}`).join(' ');
  const areaPoints = `${toX(0).toFixed(1)},${PAD.top + chartH} ` + points + ` ${toX(data.length - 1).toFixed(1)},${PAD.top + chartH}`;

  // Y-axis labels: min, mid, max
  const midW = Number(((minW + maxW) / 2).toFixed(1));
  const yLabels = [
    { v: maxW, y: toY(maxW) },
    { v: midW, y: toY(midW) },
    { v: minW, y: toY(minW) },
  ];

  // X-axis: first and last date labels
  const firstDate = formatDisplayDate(data[0].date);
  const lastDate = formatDisplayDate(data[data.length - 1].date);
  const xLabels = [
    { label: firstDate, x: toX(0), anchor: 'start' },
    { label: lastDate, x: toX(data.length - 1), anchor: 'end' },
  ];

  const lastIndex = data.length - 1;

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={accentColor} stopOpacity={isDark ? "0.35" : "0.18"} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yLabels.map(({ y }, i) => (
          <Line
            key={i}
            x1={PAD.left}
            y1={y}
            x2={W - PAD.right}
            y2={y}
            stroke={borderColor}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map(({ v, y }, i) => (
          <SvgText
            key={i}
            x={PAD.left - 6}
            y={y + 3.5}
            fontSize={9.5}
            fill={inkMuted}
            textAnchor="end"
            fontFamily={FONT}
          >
            {v}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xLabels.map(({ label, x, anchor }, i) => (
          <SvgText
            key={i}
            x={x}
            y={H - 6}
            fontSize={10}
            fill={inkMuted}
            textAnchor={anchor}
            fontFamily={FONT}
          >
            {label}
          </SvgText>
        ))}

        {/* Gradient fill under line */}
        <Polygon points={areaPoints} fill="url(#weightAreaGrad)" />

        {/* Sparkline */}
        <Polyline
          points={points}
          fill="none"
          stroke={accentColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const isLatest = i === lastIndex;
          return (
            <React.Fragment key={i}>
              {isLatest && (
                <Circle
                  cx={toX(i)}
                  cy={toY(d.weight)}
                  r={6}
                  fill={accentColor}
                  opacity={0.3}
                />
              )}
              <Circle
                cx={toX(i)}
                cy={toY(d.weight)}
                r={isLatest ? 3.5 : 2.5}
                fill={accentColor}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WeightTrackerScreen() {
  const { colors, typography, isDark } = useTheme();
  const [log, setLog] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey());
  const [saved, setSaved] = useState(false);
  const [range, setRange] = useState(30); // 7, 30, 90
  const [isLoading, setIsLoading] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editWeightValue, setEditWeightValue] = useState('');
  const [isEditSaving, setIsEditSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const apiData = await getWeights();
      // Convert API entries { id, timestamp, weight } → { date: 'YYYY-MM-DD', weight, id }
      const entries = apiData.map(item => ({
        date: new Date(item.timestamp).toISOString().slice(0, 10),
        weight: item.weight,
        id: item.id ?? item._id
      }));
      entries.sort((a, b) => a.date.localeCompare(b.date));
      setLog(entries);

      // Pre-fill input if selected date already has a logged entry
      const existing = entries.find(e => e.date === selectedDateKey);
      if (existing) {
        setInputValue(String(existing.weight));
      }
    } catch (err) {
      console.warn('refresh weight data failed:', err);
    }
  }, [selectedDateKey]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleSelectQuickDate = (dateKey) => {
    setSelectedDateKey(dateKey);
    const existing = log.find(e => e.date === dateKey);
    if (existing) {
      setInputValue(String(existing.weight));
    } else {
      setInputValue('');
    }
  };

  const handleLog = async () => {
    if (isLoading) return;
    const weight = parseFloat(inputValue);
    if (isNaN(weight) || weight < 50 || weight > 700) return;

    setIsLoading(true);
    try {
      await saveWeight({ date: selectedDateKey + 'T12:00:00', weight });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await refresh();
    } catch (err) {
      console.warn('saveWeight failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Inline edit handler
  const handleStartEdit = (entry) => {
    setEditingId(entry.id);
    setEditWeightValue(String(entry.weight));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditWeightValue('');
  };

  const handleSaveEdit = async (entry) => {
    if (isEditSaving) return;
    const newWeight = parseFloat(editWeightValue);
    if (isNaN(newWeight) || newWeight < 50 || newWeight > 700) return;

    setIsEditSaving(true);
    try {
      await saveWeight({ date: entry.date + 'T12:00:00', weight: newWeight });
      setEditingId(null);
      await refresh();
    } catch (err) {
      console.warn('inline edit saveWeight failed:', err);
    } finally {
      setIsEditSaving(false);
    }
  };

  // Delete entry
  const handleDelete = async (id) => {
    try {
      await deleteWeightEntry(id);
      await refresh();
    } catch (err) {
      console.error('Failed to delete weight entry:', err);
    }
  };

  // Filter by range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);
  const cutoffKey = formatDateKey(cutoff);
  const chartData = log.filter(e => e.date >= cutoffKey);

  const latest = log.length > 0 ? log[log.length - 1] : null;
  const prev = log.length > 1 ? log[log.length - 2] : null;
  const delta = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;

  const card = {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : colors.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: isDark ? '#000000' : '#4A3B32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  };

  const sectionTitle = {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkMuted,
    fontFamily: FONT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 18,
  };

  const quickDates = [
    { label: 'Today', key: todayKey() },
    { label: 'Yesterday', key: getRelativeDateKey(1) },
    { label: '2 Days Ago', key: getRelativeDateKey(2) },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '300', color: colors.ink, fontFamily: FONT }}>
          Weight Tracker
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Summary stat card ── */}
        {latest && (
          <View style={[card, { flexDirection: 'row', alignItems: 'center', marginTop: 12 }]}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 38, fontWeight: '200', color: colors.tomato, fontFamily: FONT }}>
                {latest.weight}
              </Text>
              <Text style={{ fontSize: 11, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 }}>
                lbs — current ({formatDisplayDate(latest.date)})
              </Text>
            </View>
            {delta !== null && (
              <>
                <View style={{ width: 1, height: 48, backgroundColor: colors.border }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 28, fontWeight: '300', fontFamily: FONT,
                    color: parseFloat(delta) < 0 ? '#4E7C62' : parseFloat(delta) > 0 ? '#E05D44' : colors.inkMuted,
                  }}>
                    {parseFloat(delta) > 0 ? '+' : ''}{delta}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 }}>
                    since last entry
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Log Weight card ── */}
        <Text style={sectionTitle}>Log Weight</Text>
        <View style={card}>
          {/* Quick Date Shortcuts */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {quickDates.map((item) => {
              const isSelected = selectedDateKey === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handleSelectQuickDate(item.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 12,
                    backgroundColor: isSelected ? (isDark ? 'rgba(255,255,255,0.1)' : hexToRgba(colors.tomato, 0.15)) : colors.background,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.tomato : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: isSelected ? '600' : '400',
                    fontFamily: FONT,
                    color: isSelected ? colors.tomato : colors.inkMuted,
                  }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 12, color: colors.inkMuted, fontFamily: FONT, marginBottom: 12, textAlign: 'center' }}>
            Logging for <Text style={{ color: colors.ink, fontWeight: '500' }}>{formatDisplayDate(selectedDateKey)}</Text>
          </Text>

          <TextInput
            style={{
              width: '100%',
              fontSize: 26,
              fontWeight: '300',
              fontFamily: FONT,
              color: colors.ink,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 12,
              textAlign: 'center',
              marginBottom: 10,
            }}
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="decimal-pad"
            placeholder="175.0"
            placeholderTextColor={colors.inkMuted}
          />

          <TouchableOpacity
            style={{
              width: '100%',
              backgroundColor: saved ? hexToRgba('#4E7C62', 0.2) : colors.tomato,
              borderRadius: 14,
              paddingVertical: 13,
              borderWidth: saved ? 1 : 0,
              borderColor: saved ? '#4E7C62' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: isLoading ? 0.7 : 1,
            }}
            onPress={handleLog}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                fontFamily: FONT,
                color: saved ? '#4E7C62' : colors.background,
              }}>
                {saved ? '✓ Logged' : 'Log Weight'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Trend Chart ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
          <Text style={[sectionTitle, { marginTop: 0, marginBottom: 0 }]}>Trend</Text>

          {/* Range selector */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[7, 30, 90].map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setRange(r)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16,
                  backgroundColor: range === r ? colors.tomato : colors.surface,
                  borderWidth: 1,
                  borderColor: range === r ? colors.tomato : colors.border,
                }}
              >
                <Text style={{
                  fontSize: 11, fontWeight: range === r ? '600' : '400', fontFamily: FONT,
                  color: range === r ? colors.background : colors.inkMuted,
                }}>
                  {r}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[card, { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 14 }]}>
          <WeightChart
            data={chartData}
            accentColor={colors.tomato}
            borderColor={colors.border}
            inkMuted={colors.inkMuted}
            isDark={isDark}
          />
        </View>

        {/* ── Recent entries list ── */}
        {log.length > 0 && (
          <>
            <Text style={sectionTitle}>History</Text>
            <View style={[card, { padding: 0 }]}>
              {[...log].reverse().slice(0, 15).map((entry, i, arr) => {
                const isEditing = editingId === entry.id;

                return (
                  <View
                    key={entry.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: isEditing ? 8 : 13,
                      borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    {/* Date label */}
                    <Text style={{ fontSize: 14, color: colors.inkMuted, fontFamily: FONT, minWidth: 80 }}>
                      {formatDisplayDate(entry.date)}
                    </Text>

                    {/* Weight / Inline Edit */}
                    {isEditing ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          style={{
                            fontSize: 15,
                            fontFamily: FONT,
                            color: colors.ink,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.tomato,
                            borderRadius: 8,
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            width: 72,
                            textAlign: 'center',
                          }}
                          value={editWeightValue}
                          onChangeText={setEditWeightValue}
                          keyboardType="decimal-pad"
                          autoFocus
                        />
                        <Text style={{ fontSize: 12, color: colors.inkMuted, fontFamily: FONT }}>lbs</Text>

                        {/* Save Edit Button */}
                        <TouchableOpacity
                          onPress={() => handleSaveEdit(entry)}
                          disabled={isEditSaving}
                          style={{
                            backgroundColor: colors.tomato,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            marginLeft: 4,
                          }}
                        >
                          {isEditSaving ? (
                            <ActivityIndicator size="small" color={colors.background} />
                          ) : (
                            <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>✓</Text>
                          )}
                        </TouchableOpacity>

                        {/* Cancel Edit Button */}
                        <TouchableOpacity
                          onPress={handleCancelEdit}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text style={{ color: colors.inkMuted, fontSize: 12 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* Tap to edit weight */}
                        <TouchableOpacity
                          onPress={() => handleStartEdit(entry)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 2,
                            paddingHorizontal: 6,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '400', color: colors.ink, fontFamily: FONT }}>
                            {entry.weight} <Text style={{ fontSize: 12, color: colors.inkMuted }}>lbs</Text>
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.inkMuted, marginLeft: 6, opacity: 0.7 }}>✎</Text>
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity
                          onPress={() => handleDelete(entry.id)}
                          style={{ marginLeft: 14, padding: 6 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={{ fontSize: 14, color: colors.inkMuted, opacity: 0.8 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}