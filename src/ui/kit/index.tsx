import Feather from '@expo/vector-icons/Feather';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '../../settings/SettingsProvider';
import { PressableScale, PulseDot, useModalTransition } from '../motion';
import { fonts } from '../theme';

export type IconName = ComponentProps<typeof Feather>['name'];

// ---------------------------------------------------------------------------
// Типографика
// ---------------------------------------------------------------------------

const variants = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 24 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  small: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

type TextVariant = keyof typeof variants;

export function Text({
  variant = 'body',
  color,
  muted,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string; muted?: boolean }) {
  const { theme } = useSettings();
  return (
    <RNText {...rest} style={[variants[variant], { color: color ?? (muted ? theme.textMuted : theme.text) }, style]} />
  );
}

// ---------------------------------------------------------------------------
// Базовые блоки
// ---------------------------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useSettings();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'ghost';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useSettings();
  const bg = variant === 'primary' ? theme.primary : variant === 'soft' ? theme.primarySoft : 'transparent';
  const fg = variant === 'primary' ? theme.primaryText : theme.primary;
  const inactive = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={18} color={fg} /> : null}
          <Text variant="subtitle" color={fg}>
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

export function Input({
  icon,
  secure,
  ...rest
}: ComponentProps<typeof TextInput> & { icon: IconName; secure?: boolean }) {
  const { theme } = useSettings();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Feather name={icon} size={18} color={theme.textMuted} />
      <TextInput
        placeholderTextColor={theme.textFaint}
        secureTextEntry={secure && hidden}
        autoCapitalize="none"
        {...rest}
        style={[styles.inputField, { color: theme.text, fontFamily: fonts.regular }]}
      />
      {secure ? (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
          <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={theme.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Строка настроек / выбора: иконка, подпись, значение, шеврон или переключатель. */
export function ListRow({
  icon,
  label,
  caption,
  value,
  onPress,
  toggle,
  danger,
  last,
}: {
  icon: IconName;
  label: string;
  caption?: string;
  value?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  danger?: boolean;
  last?: boolean;
}) {
  const { theme } = useSettings();
  const color = danger ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !last && {
          borderBottomColor: theme.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        pressed && { backgroundColor: theme.cardAlt },
      ]}
    >
      <Feather name={icon} size={20} color={danger ? theme.danger : theme.navy} />
      <View style={{ flex: 1 }}>
        {caption ? (
          <Text variant="caption" muted>
            {caption}
          </Text>
        ) : null}
        <Text variant={caption ? 'subtitle' : 'bodyMedium'} color={color}>
          {label}
        </Text>
      </View>
      {value ? (
        <Text variant="caption" muted>
          {value}
        </Text>
      ) : null}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: theme.primary, false: theme.border }}
          thumbColor="#FFFFFF"
        />
      ) : onPress && !danger ? (
        <Feather name="chevron-right" size={18} color={theme.textFaint} />
      ) : null}
    </Pressable>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? (
        <Text variant="subtitle" style={styles.sectionTitle}>
          {title}
        </Text>
      ) : null}
      <Card style={styles.sectionCard}>{children}</Card>
    </View>
  );
}

export function Badge({ label, solid, live }: { label: string; solid?: boolean; live?: boolean }) {
  const { theme } = useSettings();
  return (
    <View style={[styles.badge, { backgroundColor: solid ? theme.primary : theme.primarySoft }]}>
      {live ? <PulseDot color={solid ? theme.primaryText : theme.primary} /> : null}
      <Text variant="small" color={solid ? theme.primaryText : theme.primary}>
        {label}
      </Text>
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const { theme } = useSettings();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials ? (
        <Text variant="subtitle" color={theme.primary} style={{ fontSize: size * 0.36 }}>
          {initials}
        </Text>
      ) : (
        <Feather name="user" size={size * 0.5} color={theme.primary} />
      )}
    </View>
  );
}

