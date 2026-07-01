import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { deleteFoodEntry, loadImage } from '../services/storageService';
import { colors, typography } from '../theme';
import BackButton from '../components/BackButton';

const FALLBACK_COLOR = colors.border;

export default function PlateDetailScreen({ route, navigation }) {
    const { entry } = route.params;
    const title = entry.label || entry.name || 'Plate Details';
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        navigation.setOptions({ title });
    }, [navigation, title]);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            if (entry.imageId) {
                const uri = await loadImage(entry.imageId);
                if (mounted) {
                    setImageUri(uri || null);
                    setLoading(false);
                }
            } else {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [entry.imageId]);

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
            <BackButton onPress={() => navigation.goBack()} />
            {loading ? (
                <View style={styles.imageLoader}>
                    <ActivityIndicator size="large" color={colors.inkMuted} />
                </View>
            ) : (
                <Image
                    source={imageUri ? { uri: imageUri } : undefined}
                    style={styles.image}
                    resizeMethod="resize"
                    fallbackColor={FALLBACK_COLOR}
                />
            )}
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
    imageLoader: {
        width: '100%',
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.border,
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