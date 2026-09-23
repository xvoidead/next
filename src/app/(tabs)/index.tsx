import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { todayIso } from '../../data/scheduleService';
import type { Lesson } from '../../parser/scheduleParser';
import { useSchedule } from '../../schedule/ScheduleProvider';
import { groupWeek, nextStudyDay } from '../../schedule/selectors';
import { useSettings } from '../../settings/SettingsProvider';
import { lessonRange, nowMinutes } from '../../ui/format';
import { Avatar, Badge, Card, Text } from '../../ui/kit';
import { LessonCard } from '../../ui/LessonCard';
import { FadeIn, PressableScale } from '../../ui/motion';

export default function HomeScreen() {
  const { theme, t, dates } = useSettings();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const s = useSchedule();
  const now = useNow();
  const today = todayIso(now);
  const minutes = nowMinutes(now);

  const g = groupWeek(s.currentWeek, s.group);
  const dayIndex = g?.days.findIndex((d) => d.date === today) ?? -1;
  const lessons = dayIndex >= 0 ? g!.days[dayIndex].lessons : [];

  const current = lessons.find((l) => {
    const r = lessonRange(l);
    return r && r.from <= minutes && minutes < r.to;
  });
  const upcoming = lessons.filter((l) => (lessonRange(l)?.from ?? -1) > minutes);
  const hero = current ?? upcoming[0];
  const rest = upcoming.filter((l) => l !== hero);
  const nextDay = hero ? null : nextStudyDay(g, today);

  const open = (lesson: Lesson, day: number) => router.push(`/lesson/${day}/${lesson.pair}?src=home`);
  const firstName = (user?.name ?? '').split(/\s+/)[0] || user?.email || '';

  const heroInfo = (l: Lesson) => {
    const r = lessonRange(l)!;
    if (l === current)
      return {
        badge: t('now'),
        footer: t('minutesLeft', { n: r.to - minutes }),
        live: true,
        progress: (minutes - r.from) / (r.to - r.from),
      };
    const inMin = r.from - minutes;
    return {
      badge: t('upNext'),
      footer: inMin <= 180 ? t('startsIn', { n: inMin }) : undefined,
    };
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={s.refreshing}
          onRefresh={s.refresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      {/* Приветствие */}
      <FadeIn style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" muted>
            {greeting(now, t)}
          </Text>
          <Text variant="title">{firstName}</Text>
          <Text variant="caption" muted style={{ marginTop: 4 }}>
            {dates.fullDate(today)}
          </Text>
        </View>
        <PressableScale onPress={() => router.push('/settings')} hitSlop={8} scaleTo={0.9}>
          <Avatar name={user?.name ?? ''} />
        </PressableScale>
      </FadeIn>

      {/* Сегодня */}
      <FadeIn delay={60} style={styles.sectionHeader}>
        <Text variant="heading">{t('today')}</Text>
        {lessons.length ? <Badge label={dates.pairs(lessons.length)} /> : null}
      </FadeIn>

      {!s.currentWeek ? (
        <FadeIn delay={120}>
          <Card style={styles.message}>
            {s.stage ? <ActivityIndicator color={theme.primary} /> : null}
            <Text muted style={{ textAlign: 'center' }}>
              {s.error ?? t('notLoaded')}
            </Text>
          </Card>
        </FadeIn>
      ) : hero ? (
        <>
          <FadeIn key={`hero${hero.pair}`} delay={120} dy={18}>
            <LessonCard lesson={hero} highlight={heroInfo(hero)} onPress={() => open(hero, dayIndex)} />
          </FadeIn>
          {rest.length ? (
            <>
              <FadeIn delay={180}>
                <Text variant="subtitle" style={styles.subheading}>
                  {rest.length === 1 ? t('nextLesson') : t('laterToday')}
                </Text>
              </FadeIn>
              <View style={styles.list}>
                {rest.map((l, i) => (
                  <FadeIn key={l.pair} delay={220 + i * 50}>
                    <LessonCard lesson={l} onPress={() => open(l, dayIndex)} />
                  </FadeIn>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : (
        <>
          <FadeIn delay={120}>
            <Card style={styles.message}>
              <Text style={{ fontSize: 32, lineHeight: 40 }}>{lessons.length ? '✅' : '🎉'}</Text>
              <Text variant="subtitle">{lessons.length ? t('lessonsOver') : t('noLessonsToday')}</Text>
              <Text variant="caption" muted>
                {t('restHint')}
              </Text>
            </Card>
          </FadeIn>
          {nextDay?.date ? (
            <>
              <FadeIn delay={180}>
                <Text variant="subtitle" style={styles.subheading}>
                  {t('nextStudyDay')} · {dates.fullDate(nextDay.date)}
                </Text>
              </FadeIn>
              <View style={styles.list}>
                {nextDay.lessons.map((l, i) => (
                  <FadeIn key={l.pair} delay={220 + i * 50}>
                    <LessonCard lesson={l} onPress={() => open(l, nextDay.weekday)} />
                  </FadeIn>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function greeting(now: Date, t: ReturnType<typeof useSettings>['t']) {
  const h = now.getHours();
  if (h < 5) return t('greetingNight');
  if (h < 12) return t('greetingMorning');
  if (h < 18) return t('greetingDay');
  return t('greetingEvening');
}

/** Текущее время с обновлением раз в 30 секунд — для "Осталось N мин". */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subheading: { marginTop: 22, marginBottom: 10 },
  list: { gap: 10 },
  message: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
});
