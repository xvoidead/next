import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveryDocument } from 'expo-auth-session';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchDiscovery, refreshSession, signInWithFlowId, signOutFlowId } from './flowId';
import { registerLocal, signInLocal } from './localAccounts';

export type User = { kind: 'flowid' | 'local'; id: string; name: string; email: string | null };

/** Состояние сервера FlowID для экрана входа. */
export type FlowIdStatus = 'checking' | 'online' | 'offline';

type AuthValue = {
  loading: boolean;
  user: User | null;
  flowIdStatus: FlowIdStatus;
  checkFlowId: () => Promise<void>;
  signInFlowId: (mode: 'login' | 'register') => Promise<void>;
  signInLocal: (email: string, password: string) => Promise<boolean>;
  registerLocal: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<'ok' | 'exists'>;
  signOut: () => Promise<void>;
};

const USER_KEY = 'auth:user:v1';
const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUserState] = useState<User | null>(null);
  const [flowIdStatus, setFlowIdStatus] = useState<FlowIdStatus>('checking');
  const [discovery, setDiscovery] = useState<DiscoveryDocument | null>(null);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    (u ? AsyncStorage.setItem(USER_KEY, JSON.stringify(u)) : AsyncStorage.removeItem(USER_KEY)).catch(() => undefined);
  }, []);

  const checkFlowId = useCallback(async () => {
    setFlowIdStatus('checking');
    const d = await fetchDiscovery();
    setDiscovery(d);
    setFlowIdStatus(d ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    (async () => {
      let saved: User | null = null;
      try {
        const raw = await AsyncStorage.getItem(USER_KEY);
        saved = raw ? (JSON.parse(raw) as User) : null;
      } catch {
        saved = null;
      }
      setUserState(saved);
      setLoading(false);

      if (saved?.kind === 'flowid') {
        // Сессию проверяем в фоне: без сети остаёмся во входе, отзыв доступа — выходим
        const result = await refreshSession();
        if (result === 'revoked') setUser(null);
        else if (result) setUser({ kind: 'flowid', id: result.sub, name: result.name, email: result.email });
      }
      if (!saved) await checkFlowId();
    })();
  }, [checkFlowId, setUser]);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      user,
      flowIdStatus,
      checkFlowId,
      signInFlowId: async (mode) => {
        const d = discovery ?? (await fetchDiscovery());
        if (!d) {
          setFlowIdStatus('offline');
          throw new Error('unavailable');
        }
        const profile = await signInWithFlowId(d, mode);
        setUser({ kind: 'flowid', id: profile.sub, name: profile.name, email: profile.email });
      },
      signInLocal: async (email, password) => {
        const profile = await signInLocal(email, password);
        if (!profile) return false;
        setUser({ kind: 'local', id: profile.email, name: profile.name, email: profile.email });
        return true;
      },
      registerLocal: async (input) => {
        const profile = await registerLocal(input);
        if (profile === 'exists') return 'exists';
        setUser({ kind: 'local', id: profile.email, name: profile.name, email: profile.email });
        return 'ok';
      },
      signOut: async () => {
        if (user?.kind === 'flowid') await signOutFlowId();
        setUser(null);
        checkFlowId();
      },
    }),
    [loading, user, flowIdStatus, checkFlowId, discovery, setUser],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth вне AuthProvider');
  return v;
}
