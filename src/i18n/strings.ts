const ru = {
  appName: 'next',
  appSubtitle: 'Расписание занятий\nСАФУ им. Петра I (Колледж)',
  tagline: 'Твой учебный день\nв одном приложении',

  // Вход
  loginTitle: 'Вход в аккаунт',
  loginWithFlowId: 'Войти через FlowID',
  flowIdHint: 'Вход и регистрация откроются в браузере',
  noAccount: 'Нет аккаунта?',
  register: 'Зарегистрироваться',
  haveAccount: 'Уже есть аккаунт?',
  signIn: 'Войти',
  checkingServer: 'Подключаемся к FlowID…',
  flowIdUnavailable: 'FlowID недоступен — вход и регистрация только на этом устройстве',
  flowIdExpoGo: 'В Expo Go вход через FlowID недоступен — нужна dev-сборка. Пока можно войти на этом устройстве',
  retryConnection: 'Повторить подключение',
  emailPlaceholder: 'Email',
  passwordPlaceholder: 'Пароль',
  repeatPasswordPlaceholder: 'Повторите пароль',
  firstNamePlaceholder: 'Имя',
  lastNamePlaceholder: 'Фамилия',
  registerTitle: 'Создать аккаунт',
  registerSubtitle: 'Аккаунт сохранится только на этом устройстве',
  createAccount: 'Создать аккаунт',
  errFillAll: 'Заполните все поля',
  errEmail: 'Проверьте email',
  errPasswordShort: 'Пароль — минимум 6 символов',
  errPasswordMismatch: 'Пароли не совпадают',
  errUserExists: 'Аккаунт с таким email уже есть на устройстве',
  errWrongCredentials: 'Неверный email или пароль',
  errAuthCancelled: 'Вход отменён',
  errAuthFailed: 'Не удалось войти через FlowID',

  // Онбординг
  aboutYouTitle: 'Расскажите о себе',
  aboutYouSubtitle: 'Это поможет нам настроить\nрасписание под ваш профиль',
  college: 'Колледж',
  collegeName: 'САФУ (Колледж)',
  group: 'Группа',
  chooseGroup: 'Выберите группу',
  continue: 'Продолжить',

  // Главная
  greetingMorning: 'Доброе утро,',
  greetingDay: 'Добрый день,',
  greetingEvening: 'Добрый вечер,',
  greetingNight: 'Доброй ночи,',
  today: 'Сегодня',
  now: 'Сейчас',
  upNext: 'Далее',
  minutesLeft: 'Осталось {n} мин',
  startsIn: 'Через {n} мин',
  nextLesson: 'Следующая пара',
  laterToday: 'Дальше сегодня',
  noLessonsToday: 'Сегодня пар нет',
  lessonsOver: 'На сегодня пары закончились',
  nextStudyDay: 'Ближайшие пары',
  restHint: 'Можно отдохнуть 🙂',

  // Расписание
  scheduleTitle: 'Расписание',
  breakLabel: 'Перемена ({n} мин)',
  noLessons: 'Пар нет',
  groupMissing: 'Группы {group} нет в этой неделе',
  groupMissingHint: 'Возможно, номер группы сменился — выберите группу заново в настройках.',
  newWeek: 'Новое',
  loadingList: 'Загружаю список недель…',
  loadingDownload: 'Скачиваю PDF с сайта…',
  loadingExtract: 'Читаю PDF…',
  loadingParse: 'Ищу вашу группу…',
  notLoaded: 'Расписание пока не загружено',
  showingCached: 'Показано сохранённое расписание.',
  retry: 'Повторить',
  noConnection: 'Нет соединения с сайтом narfu.ru',
  room: 'ауд. {room}',
  pairN: '{n} пара',

  // Пара
  teacher: 'Преподаватель',
  roomLabel: 'Аудитория',
  duration: 'Длительность',
  durationValue: '{h} ч {m} мин',
  durationMinutes: '{m} мин',
  breakAfter: 'Перемена после пары',
  notSpecified: 'Не указано',
  lastLessonOfDay: 'Это последняя пара дня',

  // Настройки
  settingsTitle: 'Настройки',
  localAccount: 'Аккаунт на устройстве',
  flowIdAccount: 'Аккаунт FlowID',
  sectionApp: 'Приложение',
  appearance: 'Внешний вид',
  themeSystem: 'Как в системе',
  themeLight: 'Светлая',
  themeDark: 'Тёмная',
  language: 'Язык',
  sectionSchedule: 'Расписание',
  myGroup: 'Моя группа',
  refreshSchedule: 'Обновить расписание',
  sectionAbout: 'О приложении',
  version: 'Версия',
  dataSource: 'Источник данных',
  signOut: 'Выйти',
  signOutConfirm: 'Выйти из аккаунта?',
  signOutLocalHint: 'Аккаунт останется на устройстве — войти снова можно по email и паролю.',
  signOutFlowIdHint: 'Сохранённое расписание останется. Войти снова можно через FlowID.',
  cancel: 'Отмена',
  done: 'Готово',

  // Выбор группы
  groupSearch: 'Номер группы, например 184615',
  groupListLater: 'Список групп появится после загрузки расписания',
  nothingFound: 'Ничего не найдено',

  tabHome: 'Главная',
  tabSchedule: 'Расписание',
  tabSettings: 'Настройки',
};

