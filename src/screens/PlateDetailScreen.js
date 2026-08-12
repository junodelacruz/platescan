import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, SafeAreaView,
  ActivityIndicator, TextInput, ScrollView, Platform,
} from 'react-native';
import { deleteFoodEntry, updateFoodEntry, loadImage } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

// Legacy meal type badge colors — kept for the small badge UI only.
// For main accents, use MEAL_TO_ACCENT with theme tokens via useTheme().
const MEAL_TYPE_COLORS = {
  Breakfast: '#D9A441',
  Lunch: '#4E7C62',
  Dinner: '#E05D44',
  Snack: '#7A6EA0',
};

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const FONT = Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined;

// Map meal types to theme color keys (if applicable) or use accent colors
const MEAL_TO_ACCENT = {
  Breakfast: 'gold',
  Lunch: 'forest',
  Dinner: 'tomato',
  Snack: 'tomato',
};

export default function PlateDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { entry, entries = [], index = 0 } = route.params;

  const [currentIndex, setCurrentIndex] = useState(index);

  const currentEntry = entries[currentIndex] || entry;

  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [displayCalories, setDisplayCalories] = useState(0);
  const [displayProtein, setDisplayProtein] = useState(0);
  const [displayCarbs, setDisplayCarbs] = useState(0);
  const [displayFat, setDisplayFat] = useState(0);

  // Per-item inline editing state: index of item being edited, or null
  const [editingIndex, setEditingIndex] = useState(null);
  // Draft values for the currently editing item
  const [draftCalories, setDraftCalories] = useState('');
  const [draftProtein, setDraftProtein] = useState('');
  const [draftCarbs, setDraftCarbs] = useState('');
  const [draftFat, setDraftFat] = useState('');
  const [draftGrams, setDraftGrams] = useState('');
  // Snapshot of items at the time editing started (for cancel/discard)
  const [savedItemsSnapshot, setSavedItemsSnapshot] = useState(null);

  useEffect(() => {
    setItems(currentEntry.items || []);
    setImageUri(null);
    setLoading(true);
    setEditingIndex(null);
  }, [currentIndex]);

  const label = currentEntry.label || currentEntry.name || 'Untitled';
  const mealColor = MEAL_TYPE_COLORS[currentEntry.mealType];
  const accentKey = MEAL_TO_ACCENT[currentEntry.mealType];
  const accentColor = accentKey ? colors[accentKey] : colors.ink;

  const scanTime = currentEntry.timestamp
    ? new Date(currentEntry.timestamp).toLocaleTimeString(undefined, {
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : null;

  const scanDate = currentEntry.timestamp
    ? new Date(currentEntry.timestamp).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : null;

  useEffect(() => {
    navigation.setOptions({ title: label });
  }, [navigation, label]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      if (currentEntry.id) {
        const uri = await loadImage(currentEntry.id);
        if (mounted) { setImageUri(uri || null); setLoading(false); }
      } else {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [currentEntry.id]);

  // Derive totals from the current items state (live, not from entry)
  const derivedCalories = Math.round(items.reduce((s, i) => s + (Number(i.calories) || 0), 0));
  const derivedProtein = Math.round(items.reduce((s, i) => s + (Number(i.protein) || 0), 0));
  const derivedCarbs = Math.round(items.reduce((s, i) => s + (Number(i.carbs) || 0), 0));
  const derivedFat = Math.round(items.reduce((s, i) => s + (Number(i.fat) || 0), 0));

  // Start editing an item row
  const handleStartEdit = (idx) => {
    const item = items[idx];
    setEditingIndex(idx);
    setDraftCalories(String(item.calories ?? ''));
    setDraftProtein(String(item.protein ?? ''));
    setDraftCarbs(String(item.carbs ?? ''));
    setDraftFat(String(item.fat ?? ''));
    setDraftGrams(item.estimatedGrams != null ? String(item.estimatedGrams) : '');
  };

  // Cancel editing and revert to snapshot
  const handleCancelEdit = () => {
    if (savedItemsSnapshot) {
      setItems(savedItemsSnapshot);
    }
    setEditingIndex(null);
    setSavedItemsSnapshot(null);
  };

  // Save the currently editing item
  const handleSaveItemEdit = async () => {
    // Ensure all committed values are whole numbers
    const cal = Math.round(Number(draftCalories) || 0);
    const pro = Math.round(Number(draftProtein) || 0);
    const carb = Math.round(Number(draftCarbs) || 0);
    const fat = Math.round(Number(draftFat) || 0);
    const grams = draftGrams !== '' ? Number(draftGrams) : null;

    const updated = items.map((item, i) => {
      if (i === editingIndex) {
        return { ...item, calories: cal, protein: pro, carbs: carb, fat: fat, estimatedGrams: grams };
      }
      return item;
    });

    // Save snapshot before committing (for cancel)
    setSavedItemsSnapshot(null);
    setItems(updated);
    setEditingIndex(null);

    // Persist to storage
    await updateFoodEntry(currentEntry.id, { items: updated });
  };

  // Commit all changes (save button) — already persisted per-item, this is a no-op
  // keeping it for UI consistency if needed in future

  const handleDelete = async () => {
    await deleteFoodEntry(currentEntry.id);
    navigation.goBack();
  };

  const handlePrevPlate = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextPlate = () => {
    if (currentIndex < entries.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < entries.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with navigation arrows */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}>
        <View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center' }}>
          <BackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ fontSize: 16, fontWeight: '600', color: colors.ink, fontFamily: FONT, flex: 1 }}
          >
            {label}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handlePrevPlate}
          disabled={!hasPrevious}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: hasPrevious ? colors.surface : colors.background,
            borderWidth: 1,
            borderColor: hasPrevious ? colors.border : colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
            flexShrink: 0,
          }}
          accessibilityLabel="Previous plate"
        >
          <Text style={{ color: hasPrevious ? colors.ink : colors.inkMuted, fontSize: 18, fontFamily: FONT }}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNextPlate}
          disabled={!hasNext}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: hasNext ? colors.surface : colors.background,
            borderWidth: 1,
            borderColor: hasNext ? colors.border : colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          accessibilityLabel="Next plate"
        >
          <Text style={{ color: hasNext ? colors.ink : colors.inkMuted, fontSize: 18, fontFamily: FONT }}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        {loading ? (
          <View style={{
            marginHorizontal: 16, marginTop: 8, borderRadius: 16, height: 200,
            backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
          }}>
            <ActivityIndicator size="large" color={colors.inkMuted} />
          </View>
        ) : imageUri ? (
          <View style={{
            marginHorizontal: 16, marginTop: 8, borderRadius: 16, overflow: 'hidden', height: 200,
          }}>
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        ) : (
          <View style={{
            marginHorizontal: 16, marginTop: 8, borderRadius: 16, height: 200,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
          }} />
        )}

        {/* Meal type badge + timestamp */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {currentEntry.mealType && mealColor ? (
              <View style={{
                borderRadius: 12,
                paddingHorizontal: 8, paddingVertical: 2,
                backgroundColor: hexToRgba(mealColor, 0.15),
                borderWidth: 1, borderColor: hexToRgba(mealColor, 0.35),
              }}>
                <Text style={{
                  fontSize: 10, fontWeight: '500', color: mealColor,
                  textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONT,
                }}>
                  {currentEntry.mealType}
                </Text>
              </View>
            ) : null}

            {scanDate || scanTime ? (
              <Text style={{ fontSize: 11, color: colors.inkMuted, fontFamily: FONT, marginTop: 2 }}>
                {scanDate}{scanTime ? ` · ${scanTime}` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Compact totals summary — derived from items */}
        <View style={{
          marginHorizontal: 16, marginTop: 12,
          backgroundColor: colors.surface,
          borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          paddingVertical: 10, paddingHorizontal: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '600', color: accentColor, fontFamily: FONT }}>
                {derivedCalories.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 9, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>
                Calories
              </Text>
            </View>
            <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.ink, fontFamily: FONT }}>{derivedProtein}g</Text>
              <Text style={{ fontSize: 9, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>Protein</Text>
            </View>
            <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.ink, fontFamily: FONT }}>{derivedCarbs}g</Text>
              <Text style={{ fontSize: 9, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>Carbs</Text>
            </View>
            <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.ink, fontFamily: FONT }}>{derivedFat}g</Text>
              <Text style={{ fontSize: 9, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Individual items list — inline editable */}
        {items.length > 0 && (
          <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Items ({items.length})
              </Text>
              {editingIndex !== null && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={handleSaveItemEdit}
                    accessibilityLabel="Save item edit"
                    style={{
                      backgroundColor: colors.forest,
                      borderRadius: 6,
                      paddingVertical: 3,
                      paddingHorizontal: 8,
                    }}
                  >
                    <Text style={{ color: colors.background, fontSize: 10, fontWeight: '500', fontFamily: FONT }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    accessibilityLabel="Cancel item edit"
                    style={{
                      borderRadius: 6,
                      paddingVertical: 3,
                      paddingHorizontal: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.inkMuted, fontSize: 10, fontFamily: FONT }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {items.map((item, idx) => {
              const itemCalories = Number(item.calories) || 0;
              const itemProtein = Number(item.protein) || 0;
              const itemCarbs = Number(item.carbs) || 0;
              const itemFat = Number(item.fat) || 0;
              const itemGrams = item.estimatedGrams ?? null;
              const isEditing = editingIndex === idx;

              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    paddingVertical: isEditing ? 10 : 8,
                    paddingHorizontal: 10,
                    backgroundColor: isEditing ? hexToRgba(accentColor, 0.08) : colors.surface,
                    borderRadius: 8,
                    marginBottom: idx < items.length - 1 ? 6 : 0,
                    borderWidth: 1,
                    borderColor: isEditing ? accentColor : colors.border,
                  }}
                >
                  {/* Row header: name + grams */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ fontSize: 13, fontWeight: '500', color: colors.ink, fontFamily: FONT }}
                      >
                        {item.name || 'Unknown'}
                      </Text>
                      {itemGrams != null && itemGrams > 0 && !isEditing && (
                        <Text style={{ fontSize: 10, color: colors.inkMuted, fontFamily: FONT, marginTop: 1 }}>
                          ~{Math.round(itemGrams)}g
                        </Text>
                      )}
                    </View>
                    {!isEditing && (
                      <TouchableOpacity
                        onPress={() => {
                          setSavedItemsSnapshot([...items]);
                          handleStartEdit(idx);
                        }}
                        accessibilityLabel={`Edit ${item.name || 'item'}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: hexToRgba(accentColor, 0.15),
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 8,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: accentColor, fontFamily: FONT, lineHeight: undefined }}>✎</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Display mode: show totals */}
                  {!isEditing && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                      <Text style={{ fontSize: 9, color: colors.inkMuted, fontFamily: FONT }}>
                        {itemCalories} cal · P:{itemProtein}g C:{itemCarbs}g F:{itemFat}g
                      </Text>
                    </View>
                  )}

                  {/* Edit mode: inline inputs */}
                  {isEditing && (
                    <View style={{ marginTop: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Cal', value: draftCalories, set: setDraftCalories, key: 'calories' },
                        { label: 'P(g)', value: draftProtein, set: setDraftProtein, key: 'protein' },
                        { label: 'C(g)', value: draftCarbs, set: setDraftCarbs, key: 'carbs' },
                        { label: 'F(g)', value: draftFat, set: setDraftFat, key: 'fat' },
                      ].map(({ label, value, set, key }) => (
                        <View key={key} style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 8, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</Text>
                          <TextInput
                            style={{
                              width: '100%', fontSize: 12, fontWeight: '400', fontFamily: FONT,
                              color: colors.ink, backgroundColor: colors.background,
                              borderWidth: 1, borderColor: colors.border,
                              borderRadius: 6, paddingVertical: 4, paddingHorizontal: 6,
                            }}
                            value={value}
                            onChangeText={set}
                            keyboardType="number-pad"
                            placeholder="0"
                          />
                        </View>
                      ))}
                      {/* Optional grams field */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 8, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Grams</Text>
                        <TextInput
                          style={{
                            width: '100%', fontSize: 12, fontWeight: '400', fontFamily: FONT,
                            color: colors.ink, backgroundColor: colors.background,
                            borderWidth: 1, borderColor: colors.border,
                            borderRadius: 6, paddingVertical: 4, paddingHorizontal: 6,
                          }}
                          value={draftGrams}
                          onChangeText={setDraftGrams}
                          keyboardType="number-pad"
                          placeholder="—"
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Note / description */}
        {currentEntry.description ? (
          <View style={{
            marginHorizontal: 16, marginTop: 12,
            backgroundColor: colors.surface, borderRadius: 10,
            borderWidth: 1, borderColor: colors.border, padding: 12,
          }}>
            <Text style={{ fontSize: 10, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Note
            </Text>
            <Text style={{ fontSize: 12, color: colors.ink, fontFamily: FONT }}>{currentEntry.description}</Text>
          </View>
        ) : null}


        {/* Delete button */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 20, justifyContent: 'center' }}>
          <TouchableOpacity
            style={{
              flex: 1, flexDirection: 'row', backgroundColor: hexToRgba(colors.tomato, 0.1), borderRadius: 10,
              paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: hexToRgba(colors.tomato, 0.3),
            }}
            onPress={handleDelete}
            accessibilityLabel="Delete plate"
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.tomato, fontFamily: FONT, marginRight: 4 }}>⊘</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.tomato, fontFamily: FONT }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}