import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';

const FONT = Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined;

export default function LoginScreen() {
  const { colors } = useTheme();
  const { logIn } = useAuth();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(password);
      // Token is now stored; update auth state → navigator swaps automatically
      logIn();
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Styles (plain objects, colors from theme) ─────────────────────────────
  const container = {
    flex: 1,
    backgroundColor: colors.background,
  };

  const inner = {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  };

  const iconWrap = {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  };

  const wordmark = {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: FONT,
    letterSpacing: 0.2,
    marginBottom: 6,
  };

  const tagline = {
    fontSize: 13,
    color: colors.inkMuted,
    fontFamily: FONT,
    marginBottom: 40,
  };

  const card = {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  };

  const inputLabel = {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkMuted,
    fontFamily: FONT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  };

  const inputRow = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 20,
  };

  const inputStyle = {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    fontFamily: FONT,
    paddingVertical: Platform.OS === 'web' ? 14 : 14,
    outlineStyle: 'none', // web: suppress browser focus ring (handled by border)
  };

  const loginButton = {
    backgroundColor: loading ? colors.border : colors.tomato,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  };

  const loginButtonText = {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONT,
    color: colors.background,
    letterSpacing: 0.3,
  };

  const errorText = {
    fontSize: 13,
    color: '#E05D44',
    fontFamily: FONT,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={inner}>
          {/* App icon */}
          <View style={iconWrap}>
            <Ionicons name="scan-outline" size={36} color={colors.tomato} />
          </View>

          {/* Wordmark */}
          <Text style={wordmark}>PlateScan</Text>
          <Text style={tagline}>Your personal nutrition tracker</Text>

          {/* Login card */}
          <View style={card}>
            <Text style={inputLabel}>Password</Text>

            <View style={inputRow}>
              <TextInput
                style={inputStyle}
                value={password}
                onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
                placeholder="Enter password"
                placeholderTextColor={colors.inkMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.inkMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Error */}
            {error ? <Text style={errorText}>{error}</Text> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