export function IconButton({ icon, onPress, disabled }: { icon: IconName; onPress: () => void; disabled?: boolean }) {
  const { theme } = useSettings();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      scaleTo={0.8}
      style={{ opacity: disabled ? 0.3 : 1, padding: 4 }}
    >
      <Feather name={icon} size={22} color={theme.text} />
    </PressableScale>
  );
}

/** Логотип: четырёхлучевая звезда + название. */
export function Logo({ large }: { large?: boolean }) {
  const { theme, t } = useSettings();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: large ? 44 : 34, lineHeight: large ? 50 : 40 }} color={theme.navy}>
        ✦
      </Text>
      <Text
        variant="display"
        color={theme.navy}
        style={{
          fontSize: large ? 40 : 30,
          lineHeight: large ? 46 : 36,
          letterSpacing: 2,
        }}
      >
        {t('appName')}
      </Text>
      <Text variant="caption" muted style={{ textAlign: 'center', marginTop: 4 }}>
        {t('appSubtitle')}
      </Text>
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const { theme } = useSettings();
  return (
    <Text variant="caption" color={theme.danger} style={{ textAlign: 'center' }}>
      {children}
    </Text>
  );
}

/** Окно подтверждения вместо системного Alert — в стиле приложения на обеих платформах. */
export function ConfirmDialog({
  visible,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  icon: IconName;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { theme } = useSettings();
  const accent = destructive ? theme.danger : theme.primary;
  const accentSoft = destructive ? theme.dangerSoft : theme.primarySoft;
  const { mounted, progress } = useModalTransition(visible);
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: progress }]} />
      <Pressable style={styles.dialogBackdrop} onPress={onCancel}>
        <Animated.View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.card,
              opacity: progress,
              transform: [
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.88, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={{ alignItems: 'center', alignSelf: 'stretch' }}>
            <View style={[styles.dialogIcon, { backgroundColor: accentSoft }]}>
              <Feather name={icon} size={24} color={accent} />
            </View>
            <Text variant="heading" style={{ textAlign: 'center' }}>
              {title}
            </Text>
            {message ? (
              <Text muted style={{ textAlign: 'center', marginTop: 6 }}>
                {message}
              </Text>
            ) : null}
            <View style={styles.dialogButtons}>
              <PressableScale
                onPress={onCancel}
                containerStyle={{ flex: 1 }}
                style={[
                  styles.dialogButton,
                  {
                    backgroundColor: theme.cardAlt,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text variant="subtitle">{cancelLabel}</Text>
              </PressableScale>
              <PressableScale
                onPress={onConfirm}
                containerStyle={{ flex: 1 }}
                style={[styles.dialogButton, { backgroundColor: accent }]}
              >
                <Text variant="subtitle" color="#FFFFFF">
                  {confirmLabel}
                </Text>
              </PressableScale>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** Нижняя шторка с выбором одного значения (тема, язык). */
export function ChoiceSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();
  const { mounted, progress } = useModalTransition(visible);
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: progress }]} />
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={{
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [420, 0],
                }),
              },
            ],
          }}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: theme.card,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: theme.border }]} />
            <Text variant="heading" style={{ marginBottom: 8 }}>
              {title}
            </Text>
            {options.map((o) => {
              const active = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onSelect(o.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.choice,
                    {
                      backgroundColor: active ? theme.primarySoft : pressed ? theme.cardAlt : 'transparent',
                    },
                  ]}
                >
                  <Text variant="bodyMedium" color={active ? theme.primary : theme.text}>
                    {o.label}
                  </Text>
                  {active ? <Feather name="check" size={18} color={theme.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  button: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  inputField: { flex: 1, fontSize: 15, height: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  section: { marginBottom: 20 },
  sectionTitle: { marginBottom: 8, marginLeft: 4 },
  sectionCard: { overflow: 'hidden', elevation: 0, shadowOpacity: 0 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  dim: { backgroundColor: 'rgba(8, 16, 32, 0.45)' },
  dialogBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    alignSelf: 'stretch',
  },
  dialogButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
  },
});
