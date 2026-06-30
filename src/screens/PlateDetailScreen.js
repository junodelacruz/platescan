import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { deleteFoodEntry } from '../services/storageService';
import { colors, typography } from '../theme';

const FALLBACK_COLOR = colors.border;

export default function PlateDetailScreen({ route, navigation }) {
    const { entry } = route.params;
    const title = entry.label || entry.name || 'Plate Details';

    React.useEffect(() => {
        navigation.setOptions({ title });
    }, [navigation, title]);

    const handleDelete = async () => {
        await deleteFoodEntry(entry.id);
        navigation.goBack();
    };

    const label = entry.label || entry.name || 'Untitled';
    const calories = entry.totalCalories ?? '—';
    const macros = entry.macros || {};
    const protein = macros.protein ?? 0;
    const carbs = macros.carbs ?? 0;
    const fat = macros.fat ?? 0;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar style="light" />
            <Image
                source={entry.imageUri ? { uri: entry.imageUri } : undefined}
                style={styles.image}
                resizeMethod="resize"
                fallbackColor={FALLBACK_COLOR}
            />
            <View style={styles.body}>
                <Text style={styles.name}>{label}</Text>
                <Text style={styles.calories}>{calories} kcal</Text>

                <View style={styles.macrosRow}>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroValue}>{protein}g</Text>
                        <Text style={styles.macroLabel}>Protein</Text>
                    </View>
                    <View style={styles.macroDivider} />
                    <View style={styles.macroItem}>
                        <Text style={styles.macroValue}>{carbs}g</Text>
                        <Text style={styles.macroLabel}>Carbs</Text>
                    </View>
                    <View style={styles.macroDivider} />
                    <View style={styles.macroItem}>
                        <Text style={styles.macroValue}>{fat}g</Text>
                        <Text style={styles.macroLabel}>Fat</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.background,
    },
    image: {
        width: '100%',
        height: 220,
        backgroundColor: FALLBACK_COLOR,
    },
    body: {
        padding: 24,
        flex: 1,
    },
    name: {
        fontSize: 22,
        color: colors.ink,
        ...typography.display,
    },
    calories: {
        fontSize: 18,
        color: colors.inkMuted,
        marginTop: 4,
    },
    macrosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 24,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: colors.border,
        borderBottomColor: colors.border,
    },
    macroItem: {
        alignItems: 'center',
    },
    macroValue: {
        fontSize: 18,
        color: colors.ink,
        fontWeight: '700',
    },
    macroLabel: {
        fontSize: 11,
        color: colors.inkMuted,
        ...typography.label,
        marginTop: 2,
    },
    macroDivider: {
        width: 1,
        height: 36,
        backgroundColor: colors.border,
    },
    deleteButton: {
        marginTop: 32,
        backgroundColor: colors.tomato,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    deleteText: {
        color: colors.ink,
        fontSize: 16,
        ...typography.label,
    },
});