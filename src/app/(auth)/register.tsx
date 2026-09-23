import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { useSettings } from '../../settings/SettingsProvider';
import { Button, ErrorText, IconButton, Input, Text } from '../../ui/kit';

/** Локальная регистрация — только когда FlowID недоступен (иначе регистрация идёт на FlowID). */
export default function RegisterScreen() {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', repeat: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setError(null);
    if (Object.values(form).some((v) => !v.trim())) return setError(t('errFillAll'));
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError(t('errEmail'));
    if (form.password.length < 6) return setError(t('errPasswordShort'));
    if (form.password !== form.repeat) return setError(t('errPasswordMismatch'));
    setBusy(true);
    const result = await auth.registerLocal(form);
    setBusy(false);
    if (result === 'exists') setError(t('errUserExists'));
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <IconButton icon="arrow-left" onPress={back} />
        <Text variant="title" style={{ marginTop: 20 }}>
          {t('registerTitle')}
        </Text>
        <Text muted style={{ marginTop: 6, marginBottom: 24 }}>
          {t('registerSubtitle')}
        </Text>

        <View style={{ gap: 12 }}>
          <Input icon="user" placeholder={t('firstNamePlaceholder')} value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" />
          <Input icon="user" placeholder={t('lastNamePlaceholder')} value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" />
          <Input icon="mail" placeholder={t('emailPlaceholder')} value={form.email} onChangeText={set('email')} keyboardType="email-address" />
          <Input icon="lock" placeholder={t('passwordPlaceholder')} value={form.password} onChangeText={set('password')} secure />
          <Input icon="lock" placeholder={t('repeatPasswordPlaceholder')} value={form.repeat} onChangeText={set('repeat')} secure onSubmitEditing={submit} />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button title={t('createAccount')} onPress={submit} loading={busy} style={{ marginTop: 12 }} />
        </View>

        <View style={{ flex: 1 }} />
        <View style={styles.footer}>
          <Text variant="caption" muted>
            {t('haveAccount')}
          </Text>
          <Pressable onPress={back} hitSlop={8}>
            <Text variant="captionMedium" color={theme.primary}>
              {t('signIn')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 32 },
});
