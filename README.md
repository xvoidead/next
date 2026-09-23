# next — расписание ЛТК САФУ

Приложение на React Native (Expo) для Android и iOS. Показывает расписание группы
из PDF-файлов со страницы https://narfu.ru/ltk/obrazovatelnaya/raspisanie/.

Готовая APK для Android — в [релизах](../../releases).

## Запуск

```bash
npm install                  # заодно встроит pdf.js в бандл (scripts/vendor-pdfjs.mjs)
cp .env.example .env         # адрес FlowID и client_id, см. «FlowID» ниже
npx expo run:android         # dev-сборка на эмуляторе или телефоне
npx expo start --dev-client  # Metro для уже установленной dev-сборки
```

Вход через FlowID работает только в dev-сборке или релизе: в Expo Go адрес возврата
получается `exp://…`, а FlowID принимает лишь схему приложения. В Expo Go экран входа
сам показывает локальный вход.

Релизная APK (JS-бандл внутри, Metro не нужен):

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease   # android/app/build/outputs/apk/release/app-release.apk
```

Перед публикацией в магазины поменяйте `package` / `bundleIdentifier` в `app.json`
(сейчас `ru.example.ltkschedule`) и настройте собственный ключ подписи.

## FlowID

Вход — OAuth 2.1 (authorization code + PKCE) в системном браузере; приложение —
публичный клиент без секрета, redirect URI `ru.example.ltkschedule://oauth`.

1. В FlowID создайте публичное приложение с этим redirect URI и скоупами
   `openid profile email offline_access`.
2. Впишите его `client_id` и адрес FlowID в `.env`
   (`EXPO_PUBLIC_FLOWID_CLIENT_ID`, `EXPO_PUBLIC_FLOWID_URL`).
3. Для эмулятора с FlowID на этом же компьютере: `adb reverse tcp:3000 tcp:3000`.

Если FlowID не ответил за 5 секунд, экран входа предлагает локальный аккаунт:
он хранится только на устройстве, пароль — солёным хешем.

## Как это работает

```
narfu.ru (HTML) ──> ссылки «неделя с … по …» ──> скачать PDF (base64)
                                                     │
                     скрытый WebView + pdf.js <──────┘
                     (текст с координатами + линии границ таблиц)
                                                     │
                     scheduleParser (чистый TS) <────┘
                     восстанавливает ячейки таблиц по линиям границ
                                                     │
                     AsyncStorage-кэш ──> экран с парами
```

- **Список недель** — `src/api/narfuSite.ts`: ищет на странице ссылки на `.pdf`, в тексте
  которых есть «неделя», и достаёт даты из подписи. Новые PDF (которых не было при прошлом
  запуске) помечаются красной точкой.
- **Чтение PDF** — `src/pdf/`: в React Native нет своего PDF-движка, поэтому используется
  pdf.js в скрытом WebView. pdf.js вшит в приложение (не с CDN), поэтому работает одинаково
  на WKWebView (iOS) и Android System WebView, без нативного кода. WebView перезапускается,
  если система убьёт его процесс.
- **Парсер** — `src/parser/scheduleParser.ts`. Опирается на линии границ таблиц, а не на
  «угадывание» колонок по тексту, поэтому корректно обрабатывает:
  - несколько групп на странице и таблицы, продолжающиеся на следующей странице;
  - строку таблицы, разорванную переносом страницы;
  - разную ширину колонок в разных строках и объединённые ячейки (например, практика на несколько пар);
  - таблицы шире страницы.
- **Кэш** — `src/storage/cache.ts`: неделя хранится разобранной целиком (все группы), поэтому
  приложение открывается мгновенно, работает офлайн, а смена группы не требует повторной загрузки.
  При изменении логики парсера увеличьте `PARSER_VERSION` — старый кэш сбросится сам.

## Проверка парсера без телефона

```bash
npm run check-parser                      # все недели с сайта: сводка и подозрительные ячейки
npm run check-parser -- 184615            # + расписание группы 184615
npm run check-parser -- 184615 file.pdf   # локальный PDF
```

Используется тот же код извлечения, что и в WebView. Если колледж поменяет оформление PDF,
первым делом запустите эту команду.

## Структура

```
src/app/                     экраны (Expo Router): вход, выбор группы, вкладки, пара
src/auth/                    FlowID (OAuth + PKCE), локальные аккаунты, провайдер сессии
src/api/narfuSite.ts         страница сайта -> список недель, скачивание PDF
src/pdf/                     WebView-движок pdf.js и скрипт извлечения
src/parser/scheduleParser.ts разбор таблиц в расписание
src/data/scheduleService.ts  кэш -> загрузка -> разбор, выбор текущей недели
src/schedule/                состояние расписания и выборки для экранов
src/settings/, src/i18n/     тема, язык, строки (ru/en)
src/storage/cache.ts         AsyncStorage
src/ui/                      UI-кит, карточка пары, выбор группы, анимации (motion.tsx)
scripts/                     встраивание pdf.js, проверка парсера
```
