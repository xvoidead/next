import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDaysIso, todayIso } from '../../data/scheduleService';
import type { Lesson } from '../../parser/scheduleParser';
import { useSchedule } from '../../schedule/ScheduleProvider';
import { daysBetween, groupWeek, weekDates } from '../../schedule/selectors';
import { useSettings } from '../../settings/SettingsProvider';
import { breakBetween, fromMinutes, lessonRange } from '../../ui/format';
import { Badge, IconButton, Text } from '../../ui/kit';
import { LessonCard } from '../../ui/LessonCard';
import { FadeIn, PressableScale, useSpringValue } from '../../ui/motion';

type Row = { kind: 'lesson'; lesson: Lesson } | { kind: 'break'; from: number; to: number; minutes: number };

export default function ScheduleScreen() {
  const { theme, t, dates } = useSettings();
  const insets = useSafeAreaInsets();
  const s = useSchedule();
  const today = todayIso();

  // s.weeks отсортированы от новых к старым; стрелка влево — к более ранней неделе
  const idx = s.weeks.findIndex((w) => w.url === s.selectedUrl);
  const link = idx >= 0 ? s.weeks[idx] : null;
  const older = idx >= 0 && idx < s.weeks.length - 1 ? s.weeks[idx + 1] : null;
  const newer = idx > 0 ? s.weeks[idx - 1] : null;

  const weekStart = s.week?.weekStart ?? link?.startDate ?? null;
  const days = weekDates(weekStart);
  const rangeLabel = weekStart ? dates.range(weekStart, addDaysIso(weekStart, 6)) : (link?.title ?? '');

  // День по умолчанию — сегодня, если он в неделе; выбор пользователя помним для этой недели
  const [picked, setPicked] = useState<{
    week: string | null;
    day: number;
  } | null>(null);
  // Направление последнего перехода: -1 — назад (раньше), 1 — вперёд; от него зависит сдвиг анимации
  const [dir, setDir] = useState(0);
  const todayIdx = weekStart ? daysBetween(weekStart, today) : -1;
  const day = picked && picked.week === weekStart ? picked.day : todayIdx >= 0 && todayIdx <= 6 ? todayIdx : 0;

  const g = groupWeek(s.week, s.group);
  const lessons = useMemo(() => (day < 6 ? (g?.days[day]?.lessons ?? []) : []), [g, day]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    lessons.forEach((lesson, i) => {
      out.push({ kind: 'lesson', lesson });
      const next = lessons[i + 1];
      const br = next ? breakBetween(lesson, next) : null;
      if (br) out.push({ kind: 'break', ...br });
    });
    return out;
  }, [lessons]);

  // Индикатор выбранного дня скользит под чипами; ширина чипа — из ширины ряда
  const [daysWidth, setDaysWidth] = useState(0);
  const chipWidth = daysWidth ? (daysWidth - DAYS_PAD * 2 - DAY_GAP * 6) / 7 : 0;
  const indicatorX = useSpringValue(day * (chipWidth + DAY_GAP), chipWidth);

  const goWeek = (url: string, d: number) => {
    setDir(d);
    s.openWeek(url);
  };
  const pickDay = (i: number) => {
    setDir(i > day ? 1 : i < day ? -1 : 0);
    setPicked({ week: weekStart, day: i });
  };

  const loadingText = s.stage
    ? t(
        (
          {
            list: 'loadingList',
            download: 'loadingDownload',
            extract: 'loadingExtract',
            parse: 'loadingParse',
          } as const
        )[s.stage],
      )
    : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top + 16 }]}>
      <Text variant="title" style={styles.title}>
        {t('scheduleTitle')}
      </Text>

      {/* Неделя */}
      <View style={styles.weekNav}>
        <IconButton icon="chevron-left" onPress={() => older && goWeek(older.url, -1)} disabled={!older} />
        <FadeIn key={rangeLabel} dx={dir * 16} dy={0} duration={260} style={styles.weekLabel}>
          <Text variant="subtitle">{rangeLabel}</Text>
          {link?.isNew ? <Badge label={t('newWeek')} /> : null}
        </FadeIn>
        <IconButton icon="chevron-right" onPress={() => newer && goWeek(newer.url, 1)} disabled={!newer} />
      </View>

      {/* Дни Пн..Вс */}
      <View style={styles.days} onLayout={(e) => setDaysWidth(e.nativeEvent.layout.width)}>
        {/* Слои: фоны чипов → скользящий индикатор → чипы (рамка и текст), чтобы индикатор не прятался под соседями */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dayBackgrounds]}>
          {days.map((_, i) => (
            <View key={i} style={[styles.dayBackground, { backgroundColor: theme.card }]} />
          ))}
        </View>
        {chipWidth ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.dayIndicator,
              {
                width: chipWidth,
                backgroundColor: theme.primary,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        ) : null}
        {days.map((date, i) => {
          const active = i === day;
          const isToday = date === today;
          return (
            <PressableScale
              key={i}
              onPress={() => pickDay(i)}
              scaleTo={0.9}
              containerStyle={{ flex: 1 }}
              style={[
                styles.dayChip,
                {
                  // активный фон рисует скользящий индикатор; до замера ширины — сам чип
                  backgroundColor: active && !chipWidth ? theme.primary : 'transparent',
                  borderColor: active ? 'transparent' : isToday ? theme.primary : theme.border,
                },
              ]}
            >
              <Text variant="small" color={active ? theme.primaryText : theme.textMuted}>
                {dates.weekdayShort(i)}
              </Text>
              <Text variant="subtitle" color={active ? theme.primaryText : theme.text}>
                {date ? Number(date.slice(8, 10)) : ''}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {s.error ? (
        <Pressable
          onPress={s.retry}
          style={[styles.banner, { backgroundColor: s.week ? theme.warnSoft : theme.dangerSoft }]}
        >
          <Feather name="alert-circle" size={16} color={s.week ? theme.warnText : theme.danger} />
          <Text variant="caption" color={s.week ? theme.warnText : theme.danger} style={{ flex: 1 }}>
            {s.week ? `${s.error}. ${t('showingCached')}` : s.error}
          </Text>
          <Text variant="captionMedium" color={s.week ? theme.warnText : theme.danger}>
            {t('retry')}
          </Text>
        </Pressable>
      ) : null}
      {s.stage && s.week ? (
        <View style={styles.progress}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text variant="caption" muted>
            {loadingText}
          </Text>
        </View>
      ) : null}

      <FlatList
        // новый key на каждый день/неделю — карточки заново въезжают со стороны перехода
        key={`${weekStart}:${day}`}
        data={rows}
        keyExtractor={(r) => (r.kind === 'lesson' ? `l${r.lesson.pair}` : `b${r.from}`)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={s.refreshing}
            onRefresh={s.refresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        renderItem={({ item, index }) => (
          <FadeIn delay={Math.min(index, 8) * 35} dx={dir * 28} dy={dir ? 0 : 10} duration={280}>
            {item.kind === 'lesson' ? (
              <View style={styles.timelineRow}>
                <Text variant="caption" muted style={styles.timeCol}>
                  {fromMinutes(lessonRange(item.lesson)?.from ?? 0)}
                </Text>
                <View style={{ flex: 1 }}>
                  <LessonCard lesson={item.lesson} onPress={() => router.push(`/lesson/${day}/${item.lesson.pair}`)} />
                </View>
              </View>
            ) : (
              <View style={styles.timelineRow}>
                <View style={styles.timeCol} />
                <View style={[styles.breakPill, { backgroundColor: theme.primarySoft }]}>
                  <Feather name="coffee" size={12} color={theme.primary} />
                  <Text variant="caption" color={theme.primary}>
                    {fromMinutes(item.from)} – {fromMinutes(item.to)} · {t('breakLabel', { n: item.minutes })}
                  </Text>
                </View>
              </View>
            )}
          </FadeIn>
        )}
        ListEmptyComponent={
          <FadeIn style={styles.empty} dx={dir * 28} dy={dir ? 0 : 10}>
            {s.stage && !s.week ? (
              <>
                <ActivityIndicator color={theme.primary} />
                <Text muted>{loadingText}</Text>
              </>
            ) : !s.week ? (
              <Text muted>{t('notLoaded')}</Text>
            ) : !g ? (
              <>
                <Text variant="subtitle" style={{ textAlign: 'center' }}>
                  {t('groupMissing', { group: s.group ?? '' })}
                </Text>
                <Text variant="caption" muted style={{ textAlign: 'center' }}>
                  {t('groupMissingHint')}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 32, lineHeight: 40 }}>🎉</Text>
                <Text variant="subtitle">{t('noLessons')}</Text>
              </>
            )}
          </FadeIn>
        }
      />
    </View>
  );
}

const DAYS_PAD = 16;
const DAY_GAP = 6;

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { paddingHorizontal: 20, marginBottom: 12 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  weekLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  days: {
    flexDirection: 'row',
    gap: DAY_GAP,
    paddingHorizontal: DAYS_PAD,
    marginBottom: 12,
  },
  dayBackgrounds: { flexDirection: 'row', gap: DAY_GAP, paddingHorizontal: DAYS_PAD },
  dayBackground: { flex: 1, borderRadius: 12 },
  dayIndicator: {
    position: 'absolute',
    left: DAYS_PAD,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  dayChip: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10, flexGrow: 1 },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timeCol: { width: 42, paddingTop: 12 },
  breakPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 10,
  },
});
