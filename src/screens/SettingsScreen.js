import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors, typography } from '../theme';
import { getCalorieGoal, setCalorieGoal } from '../services/storageService';

export default function SettingsScreen({ navigation }) {
  const [goal, setGoal] = useState(1900);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCalorieGoal().then((g) => setGoal(g));
  }, []);

  const handleSave = async () => {
    if (goal < 500 || goal > 10000) {
      Alert.alert('Invalid', 'Please enter a value between 500 and 10000.');
      return;
    }
    await setCalorieGoal(goal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const adjust = (delta) => {
    setGoal((prev) => Math.max(500, Math.min(10000, prev + delta)));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Daily Calorie Goal</Text>

        <View style={styles.calorieDisplay}>
          <TouchableOpacity
            onPress={() => adjust(-50)}
            style={styles.adjustBtn}
          >
            <Text style={styles.adjustText}>−50</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => adjust(-10)}
            style={[styles.adjustBtn, styles.adjustBtnSmall]}
          >
            <Text style={styles.adjustText}>−10</Text>
          </TouchableOpacity>
          <Text style={styles.goalValue}>{goal}</Text>
          <TouchableOpacity
            onPress={() => adjust(10)}
            style={[styles.adjustBtn, styles.adjustBtnSmall]}
          >
            <Text style={styles.adjustText}>+10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => adjust(50)}
            style={styles.adjustBtn}
          >
            <Text style={styles.adjustText}>+50</Text>
          </TouchableOpacity>
        </View>

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
  backLink: { fontSize: 14, color: colors.forest, ...typography.label },

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  goalValue: {
    fontSize: 56,
    color: colors.ink,
    ...typography.display,
    minWidth: 140,
    textAlign: 'center',
  },
  adjustBtn: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  adjustText: {
    fontSize: 15,
    color: colors.gold,
    fontWeight: '600',
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