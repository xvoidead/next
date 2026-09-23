import { bytesToBase64 } from '../utils/base64';

export const SITE_ORIGIN = 'https://narfu.ru';
export const SCHEDULE_PAGE_URL = `${SITE_ORIGIN}/ltk/obrazovatelnaya/raspisanie/`;

const REQUEST_TIMEOUT_MS = 30_000;

/** Ссылка на PDF с расписанием одной недели. */
export type WeekLink = {
  /** абсолютный URL PDF — он же ключ кэша */
  url: string;
  /** текст ссылки на сайте: "неделя с 21 по 26 сентября 2026 года" */
  title: string;
  /** ISO-даты начала и конца недели, если удалось понять из текста ссылки */
  startDate: string | null;
  endDate: string | null;
};

const MONTHS: Record<string, number> = {
  января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6,
  июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12,
};

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`Сайт ответил ${res.status}`);
    return res;
  } catch (e) {
    if (controller.signal.aborted) throw new Error('Сайт не отвечает (таймаут)');
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    clearTimeout(timer);
  }
}

/** Скачивает страницу расписания и достаёт ссылки на PDF по неделям (очная форма). */
export async function fetchWeekLinks(): Promise<WeekLink[]> {
  const res = await fetchWithTimeout(SCHEDULE_PAGE_URL);
  return parseWeekLinks(await res.text());
}

/** Вынесено отдельно, чтобы можно было проверить на сохранённом HTML. */
export function parseWeekLinks(html: string): WeekLink[] {
  const links: WeekLink[] = [];
  const seen = new Set<string>();
  const anchorRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const m of html.matchAll(anchorRe)) {
    const href = decodeEntities(m[1]);
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/[;,.\s]+$/, '').trim();
    // Недельное расписание подписано "неделя с 21 по 26 сентября 2026 года"
    if (!/недел/i.test(title)) continue;

    const url = absoluteUrl(href);
    if (seen.has(url)) continue;
    seen.add(url);
    links.push({ url, title, ...parseDateRange(title) });
  }

  // Новые недели — первыми
  return links.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
}

/** "неделя с 28 сентября по 3 октября 2026 года" / "неделя с 21 по 26 сентября 2026 года" */
function parseDateRange(title: string): { startDate: string | null; endDate: string | null } {
  const none = { startDate: null, endDate: null };
  const m = /с\s+(\d{1,2})(?:\s+([а-яё]+))?\s+по\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i.exec(title);
  if (!m) return none;
  const endMonth = MONTHS[m[4].toLowerCase()];
  const startMonth = m[2] ? MONTHS[m[2].toLowerCase()] : endMonth;
  if (!startMonth || !endMonth) return none;
  const endYear = Number(m[5]);
  const startYear = startMonth > endMonth ? endYear - 1 : endYear; // неделя через Новый год
  const iso = (y: number, mo: number, d: string) =>
    `${y}-${String(mo).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;
  return { startDate: iso(startYear, startMonth, m[1]), endDate: iso(endYear, endMonth, m[3]) };
}

/** Полифилл URL в React Native неполный, поэтому относительные ссылки собираем сами. */
function absoluteUrl(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `${SITE_ORIGIN}${href}`;
  return `${SCHEDULE_PAGE_URL}${href}`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

/** Скачивает PDF и возвращает его в base64 (в таком виде он уходит в WebView). */
export async function downloadPdfBase64(url: string): Promise<string> {
  const res = await fetchWithTimeout(url);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // %PDF — сигнатура; вместо PDF сайт может отдать HTML-страницу ошибки
  if (bytes.length < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    throw new Error('По ссылке оказался не PDF');
  }
  return bytesToBase64(bytes);
}
