import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import FileSystem from 'expo-file-system';
import { addFoodEntry } from '../services/storageService';
import { colors, typography } from '../theme';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const MEAL_TYPE_COLORS = {
  Breakfast: '#D9A441', // gold — morning warmth
  Lunch: '#4E7C62', // forest — midday
  Dinner: '#E05D44', // tomato — evening
  Snack: '#7A6EA0', // soft purple — in-between
};

function getDefaultMealType() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 15) return 'Lunch';
  if (hour >= 15 && hour < 21) return 'Dinner';
  return 'Snack';
}

export default function ResultScreen({ route, navigation }) {
  const { analysis, imageUri } = route.params;
  const [items, setItems] = useState(analysis.items || []);
  const [mealType, setMealType] = useState(getDefaultMealType());

  const total = items.reduce((sum, i) => sum + (Number(i.calories) || 0), 0);

  const updateCalories = (index, value) => {
    const next = [...items];
    next[index] = { ...next[index], calories: Number(value) || 0 };
    setItems(next);
  };

  const handleSave = async () => {
    const entryId = String(Date.now());
    let finalImageUri = imageUri;

    // Copy image from temp URI to persistent storage (native only — web doesn't need this)
    if (imageUri && Platform.OS !== 'web') {
      try {
        const platesDir = `${FileSystem.documentDirectory}plates/`;
        const exists = (await FileSystem.getInfoAsync(platesDir)).exists;
        if (!exists) {
          await FileSystem.makeDirectoryAsync(platesDir, { intermediates: true });
        }
        const destUri = `${platesDir}${entryId}.jpg`;
        await FileSystem.copyAsync({ from: imageUri, to: destUri });
        finalImageUri = destUri;
      } catch (e) {
        console.warn('Failed to persist image:', e);
      }
    }

    await addFoodEntry({
      id: entryId,
      timestamp: Date.now(),
      imageUri: finalImageUri,
      label: items.map((i) => i.name).join(', ') || 'Plate',
      items,
      totalCalories: total,
      mealType,
    });
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Here's What I See</Text>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

        {items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.estimatedGrams ? `${item.estimatedGrams}g · ` : ''}
                confidence: {item.confidence || 'medium'}
              </Text>
            </View>
            <TextInput
              style={styles.calInput}
              keyboardType="number-pad"
              value={String(item.calories ?? 0)}
              onChangeText={(v) => updateCalories(idx, v)}
            />
            <Text style={styles.kcalLabel}>kcal</Text>
          </View>
        ))}

        {analysis.notes ? <Text style={styles.notes}>{analysis.notes}</Text> : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total} kcal</Text>
        </View>

        {/* Meal type selector */}
        <Text style={styles.mealTypeHeading}>Meal Type</Text>
        <View style={styles.mealTypePills}>
          {MEAL_TYPES.map((type) => {
            const active = mealType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pill,
                  active && { backgroundColor: MEAL_TYPE_COLORS[type], borderColor: MEAL_TYPE_COLORS[type] },
                ]}
                onPress={() => setMealType(type)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Add to Today's Plate</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, color: colors.ink, ...typography.display, marginBottom: 16 },
  image: { width: '100%', height: 200, borderRadius: 16, marginBottom: 20 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { fontSize: 16, color: colors.ink, fontWeight: '600' },
  itemMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 2, textTransform: 'capitalize' },
  calInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    width: 64,
    textAlign: 'center',
    paddingVertical: 6,
    color: colors.ink,
    backgroundColor: colors.surface,
    marginLeft: 8,
  },
  kcalLabel: { fontSize: 12, color: colors.inkMuted, marginLeft: 6 },
  notes: { fontSize: 13, color: colors.inkMuted, marginTop: 16, fontStyle: 'italic' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 16, color: colors.ink, ...typography.label },
  totalValue: { fontSize: 20, color: colors.tomato, ...typography.display },
  mealTypeHeading: {
    fontSize: 12,
    color: colors.inkMuted,
    ...typography.label,
    marginTop: 28,
    marginBottom: 12,
  },
  mealTypePills: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pill: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  pillText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.background,
  },
  saveButton: {
    backgroundColor: colors.forest,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    margin: 24,
  },
  saveButtonText: { color: colors.ink, fontSize: 16, ...typography.label, letterSpacing: 1 },
});
