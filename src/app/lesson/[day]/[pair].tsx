import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSchedule } from '../../../schedule/ScheduleProvider';
import { groupWeek } from '../../../schedule/selectors';
import { useSettings } from '../../../settings/SettingsProvider';
import { breakBetween, fromMinutes, lessonMeta, lessonRange, lessonTimeLabel, lessonTitle } from '../../../ui/format';
import { Card, IconButton, Text, type IconName } from '../../../ui/kit';
import { LessonCard } from '../../../ui/LessonCard';
import { FadeIn, PressableScale } from '../../../ui/motion';

/** Подробности пары: переключатель пар дня, преподаватель, аудитория, длительность, перемена. */
export default function LessonScreen() {
  const { theme, t, dates } = useSettings();
  const insets = useSafeAreaInsets();
  const s = useSchedule();
  const params = useLocalSearchParams<{
    day: string;
    pair: string;
    src?: string;
  }>();
  const dayIdx = Number(params.day);
  const pairN = Number(params.pair);

  const g = groupWeek(params.src === 'home' ? s.currentWeek : s.week, s.group);
  const day = g?.days[dayIdx];
  const lessons = day?.lessons ?? [];
  const i = lessons.findIndex((l) => l.pair === pairN);
  const lesson = lessons[i];
  const next = lessons[i + 1];

  // Направление переключения пары — карточка въезжает с той же стороны
  const [dir, setDir] = useState(0);
  const openPair = (pair: number) => {
    setDir(pair > pairN ? 1 : -1);
    router.setParams({ pair: String(pair) });
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!lesson || !day) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, backgroundColor: theme.bg }]}>
        <IconButton icon="arrow-left" onPress={back} />
        <Text muted style={{ marginTop: 24 }}>
          {t('notLoaded')}
        </Text>
      </View>
    );
  }

  const range = lessonRange(lesson);
  const duration = range ? range.to - range.from : null;
  const br = next ? breakBetween(lesson, next) : null;
  const meta = lessonMeta(lesson, (room) => t('room', { room }));

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top + 12 }]}>
      <IconButton icon="arrow-left" onPress={back} />
      <Text variant="title" style={{ marginTop: 14, marginBottom: 16 }}>
        {day.date ? dates.fullDate(day.date) : ''}
      </Text>

      {/* Пары этого дня */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.chips}
      >
        {lessons.map((l) => {
          const active = l.pair === pairN;
          return (
            <PressableScale
              key={l.pair}
              onPress={() => openPair(l.pair)}
              scaleTo={0.92}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text variant="subtitle" color={active ? theme.primaryText : theme.text}>
                {fromMinutes(lessonRange(l)?.from ?? 0)}
              </Text>
              <Text variant="small" color={active ? theme.primaryText : theme.textMuted}>
                {t('pairN', { n: l.pair })}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <FadeIn key={`card${pairN}`} dx={dir * 32} dy={dir ? 0 : 14} duration={280}>
          <Card style={styles.main}>
            <View style={[styles.bar, { backgroundColor: theme.primary }]} />
            <View style={{ flex: 1, padding: 18 }}>
              <Text variant="heading">{lessonTitle(lesson)}</Text>
              <Text variant="subtitle" style={{ marginTop: 4 }}>
                {lessonTimeLabel(lesson)}
              </Text>
              {meta ? (
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={13} color={theme.textMuted} />
                  <Text variant="caption" muted style={{ flex: 1 }}>
                    {meta}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <Info icon="user" label={t('teacher')} value={lesson.teachers.join(', ') || t('notSpecified')} />
              <Info icon="map-pin" label={t('roomLabel')} value={lesson.rooms.join(', ') || t('notSpecified')} />
              {duration !== null ? (
                <Info
                  icon="clock"
                  label={t('duration')}
                  value={
                    duration >= 60
                      ? t('durationValue', {
                          h: Math.floor(duration / 60),
                          m: duration % 60,
                        })
                      : t('durationMinutes', { m: duration })
                  }
                />
              ) : null}

              <View style={[styles.breakBox, { backgroundColor: theme.cardAlt }]}>
                <Feather name="coffee" size={14} color={theme.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" muted>
                    {br ? t('breakAfter') : t('lastLessonOfDay')}
                  </Text>
                  {br ? (
                    <Text variant="captionMedium">
                      {fromMinutes(br.from)} – {fromMinutes(br.to)} ({t('durationMinutes', { m: br.minutes })})
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </Card>
        </FadeIn>

        {next ? (
          <FadeIn key={`next${pairN}`} delay={80} dx={dir * 32} dy={dir ? 0 : 14} duration={280}>
            <Text variant="subtitle" style={{ marginTop: 22, marginBottom: 10 }}>
              {t('nextLesson')}
            </Text>
            <LessonCard lesson={next} onPress={() => openPair(next.pair)} />
          </FadeIn>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Info({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { theme } = useSettings();
  return (
    <View style={styles.info}>
      <Feather name={icon} size={18} color={theme.navy} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" muted>
          {label}
        </Text>
        <Text variant="bodyMedium">{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  chips: { gap: 8, paddingBottom: 16 },
  chip: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  main: { flexDirection: 'row', overflow: 'hidden' },
  bar: { width: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  info: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  breakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
});
