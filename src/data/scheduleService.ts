import { downloadPdfBase64, type WeekLink } from '../api/narfuSite';
import { parseSchedule, type ParsedWeek, type PdfContent } from '../parser/scheduleParser';
import { cache } from '../storage/cache';

export type LoadStage = 'download' | 'extract' | 'parse';
type Extract = (pdfBase64: string) => Promise<PdfContent>;

/** Одновременные запросы одной и той же недели склеиваются в один. */
const inFlight = new Map<string, Promise<ParsedWeek>>();

/**
 * Расписание недели: из кэша, либо скачать PDF -> pdf.js в WebView -> парсер.
 * force = true игнорирует кэш (кнопка "обновить").
 */
export function loadWeek(
  url: string,
  extract: Extract,
  opts: { force?: boolean; onStage?: (s: LoadStage) => void } = {},
): Promise<ParsedWeek> {
  const running = inFlight.get(url);
  if (running) return running;

  const task = (async () => {
    if (!opts.force) {
      const cached = await cache.getWeek(url);
      if (cached) return cached.data;
    }
    opts.onStage?.('download');
    const base64 = await downloadPdfBase64(url);
    opts.onStage?.('extract');
    const content = await extract(base64);
    opts.onStage?.('parse');
    // даём UI отрисовать смену стадии перед синхронным разбором
    await new Promise((r) => setTimeout(r, 0));
    const parsed = parseSchedule(content);
    if (Object.keys(parsed.groups).length === 0) {
      throw new Error('В PDF не найдено ни одной группы — возможно, изменился формат расписания');
    }
    await cache.setWeek(url, parsed);
    return parsed;
  })().finally(() => inFlight.delete(url));

  inFlight.set(url, task);
  return task;
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Неделя, в которую попадает сегодняшний день; иначе ближайшая прошедшая; иначе самая новая. */
export function pickDefaultWeek(links: WeekLink[], today = todayIso()): WeekLink | null {
  if (links.length === 0) return null;
  const dated = links
    .filter((l): l is WeekLink & { startDate: string } => l.startDate !== null)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  // Воскресенье считаем частью прошедшей недели
  const lastDay = (l: WeekLink & { startDate: string }) => addDaysIso(l.endDate ?? addDaysIso(l.startDate, 5), 1);
  const current = dated.find((l) => l.startDate <= today && today <= lastDay(l));
  if (current) return current;
  // Если следующая неделя уже выложена и до неё пара дней — показываем её
  const upcoming = [...dated].reverse().find((l) => l.startDate > today);
  if (upcoming && addDaysIso(today, 2) >= upcoming.startDate) return upcoming;
  return dated.find((l) => l.startDate <= today) ?? links[0];
}
