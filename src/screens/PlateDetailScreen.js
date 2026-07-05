import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, TextInput } from 'react-native';
import { deleteFoodEntry, updateFoodEntry, loadImage } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

export default function PlateDetailScreen({ route, navigation }) {
    const { colors, typography } = useTheme();
    const { entry } = route.params;
    const title = entry.label || entry.name || 'Plate Details';
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState(entry.items || []);

    const [displayCalories, setDisplayCalories] = useState(entry.totalCalories ?? 0);
    const [displayProtein, setDisplayProtein] = useState(Math.round(entry.items?.reduce((s, i) => s + (Number(i.protein) || 0), 0) ?? 0));
    const [displayCarbs, setDisplayCarbs] = useState(Math.round(entry.items?.reduce((s, i) => s + (Number(i.carbs) || 0), 0) ?? 0));
    const [displayFat, setDisplayFat] = useState(Math.round(entry.items?.reduce((s, i) => s + (Number(i.fat) || 0), 0) ?? 0));

    const [editOpen, setEditOpen] = useState(false);
    const [draftCalories, setDraftCalories] = useState('');
    const [draftProtein, setDraftProtein] = useState('');
    const [draftCarbs, setDraftCarbs] = useState('');
    const [draftFat, setDraftFat] = useState('');

    const fieldLabel = (labelText) => (
        <Text style={[styles.fieldLabel, { color: colors.inkMuted }]}>{labelText}</Text>
    );

    React.useEffect(() => {
        navigation.setOptions({ title });
    }, [navigation, title]);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            if (entry.id) {
                const uri = await loadImage(entry.id);
                if (mounted) {
                    setImageUri(uri || null);
                    setLoading(false);
                }
            } else {
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

    const handleCancelEdit = () => setEditOpen(false);

    const handleDelete = async () => {
        await deleteFoodEntry(entry.id);
        navigation.goBack();
    };

    const label = entry.label || entry.name || 'Untitled';

    const macroField = (labelText, draftState, setDraft) => (
        <View style={{ flex: 1, paddingHorizontal: 4 }}>
            {fieldLabel(labelText)}
            <TextInput
                style={[styles.fieldInput, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={draftState}
                onChangeText={setDraft}
                keyboardType="number-pad"
                textAlign="center"
            />
        </View>
    );

    const styles = {
        safe: { flex: 1 },
        backButtonWrapper: {
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 4,
        },
        imageWrapper: {
            marginHorizontal: 20,
            marginTop: 8,
            borderRadius: 16,
            overflow: 'hidden',
            height: 220,
        },
        image: {
            width: '100%',
            height: '100%',
        },
        imageLoader: {
            height: 220,
            marginHorizontal: 20,
            marginTop: 8,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        body: { padding: 24, flex: 1 },
        name: { fontSize: 22, ...typography.display },
        calories: { fontSize: 18 },
        macrosRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            marginTop: 24,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderBottomWidth: 1,
        },
        macroItem: { alignItems: 'center', flex: 1 },
        macroValue: { fontSize: 18, fontWeight: '700' },
        macroLabel: { fontSize: 11, ...typography.label, marginTop: 2 },
        macroDivider: { width: 1, height: 36 },
        editPanel: { marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
        editGrid: { flexDirection: 'row', flexWrap: 'wrap' },
        fieldLabel: { fontSize: 11, marginBottom: 4, textAlign: 'center' },
        fieldInput: { fontSize: 18, borderWidth: 1, borderRadius: 8, padding: 8, textAlign: 'center' },
        editButtonRow: { flexDirection: 'row', marginTop: 12 },
        saveButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
        saveText: { fontSize: 14, fontWeight: '700' },
        cancelButton: {
            flex: 1,
            backgroundColor: 'transparent',
            paddingVertical: 10,
            borderRadius: 8,
            borderWidth: 1,
            alignItems: 'center',
            marginLeft: 8,
        },
        cancelText: { fontSize: 14, fontWeight: '700' },
        buttonRow: { flexDirection: 'row', marginTop: 32, gap: 8 },
        actionButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
        actionButtonText: { fontSize: 16, ...typography.label },
        deleteText: { fontSize: 16, ...typography.label },
        noteContainer: { marginTop: 16 },
        noteLabel: { fontSize: 12, ...typography.label, marginBottom: 2 },
        noteText: { fontSize: 13 },
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <StatusBar style="light" />

            <View style={styles.backButtonWrapper}>
                <BackButton onPress={() => navigation.goBack()} />
            </View>

            {loading ? (
                <View style={[styles.imageLoader, { backgroundColor: colors.border }]}>
                    <ActivityIndicator size="large" color={colors.inkMuted} />
                </View>
            ) : imageUri ? (
                <View style={styles.imageWrapper}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                </View>
            ) : (
                <View style={[styles.imageWrapper, { backgroundColor: colors.surface }]} />
            )}

            <View style={styles.body}>
                <Text style={[styles.name, { color: colors.ink }]}>{label}</Text>
                <Text style={[styles.calories, { color: colors.inkMuted }]}>{displayCalories} kcal</Text>

                <View style={[styles.macrosRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                    <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: colors.ink }]}>{displayProtein}</Text>
                        <Text style={[styles.macroLabel, { color: colors.inkMuted }]}>Protein (g)</Text>
                    </View>
                    <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: colors.ink }]}>{displayCarbs}</Text>
                        <Text style={[styles.macroLabel, { color: colors.inkMuted }]}>Carbs (g)</Text>
                    </View>
                    <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: colors.ink }]}>{displayFat}</Text>
                        <Text style={[styles.macroLabel, { color: colors.inkMuted }]}>Fat (g)</Text>
                    </View>
                </View>

                {entry.description ? (
                    <View style={styles.noteContainer}>
                        <Text style={[styles.noteLabel, { color: colors.inkMuted }]}>Note:</Text>
                        <Text style={[styles.noteText, { color: colors.inkMuted }]}>{entry.description}</Text>
                    </View>
                ) : null}

                {editOpen && (
                    <View style={[styles.editPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.editGrid}>
                            {macroField('Calories', draftCalories, setDraftCalories)}
                            {macroField('Protein (g)', draftProtein, setDraftProtein)}
                            {macroField('Carbs (g)', draftCarbs, setDraftCarbs)}
                            {macroField('Fat (g)', draftFat, setDraftFat)}
                        </View>
                        <View style={styles.editButtonRow}>
                            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.forest }]} onPress={handleSaveEdit}>
                                <Text style={[styles.saveText, { color: colors.background }]}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={handleCancelEdit}>
                                <Text style={[styles.cancelText, { color: colors.inkMuted }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.forest }]} onPress={handleOpenEdit}>
                        <Text style={[styles.actionButtonText, { color: colors.background }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.tomato }]} onPress={handleDelete}>
                        <Text style={[styles.deleteText, { color: colors.background }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}