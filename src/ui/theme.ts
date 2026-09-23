/** Палитра по макету: светлый холодный фон, белые карточки, насыщенный синий акцент. */
export const lightTheme = {
  dark: false,
  bg: '#F3F6FB',
  card: '#FFFFFF',
  cardAlt: '#F7F9FC',
  text: '#0E1A2B',
  textMuted: '#6A7A92',
  textFaint: '#9AA7BA',
  border: '#E4E9F1',
  primary: '#1565F2',
  primarySoft: '#E7F0FF',
  primaryText: '#FFFFFF',
  navy: '#12243F',
  danger: '#D93A2F',
  dangerSoft: '#FDECEA',
  warnSoft: '#FFF5DD',
  warnText: '#7A5800',
  shadow: 'rgba(20, 40, 80, 0.08)',
};

export type Theme = typeof lightTheme;

export const darkTheme: Theme = {
  dark: true,
  bg: '#0A111E',
  card: '#121B2C',
  cardAlt: '#172235',
  text: '#E8EEF8',
  textMuted: '#8C9AB2',
  textFaint: '#5F6E86',
  border: '#223049',
  primary: '#4C8DFF',
  primarySoft: '#16284A',
  primaryText: '#FFFFFF',
  navy: '#DCE6F7',
  danger: '#FF7A6E',
  dangerSoft: '#3A1D1A',
  warnSoft: '#34300F',
  warnText: '#F2D27A',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