export type StringKey = keyof typeof ru;

const en: Record<StringKey, string> = {
  appName: 'next',
  appSubtitle: 'Class schedule\nNArFU College',
  tagline: 'Your study day\nin one app',

  loginTitle: 'Sign in',
  loginWithFlowId: 'Sign in with FlowID',
  flowIdHint: 'Sign-in and sign-up open in the browser',
  noAccount: 'No account?',
  register: 'Sign up',
  haveAccount: 'Already have an account?',
  signIn: 'Sign in',
  checkingServer: 'Connecting to FlowID…',
  flowIdUnavailable: 'FlowID is unavailable — the account will live on this device only',
  flowIdExpoGo: 'FlowID sign-in does not work in Expo Go — use a dev build. For now, sign in on this device',
  retryConnection: 'Try again',
  emailPlaceholder: 'Email',
  passwordPlaceholder: 'Password',
  repeatPasswordPlaceholder: 'Repeat password',
  firstNamePlaceholder: 'First name',
  lastNamePlaceholder: 'Last name',
  registerTitle: 'Create account',
  registerSubtitle: 'The account is stored on this device only',
  createAccount: 'Create account',
  errFillAll: 'Fill in all fields',
  errEmail: 'Check the email',
  errPasswordShort: 'Password must be at least 6 characters',
  errPasswordMismatch: 'Passwords do not match',
  errUserExists: 'An account with this email already exists on this device',
  errWrongCredentials: 'Wrong email or password',
  errAuthCancelled: 'Sign-in cancelled',
  errAuthFailed: 'Could not sign in with FlowID',

  aboutYouTitle: 'Tell us about you',
  aboutYouSubtitle: 'This helps us tailor\nthe schedule to you',
  college: 'College',
  collegeName: 'NArFU (College)',
  group: 'Group',
  chooseGroup: 'Choose a group',
  continue: 'Continue',

  greetingMorning: 'Good morning,',
  greetingDay: 'Good afternoon,',
  greetingEvening: 'Good evening,',
  greetingNight: 'Good night,',
  today: 'Today',
  now: 'Now',
  upNext: 'Up next',
  minutesLeft: '{n} min left',
  startsIn: 'In {n} min',
  nextLesson: 'Next class',
  laterToday: 'Later today',
  noLessonsToday: 'No classes today',
  lessonsOver: 'Classes are over for today',
  nextStudyDay: 'Upcoming classes',
  restHint: 'Time to rest 🙂',

  scheduleTitle: 'Schedule',
  breakLabel: 'Break ({n} min)',
  noLessons: 'No classes',
  groupMissing: 'Group {group} is not in this week',
  groupMissingHint: 'The group number may have changed — pick the group again in settings.',
  newWeek: 'New',
  loadingList: 'Loading weeks…',
  loadingDownload: 'Downloading PDF…',
  loadingExtract: 'Reading PDF…',
  loadingParse: 'Looking for your group…',
  notLoaded: 'Schedule is not loaded yet',
  showingCached: 'Showing the saved schedule.',
  retry: 'Retry',
  noConnection: 'Cannot reach narfu.ru',
  room: 'room {room}',
  pairN: 'class {n}',

  teacher: 'Teacher',
  roomLabel: 'Room',
  duration: 'Duration',
  durationValue: '{h} h {m} min',
  durationMinutes: '{m} min',
  breakAfter: 'Break after class',
  notSpecified: 'Not specified',
  lastLessonOfDay: 'This is the last class of the day',

  settingsTitle: 'Settings',
  localAccount: 'Account on this device',
  flowIdAccount: 'FlowID account',
  sectionApp: 'App',
  appearance: 'Appearance',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  language: 'Language',
  sectionSchedule: 'Schedule',
  myGroup: 'My group',
  refreshSchedule: 'Refresh schedule',
  sectionAbout: 'About',
  version: 'Version',
  dataSource: 'Data source',
  signOut: 'Sign out',
  signOutConfirm: 'Sign out of the account?',
  signOutLocalHint: 'The account stays on this device — sign in again with email and password.',
  signOutFlowIdHint: 'Your saved schedule stays. Sign in again with FlowID.',
  cancel: 'Cancel',
  done: 'Done',

  groupSearch: 'Group number, e.g. 184615',
  groupListLater: 'Groups appear once the schedule is loaded',
  nothingFound: 'Nothing found',

  tabHome: 'Home',
  tabSchedule: 'Schedule',
  tabSettings: 'Settings',
};

