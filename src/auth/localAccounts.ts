import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Локальные аккаунты — запасной вариант, когда FlowID недоступен.
 * Живут только на этом устройстве (SecureStore), пароль хранится как солёный хеш.
 */

type LocalAccount = { email: string; firstName: string; lastName: string; salt: string; hash: string };
export type LocalProfile = { email: string; name: string };

const KEY = 'local.accounts.v1';
const ITERATIONS = 500;

async function load(): Promise<LocalAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as LocalAccount[]) : [];
  } catch {
    return [];
  }
}

async function hashPassword(password: string, salt: string): Promise<string> {
  let h = `${salt}:${password}`;
  for (let i = 0; i < ITERATIONS; i++) {
    h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${h}${salt}`);
  }
  return h;
}

const normalize = (email: string) => email.trim().toLowerCase();
const toProfile = (a: LocalAccount): LocalProfile => ({ email: a.email, name: `${a.firstName} ${a.lastName}`.trim() });

export async function registerLocal(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<LocalProfile | 'exists'> {
  const accounts = await load();
  const email = normalize(input.email);
  if (accounts.some((a) => a.email === email)) return 'exists';
  const salt = Crypto.randomUUID();
  const account: LocalAccount = {
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    salt,
    hash: await hashPassword(input.password, salt),
  };
  await SecureStore.setItemAsync(KEY, JSON.stringify([...accounts, account]));
  return toProfile(account);
}

export async function signInLocal(emailInput: string, password: string): Promise<LocalProfile | null> {
  const account = (await load()).find((a) => a.email === normalize(emailInput));
  if (!account) return null;
  return (await hashPassword(password, account.salt)) === account.hash ? toProfile(account) : null;
}
