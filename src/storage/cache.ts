import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WeekLink } from '../api/narfuSite';
import { PARSER_VERSION, type ParsedWeek } from '../parser/scheduleParser';

/**
 * Локальный кэш: приложение открывается мгновенно и работает без сети
 * с последним загруженным расписанием.
 *
 * Храним разобранную неделю целиком (все группы, ~150–250 КБ JSON) — так смена
 * группы не требует повторной загрузки PDF.
 */

const KEYS = {
  group: 'settings:group:v1',
  weeks: 'weeks:list:v1',
  knownUrls: 'weeks:known:v1',
  week: (url: string) => `week:v${PARSER_VERSION}:${url}`,
};

export type CachedWeekList = { links: WeekLink[]; fetchedAt: number };
export type CachedWeek = { data: ParsedWeek; parsedAt: number };

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // битый кэш не должен ронять приложение
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[cache] не удалось сохранить', key, e);
  }
}

export const cache = {
  getGroup: () => AsyncStorage.getItem(KEYS.group).catch(() => null),
  setGroup: (group: string) => AsyncStorage.setItem(KEYS.group, group).catch(() => undefined),

  getWeekList: () => readJson<CachedWeekList>(KEYS.weeks),
  setWeekList: (links: WeekLink[]) => writeJson(KEYS.weeks, { links, fetchedAt: Date.now() }),

  /** URL недель, которые пользователь уже видел — чтобы помечать новые PDF. */
  getKnownUrls: async () => new Set((await readJson<string[]>(KEYS.knownUrls)) ?? []),
  setKnownUrls: (urls: Iterable<string>) => writeJson(KEYS.knownUrls, [...urls]),

  getWeek: (url: string) => readJson<CachedWeek>(KEYS.week(url)),
  setWeek: (url: string, data: ParsedWeek) => writeJson(KEYS.week(url), { data, parsedAt: Date.now() }),

  /** Удаляет из кэша недели, которых больше нет на сайте, и кэш старых версий парсера. */
  async prune(activeUrls: string[]) {
    try {
      const keep = new Set(activeUrls.map(KEYS.week));
      const keys = await AsyncStorage.getAllKeys();
      const stale = keys.filter((k) => k.startsWith('week:') && !keep.has(k));
      if (stale.length) await AsyncStorage.multiRemove(stale);
    } catch {
      // не критично
    }
  },
};
