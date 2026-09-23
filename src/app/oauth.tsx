import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Сюда приводит deep link ru.example.ltkschedule://oauth после входа в FlowID.
 * Сам ответ перехватывает AuthSession, а экран входа ещё ждёт обмена кода на токены.
 * Поэтому сразу убираем этот экран из стека: иначе он остаётся пустым поверх всего,
 * когда защищённые маршруты переключаются на выбор группы или вкладки.
 * Если стек пуст (приложение выгружалось, пока открыт браузер) — на главную.
 */
export default function OAuthRedirect() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  return null;
}
