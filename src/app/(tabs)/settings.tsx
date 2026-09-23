import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCHEDULE_PAGE_URL } from '../../api/narfuSite';
import { useAuth } from '../../auth/AuthProvider';
import type { Language } from '../../i18n/strings';
import { useSchedule } from '../../schedule/ScheduleProvider';
import { useSettings, type ThemeMode } from '../../settings/SettingsProvider';
import { GroupPicker } from '../../ui/GroupPicker';
import { Avatar, Card, ChoiceSheet, ConfirmDialog, ListRow, Section, Text } from '../../ui/kit';

/** Настройки: только то, что реально настраивается — тема, язык, группа. */
export default function SettingsScreen() {
  const { theme, t, themeMode, setThemeMode, language, setLanguage } = useSettings();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const s = useSchedule();
  const [sheet, setSheet] = useState<'theme' | 'language' | 'group' | 'signOut' | null>(null);

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: t('themeSystem') },
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
  ];
  const languageOptions: { value: Language; label: string }[] = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
  ];
  const groups = useMemo(() => Object.keys((s.currentWeek ?? s.week)?.groups ?? {}), [s.currentWeek, s.week]);

  const user = auth.user;

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <Text variant="title" style={{ marginBottom: 16 }}>
        {t('settingsTitle')}
      </Text>

      <Card style={styles.profile}>
        <Avatar name={user?.name ?? ''} size={52} />
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{user?.name}</Text>
          {user?.email ? (
            <Text variant="caption" muted>
              {user.email}
            </Text>
          ) : null}
          <Text variant="small" color={theme.primary} style={{ marginTop: 4 }}>
            {user?.kind === 'flowid' ? t('flowIdAccount') : t('localAccount')}
          </Text>
        </View>
      </Card>

      <Section title={t('sectionApp')}>
        <ListRow
          icon={theme.dark ? 'moon' : 'sun'}
          label={t('appearance')}
          value={themeOptions.find((o) => o.value === themeMode)?.label}
          onPress={() => setSheet('theme')}
        />
        <ListRow
          icon="globe"
          label={t('language')}
          value={languageOptions.find((o) => o.value === language)?.label}
          onPress={() => setSheet('language')}
          last
        />
      </Section>

      <Section title={t('sectionSchedule')}>
        <ListRow icon="users" label={t('myGroup')} value={s.group ?? '—'} onPress={() => setSheet('group')} />
        <ListRow
          icon="refresh-cw"
          label={t('refreshSchedule')}
          value={s.refreshing || s.stage ? '…' : undefined}
          onPress={s.refresh}
          last
        />
      </Section>

      <Section title={t('sectionAbout')}>
        <ListRow icon="info" label={t('version')} value={Constants.expoConfig?.version ?? '1.0.0'} />
        <ListRow
          icon="external-link"
          label={t('dataSource')}
          value="narfu.ru"
          onPress={() => WebBrowser.openBrowserAsync(SCHEDULE_PAGE_URL)}
          last
        />
      </Section>

      <Section>
        <ListRow icon="log-out" label={t('signOut')} onPress={() => setSheet('signOut')} danger last />
      </Section>

      <ChoiceSheet
        visible={sheet === 'theme'}
        title={t('appearance')}
        options={themeOptions}
        value={themeMode}
        onSelect={setThemeMode}
        onClose={() => setSheet(null)}
      />
      <ChoiceSheet
        visible={sheet === 'language'}
        title={t('language')}
        options={languageOptions}
        value={language}
        onSelect={setLanguage}
        onClose={() => setSheet(null)}
      />
      <ConfirmDialog
        visible={sheet === 'signOut'}
        icon="log-out"
        title={t('signOutConfirm')}
        message={user?.kind === 'local' ? t('signOutLocalHint') : t('signOutFlowIdHint')}
        confirmLabel={t('signOut')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => {
          setSheet(null);
          auth.signOut();
        }}
        onCancel={() => setSheet(null)}
      />
      <GroupPicker
        visible={sheet === 'group'}
        groups={groups}
        selected={s.group}
        loading={s.stage !== null}
        onSelect={s.selectGroup}
        onClose={() => setSheet(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 24 },
});
