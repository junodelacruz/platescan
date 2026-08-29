import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import FileSystem from 'expo-file-system';
import { addFoodEntry } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';

export default function ResultScreen({ route, navigation }) {
  const { colors, typography, isDark } = useTheme();
  const { analysis, imageUri, imageBase64, description, initialDate } = route.params;
  const [items, setItems] = useState(analysis.items || []);

  const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  const MEAL_TYPE_COLORS = {
    Breakfast: isDark ? '#D9A441' : '#B8860B',
    Lunch: isDark ? '#4E7C62' : '#3D6B52',
    Dinner: isDark ? '#E05D44' : '#C0392B',
    Snack: '#7A6EA0',
  };

  function getDefaultMealType() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Breakfast';
    if (hour >= 11 && hour < 15) return 'Lunch';
    if (hour >= 15 && hour < 21) return 'Dinner';
    return 'Snack';
  }

  const [mealType, setMealType] = useState(getDefaultMealType());

  const total = items.reduce((sum, i) => sum + (Number(i.calories) || 0), 0);

  const updateCalories = (index, value) => {
    const next = [...items];
    next[index] = { ...next[index], calories: Number(value) || 0 };
    setItems(next);
  };

  const handleSave = async () => {
    try {
      const entryId = String(Date.now());
      let finalImageUri = imageUri;

      if (imageUri && Platform.OS !== 'web') {
        // Native: copy image from temp URI to persistent file storage
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
      } else if (imageUri && Platform.OS === 'web') {
        if (imageBase64) {
          // Fast path: base64 already available as route param
          finalImageUri = `data:image/jpeg;base64,${imageBase64}`;
        } else {
          // Fallback: fetch the blob: URL and convert to base64 data URI
          try {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            finalImageUri = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn('Failed to convert blob to base64:', e);
            finalImageUri = null; // save entry without image rather than with a dead blob URL
          }
        }
      }

      // Use initialDate from navigation params (selected date from dropdown), fallback to stored date, then today
      const timestamp = initialDate ? new Date(initialDate).getTime() : (async () => { const d = await AsyncStorage.getItem('platescan-selected-date'); return d ? new Date(d).getTime() : Date.now(); })();

      await addFoodEntry({
        id: entryId,
        timestamp: timestamp,
        imageUri: finalImageUri,
        label: items.map((i) => i.name).join(', ') || 'Plate',
        items,
        totalCalories: total,
        mealType,
        description: description || '',
      });
      navigation.popToTop();
    } catch (error) {
      console.error('handleSave error:', error);
      if (Platform.OS === 'web') {
        window.alert('Save failed: ' + error.message);
      } else {
        Alert.alert('Save failed', error.message);
      }
    }
  };

  const styles = {
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingBottom: 40 },
    title: { fontSize: 22, marginBottom: 16, color: colors.ink },
    image: { width: '100%', height: 200, borderRadius: 16, marginBottom: 20 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemName: { fontSize: 16, fontWeight: '600', color: colors.ink },
    itemMeta: { fontSize: 12, marginTop: 2, textTransform: 'capitalize', color: colors.inkMuted },
    calInput: {
      borderWidth: 1,
      borderRadius: 8,
      width: 64,
      textAlign: 'center',
      paddingVertical: 6,
      color: colors.ink,
      backgroundColor: colors.surface,
    },
    kcalLabel: { fontSize: 12, marginLeft: 6, color: colors.inkMuted },
    notes: { fontSize: 13, marginTop: 16, fontStyle: 'italic', color: colors.inkMuted },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 2,
      borderTopColor: colors.border,
    },
    totalLabel: { fontSize: 16, color: colors.ink },
    totalValue: { fontSize: 20, color: colors.ink },
    macroTotalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    macroTotalsValue: { fontSize: 13, color: colors.inkMuted },
    mealTypeHeading: {
      fontSize: 12,
      ...typography.label,
      marginTop: 28,
      marginBottom: 12,
      color: colors.ink,
    },
    mealTypePills: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    pill: {
      borderRadius: 24,
      borderWidth: 1.5,
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderColor: colors.border,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.ink,
    },
    pillTextActive: {
      color: '#FFFFFF',
    },
    saveButton: {
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      margin: 24,
    },
    saveButtonText: { fontSize: 16, letterSpacing: 1 },
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
              <Text style={[styles.itemMeta, { marginTop: 0, fontSize: 11 }]}>
                P: {Math.round(item.protein ?? 0)}g · C: {Math.round(item.carbs ?? 0)}g · F: {Math.round(item.fat ?? 0)}g
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

        <View style={styles.macroTotalsRow}>
          <Text style={styles.totalLabel}>Macros</Text>
          <Text style={styles.macroTotalsValue}>
            P: {Math.round(items.reduce((s, i) => s + (Number(i.protein) || 0), 0))}g · C:{' '}
            {Math.round(items.reduce((s, i) => s + (Number(i.carbs) || 0), 0))}g · F:{' '}
            {Math.round(items.reduce((s, i) => s + (Number(i.fat) || 0), 0))}g
          </Text>
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

      <TouchableOpacity style={{ ...styles.saveButton, backgroundColor: colors.forest }} onPress={handleSave}>
        <Text style={[styles.saveButtonText, { color: colors.ink }]}>Add to Plate</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}