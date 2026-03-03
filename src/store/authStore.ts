import type { User } from '@/types/api';

export const AUTH_STORAGE_KEY = 'pos.auth';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}

const listeners = new Set<() => void>();

function loadInitialState(): AuthState {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null, user: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { accessToken: null, refreshToken: null, user: null };
    }
    const parsed = JSON.parse(raw) as AuthState;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      user: parsed.user ?? null
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

let state: AuthState = loadInitialState();

function persist() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function getAuthState(): AuthState {
  return state;
}

export function setAuthState(next: Partial<AuthState>) {
  state = {
    ...state,
    ...next
  };
  persist();
  emit();
}

export function clearAuthState() {
  state = { accessToken: null, refreshToken: null, user: null };
  persist();
  emit();
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAuthenticated() {
  return Boolean(state.accessToken);
}
