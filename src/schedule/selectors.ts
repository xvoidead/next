import { addDaysIso } from '../data/scheduleService';
import type { DaySchedule, GroupSchedule, ParsedWeek } from '../parser/scheduleParser';

/** Расписание выбранной группы в неделе (или null, если группы в этой неделе нет). */
export function groupWeek(week: ParsedWeek | null, group: string | null): GroupSchedule | null {
  return week && group ? week.groups[group] ?? null : null;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Даты Пн..Вс недели; в PDF только Пн..Сб, воскресенье добавляем для полосы дней. */
export function weekDates(weekStart: string | null): (string | null)[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart ? addDaysIso(weekStart, i) : null));
}

/** Первый день после today, в который есть пары. */
export function nextStudyDay(g: GroupSchedule | null, today: string): DaySchedule | null {
  if (!g) return null;
  return g.days.find((d) => d.date !== null && d.date > today && d.lessons.length > 0) ?? null;
}
