import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

import { APP_SCHEME, FLOWID_CLIENT_ID, FLOWID_ISSUER } from '../config';

/**
 * Вход через FlowID: OAuth 2.1 authorization code + PKCE в системном браузере.
 * Приложение — публичный клиент (без секрета), redirect URI на собственной схеме.
 */

export type FlowIdProfile = { sub: string; name: string; email: string | null };

type StoredTokens = { accessToken: string; refreshToken: string | null; expiresAt: number | null };

const TOKENS_KEY = 'flowid.tokens.v1';
const SCOPES = ['openid', 'profile', 'email', 'offline_access'];
const DISCOVERY_TIMEOUT_MS = 5000;

export const redirectUri = AuthSession.makeRedirectUri({ scheme: APP_SCHEME, path: 'oauth' });

/**
 * В Expo Go адрес возврата получается exp://…, а FlowID принимает только схему
 * приложения. Поэтому в Expo Go вход через FlowID выключен — нужна dev-сборка
 * (npx expo run:android / run:ios) или релиз.
 */
export const flowIdSupported = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export class FlowIdError extends Error {
  constructor(
    message: string,
    readonly code: 'cancelled' | 'unavailable' | 'failed',
  ) {
    super(message);
  }
}

/** Метаданные FlowID; null, если сервер недоступен или приложение не настроено. */
export async function fetchDiscovery(): Promise<AuthSession.DiscoveryDocument | null> {
  if (!FLOWID_CLIENT_ID || !flowIdSupported) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
  try {
    const res = await fetch(`${FLOWID_ISSUER}/.well-known/openid-configuration`, { signal: controller.signal });
    if (!res.ok) return null;
    const meta = await res.json();
    return {
      authorizationEndpoint: meta.authorization_endpoint,
      tokenEndpoint: meta.token_endpoint,
      revocationEndpoint: meta.revocation_endpoint,
      userInfoEndpoint: meta.userinfo_endpoint,
      endSessionEndpoint: meta.end_session_endpoint,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Открывает FlowID в браузере. mode = 'register' сразу показывает регистрацию:
 * страница /register после создания аккаунта продолжает тот же authorize-запрос.
 */
export async function signInWithFlowId(
  discovery: AuthSession.DiscoveryDocument,
  mode: 'login' | 'register',
): Promise<FlowIdProfile> {
  const request = new AuthSession.AuthRequest({
    clientId: FLOWID_CLIENT_ID,
    redirectUri,
    scopes: SCOPES,
    usePKCE: true,
  });
  const authorizeUrl = await request.makeAuthUrlAsync(discovery);
  const url =
    mode === 'register'
      ? `${FLOWID_ISSUER}/register?next=${encodeURIComponent(authorizeUrl.slice(authorizeUrl.indexOf('/oauth/')))}`
      : authorizeUrl;

  const result = await request.promptAsync(discovery, { url });
  if (result.type === 'cancel' || result.type === 'dismiss') throw new FlowIdError('cancelled', 'cancelled');
  if (result.type !== 'success') {
    const message = result.type === 'error' ? result.error?.description ?? result.error?.message : null;
    throw new FlowIdError(message ?? 'Authorization failed', 'failed');
  }

  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId: FLOWID_CLIENT_ID,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
    },
    discovery,
  );
  await saveTokens(tokens);
  return fetchProfile(tokens.accessToken, discovery);
}

async function fetchProfile(accessToken: string, discovery: AuthSession.DiscoveryDocument): Promise<FlowIdProfile> {
  const info = await AuthSession.fetchUserInfoAsync({ accessToken }, discovery);
  return {
    sub: String(info.sub),
    name: String(info.name || info.preferred_username || info.email || 'FlowID'),
    email: info.email ? String(info.email) : null,
  };
}

async function saveTokens(t: AuthSession.TokenResponse) {
  const stored: StoredTokens = {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken ?? null,
    expiresAt: t.expiresIn ? (t.issuedAt + t.expiresIn) * 1000 : null,
  };
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(stored));
}

async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

/**
 * Тихо обновляет профиль при запуске. Возвращает:
 *  - профиль, если всё хорошо;
 *  - 'revoked', если FlowID отозвал доступ (надо выйти);
 *  - null, если сервер недоступен (остаёмся в сохранённой сессии).
 */
export async function refreshSession(): Promise<FlowIdProfile | 'revoked' | null> {
  const discovery = await fetchDiscovery();
  const tokens = await loadTokens();
  if (!discovery || !tokens) return null;
  try {
    let accessToken = tokens.accessToken;
    const expired = tokens.expiresAt !== null && tokens.expiresAt < Date.now() + 30_000;
    if (expired) {
      if (!tokens.refreshToken) return 'revoked';
      const fresh = await AuthSession.refreshAsync(
        { clientId: FLOWID_CLIENT_ID, refreshToken: tokens.refreshToken },
        discovery,
      );
      await saveTokens(fresh);
      accessToken = fresh.accessToken;
    }
    return await fetchProfile(accessToken, discovery);
  } catch (e) {
    // invalid_grant / 401 — токены больше не действуют
    return /invalid_grant|invalid_token|401/i.test(String((e as Error)?.message ?? e)) ? 'revoked' : null;
  }
}

export async function signOutFlowId() {
  const tokens = await loadTokens();
  await SecureStore.deleteItemAsync(TOKENS_KEY).catch(() => undefined);
  if (!tokens?.refreshToken) return;
  const discovery = await fetchDiscovery();
  if (!discovery?.revocationEndpoint) return;
  await AuthSession.revokeAsync(
    { clientId: FLOWID_CLIENT_ID, token: tokens.refreshToken, tokenTypeHint: AuthSession.TokenTypeHint.RefreshToken },
    discovery,
  ).catch(() => undefined);
}
