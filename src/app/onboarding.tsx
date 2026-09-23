import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { useSchedule } from '../schedule/ScheduleProvider';
import { useSettings } from '../settings/SettingsProvider';
import { GroupPicker } from '../ui/GroupPicker';
import { Button, Card, IconButton, Text, type IconName } from '../ui/kit';

/** "Расскажите о себе": колледж фиксирован, выбирается только группа. */
export default function OnboardingScreen() {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const schedule = useSchedule();
  const [group, setGroup] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const groups = useMemo(
    () => Object.keys((schedule.currentWeek ?? schedule.week)?.groups ?? {}),
    [schedule.currentWeek, schedule.week],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <IconButton icon="arrow-left" onPress={auth.signOut} />
      <Text variant="title" style={{ marginTop: 20 }}>
        {t('aboutYouTitle')}
      </Text>
      <Text muted style={{ marginTop: 6, marginBottom: 28 }}>
        {t('aboutYouSubtitle')}
      </Text>

      <View style={{ gap: 12 }}>
        <Field icon="home" caption={t('college')} value={t('collegeName')} />
        <Field
          icon="users"
          caption={t('group')}
          value={group ?? t('chooseGroup')}
          placeholder={!group}
          onPress={() => setPickerOpen(true)}
        />
      </View>

      {schedule.error && groups.length === 0 ? (
        <Text variant="caption" color={theme.danger} style={{ marginTop: 16 }}>
          {schedule.error}
        </Text>
      ) : null}

      <View style={{ flex: 1 }} />
      <Button title={t('continue')} disabled={!group} onPress={() => group && schedule.selectGroup(group)} />

      <GroupPicker
        visible={pickerOpen}
        groups={groups}
        selected={group}
        loading={schedule.stage !== null}
        onSelect={setGroup}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function Field({
  icon,
  caption,
  value,
  placeholder,
  onPress,
}: {
  icon: IconName;
  caption: string;
  value: string;
  placeholder?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useSettings();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Card style={styles.field}>
        <Feather name={icon} size={22} color={theme.navy} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" muted>
            {caption}
          </Text>
          <Text variant="subtitle" color={placeholder ? theme.textFaint : theme.text}>
            {value}
          </Text>
        </View>
        {onPress ? <Feather name="chevron-right" size={18} color={theme.textFaint} /> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 16 },
});
