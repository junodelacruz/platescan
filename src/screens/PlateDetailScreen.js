import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, SafeAreaView,
  ActivityIndicator, TextInput, ScrollView, Platform,
  PanResponder, Animated, Easing, Dimensions,
} from 'react-native';
import { deleteFoodEntry, updateFoodEntry, loadImage } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

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

export default function PlateDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { entry, entries = [], index = 0 } = route.params;

  const [currentIndex, setCurrentIndex] = useState(index);
  const currentIndexRef = useRef(index);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const currentEntry = entries[currentIndex] || entry;

  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [displayCalories, setDisplayCalories] = useState(0);
  const [displayProtein, setDisplayProtein] = useState(0);
  const [displayCarbs, setDisplayCarbs] = useState(0);
  const [displayFat, setDisplayFat] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [draftCalories, setDraftCalories] = useState('');
  const [draftProtein, setDraftProtein] = useState('');
  const [draftCarbs, setDraftCarbs] = useState('');
  const [draftFat, setDraftFat] = useState('');

  useEffect(() => {
    setItems(currentEntry.items || []);
    setDisplayCalories(currentEntry.totalCalories ?? 0);
    setDisplayProtein(Math.round(currentEntry.items?.reduce((s, i) => s + (Number(i.protein) || 0), 0) ?? 0));
    setDisplayCarbs(Math.round(currentEntry.items?.reduce((s, i) => s + (Number(i.carbs) || 0), 0) ?? 0));
    setDisplayFat(Math.round(currentEntry.items?.reduce((s, i) => s + (Number(i.fat) || 0), 0) ?? 0));
    setImageUri(null);
    setLoading(true);
    setEditOpen(false);
  }, [currentIndex]);

  const label = currentEntry.label || currentEntry.name || 'Untitled';
  const mealColor = MEAL_TYPE_COLORS[currentEntry.mealType];

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

  const oldTotalForMacro = (macro) =>
    currentEntry.items?.reduce((s, i) => s + (Number(i[macro]) || 0), 0) ?? 0;

  const handleOpenEdit = () => {
    setDraftCalories(String(currentEntry.totalCalories ?? 0));
    setDraftProtein(String(Math.round(currentEntry.items?.reduce((s, i) => s + (Number(i.protein) || 0), 0) ?? 0)));
    setDraftCarbs(String(Math.round(currentEntry.items?.reduce((s, i) => s + (Number(i.carbs) || 0), 0) ?? 0)));
    setDraftFat(String(Math.round(currentEntry.items?.reduce((s, i) => s + (Number(i.fat) || 0), 0) ?? 0)));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const newCalories = Number(draftCalories) || 0;
    const newProtein = Number(draftProtein) || 0;
    const newCarbs = Number(draftCarbs) || 0;
    const newFat = Number(draftFat) || 0;

    const updatedItems = items.map(i => ({
      ...i,
      protein: oldTotalForMacro('protein') > 0
        ? Math.round((Number(i.protein) || 0) / oldTotalForMacro('protein') * newProtein)
        : Math.round(newProtein / (items.length || 1)),
      carbs: oldTotalForMacro('carbs') > 0
        ? Math.round((Number(i.carbs) || 0) / oldTotalForMacro('carbs') * newCarbs)
        : Math.round(newCarbs / (items.length || 1)),
      fat: oldTotalForMacro('fat') > 0
        ? Math.round((Number(i.fat) || 0) / oldTotalForMacro('fat') * newFat)
        : Math.round(newFat / (items.length || 1)),
    }));

    await updateFoodEntry(currentEntry.id, { totalCalories: newCalories, items: updatedItems });
    setDisplayCalories(newCalories);
    setDisplayProtein(newProtein);
    setDisplayCarbs(newCarbs);
    setDisplayFat(newFat);
    setItems(updatedItems);
    setEditOpen(false);
  };

  const handleDelete = async () => {
    await deleteFoodEntry(currentEntry.id);
    navigation.goBack();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const idx = currentIndexRef.current;
        const screenHeight = Dimensions.get('window').height;

        if (gestureState.dy < -50 && idx < entries.length - 1) {
          // Swipe up → next plate
          Animated.timing(slideAnim, {
            toValue: -screenHeight,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            slideAnim.setValue(screenHeight);
            setCurrentIndex(idx + 1);
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 280,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }).start();
          });
        } else if (gestureState.dy > 50 && idx > 0) {
          // Swipe down → previous plate
          Animated.timing(slideAnim, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            slideAnim.setValue(-screenHeight);
            setCurrentIndex(idx - 1);
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 280,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }).start();
          });
        }
      },
    })
  ).current;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < entries.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Swipe indicator — top (previous plate) */}
      {hasPrevious && (
        <View style={{
          alignItems: 'center',
          paddingTop: 4,
          paddingBottom: 2,
        }}>
          <Text style={{
            fontSize: 11,
            color: colors.inkMuted,
            fontFamily: FONT,
          }}>↑ previous</Text>
        </View>
      )}

      {/* Swipe area — header/image only */}
      <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
        <View {...panResponder.panHandlers}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 8,
        }}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Hero image */}
          {loading ? (
            <View style={{
              marginHorizontal: 20, marginTop: 4, borderRadius: 20, height: 240,
              backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
            }}>
              <ActivityIndicator size="large" color={colors.inkMuted} />
            </View>
          ) : imageUri ? (
            <View style={{
              marginHorizontal: 20, marginTop: 4, borderRadius: 20, overflow: 'hidden', height: 240,
            }}>
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : (
            <View style={{
              marginHorizontal: 20, marginTop: 4, borderRadius: 20, height: 240,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
            }} />
          )}

          {/* Name + timestamp + meal badge */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <Text style={{ fontSize: 22, fontWeight: '500', color: colors.ink, fontFamily: FONT, flexShrink: 1 }}>
                {label}
              </Text>
              {currentEntry.mealType && mealColor ? (
                <View style={{
                  borderRadius: 20,
                  paddingHorizontal: 10, paddingVertical: 3,
                  backgroundColor: hexToRgba(mealColor, 0.15),
                  borderWidth: 1, borderColor: hexToRgba(mealColor, 0.35),
                }}>
                  <Text style={{
                    fontSize: 10, fontWeight: '500', color: mealColor,
                    textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONT,
                  }}>
                    {currentEntry.mealType}
                  </Text>
                </View>
              ) : null}
            </View>

            {scanDate || scanTime ? (
              <Text style={{ fontSize: 12, color: colors.inkMuted, fontFamily: FONT }}>
                {scanDate}{scanTime ? ` · ${scanTime}` : ''}
              </Text>
            ) : null}
          </View>

          {/* Calorie + macro summary card */}
          <View style={{
            marginHorizontal: 20, marginTop: 16,
            backgroundColor: colors.surface,
            borderRadius: 16, borderWidth: 1, borderColor: colors.border,
            padding: 16,
          }}>
            {/* Big calorie number */}
            <View style={{ alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 42, fontWeight: '300', color: colors.tomato, fontFamily: FONT, letterSpacing: -1 }}>
                {displayCalories.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 }}>
                calories
              </Text>
            </View>

            {/* Three macro columns */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '300', color: colors.tomato, fontFamily: FONT }}>{displayProtein}g</Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>Protein</Text>
              </View>
              <View style={{ width: 1, height: 36, backgroundColor: colors.border }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '300', color: '#D9A441', fontFamily: FONT }}>{displayCarbs}g</Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>Carbs</Text>
              </View>
              <View style={{ width: 1, height: 36, backgroundColor: colors.border }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '300', color: '#E05D44', fontFamily: FONT }}>{displayFat}g</Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>Fat</Text>
              </View>
            </View>
          </View>

          {/* Note / description */}
          {currentEntry.description ? (
            <View style={{
              marginHorizontal: 20, marginTop: 12,
              backgroundColor: colors.surface, borderRadius: 12,
              borderWidth: 1, borderColor: colors.border, padding: 14,
            }}>
              <Text style={{ fontSize: 11, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Note
              </Text>
              <Text style={{ fontSize: 13, color: colors.ink, fontFamily: FONT }}>{currentEntry.description}</Text>
            </View>
          ) : null}

          {/* Edit panel */}
          {editOpen && (
            <View style={{
              marginHorizontal: 20, marginTop: 12,
              backgroundColor: colors.surface, borderRadius: 16,
              borderWidth: 1, borderColor: colors.border, padding: 16,
            }}>
              <Text style={{ fontSize: 13, color: colors.inkMuted, fontFamily: FONT, marginBottom: 12 }}>
                Edit values — changes are proportionally distributed across items.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: 'Calories', val: draftCalories, set: setDraftCalories },
                  { label: 'Protein', val: draftProtein, set: setDraftProtein },
                  { label: 'Carbs', val: draftCarbs, set: setDraftCarbs },
                  { label: 'Fat', val: draftFat, set: setDraftFat },
                ].map(({ label: l, val, set }) => (
                  <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: colors.inkMuted, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{l}</Text>
                    <TextInput
                      style={{
                        width: '100%', fontSize: 16, fontWeight: '400', fontFamily: FONT,
                        color: colors.ink, backgroundColor: colors.background,
                        borderWidth: 1, borderColor: colors.border,
                        borderRadius: 10, paddingVertical: 8, textAlign: 'center',
                      }}
                      value={val}
                      onChangeText={set}
                      keyboardType="number-pad"
                    />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.forest, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  onPress={handleSaveEdit}
                >
                  <Text style={{ color: colors.background, fontSize: 14, fontWeight: '500', fontFamily: FONT }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                  onPress={() => setEditOpen(false)}
                >
                  <Text style={{ color: colors.inkMuted, fontSize: 14, fontFamily: FONT }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 20, gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1, backgroundColor: colors.surface, borderRadius: 14,
                paddingVertical: 14, alignItems: 'center',
                borderWidth: 1, borderColor: colors.border,
              }}
              onPress={handleOpenEdit}
            >
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.ink, fontFamily: FONT }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1, backgroundColor: hexToRgba('#E05D44', 0.12), borderRadius: 14,
                paddingVertical: 14, alignItems: 'center',
                borderWidth: 1, borderColor: hexToRgba('#E05D44', 0.3),
              }}
              onPress={handleDelete}
            >
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#E05D44', fontFamily: FONT }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </View>
      </Animated.View>

      {/* Swipe indicator — bottom (next plate) */}
      {hasNext && (
        <View style={{
          alignItems: 'center',
          paddingBottom: 4,
        }}>
          <Text style={{
            fontSize: 11,
            color: colors.inkMuted,
            fontFamily: FONT,
          }}>↓ next</Text>
        </View>
      )}
    </SafeAreaView>
  );
}