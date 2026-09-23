import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// Все анимации — на встроенном Animated с нативным драйвером (только opacity/transform),
// поэтому не требуют нативных модулей и не нагружают JS-поток.

/** «Уменьшить движение» в системе: анимации становятся мгновенными. */
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => (reduceMotion = v))
  .catch(() => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => (reduceMotion = v));

const easeOut = Easing.out(Easing.cubic);

function timing(value: Animated.Value, toValue: number, duration: number, delay = 0) {
  return Animated.timing(value, {
    toValue,
    duration: reduceMotion ? 0 : duration,
    delay: reduceMotion ? 0 : delay,
    easing: easeOut,
    useNativeDriver: true,
  });
}

function spring(value: Animated.Value, toValue: number, config: { speed?: number; bounciness?: number } = {}) {
  if (reduceMotion) return timing(value, toValue, 0);
  return Animated.spring(value, {
    toValue,
    speed: 20,
    bounciness: 6,
    ...config,
    useNativeDriver: true,
  });
}

/**
 * Плавное появление при монтировании: из прозрачности со сдвигом.
 * Чтобы проиграть заново — сменить key у компонента.
 */
export function FadeIn({
  children,
  delay = 0,
  dy = 12,
  dx = 0,
  duration = 320,
  style,
}: {
  children: ReactNode;
  delay?: number;
  dy?: number;
  dx?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    timing(p, 1, duration, delay).start();
  }, [p, duration, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: p,
          transform: [
            {
              translateX: p.interpolate({
                inputRange: [0, 1],
                outputRange: [dx, 0],
              }),
            },
            {
              translateY: p.interpolate({
                inputRange: [0, 1],
                outputRange: [dy, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Pressable, который пружинисто сжимается под пальцем. style применяется к анимируемому блоку. */
export function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** стиль внешнего Pressable — для flex/позиционирования в родителе */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(e) => {
        spring(scale, scaleTo, { speed: 40, bounciness: 0 }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(scale, 1, { speed: 18, bounciness: 10 }).start();
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * Состояние модального окна с анимацией закрытия: окно остаётся смонтированным,
 * пока progress не вернётся в 0.
 */
export function useModalTransition(visible: boolean) {
  const progress = useState(() => new Animated.Value(0))[0];
  const [mounted, setMounted] = useState(visible);
  // открытие монтирует окно сразу, в этом же рендере; размонтирует только конец анимации закрытия
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      spring(progress, 1, { speed: 16, bounciness: 5 }).start();
    } else {
      timing(progress, 0, 180).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, progress]);

  return { mounted, progress };
}

/** Пульсирующая точка — признак «идёт сейчас». */
export function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  const p = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(p, {
          toValue: 1,
          duration: 1100,
          easing: easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(p, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [p]);
  const dot = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };
  return (
    <Animated.View style={dot}>
      <Animated.View
        style={[
          dot,
          {
            position: 'absolute',
            opacity: p.interpolate({
              inputRange: [0, 1],
              outputRange: [0.7, 0],
            }),
            transform: [
              {
                scale: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.8],
                }),
              },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

/** Полоса прогресса 0..1, плавно доезжающая до нового значения. */
export function ProgressBar({
  value,
  color,
  track,
  style,
}: {
  value: number;
  color: string;
  track: string;
  style?: StyleProp<ViewStyle>;
}) {
  const v = Math.min(1, Math.max(0, value));
  const p = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    timing(p, v, 700).start();
  }, [p, v]);
  return (
    <Animated.View
      style={[
        {
          height: 4,
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: track,
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: color,
          transformOrigin: 'left',
          transform: [{ scaleX: p }],
        }}
      />
    </Animated.View>
  );
}

/**
 * Скользящее значение (например, позиция индикатора выбранного дня).
 * При смене jumpKey (скажем, ширины контейнера) значение ставится сразу, без анимации.
 */
export function useSpringValue(target: number, jumpKey?: unknown) {
  const v = useState(() => new Animated.Value(target))[0];
  const lastKey = useRef<unknown>(Symbol('init'));
  useEffect(() => {
    if (lastKey.current !== jumpKey) {
      lastKey.current = jumpKey;
      v.setValue(target);
      return;
    }
    spring(v, target, { speed: 16, bounciness: 7 }).start();
  }, [v, target, jumpKey]);
  return v;
}
