/**
 * Настройки подключения к FlowID. Задаются через .env (см. .env.example):
 *   EXPO_PUBLIC_FLOWID_URL        адрес FlowID (issuer)
 *   EXPO_PUBLIC_FLOWID_CLIENT_ID  client_id публичного приложения в FlowID
 */
export const FLOWID_ISSUER = (process.env.EXPO_PUBLIC_FLOWID_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
export const FLOWID_CLIENT_ID = process.env.EXPO_PUBLIC_FLOWID_CLIENT_ID ?? '';

/** Схема приложения в обратной доменной записи — такие redirect URI FlowID принимает (RFC 8252). */
export const APP_SCHEME = 'ru.example.ltkschedule';
