/**
 * Парсер PDF-расписания ЛТК САФУ.
 *
 * На вход получает то, что pdf.js достаёт из PDF (см. src/pdf/extractorScript.ts):
 *  - текстовые элементы с координатами;
 *  - тонкие прямоугольники — линии границ таблиц (Word рисует их заливкой).
 *
 * По линиям восстанавливаются ячейки таблиц, текст раскладывается по ячейкам:
 *
 *   РАСПИСАНИЕ ГРУППЫ 184615 неделя с 21.09.2026 по 27.09.2026
 *   Пара | Время       | Понедельник | Вторник | ... | Суббота
 *    1   | 08:30-10:10 | ячейка      | ячейка  | ... | ячейка
 *
 * Особенности PDF, которые учитываются:
 *  - на одной странице бывает несколько групп, а таблица группы может продолжаться
 *    на следующей странице (без заголовка и без строки с днями недели);
 *  - строка таблицы может разорваться переносом страницы посередине;
 *  - ширина колонок может меняться от строки к строке;
 *  - слова иногда разбиты на несколько элементов ("МАТЕМ" + "АТИКА").
 *
 * Модуль не зависит от React Native — его можно гонять в Node (см. scripts/).
 */

export type PdfTextItem = {
  page: number;
  str: string;
  /** левый край, pt (начало координат PDF — левый нижний угол) */
  x: number;
  /** базовая линия, pt */
  y: number;
  w: number;
  h: number;
};

export type PdfRect = { page: number; x: number; y: number; w: number; h: number };

export type PdfContent = { items: PdfTextItem[]; rects: PdfRect[] };

export type Lesson = {
  pair: number;
  /** "08:30-10:10" */
  time: string;
  /** Текст ячейки как есть (строки склеены) */
  raw: string;
  subject: string;
  teachers: string[];
  rooms: string[];
};

export type DaySchedule = {
  /** 0 = понедельник ... 5 = суббота */
  weekday: number;
  /** ISO-дата "2026-09-21" или null, если дату недели не удалось распознать */
  date: string | null;
  lessons: Lesson[];
};

export type GroupSchedule = {
  group: string;
  weekStart: string | null;
  weekEnd: string | null;
  days: DaySchedule[];
};

export type ParsedWeek = {
  weekStart: string | null;
  weekEnd: string | null;
  groups: Record<string, GroupSchedule>;
};

/** Увеличивать при изменении логики парсера — кэш старых результатов сбросится. */
export const PARSER_VERSION = 1;

export const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const HEADER_RE = /РАСПИСАНИЕ\s+ГРУППЫ\s+(\S+)/i;
const WEEK_RE = /(\d{2})\.(\d{2})\.(\d{4})\s*по\s*(\d{2})\.(\d{2})\.(\d{4})/;
const PAIR_RE = /^\d{1,2}$/;
const TIME_RE = /\d{1,2}[:.]\d{2}/g;
const EMPTY_CELL_RE = /^[-–—_\s]*$/;

/** Допуск по вертикали, при котором элементы считаются одной строкой текста. */
const SAME_LINE_EPS = 2;
/** Максимальная толщина прямоугольника, который считается линией границы. */
const MAX_BORDER = 2.5;

type Range = { left: number; right: number };
type DayRange = Range & { day: number };

type Cell = Range & {
  page: number;
  top: number;
  bottom: number;
  items: PdfTextItem[];
  text: string;
};

type Row = { n: number; top: number; bottom: number; center: number; time: string };

type Segment = { page: number; top: number; bottom: number; group: string; header: string };

/** Что нужно помнить о группе между кусками таблицы на разных страницах. */
type GroupState = {
  /** колонки из шапки таблицы */
  dayRanges: Range[] | null;
  pairCol: Range | null;
  timeCol: Range | null;
  /** последняя пара на предыдущем куске — к ней дописывается хвост разорванной строки */
  lastRow: Row | null;
  /** ячейки последней строки и их дни — по ним определяем день у хвостов */
  lastRowCells: DayRange[];
  /** начало строки, чей номер пары оказался уже на следующей странице */
  pending: Cell[];
};

