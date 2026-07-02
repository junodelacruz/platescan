import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors, typography } from '../theme';
import { getCalorieGoal, setCalorieGoal } from '../services/storageService';
import BackButton from '../components/BackButton';

export default function SettingsScreen({ navigation }) {
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.screenTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Daily Calorie Goal</Text>

        <View style={styles.calorieDisplay}>
          <TextInput
            style={styles.goalInput}
            keyboardType="number-pad"
            value={goalInput}
            onChangeText={(text) => {
              setGoalInput(text);
              if (error) setError('');
            }}
            placeholder="2000"
          />
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
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

const styles = StyleSheet.create({
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

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  label: {
    fontSize: 16,
    color: colors.inkMuted,
    marginBottom: 16,
    ...typography.label,
  },
  calorieDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  goalInput: {
    fontSize: 56,
    color: colors.ink,
    ...typography.display,
    minWidth: 140,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  errorText: {
    fontSize: 13,
    color: colors.tomato,
    textAlign: 'center',
    marginTop: 8,
    ...typography.label,
  },
  saveButton: {
    marginTop: 40,
    backgroundColor: colors.forest,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.ink,
    fontSize: 16,
    ...typography.label,
    letterSpacing: 1,
  },
});