import { Stack } from 'expo-router';

import { useSettings } from '../../settings/SettingsProvider';

export const unstable_settings = { initialRouteName: 'login' };

export default function AuthLayout() {
  const { theme } = useSettings();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />;
}
