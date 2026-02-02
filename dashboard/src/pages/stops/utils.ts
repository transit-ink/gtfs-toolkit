import { AxiosError } from 'axios';
import { MAP_STATE_KEY } from './constants';

// Helper functions for map state persistence
export const getSavedMapState = (): { lat: number; lon: number; zoom: number } | null => {
  try {
    const saved = localStorage.getItem(MAP_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.lat === 'number' &&
        typeof parsed.lon === 'number' &&
        typeof parsed.zoom === 'number'
      ) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

export const saveMapState = (lat: number, lon: number, zoom: number) => {
  try {
    localStorage.setItem(MAP_STATE_KEY, JSON.stringify({ lat, lon, zoom }));
  } catch {
    // Ignore storage errors
  }
};

// Helper to handle API errors
export const handleApiError = (
  err: unknown,
  action: string,
  setError: (error: string | null) => void
) => {
  if (err instanceof AxiosError) {
    if (err.response?.status === 403) {
      setError(`Permission denied: You need admin privileges to ${action}.`);
    } else if (err.response?.status === 401) {
      setError('Session expired. Please log in again.');
    } else {
      setError(err.response?.data?.message || `Failed to ${action}.`);
    }
  } else {
    setError(`An unexpected error occurred while trying to ${action}.`);
  }
  console.error(`Error ${action}:`, err);
};