export class ScheduleParseError extends Error {}

// ---------------------------------------------------------------------------
// Публичное API
// ---------------------------------------------------------------------------

export function parseSchedule(content: PdfContent): ParsedWeek {
  const items = mergeFragments(
    content.items
      .filter((it) => it.str && it.str.trim().length > 0)
      .map((it) => ({ ...it, str: it.str.replace(/\s+/g, ' ') })),
  );
  const cells = buildCells(items, buildBorders(content.rects));

  const groups: Record<string, GroupSchedule> = {};
  const states: Record<string, GroupState> = {};
  let weekStart: string | null = null;
  let weekEnd: string | null = null;

  for (const seg of findSegments(items)) {
    let group = groups[seg.group];
    if (!group) {
      const week = parseWeek(seg.header);
      weekStart = weekStart ?? week.start;
      weekEnd = weekEnd ?? week.end;
      group = {
        group: seg.group,
        weekStart: week.start,
        weekEnd: week.end,
        days: WEEKDAYS.map((_, i) => ({
          weekday: i,
          date: week.start ? addDays(week.start, i) : null,
          lessons: [],
        })),
      };
      groups[seg.group] = group;
    }

    const state = (states[seg.group] ??= {
      dayRanges: null,
      pairCol: null,
      timeCol: null,
      lastRow: null,
      lastRowCells: [],
      pending: [],
    });
    const segCells = cells.filter((c) => {
      const mid = (c.top + c.bottom) / 2;
      return c.page === seg.page && mid < seg.top && mid > seg.bottom;
    });
    parseSegment(segCells, group, state);
  }

  if (Object.keys(groups).length > 0 && cells.length === 0) {
    throw new ScheduleParseError('В PDF не найдены границы таблиц — похоже, формат расписания изменился');
  }

  for (const g of Object.values(groups)) {
    for (const d of g.days) d.lessons.sort((a, b) => a.pair - b.pair);
  }
  return { weekStart, weekEnd, groups };
}

/** Разбор текста ячейки на предмет / преподавателей / аудитории. */
export function parseLessonText(raw: string): Omit<Lesson, 'pair' | 'time' | 'raw'> {
  let rest = ` ${raw} `;

  const rooms: string[] = [];
  rest = rest.replace(/ауд\.\s*(.+?)(?=\s+ауд\.|\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ]\.|\s*$)/g, (_, room: string) => {
    rooms.push(room.trim());
    return ' ';
  });

  const teachers: string[] = [];
  rest = rest.replace(/[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s+[А-ЯЁ]\.\s?(?:[А-ЯЁ]\.)?/g, (t: string) => {
    teachers.push(t.replace(/\s+/g, ' ').replace(/\.\s(?=[А-ЯЁ]\.)/, '.').trim());
    return ' ';
  });

  return { subject: rest.replace(/\s+/g, ' ').trim(), teachers, rooms };
}

// ---------------------------------------------------------------------------
// Текст
// ---------------------------------------------------------------------------

/**
 * pdf.js иногда режет слово на несколько элементов ("МАТЕМ" + "АТИКА",
 * "Вторни" + "к"). Склеиваем элементы, стоящие вплотную на одной строке.
 */
function mergeFragments(items: PdfTextItem[]): PdfTextItem[] {
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const out: PdfTextItem[] = [];
  for (const it of sorted) {
    const last = out[out.length - 1];
    const gap = last ? it.x - (last.x + last.w) : Infinity;
    if (last && last.page === it.page && Math.abs(last.y - it.y) < 0.5 && gap > -1 && gap < 1) {
      out[out.length - 1] = { ...last, str: last.str + it.str, w: it.x + it.w - last.x };
    } else {
      out.push(it);
    }
  }
  return out;
}

