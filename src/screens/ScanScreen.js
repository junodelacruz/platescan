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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFoodImage } from '../services/aiService';
import { colors, typography } from '../theme';

export default function ScanScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handleImage = async (asset) => {
    setImageUri(asset.uri);
    setLoading(true);
    try {
      const analysis = await analyzeFoodImage(asset.base64);
      navigation.replace('Result', { analysis, imageUri: asset.uri });
    } catch (err) {
      Alert.alert('Scan failed', err.message || 'Could not analyze this photo. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Inner container enforces horizontal margins and clips overflow */}
      <View style={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>
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

        <TouchableOpacity style={styles.primaryButton} onPress={takePhoto} disabled={loading}>
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={pickFromLibrary} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Choose from Library</Text>
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
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  header: { paddingTop: 16, paddingBottom: 6 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 16 },
  backText: { fontSize: 16, color: colors.forest, fontWeight: '600' },
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
});
