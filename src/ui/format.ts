import type { Lesson } from '../parser/scheduleParser';

/** Аббревиатуры, которые не надо переводить в строчные. */
const KEEP_UPPER = new Set(['МДК', 'УП', 'ПП', 'ПМ', 'ОП', 'ОБЖ', 'ИТ', 'ИКТ', 'ЭВМ', 'ПК', 'САПР', 'ОБЗР', 'ОГСЭ', 'ЕН', 'ОУД']);

/**
 * "МДК.02.02 ГЕОЛОГИЯ И ГРУНТОВЕДЕНИЕ" -> "МДК.02.02 Геология и грунтоведение".
 * Коды, номера и аббревиатуры оставляем как есть.
 */
export function prettifySubject(subject: string): string {
  let capitalizeNext = true;
  return subject
    .split(' ')
    .map((word) => {
      const letters = word.replace(/[^А-ЯЁа-яёA-Za-z]/g, '');
      if (!letters) return word;
      // Коды вида "МДК.02.02", "УП." и аббревиатуры оставляем как есть
      if (/\d/.test(word) || KEEP_UPPER.has(letters)) return word;
      let out = letters === letters.toUpperCase() ? word.toLowerCase() : word;
      if (capitalizeNext) out = out.charAt(0).toUpperCase() + out.slice(1);
      capitalizeNext = false;
      return out;
    })
    .join(' ');
}

export const lessonTitle = (l: Lesson) => prettifySubject(l.subject || l.raw);

function toMinutes(hhmm: string | undefined): number | null {
  const m = hhmm ? /(\d{1,2})[:.](\d{2})/.exec(hhmm) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Начало и конец пары в минутах от полуночи. */
export function lessonRange(l: Lesson): { from: number; to: number } | null {
  const [a, b] = l.time.split('-');
  const from = toMinutes(a);
  const to = toMinutes(b);
  return from === null || to === null ? null : { from, to };
}

/** "08:30 – 10:10" */
export function lessonTimeLabel(l: Lesson): string {
  const r = lessonRange(l);
  return r ? `${fromMinutes(r.from)} – ${fromMinutes(r.to)}` : l.time;
}

export const nowMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Перемена между двумя парами, если обе с временем и между ними есть зазор. */
export function breakBetween(a: Lesson, b: Lesson): { from: number; to: number; minutes: number } | null {
  const ra = lessonRange(a);
  const rb = lessonRange(b);
  if (!ra || !rb || rb.from <= ra.to) return null;
  return { from: ra.to, to: rb.from, minutes: rb.from - ra.to };
}

/** Строка "ауд. 214 · Петров П. П." */
export function lessonMeta(l: Lesson, roomWord: (room: string) => string): string {
  return [l.rooms.length ? roomWord(l.rooms.join(', ')) : null, l.teachers.join(', ') || null]
    .filter(Boolean)
    .join('  ·  ');
}
