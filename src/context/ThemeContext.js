import React, { createContext, useContext, useState, useEffect, Platform } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme } from '../theme';

const THEME_KEY = 'platescan-theme';
const DARK_BG = '#1C1814';
const LIGHT_BG = '#F5F0E8';

const ThemeContext = createContext(null);

function syncBodyBackground(dark) {
  if (typeof document !== 'undefined') {
    document.body.style.backgroundColor = dark ? DARK_BG : LIGHT_BG;
  }
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true); // default dark

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      const dark = val === null ? true : val === 'dark';
      setIsDark(dark);
      syncBodyBackground(dark);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    syncBodyBackground(next);
    await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ ...theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}