/** Склейка элементов в строки текста (сверху вниз, слева направо). */
function itemsToLines(items: PdfTextItem[]): { y: number; text: string }[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; items: PdfTextItem[] }[] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - it.y) < SAME_LINE_EPS) last.items.push(it);
    else lines.push({ y: it.y, items: [it] });
  }
  return lines.map((l) => {
    const parts = l.items.sort((a, b) => a.x - b.x);
    let text = '';
    let prevEnd: number | null = null;
    for (const p of parts) {
      text += prevEnd !== null && p.x - prevEnd > 1 ? ` ${p.str}` : p.str;
      prevEnd = p.x + p.w;
    }
    return { y: l.y, text: text.replace(/\s+/g, ' ').trim() };
  });
}

function joinCellLines(lines: string[]): string {
  let out = '';
  for (const l of lines) {
    if (!l) continue;
    if (!out) out = l;
    else if (/[-‐]$/.test(out) && !/-{2,}$/.test(out)) out += l; // перенос: "ДОРОЖНО-" + "СТРОИТЕЛЬНЫЕ"
    else out += ` ${l}`;
  }
  return out.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Ячейки по линиям границ
// ---------------------------------------------------------------------------

type HSeg = { y: number; x1: number; x2: number };
type VSeg = { x: number; y1: number; y2: number };
type PageBorders = { h: HSeg[]; v: VSeg[]; minX: number; maxX: number };

function buildBorders(rects: PdfRect[]): Map<number, PageBorders> {
  const byPage = new Map<number, PageBorders>();
  for (const r of rects) {
    const x = Math.min(r.x, r.x + r.w);
    const y = Math.min(r.y, r.y + r.h);
    const w = Math.abs(r.w);
    const h = Math.abs(r.h);
    if (Math.min(w, h) > MAX_BORDER || Math.max(w, h) < 1.5) continue;

    let page = byPage.get(r.page);
    if (!page) byPage.set(r.page, (page = { h: [], v: [], minX: Infinity, maxX: -Infinity }));
    if (w >= h) page.h.push({ y: y + h / 2, x1: x, x2: x + w });
    else page.v.push({ x: x + w / 2, y1: y, y2: y + h });
    page.minX = Math.min(page.minX, x);
    page.maxX = Math.max(page.maxX, x + w);
  }
  return byPage;
}

/** Ячейка вокруг точки: ближайшие линии слева/справа/сверху/снизу, проходящие мимо точки. */
function cellAround(b: PageBorders, px: number, py: number): (Range & { top: number; bottom: number }) | null {
  const EPS = 0.8;
  let left = -Infinity;
  let right = Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const s of b.v) {
    if (py < s.y1 - EPS || py > s.y2 + EPS) continue;
    if (s.x <= px && s.x > left) left = s.x;
    if (s.x >= px && s.x < right) right = s.x;
  }
  for (const s of b.h) {
    if (px < s.x1 - EPS || px > s.x2 + EPS) continue;
    if (s.y >= py && s.y < top) top = s.y;
    if (s.y <= py && s.y > bottom) bottom = s.y;
  }
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  // Таблица бывает шире страницы — тогда боковой границы крайней колонки просто нет
  if (!Number.isFinite(left)) left = b.minX;
  if (!Number.isFinite(right)) right = b.maxX;
  return { left, right, top, bottom };
}

function buildCells(items: PdfTextItem[], borders: Map<number, PageBorders>): Cell[] {
  const cells = new Map<string, Cell>();
  for (const it of items) {
    const b = borders.get(it.page);
    if (!b) continue;
    // Точка внутри первой буквы: чуть правее левого края текста, над базовой линией
    const box = cellAround(b, it.x + 1, it.y + Math.max(it.h, 4) * 0.35);
    if (!box) continue;
    const key = [it.page, box.left, box.right, box.top, box.bottom].map((v) => v.toFixed(1)).join('|');
    let cell = cells.get(key);
    if (!cell) cells.set(key, (cell = { page: it.page, ...box, items: [], text: '' }));
    cell.items.push(it);
  }
  const out = [...cells.values()];
  for (const c of out) c.text = joinCellLines(itemsToLines(c.items).map((l) => l.text));
  return out;
}

