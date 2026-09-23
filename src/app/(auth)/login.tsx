import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { FlowIdError, flowIdSupported } from '../../auth/flowId';
import { useSettings } from '../../settings/SettingsProvider';
import { Button, ErrorText, Input, Logo, Text } from '../../ui/kit';
import { FadeIn } from '../../ui/motion';

/**
 * Вход. Если FlowID доступен — вход и регистрация через него (в браузере).
 * Если нет — локальный аккаунт на устройстве (поля email/пароль по макету).
 */
export default function LoginScreen() {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'flowid' | 'register' | 'local' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flowId = async (mode: 'login' | 'register') => {
    setError(null);
    setBusy(mode === 'login' ? 'flowid' : 'register');
    try {
      await auth.signInFlowId(mode);
    } catch (e) {
      if (e instanceof FlowIdError && e.code === 'cancelled') setError(t('errAuthCancelled'));
      else if ((e as Error).message !== 'unavailable') setError(`${t('errAuthFailed')}: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const local = async () => {
    setError(null);
    if (!email.trim() || !password) return setError(t('errFillAll'));
    setBusy('local');
    const ok = await auth.signInLocal(email, password);
    setBusy(null);
    if (!ok) setError(t('errWrongCredentials'));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn dy={16}>
          <Logo />
        </FadeIn>
        <FadeIn delay={80}>
          <Text variant="title" style={styles.title}>
            {t('loginTitle')}
          </Text>
        </FadeIn>

        {/* key — чтобы смена состояния сервера (проверка → онлайн/офлайн) тоже проигрывалась */}
        <FadeIn key={auth.flowIdStatus} delay={140}>
          {auth.flowIdStatus === 'checking' ? (
            <View style={styles.checking}>
              <ActivityIndicator color={theme.primary} />
              <Text muted>{t('checkingServer')}</Text>
            </View>
          ) : auth.flowIdStatus === 'online' ? (
            <View style={styles.form}>
              <Button
                title={t('loginWithFlowId')}
                icon="log-in"
                onPress={() => flowId('login')}
                loading={busy === 'flowid'}
              />
              <Text variant="caption" muted style={styles.center}>
                {t('flowIdHint')}
              </Text>
              {error ? <ErrorText>{error}</ErrorText> : null}
            </View>
          ) : (
            <View style={styles.form}>
              <View style={[styles.notice, { backgroundColor: theme.warnSoft }]}>
                <Feather name="wifi-off" size={16} color={theme.warnText} />
                <Text variant="caption" color={theme.warnText} style={{ flex: 1 }}>
                  {flowIdSupported ? t('flowIdUnavailable') : t('flowIdExpoGo')}
                </Text>
              </View>
              <Input
                icon="user"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
              />
              <Input
                icon="lock"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secure
                autoComplete="password"
                onSubmitEditing={local}
              />
              {error ? <ErrorText>{error}</ErrorText> : null}
              <Button title={t('signIn')} onPress={local} loading={busy === 'local'} style={{ marginTop: 6 }} />
              {flowIdSupported ? (
                <Pressable onPress={auth.checkFlowId} hitSlop={8} style={styles.centerRow}>
                  <Feather name="refresh-cw" size={14} color={theme.primary} />
                  <Text variant="captionMedium" color={theme.primary}>
                    {t('retryConnection')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </FadeIn>

        <View style={{ flex: 1 }} />

        {auth.flowIdStatus !== 'checking' ? (
          <View style={styles.footer}>
            <Text variant="caption" muted>
              {t('noAccount')}
            </Text>
            {busy === 'register' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Pressable
                hitSlop={8}
                onPress={() => (auth.flowIdStatus === 'online' ? flowId('register') : router.push('/register'))}
              >
                <Text variant="captionMedium" color={theme.primary}>
                  {t('register')}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24 },
  title: { marginTop: 40, marginBottom: 20 },
  form: { gap: 12 },
  checking: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
  },
  center: { textAlign: 'center' },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 32,
  },
});
