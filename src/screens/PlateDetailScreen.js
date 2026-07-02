import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, TextInput } from 'react-native';
import { deleteFoodEntry, updateFoodEntry, loadImage } from '../services/storageService';
import { colors, typography } from '../theme';
import BackButton from '../components/BackButton';

const FALLBACK_COLOR = colors.border;

export default function PlateDetailScreen({ route, navigation }) {
    const { entry } = route.params;
    const title = entry.label || entry.name || 'Plate Details';
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState(entry.items || []);

    // Local display state for macros (so macrosRow updates immediately after Save)
    const [displayCalories, setDisplayCalories] = useState(entry.totalCalories ?? 0);
    const [displayProtein, setDisplayProtein] = useState(Math.round(entry.items?.reduce((s, i) => s + (Number(i.protein) || 0), 0) ?? 0));
    const [displayCarbs, setDisplayCarbs] = useState(Math.round(entry.items?.reduce((s, i) => s + (Number(i.carbs) || 0), 0) ?? 0));
    const [displayFat, setDisplayFat] = useState(Math.round(entry.items?.reduce((s, i) => s + (Number(i.fat) || 0), 0) ?? 0));

    // Edit panel state
    const [editOpen, setEditOpen] = useState(false);
    const [draftCalories, setDraftCalories] = useState('');
    const [draftProtein, setDraftProtein] = useState('');
    const [draftCarbs, setDraftCarbs] = useState('');
    const [draftFat, setDraftFat] = useState('');

    React.useEffect(() => {
        navigation.setOptions({ title });
    }, [navigation, title]);

    React.useEffect(() => {
    let mounted = true;
    (async () => {
        setLoading(true);
        if (entry.id) {
            const uri = await loadImage(entry.id);
            console.log('loadImage returned length:', uri?.length, 'starts with:', uri?.substring(0, 30));
            if (mounted) {
                setImageUri(uri || null);
                setLoading(false);
            }
        } else {
            console.log('no entry.id, skipping image load');
            if (mounted) setLoading(false);
        }
    })();
    return () => { mounted = false; };
}, [entry.id]);

    const handleOpenEdit = () => {
        setDraftCalories(String(entry.totalCalories ?? 0));
        setDraftProtein(String(Math.round(entry.items?.reduce((s, i) => s + (Number(i.protein) || 0), 0) ?? 0)));
        setDraftCarbs(String(Math.round(entry.items?.reduce((s, i) => s + (Number(i.carbs) || 0), 0) ?? 0)));
        setDraftFat(String(Math.round(entry.items?.reduce((s, i) => s + (Number(i.fat) || 0), 0) ?? 0)));
        setEditOpen(true);
    };

    const handleSaveEdit = async () => {
        const newCalories = Number(draftCalories) || 0;
        const newProtein = Number(draftProtein) || 0;
        const newCarbs = Number(draftCarbs) || 0;
        const newFat = Number(draftFat) || 0;

        // Distribute new protein/carbs/fat across items proportionally
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

        await updateFoodEntry(entry.id, { totalCalories: newCalories, items: updatedItems });

        // Update local display state immediately
        setDisplayCalories(newCalories);
        setDisplayProtein(newProtein);
        setDisplayCarbs(newCarbs);
        setDisplayFat(newFat);
        setItems(updatedItems);

        setEditOpen(false);
    };

    const oldTotalForMacro = (macro) => {
        return entry.items?.reduce((s, i) => s + (Number(i[macro]) || 0), 0) ?? 0;
    };

    const handleCancelEdit = () => {
        setEditOpen(false);
    };

    const handleDelete = async () => {
        await deleteFoodEntry(entry.id);
        navigation.goBack();
    };

    const label = entry.label || entry.name || 'Untitled';

    const macroField = (labelText, draftState, setDraft) => (
        <View style={{ flex: 1, paddingHorizontal: 4 }}>
            <Text style={styles.fieldLabel}>{labelText}</Text>
            <TextInput
                style={styles.fieldInput}
                value={draftState}
                onChangeText={setDraft}
                keyboardType="number-pad"
                textAlign="center"
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar style="light" />
            <BackButton onPress={() => navigation.goBack()} />
            {loading ? (
                <View style={styles.imageLoader}>
                    <ActivityIndicator size="large" color={colors.inkMuted} />
                </View>
            ) : imageUri ? (
                <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                />
            ) : (
                <View style={[styles.image, { backgroundColor: FALLBACK_COLOR }]} />
            )}
            <View style={styles.body}>
                <Text style={styles.name}>{label}</Text>
                <Text style={styles.calories}>{displayCalories}{''} kcal</Text>

                <View style={styles.macrosRow}>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroValue}>{displayProtein}</Text>
                        <Text style={styles.macroLabel}>Protein (g)</Text>
                    </View>
                    <View style={styles.macroDivider} />
                    <View style={styles.macroItem}>
                        <Text style={styles.macroValue}>{displayCarbs}</Text>
                        <Text style={styles.macroLabel}>Carbs (g)</Text>
                    </View>
                    <View style={styles.macroDivider} />
                    <View style={styles.macroItem}>
                        <Text style={styles.macroValue}>{displayFat}</Text>
                        <Text style={styles.macroLabel}>Fat (g)</Text>
                    </View>
                </View>

                {/* Description/Note */}
                {entry.description ? (
                    <View style={styles.noteContainer}>
                        <Text style={styles.noteLabel}>Note:</Text>
                        <Text style={styles.noteText}>{entry.description}</Text>
                    </View>
                ) : null}

                {/* Edit Panel */}
                {editOpen && (
                    <View style={styles.editPanel}>
                        <View style={styles.editGrid}>
                            {macroField('Calories', draftCalories, setDraftCalories)}
                            {macroField('Protein (g)', draftProtein, setDraftProtein)}
                            {macroField('Carbs (g)', draftCarbs, setDraftCarbs)}
                            {macroField('Fat (g)', draftFat, setDraftFat)}
                        </View>
                        <View style={styles.editButtonRow}>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Button Row: Edit + Delete */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.forest }]} onPress={handleOpenEdit}>
                        <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.tomato }]} onPress={handleDelete}>
                        <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                </View>
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
        flex: 1,
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
    editPanel: {
        marginTop: 16,
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    editGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    fieldLabel: {
        fontSize: 11,
        color: colors.inkMuted,
        marginBottom: 4,
        textAlign: 'center',
    },
    fieldInput: {
        fontSize: 18,
        color: colors.ink,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 8,
        textAlign: 'center',
    },
    editButtonRow: {
        flexDirection: 'row',
        marginTop: 12,
    },
    saveButton: {
        flex: 1,
        backgroundColor: colors.forest,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveText: {
        color: colors.background,
        fontSize: 14,
        fontWeight: '700',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        marginLeft: 8,
    },
    cancelText: {
        color: colors.inkMuted,
        fontSize: 14,
        fontWeight: '700',
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 32,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    actionButtonText: {
        color: colors.background,
        fontSize: 16,
        ...typography.label,
    },
    deleteText: {
        color: colors.background,
        fontSize: 16,
        ...typography.label,
    },
    noteContainer: {
        marginTop: 16,
    },
    noteLabel: {
        fontSize: 12,
        color: colors.inkMuted,
        ...typography.label,
        marginBottom: 2,
    },
    noteText: {
        fontSize: 13,
        color: colors.inkMuted,
    },
});
