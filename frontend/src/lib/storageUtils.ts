/**
 * Shared localStorage utilities.
 * Eliminates duplicated load/save patterns across all 9+ contexts.
 */

const STORAGE_DEBOUNCE_MS = 300;

/**
 * Load and parse JSON from localStorage with error handling.
 * Returns defaultValue if key doesn't exist or parsing fails.
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (e) {
    console.error(`[Storage] Failed to load "${key}":`, e);
  }
  return defaultValue;
}

/**
 * Save JSON to localStorage with error handling.
 */
export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[Storage] Failed to save "${key}":`, e);
  }
}

/**
 * Remove a key from localStorage.
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`[Storage] Failed to remove "${key}":`, e);
  }
}

/**
 * Creates a debounced save effect for use in React contexts.
 * Returns a cleanup function suitable for useEffect return.
 *
 * Usage:
 *   useEffect(() => debouncedSave('key', data), [data]);
 */
export function debouncedSave(key: string, value: unknown, delayMs: number = STORAGE_DEBOUNCE_MS): () => void {
  const timer = setTimeout(() => saveToStorage(key, value), delayMs);
  return () => clearTimeout(timer);
}
