import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFoodImage } from '../services/aiService';
import { addFoodEntry } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

export default function ScanScreen({ navigation, route }) {
  const { colors, typography } = useTheme();
  const initialDate = route.params?.initialDate || null;
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera permissions to scan a plate.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      allowsEditing: true,
    });
    if (!result.canceled) handleImage(result.assets[0]);
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.6,
      allowsEditing: true,
    });
    if (!result.canceled) handleImage(result.assets[0]);
  };

  // Store base64 alongside URI for the scan call
  const [imageBase64, setImageBase64] = useState(null);

  const handleImage = (asset) => {
    setImageUri(asset.uri);
    setImageBase64(asset.base64 || null);
    setDescription('');
    setShowDescriptionInput(true);
  };

  const triggerScan = async () => {
    if (!imageBase64) {
      Alert.alert('Missing image', 'No image data available for scanning.');
      return;
    }
    setShowDescriptionInput(false);
    setLoading(true);
    try {
      const analysis = await analyzeFoodImage(imageBase64, description);
      navigation.replace('Result', { analysis, imageUri, imageBase64, initialDate });
    } catch (err) {
      Alert.alert('Scan failed', err.message || 'Could not analyze this photo. Try again.');
      setShowDescriptionInput(true);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = () => {
    triggerScan();
  };

  const handleSkip = () => {
    triggerScan();
  };

  const styles = {
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      paddingHorizontal: 28,
      paddingBottom: 36,
      overflow: 'hidden',
    },
    title: { fontSize: 24, color: colors.ink, ...typography.display, marginTop: 10 },
    subtitle: { fontSize: 14, color: colors.inkMuted, marginTop: 8, marginBottom: 24 },
    preview: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    image: { width: '100%', height: '100%' },
    placeholder: { color: colors.inkMuted },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(28, 24, 20, 0.75)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: { color: colors.ink, marginTop: 10, ...typography.label },
    primaryButton: {
      backgroundColor: colors.tomato,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 20,
    },
    primaryButtonText: { color: colors.ink, fontSize: 16, ...typography.label },
    secondaryButton: {
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.forest,
    },
    secondaryButtonText: { color: colors.forest, fontSize: 16, ...typography.label },
    descriptionPanel: {
      marginTop: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    descriptionInput: {
      fontSize: 14,
      color: colors.ink,
      minHeight: 80,
      textAlignVertical: 'top',
      padding: 8,
      marginBottom: 12,
    },
    descriptionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    scanButton: {
      flex: 1,
      backgroundColor: colors.tomato,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    scanButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '700',
      ...typography.label,
    },
    skipButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    skipButtonText: {
      color: colors.inkMuted,
      fontSize: 16,
      fontWeight: '700',
      ...typography.label,
    },
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        <StatusBar barTitle="light-content" />
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Scan Your Plate</Text>
        <Text style={styles.subtitle}>Center the plate in frame — good lighting helps accuracy.</Text>

        <View style={styles.preview}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <Text style={styles.placeholder}>No photo yet</Text>
          )}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.tomato} size="large" />
              <Text style={styles.loadingText}>Reading the plate...</Text>
            </View>
          )}
        </View>

        {!imageUri && (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={takePhoto} disabled={loading}>
              <Text style={styles.primaryButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={pickFromLibrary} disabled={loading}>
              <Text style={styles.secondaryButtonText}>Choose from Library</Text>
            </TouchableOpacity>
          </>
        )}

        {showDescriptionInput && imageUri && (
          <View style={styles.descriptionPanel}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add context (optional) — e.g. Chipotle bowl, chicken, rice, guac"
              placeholderTextColor={colors.inkMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
            <View style={styles.descriptionButtons}>
              <TouchableOpacity style={styles.scanButton} onPress={handleScan} disabled={loading}>
                <Text style={styles.scanButtonText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={loading}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}