import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';

import { useSettings } from '../../settings/SettingsProvider';
import { fonts } from '../../ui/theme';

export default function TabsLayout() {
  const { theme, t } = useSettings();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textFaint,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabHome'), tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t('tabSchedule'),
          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
