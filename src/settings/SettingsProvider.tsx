import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { STRINGS, makeDateFormat, type Language, type StringKey } from '../i18n/strings';
import { darkTheme, lightTheme, type Theme } from '../ui/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

type SettingsValue = {
  ready: boolean;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  /** перевод с подстановкой {параметров} */
  t: (key: StringKey, params?: Record<string, string | number>) => string;
  dates: ReturnType<typeof makeDateFormat>;
};

const KEY = 'settings:app:v1';
const Ctx = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [ready, setReady] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [language, setLanguageState] = useState<Language>('ru');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<{ themeMode: ThemeMode; language: Language }>;
        if (saved.themeMode) setThemeModeState(saved.themeMode);
        if (saved.language) setLanguageState(saved.language);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((patch: Partial<{ themeMode: ThemeMode; language: Language }>) => {
    AsyncStorage.getItem(KEY)
      .then((raw) => AsyncStorage.setItem(KEY, JSON.stringify({ ...(raw ? JSON.parse(raw) : {}), ...patch })))
      .catch(() => undefined);
  }, []);

  const value = useMemo<SettingsValue>(() => {
    const dark = themeMode === 'dark' || (themeMode === 'system' && system === 'dark');
    const dict = STRINGS[language];
    return {
      ready,
      themeMode,
      setThemeMode: (m) => {
        setThemeModeState(m);
        persist({ themeMode: m });
      },
      language,
      setLanguage: (l) => {
        setLanguageState(l);
        persist({ language: l });
      },
      theme: dark ? darkTheme : lightTheme,
      t: (key, params) =>
        params ? dict[key].replace(/\{(\w+)\}/g, (_, p: string) => String(params[p] ?? '')) : dict[key],
      dates: makeDateFormat(language),
    };
  }, [ready, themeMode, language, system, persist]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings вне SettingsProvider');
  return v;
}
