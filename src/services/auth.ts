import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, LoginData, LoginPayload, User } from '@/types/api';

export async function login(payload: LoginPayload) {
  const response = await api.post<ApiEnvelope<LoginData>>('/login', payload);
  return unwrapApi(response);
}

export async function getCurrentUser() {
  const response = await api.get<ApiEnvelope<User>>('/user');
  return unwrapApi(response);
}

export async function logout() {
  const response = await api.post<ApiEnvelope<[]>>('/logout', {});
  return unwrapApi(response);
}
