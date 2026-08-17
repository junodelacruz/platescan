import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { getToken, setToken, clearToken } from '../services/authService';
import { subscribe } from '../services/eventBus';

const AuthContext = createContext(null);

/**
 * AuthProvider
 *
 * Manages isLoggedIn state and exposes logIn / logOut helpers.
 * Also listens for the 'logout' event emitted by the apiFetch 401
 * interceptor in storageService, so any API 401 automatically clears
 * the token and forces the Login screen without screen-level code changes.
 */
export function AuthProvider({ children }) {
  // null = not yet checked, true/false = result of the startup AsyncStorage read
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // On mount: read persisted token to decide initial nav state
  useEffect(() => {
    getToken().then((token) => {
      setIsLoggedIn(!!token);
      setIsAuthChecked(true);
    });
  }, []);

  // Listen for 401 interceptor events from apiFetch in storageService
  useEffect(() => {
    const unsubscribe = subscribe('logout', () => {
      setIsLoggedIn(false);
    });
    return unsubscribe;
  }, []);

  /** Call after a successful login(password) in LoginScreen. */
  const logIn = useCallback(() => {
    setIsLoggedIn(true);
  }, []);

  /**
   * Call for an explicit user-initiated logout (e.g. a future Settings button).
   * The 401 path goes through the 'logout' event instead.
   */
  const logOut = useCallback(async () => {
    await clearToken();
    setIsLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthChecked, isLoggedIn, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
