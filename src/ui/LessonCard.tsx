import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Lesson } from '../parser/scheduleParser';
import { useSettings } from '../settings/SettingsProvider';
import { lessonMeta, lessonTimeLabel, lessonTitle } from './format';
import { Badge, Text } from './kit';
import { PressableScale, ProgressBar } from './motion';

/**
 * Карточка пары с синей полосой слева (как на макете).
 * highlight — крупный вариант для "Сейчас"/"Далее" на главной.
 */
export const LessonCard = memo(function LessonCard({
  lesson,
  onPress,
  highlight,
  dimmed,
}: {
  lesson: Lesson;
  onPress?: () => void;
  /** live — пара идёт сейчас (пульсирующая точка), progress — доля прошедшего времени 0..1 */
  highlight?: {
    badge: string;
    footer?: string;
    live?: boolean;
    progress?: number;
  };
  dimmed?: boolean;
}) {
  const { theme, t } = useSettings();
  const meta = lessonMeta(lesson, (room) => t('room', { room }));
  const big = !!highlight;

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      scaleTo={big ? 0.98 : 0.97}
      style={[
        styles.card,
        {
          backgroundColor: big ? theme.primarySoft : theme.card,
          borderColor: big ? theme.primarySoft : theme.border,
          opacity: dimmed ? 0.55 : 1,
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: theme.primary }]} />
      <View style={[styles.body, big && styles.bodyBig]}>
        {highlight ? <Badge label={highlight.badge} solid live={highlight.live} /> : null}
        <Text variant={big ? 'title' : 'captionMedium'} muted={!big} style={big ? { marginTop: 8 } : undefined}>
          {lessonTimeLabel(lesson)}
        </Text>
        <Text variant={big ? 'heading' : 'subtitle'} style={{ marginTop: big ? 2 : 2 }}>
          {lessonTitle(lesson)}
        </Text>
        {meta ? (
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={13} color={theme.textMuted} />
            <Text variant="caption" muted style={{ flex: 1 }}>
              {meta}
            </Text>
          </View>
        ) : null}
        {highlight?.footer ? (
          <View style={styles.metaRow}>
            <Feather name="clock" size={13} color={theme.primary} />
            <Text variant="captionMedium" color={theme.primary}>
              {highlight.footer}
            </Text>
          </View>
        ) : null}
        {highlight?.progress !== undefined ? (
          <ProgressBar value={highlight.progress} color={theme.primary} track={theme.card} style={{ marginTop: 12 }} />
        ) : null}
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  bar: { width: 4 },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  bodyBig: { paddingVertical: 16, paddingHorizontal: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
});
