import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ReadingMode = 'webtoon' | 'manga';

export interface ReadingPreferences {
  defaultReadingMode: ReadingMode;
  fontSize: number; // 12-20px range
  autoSaveBookmark: boolean;
  showProgressBar: boolean;
  keyboardShortcutsEnabled: boolean;
}

interface ReadingPreferencesContextType {
  preferences: ReadingPreferences;
  updatePreference: <K extends keyof ReadingPreferences>(
    key: K,
    value: ReadingPreferences[K]
  ) => void;
  resetPreferences: () => void;
}

const defaultPreferences: ReadingPreferences = {
  defaultReadingMode: 'webtoon',
  fontSize: 16,
  autoSaveBookmark: true,
  showProgressBar: true,
  keyboardShortcutsEnabled: true,
};

const STORAGE_KEY = 'mangaflow_reading_preferences';

const ReadingPreferencesContext = createContext<ReadingPreferencesContextType | undefined>(
  undefined
);

export function ReadingPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ReadingPreferences>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultPreferences, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load reading preferences:', error);
    }
    return defaultPreferences;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save reading preferences:', error);
    }
  }, [preferences]);

  const updatePreference = <K extends keyof ReadingPreferences>(
    key: K,
    value: ReadingPreferences[K]
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ReadingPreferencesContext.Provider
      value={{
        preferences,
        updatePreference,
        resetPreferences,
      }}
    >
      {children}
    </ReadingPreferencesContext.Provider>
  );
}

export function useReadingPreferences() {
  const context = useContext(ReadingPreferencesContext);
  if (!context) {
    throw new Error(
      'useReadingPreferences must be used within ReadingPreferencesProvider'
    );
  }
  return context;
}