export type Language = 'ru' | 'en';
export const STRINGS: Record<Language, Record<StringKey, string>> = { ru, en };

const MONTHS_GEN = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const WEEKDAYS_FULL = {
  ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};
const WEEKDAYS_SHORT = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

/** Даты приходят в ISO "2026-09-21"; день недели считаем от понедельника = 0. */
export function makeDateFormat(lang: Language) {
  const parse = (iso: string) => iso.split('-').map(Number) as [number, number, number];
  const weekdayIndex = (iso: string) => {
    const [y, m, d] = parse(iso);
    return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  };
  return {
    weekdayShort: (i: number) => WEEKDAYS_SHORT[lang][i],
    /** "Четверг, 18 сентября" / "Thursday, September 18" */
    fullDate: (iso: string) => {
      const [, m, d] = parse(iso);
      const wd = WEEKDAYS_FULL[lang][weekdayIndex(iso)];
      return lang === 'ru' ? `${wd}, ${d} ${MONTHS_GEN.ru[m - 1]}` : `${wd}, ${MONTHS_GEN.en[m - 1]} ${d}`;
    },
    /** "15 — 21 сентября", "28 сентября — 4 октября" */
    range: (fromIso: string, toIso: string) => {
      const [, m1, d1] = parse(fromIso);
      const [, m2, d2] = parse(toIso);
      const months = MONTHS_GEN[lang];
      if (lang === 'en') return m1 === m2 ? `${months[m1 - 1]} ${d1} — ${d2}` : `${months[m1 - 1]} ${d1} — ${months[m2 - 1]} ${d2}`;
      return m1 === m2 ? `${d1} — ${d2} ${months[m1 - 1]}` : `${d1} ${months[m1 - 1]} — ${d2} ${months[m2 - 1]}`;
    },
    /** "3 пары" */
    pairs: (n: number) => {
      if (lang === 'en') return `${n} ${n === 1 ? 'class' : 'classes'}`;
      const mod10 = n % 10;
      const mod100 = n % 100;
      const word = mod10 === 1 && mod100 !== 11 ? 'пара' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'пары' : 'пар';
      return `${n} ${word}`;
    },
  };
}
