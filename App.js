import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PlateDetailScreen from './src/screens/PlateDetailScreen';
import WeightTrackerScreen from './src/screens/WeightTrackerScreen';
import LoginScreen from './src/screens/LoginScreen';
import { clearLegacyData } from './src/services/storageService';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FONT = Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined;

function TabIcon({ name, focused, color }) {
  const iconMap = {
    Home: 'home-outline',
    History: 'calendar-outline',
    Weight: 'trending-down-outline',
    Settings: 'settings-outline',
  };
  return (
    <Ionicons
      name={iconMap[name] || 'ellipse-outline'}
      size={focused ? 24 : 22}
      color={color}
    />
  );
}

function MainTabs() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Dynamic bottom margin: on devices with safe area (like notch iPhones), use insets.bottom + 8.
  // On other devices, use 12px for breathing room.
  const bottomMargin = insets.bottom > 0 ? insets.bottom + 8 : 12;

  return (
    <View style={[styles.tabBarWrapper, { backgroundColor: colors.surface }]}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={route.name} focused={focused} color={color} />
          ),
          tabBarActiveTintColor: isDark ? colors.tomato : '#333333',
          tabBarInactiveTintColor: isDark ? colors.inkMuted : '#999999',
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: FONT,
            fontWeight: '500',
            marginBottom: 2,
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingTop: 6,
            paddingBottom: 0,
            marginBottom: bottomMargin,
          },
        })}
      >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'Calendar' }} />
      <Tab.Screen name="Weight" component={WeightTrackerScreen} options={{ tabBarLabel: 'Weight' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    flex: 1,
    backgroundColor: '#2A241E',
  },
});

function AppNavigator() {
  const { colors, isDark } = useTheme();
  const { isAuthChecked, isLoggedIn } = useAuth();

  // Splash: wait for AsyncStorage read before deciding which screen to show
  if (!isAuthChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tomato} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {isLoggedIn ? (
          // ── Authenticated stack ──────────────────────────────────────
          <>
            {/* Tab screens — tab bar visible */}
            <Stack.Screen name="MainTabs" component={MainTabs} />
            {/* Stack overlays — tab bar hidden */}
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="PlateDetail" component={PlateDetailScreen} />
          </>
        ) : (
          // ── Unauthenticated stack ────────────────────────────────────
          // animationTypeForReplace: 'pop' makes the forward transition feel
          // natural when going from Login → MainTabs after a successful login.
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animationTypeForReplace: 'pop' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    clearLegacyData();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}