const overlap = (a: Range, b: Range) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));

// ---------------------------------------------------------------------------
// Сегменты: куски страниц, принадлежащие одной группе
// ---------------------------------------------------------------------------

function findSegments(items: PdfTextItem[]): Segment[] {
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  const segments: Segment[] = [];
  let current: { group: string; header: string } | null = null;

  for (const page of pages) {
    const headers: { y: number; text: string; group: string }[] = [];
    for (const l of itemsToLines(items.filter((i) => i.page === page))) {
      const m = HEADER_RE.exec(l.text);
      if (m) headers.push({ y: l.y, text: l.text, group: m[1] });
    }

    // Верх страницы до первого заголовка — продолжение таблицы предыдущей группы
    if (current) {
      segments.push({
        page,
        top: Infinity,
        bottom: headers.length > 0 ? headers[0].y : -Infinity,
        group: current.group,
        header: current.header,
      });
    }

    headers.forEach((h, idx) => {
      segments.push({
        page,
        top: h.y,
        bottom: idx + 1 < headers.length ? headers[idx + 1].y : -Infinity,
        group: h.group,
        header: h.text,
      });
    });
    const last = headers[headers.length - 1];
    if (last) current = { group: last.group, header: last.text };
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Разбор куска таблицы одной группы на одной странице
// ---------------------------------------------------------------------------

function parseSegment(cells: Cell[], group: GroupSchedule, state: GroupState) {
  const isWord = (c: Cell, word: string) => c.text.toLowerCase() === word.toLowerCase();

  // Шапка таблицы: "Пара | Время | Понедельник | ... | Суббота"
  const dayHeaders = WEEKDAYS.map((d) => cells.find((c) => isWord(c, d)));
  let body = cells;
  if (dayHeaders.every(Boolean)) {
    const headers = dayHeaders as Cell[];
    const range = (c: Cell | undefined) => (c ? { left: c.left, right: c.right } : null);
    state.dayRanges = headers.map((h) => ({ left: h.left, right: h.right }));
    state.pairCol = range(cells.find((c) => isWord(c, 'Пара')));
    state.timeCol = range(cells.find((c) => isWord(c, 'Время')));
    state.lastRow = null;
    state.lastRowCells = [];
    state.pending = [];
    const headerBottom = Math.min(...headers.map((h) => h.bottom));
    body = cells.filter((c) => c.top <= headerBottom + 1);
  }
  const dayRanges = state.dayRanges;
  if (!dayRanges) return; // шапку не видели — непонятно, где какие дни
  const headerDays: DayRange[] = dayRanges.map((r, day) => ({ ...r, day }));

  const inLeftPart = (c: Cell) => c.right <= dayRanges[0].left + 1;
  const isPairCell = (c: Cell) =>
    PAIR_RE.test(c.text) && (state.pairCol ? overlap(c, state.pairCol) > 1 : inLeftPart(c));
  const isTimeCell = (c: Cell) =>
    /\d{1,2}[:.]\d{2}/.test(c.text) && (state.timeCol ? overlap(c, state.timeCol) > 1 : inLeftPart(c));

  const timeCells = body.filter(isTimeCell);
  const rows: Row[] = body
    .filter(isPairCell)
    .map((c) => {
      const center = (c.top + c.bottom) / 2;
      const timeCell = timeCells.find((t) => t.bottom <= center && t.top >= center);
      const tokens = timeCell?.text.match(TIME_RE) ?? [];
      const time = tokens.length >= 2 ? `${tokens[0]}-${tokens[tokens.length - 1]}` : tokens.join('');
      return { n: Number(c.text), top: c.top, bottom: c.bottom, center, time };
    })
    .sort((a, b) => b.center - a.center);

  const dayCells = body.filter((c) => !inLeftPart(c) && !isPairCell(c) && !isTimeCell(c));

  // Ячейки -> строки таблицы. Объединённая по вертикали ячейка попадает в несколько пар.
  const byRow: Cell[][] = rows.map(() => []);
  const carryUp: Cell[] = [];
  const carryDown: Cell[] = [];
  for (const cell of dayCells) {
    let matched = false;
    rows.forEach((r, i) => {
      if (r.center <= cell.top && r.center >= cell.bottom) {
        byRow[i].push(cell);
        matched = true;
      }
    });
    if (matched) continue;
    // Кусок строки без номера пары: хвост строки с прошлой страницы или начало
    // строки, чей номер пары окажется на следующей странице
    const aboveRows = rows.length === 0 ? state.lastRow !== null : cell.bottom >= rows[0].top - 1;
    (aboveRows ? carryUp : carryDown).push(cell);
  }

  if (state.lastRow) {
    const lastRow = state.lastRow;
    const known = state.lastRowCells.length ? state.lastRowCells : headerDays;
    for (const cell of carryUp) appendText(group.days[dayByRanges(cell, known)], lastRow, cell.text, false);
  }

  rows.forEach((row, i) => {
    const rowCells = byRow[i].sort((a, b) => a.left - b.left);
    // Обычно в строке ровно 6 ячеек — по одной на день. Иначе (объединённые
    // ячейки, пустые клетки без "-------") — сопоставляем с колонками шапки.
    const days =
      rowCells.length === WEEKDAYS.length
        ? rowCells.map((_, d) => d)
        : rowCells.map((c) => dayByRanges(c, headerDays));
    const own: DayRange[] = rowCells.map((c, k) => ({ left: c.left, right: c.right, day: days[k] }));
    rowCells.forEach((c, k) => appendText(group.days[days[k]], row, c.text, false));

    // Начало этой строки осталось внизу прошлой страницы
    if (i === 0 && state.pending.length) {
      for (const cell of state.pending) {
        appendText(group.days[dayByRanges(cell, own.length ? own : headerDays)], row, cell.text, true);
      }
      state.pending = [];
    }
    state.lastRowCells = own;
  });

  if (rows.length) state.lastRow = rows[rows.length - 1];
  if (carryDown.length) state.pending = carryDown;
}

function dayByRanges(cell: Range, ranges: DayRange[]): number {
  let best = ranges[0];
  let bestOverlap = -1;
  for (const r of ranges) {
    const o = overlap(cell, r);
    if (o > bestOverlap) {
      best = r;
      bestOverlap = o;
    }
  }
  return best.day;
}

function appendText(day: DaySchedule, row: Row, text: string, prepend: boolean) {
  if (EMPTY_CELL_RE.test(text)) return;
  const idx = day.lessons.findIndex((l) => l.pair === row.n);
  if (idx === -1) {
    day.lessons.push(makeLesson(row.n, row.time, text));
    return;
  }
  const prev = day.lessons[idx];
  const raw = prepend ? joinCellLines([text, prev.raw]) : joinCellLines([prev.raw, text]);
  day.lessons[idx] = makeLesson(prev.pair, prev.time || row.time, raw);
}

function makeLesson(pair: number, time: string, raw: string): Lesson {
  const cleaned = raw.replace(/-{3,}/g, ' ').replace(/\s+/g, ' ').trim();
  return { pair, time, raw: cleaned, ...parseLessonText(cleaned) };
}

// ---------------------------------------------------------------------------
// Даты
// ---------------------------------------------------------------------------

function parseWeek(header: string): { start: string | null; end: string | null } {
  const m = WEEK_RE.exec(header);
  if (!m) return { start: null, end: null };
  return { start: `${m[3]}-${m[2]}-${m[1]}`, end: `${m[6]}-${m[5]}-${m[4]}` };
}

function addDays(iso: string, days: number): string {
  const [y, mo, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d + days));
  return date.toISOString().slice(0, 10);
}
