import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Switch,
} from 'react-native';
import { getCalorieGoal, setCalorieGoal } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton'; 

export default function SettingsScreen({ navigation }) {
  const { colors, typography, isDark, toggleTheme } = useTheme();
  const [goalInput, setGoalInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCalorieGoal().then((g) => setGoalInput(g.toString()));
  }, []);

  const handleSave = async () => {
    const parsed = parseInt(goalInput, 10);
    if (!goalInput || isNaN(parsed) || parsed < 500 || parsed > 10000) {
      setError('Please enter a value between 500 and 10000.');
      return;
    }
    setError('');
    await setCalorieGoal(parsed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const styles = {
    safe: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 8,
    },
    screenTitle: { fontSize: 24 },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 40,
    },
    label: {
      fontSize: 16,
      marginBottom: 16,
    },
    calorieDisplay: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    goalInput: {
      fontSize: 56,
      ...typography.display,
      minWidth: 140,
      textAlign: 'center',
      borderBottomWidth: 1,
    },
    errorText: {
      fontSize: 13,
      textAlign: 'center',
      marginTop: 8,
    },
    saveButton: {
      marginTop: 40,
      backgroundColor: colors.forest,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
    },
    saveButtonText: {
      color: colors.white,
      fontSize: 16,
      letterSpacing: 1,
    },
  };

  // No changes needed - styles are already inside the component

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.screenTitle, { color: colors.ink }]}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={[styles.label, { color: colors.inkMuted }, { marginBottom: 0 }]}>Appearance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.ink, marginRight: 12 }}>{isDark ? 'Dark' : 'Light'}</Text>
            <Switch
              trackColor={{ false: colors.border, true: colors.tomato }}
              thumbColor={colors.ink}
              value={isDark}
              onValueChange={toggleTheme}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.inkMuted }]}>Daily Calorie Goal</Text>

        <View style={styles.calorieDisplay}>
          <TextInput
            style={[styles.goalInput, { color: colors.ink }]}
            keyboardType="number-pad"
            value={goalInput}
            onChangeText={(text) => {
              setGoalInput(text);
              if (error) setError('');
            }}
            placeholder="2000"
            placeholderTextColor={colors.inkMuted}
          />
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: colors.tomato }]}>{error}</Text>
        ) : null}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {saved ? '✓ Saved' : 'Save Goal'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
