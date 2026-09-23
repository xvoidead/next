import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { fetchWeekLinks, type WeekLink } from '../api/narfuSite';
import { loadWeek, pickDefaultWeek, type LoadStage } from '../data/scheduleService';
import { usePdfExtractor } from '../pdf/PdfEngine';
import type { ParsedWeek } from '../parser/scheduleParser';
import { cache } from '../storage/cache';

export type WeekItem = WeekLink & { isNew: boolean };

export type ScheduleState = {
  /** первичная загрузка кэша ещё не закончилась */
  booting: boolean;
  group: string | null;
  weeks: WeekItem[];
  selectedUrl: string | null;
  week: ParsedWeek | null;
  /** что сейчас происходит, если грузим неделю */
  stage: LoadStage | 'list' | null;
  refreshing: boolean;
  error: string | null;
  /** список недель показан из кэша, сеть недоступна */
  offline: boolean;
  /** неделя, в которую попадает сегодняшний день — для главного экрана */
  currentWeek: ParsedWeek | null;
};

const errorText = (e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  return /network request failed/i.test(message) ? 'Нет соединения с сайтом narfu.ru' : message;
};

function useScheduleState() {
  const extract = usePdfExtractor();
  const [state, setState] = useState<ScheduleState>({
    booting: true,
    group: null,
    weeks: [],
    selectedUrl: null,
    week: null,
    stage: null,
    refreshing: false,
    error: null,
    offline: false,
    currentWeek: null,
  });
  const patch = useCallback((p: Partial<ScheduleState>) => setState((s) => ({ ...s, ...p })), []);

  // Защита от гонок: применяем результат только последнего запроса недели
  const weekRequest = useRef(0);
  const selectedRef = useRef<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  // Главный экран всегда показывает текущую неделю, независимо от выбранной во вкладке
  const currentUrl = pickDefaultWeek(state.weeks)?.url ?? null;
  useEffect(() => {
    currentUrlRef.current = currentUrl;
    if (!currentUrl) return;
    let cancelled = false;
    loadWeek(currentUrl, extract)
      .then((data) => !cancelled && patch({ currentWeek: data }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentUrl, extract, patch]);

  const openWeek = useCallback(
    async (url: string, force = false) => {
      const req = ++weekRequest.current;
      selectedRef.current = url;
      patch({ selectedUrl: url, error: null });

      // отметить неделю просмотренной (снять "новое")
      setState((s) => ({ ...s, weeks: s.weeks.map((w) => (w.url === url ? { ...w, isNew: false } : w)) }));
      cache.getKnownUrls().then((known) => cache.setKnownUrls(new Set([...known, url])));

      // Кэш показываем сразу; при force он остаётся на экране, пока грузится свежая версия
      const cached = await cache.getWeek(url);
      if (req !== weekRequest.current) return;
      patch({ week: cached?.data ?? null, stage: cached && !force ? null : 'download' });
      if (cached && !force) return;

      try {
        const data = await loadWeek(url, extract, {
          force: true,
          onStage: (stage) => req === weekRequest.current && patch({ stage }),
        });
        if (req === weekRequest.current) patch({ week: data, stage: null });
        if (url === currentUrlRef.current) patch({ currentWeek: data });
      } catch (e) {
        if (req === weekRequest.current) patch({ stage: null, error: errorText(e) });
      }
    },
    [extract, patch],
  );

  /** Обновить список PDF с сайта; вернуть неделю, которую стоит открыть. */
  const refreshList = useCallback(async (): Promise<WeekItem[] | null> => {
    try {
      const links = await fetchWeekLinks();
      if (links.length === 0) throw new Error('На странице не найдено ни одной недели расписания');
      const known = await cache.getKnownUrls();
      const firstRun = known.size === 0;
      const weeks = links.map((l) => ({ ...l, isNew: !firstRun && !known.has(l.url) }));
      if (firstRun) await cache.setKnownUrls(links.map((l) => l.url));
      await cache.setWeekList(links);
      cache.prune(links.map((l) => l.url));
      patch({ weeks, offline: false });
      return weeks;
    } catch (e) {
      patch({ offline: true, error: errorText(e) });
      return null;
    }
  }, [patch]);

  // Старт: мгновенно показываем кэш, потом тихо обновляемся из сети
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [group, cachedList] = await Promise.all([cache.getGroup(), cache.getWeekList()]);
      if (cancelled) return;
      const known = await cache.getKnownUrls();
      const cachedWeeks = (cachedList?.links ?? []).map((l) => ({ ...l, isNew: known.size > 0 && !known.has(l.url) }));
      patch({ group, weeks: cachedWeeks, booting: false });

      const cachedDefault = pickDefaultWeek(cachedWeeks);
      // не ждём: пока открывается кэш (или качается PDF), параллельно обновляем список
      if (cachedDefault) void openWeek(cachedDefault.url);

      if (cachedWeeks.length === 0) patch({ stage: 'list' });
      const fresh = await refreshList();
      if (cancelled) return;
      if (!fresh) {
        if (cachedWeeks.length === 0) patch({ stage: null });
        return;
      }
      const target = pickDefaultWeek(fresh);
      const current = selectedRef.current;
      // Открываем актуальную неделю, если пользователь ещё ничего не выбирал сам
      if (target && (!current || current === cachedDefault?.url) && target.url !== current) {
        await openWeek(target.url);
      } else if (!current) {
        patch({ stage: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openWeek, patch, refreshList]);

  const refresh = useCallback(async () => {
    patch({ refreshing: true, error: null });
    const fresh = await refreshList();
    if (fresh) {
      const current = selectedRef.current;
      const stillListed = current && fresh.some((w) => w.url === current);
      const url = stillListed ? current : pickDefaultWeek(fresh)?.url;
      if (url) await openWeek(url, true);
    }
    patch({ refreshing: false });
  }, [openWeek, patch, refreshList]);

  const selectGroup = useCallback(
    (group: string) => {
      patch({ group });
      cache.setGroup(group);
    },
    [patch],
  );

  const retry = useCallback(() => {
    if (selectedRef.current) openWeek(selectedRef.current, true);
    else refresh();
  }, [openWeek, refresh]);

  return { ...state, openWeek, refresh, retry, selectGroup };
}

export type ScheduleValue = ReturnType<typeof useScheduleState>;
const Ctx = createContext<ScheduleValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useScheduleState()}>{children}</Ctx.Provider>;
}

export function useSchedule(): ScheduleValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSchedule вне ScheduleProvider');
  return v;
}
