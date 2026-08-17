import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://platescan.duckdns.org/api';

export const AUTH_TOKEN_KEY = 'auth-token';

/** Read the stored JWT (or null if absent). */
export async function getToken() {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persist a JWT returned by the server. */
export async function setToken(token) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Remove the stored JWT (called on logout / 401). */
export async function clearToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * POST /api/login with { password }.
 * Stores the returned token and returns it.
 * Throws on network errors or non-200 responses.
 */
export async function login(password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    // Surface a clear error message for wrong password vs network issues
    let message = `Login failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error || body?.message) {
        message = body.error || body.message;
      }
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }

  const data = await res.json();
  if (!data?.token) {
    throw new Error('Server did not return a token.');
  }

  await setToken(data.token);
  return data.token;
}
