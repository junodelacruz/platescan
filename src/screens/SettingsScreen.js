import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Platform,
} from 'react-native';
import { getCalorieGoal, setCalorieGoal } from '../services/storageService';
import { triggerExport, getExportData } from '../services/exportService';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

const FONT = Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function SettingsScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [goalInput, setGoalInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [exported, setExported] = useState(false);

  useEffect(() => {
    getCalorieGoal().then((g) => setGoalInput(g.toString()));
  }, []);

  const handleSave = async () => {
    const parsed = parseInt(goalInput, 10);
    if (!goalInput || isNaN(parsed) || parsed < 500 || parsed > 10000) {
      setError('Please enter a value between 500 and 10,000.');
      return;
    }
    setError('');
    await setCalorieGoal(parsed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    try {
      const data = await getExportData();
      triggerExport(data);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (err) {
      setError('Export failed. Please try again.');
      console.error('export failed:', err);
    }
  };

  // Reusable section card style
  const card = {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  };

  const rowBase = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  };

  const rowLabel = {
    fontSize: 15,
    fontWeight: '400',
    color: colors.ink,
    fontFamily: FONT,
  };

  const sectionTitle = {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkMuted,
    fontFamily: FONT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: 6,
    marginTop: 20,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
        height: 56,
      }}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={{
          fontSize: 17,
          fontWeight: '500',
          color: colors.ink,
          fontFamily: FONT,
          position: 'absolute',
          left: 0, right: 0,
          textAlign: 'center',
        }}>
          Settings
        </Text>
        {/* spacer to balance the back button */}
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20 }}>

        {/* ── Appearance ─────────────────────────────── */}
        <Text style={sectionTitle}>Appearance</Text>
        <View style={card}>
          <View style={rowBase}>
            <Text style={rowLabel}>Dark Mode</Text>
            <Switch
              trackColor={{ false: colors.border, true: colors.tomato }}
              thumbColor={isDark ? colors.background : colors.inkMuted}
              ios_backgroundColor={colors.border}
              value={isDark}
              onValueChange={toggleTheme}
            />
          </View>
        </View>

        {/* ── Nutrition ─────────────────────────────── */}
        <Text style={sectionTitle}>Nutrition</Text>
        <View style={card}>
          <View style={[rowBase, { flexDirection: 'column', alignItems: 'flex-start', paddingBottom: 20 }]}>
            <Text style={rowLabel}>Daily Calorie Goal</Text>
            <Text style={{ fontSize: 12, color: colors.inkMuted, fontFamily: FONT, marginTop: 2, marginBottom: 16 }}>
              Set your target calorie intake per day.
            </Text>

            {/* Large editable goal number */}
            <View style={{ width: '100%', alignItems: 'center' }}>
              <TextInput
                style={{
                  fontSize: 52,
                  fontWeight: '300',
                  fontFamily: FONT,
                  color: colors.tomato,
                  textAlign: 'center',
                  minWidth: 160,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingBottom: 4,
                }}
                keyboardType="number-pad"
                value={goalInput}
                onChangeText={(text) => { setGoalInput(text); if (error) setError(''); }}
                placeholder="2000"
                placeholderTextColor={colors.inkMuted}
              />
              <Text style={{ fontSize: 12, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 }}>
                kcal / day
              </Text>
            </View>

            {error ? (
              <Text style={{ fontSize: 13, color: '#E05D44', fontFamily: FONT, marginTop: 10, textAlign: 'center', width: '100%' }}>
                {error}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={{
            marginTop: 8,
            backgroundColor: saved ? hexToRgba('#4E7C62', 0.15) : colors.tomato,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            borderWidth: saved ? 1 : 0,
            borderColor: saved ? '#4E7C62' : 'transparent',
          }}
          onPress={handleSave}
        >
          <Text style={{
            fontSize: 15,
            fontWeight: '500',
            fontFamily: FONT,
            color: saved ? '#4E7C62' : colors.background,
            letterSpacing: 0.3,
          }}>
            {saved ? '✓ Saved' : 'Save Goal'}
          </Text>
        </TouchableOpacity>

        {/* Export button */}
        <TouchableOpacity
          style={{
            marginTop: 8,
            backgroundColor: exported ? hexToRgba('#4E7C62', 0.15) : colors.tomato,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            borderWidth: exported ? 1 : 0,
            borderColor: exported ? '#4E7C62' : 'transparent',
          }}
          onPress={handleExport}
        >
          <Text style={{
            fontSize: 15,
            fontWeight: '500',
            fontFamily: FONT,
            color: exported ? '#4E7C62' : colors.background,
            letterSpacing: 0.3,
          }}>
            {exported ? '✓ Exported' : 'Export My Data'}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
