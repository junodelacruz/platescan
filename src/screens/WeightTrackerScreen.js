import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Platform,
} from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { getWeights, saveWeight } from '../services/storageService';

const FONT = Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────
function WeightChart({ data, accentColor, borderColor, inkMuted }) {
  const W = 340;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  if (data.length < 2) {
    return (
      <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: inkMuted, fontSize: 13, fontFamily: FONT }}>
          Log at least 2 entries to see the chart
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

  const points = data.map((d, i) => `${toX(i)},${toY(d.weight)}`).join(' ');

  // Y-axis labels: min, mid, max
  const yLabels = [
    { v: minW, y: toY(minW) },
    { v: Math.round((minW + maxW) / 2), y: toY((minW + maxW) / 2) },
    { v: maxW, y: toY(maxW) },
  ];

  // X-axis: first and last date labels
  const xLabels = [
    { label: data[0].date.slice(5), x: toX(0) },
    { label: data[data.length - 1].date.slice(5), x: toX(data.length - 1) },
  ];

  return (
    <Svg width={W} height={H}>
      {/* Grid lines */}
      {yLabels.map(({ y }, i) => (
        <Line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
          stroke={borderColor} strokeWidth={1} strokeDasharray="4 4" />
      ))}

      {/* Y-axis labels */}
      {yLabels.map(({ v, y }, i) => (
        <SvgText key={i} x={PAD.left - 6} y={y + 4} fontSize={10}
          fill={inkMuted} textAnchor="end" fontFamily={FONT}>
          {v}
        </SvgText>
      ))}

      {/* X-axis labels */}
      {xLabels.map(({ label, x }, i) => (
        <SvgText key={i} x={x} y={H - 4} fontSize={10}
          fill={inkMuted} textAnchor="middle" fontFamily={FONT}>
          {label}
        </SvgText>
      ))}

      {/* Line */}
      <Polyline points={points} fill="none" stroke={accentColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {data.map((d, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(d.weight)} r={3}
          fill={accentColor} />
      ))}
    </Svg>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WeightTrackerScreen() {
  const { colors } = useTheme();
  const [log, setLog] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [saved, setSaved] = useState(false);
  const [range, setRange] = useState(30); // 7, 30, 90

  const refresh = useCallback(async () => {
    try {
      const apiData = await getWeights();
      // Convert API entries { id, timestamp, weight } → { date: 'YYYY-MM-DD', weight }
      const entries = apiData.map(item => ({
        date: new Date(item.timestamp).toISOString().slice(0, 10),
        weight: item.weight,
      }));
      entries.sort((a, b) => a.date.localeCompare(b.date));
      setLog(entries);
      // Pre-fill today's input if already logged
      const today = entries.find(e => e.date === todayKey());
      if (today) setInputValue(String(today.weight));
    } catch (err) {
      console.warn('refresh weight data failed:', err);
      // Leave existing state intact — don't blank the screen
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleLog = async () => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num < 50 || num > 700) return;
    try {
      await saveWeight({ date: todayKey(), weight: num });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Reload canonical list from server
      await refresh();
    } catch (err) {
      console.warn('saveWeight failed:', err);
    }
  };

  // Filter by range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  const chartData = log.filter(e => e.date >= cutoffKey);

  const latest = log.length > 0 ? log[log.length - 1] : null;
  const prev = log.length > 1 ? log[log.length - 2] : null;
  const delta = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;

  const card = {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  };

  const sectionTitle = {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkMuted,
    fontFamily: FONT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '300', color: colors.ink, fontFamily: FONT }}>
          Weight Tracker
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Summary stat ── */}
        {latest && (
          <View style={[card, { flexDirection: 'row', alignItems: 'center', marginTop: 12 }]}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, fontWeight: '200', color: colors.tomato, fontFamily: FONT }}>
                {latest.weight}
              </Text>
              <Text style={{ fontSize: 11, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 }}>
                lbs — current
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

        {/* ── Log today's weight ── */}
        <Text style={sectionTitle}>Log Today</Text>
        <View style={card}>
          <Text style={{ fontSize: 12, color: colors.inkMuted, fontFamily: FONT, marginBottom: 12 }}>
            Enter your weight in lbs for {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.
          </Text>
          <TextInput
            style={{
              width: '100%',
              fontSize: 24,
              fontWeight: '300',
              fontFamily: FONT,
              color: colors.ink,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 12,
              textAlign: 'center',
              marginBottom: 8,
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
              backgroundColor: saved ? hexToRgba('#4E7C62', 0.15) : colors.tomato,
              borderRadius: 12,
              paddingVertical: 12,
              borderWidth: saved ? 1 : 0,
              borderColor: saved ? '#4E7C62' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={handleLog}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              fontFamily: FONT,
              color: saved ? '#4E7C62' : colors.background,
            }}>
              {saved ? '✓ Logged' : 'Log'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Chart ── */}
        <Text style={sectionTitle}>Trend</Text>

        {/* Range selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[7, 30, 90].map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: range === r ? colors.tomato : colors.surface,
                borderWidth: 1,
                borderColor: range === r ? colors.tomato : colors.border,
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: '500', fontFamily: FONT,
                color: range === r ? colors.background : colors.inkMuted,
              }}>
                {r}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[card, { alignItems: 'center', paddingHorizontal: 8 }]}>
          <WeightChart
            data={chartData}
            accentColor={colors.tomato}
            borderColor={colors.border}
            inkMuted={colors.inkMuted}
          />
        </View>

        {/* ── Recent entries list ── */}
        {log.length > 0 && (
          <>
            <Text style={sectionTitle}>History</Text>
            <View style={[card, { padding: 0, overflow: 'hidden' }]}>
              {[...log].reverse().slice(0, 10).map((entry, i, arr) => (
                <View key={entry.date} style={{
                  flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 13,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}>
                  <Text style={{ fontSize: 14, color: colors.inkMuted, fontFamily: FONT }}>
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '400', color: colors.ink, fontFamily: FONT }}>
                    {entry.weight} <Text style={{ fontSize: 12, color: colors.inkMuted }}>lbs</Text>
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
