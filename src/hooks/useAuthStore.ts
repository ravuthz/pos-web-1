import { useSyncExternalStore } from 'react';
import { getAuthState, subscribeAuth } from '@/store/authStore';

export function useAuthStore() {
  return useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
}
