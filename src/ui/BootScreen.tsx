import { StyleSheet, View } from 'react-native';

import { useSettings } from '../settings/SettingsProvider';
import { Logo, Text } from './kit';
import { FadeIn } from './motion';

/** Заставка по макету: логотип по центру, слоган внизу. */
export function BootScreen() {
  const { theme, t } = useSettings();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* мягкие пятна фона вместо фото корпуса */}
      <View style={[styles.blob, styles.blobTop, { backgroundColor: theme.primarySoft }]} />
      <View style={[styles.blob, styles.blobBottom, { backgroundColor: theme.primarySoft }]} />
      <FadeIn style={styles.center} dy={16} duration={500}>
        <Logo large />
      </FadeIn>
      <FadeIn delay={250} dy={8} duration={450}>
        <Text variant="captionMedium" muted style={styles.tagline}>
          {t('tagline')}
        </Text>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  tagline: { textAlign: 'center', marginBottom: 64 },
  blob: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    opacity: 0.7,
  },
  blobTop: { top: -220, right: -160 },
  blobBottom: { bottom: -240, left: -180 },
});
