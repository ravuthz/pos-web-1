import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, ListQuery, User } from '@/types/api';

export interface UserPayload {
  name: string;
  username: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  role_id: number;
  branch_id?: number;
  branch_ids?: number[];
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

export async function listUsers(params?: ListQuery) {
  const response = await api.get<ApiEnvelope<User[]>>('/users', { params });
  return unwrapApi(response);
}

export async function createUser(payload: UserPayload) {
  const response = await api.post<ApiEnvelope<User>>('/users', payload);
  return unwrapApi(response);
}

export async function updateUser(id: number, payload: Partial<UserPayload>) {
  const response = await api.put<ApiEnvelope<User>>(`/users/${id}`, payload);
  return unwrapApi(response);
}

export async function deleteUser(id: number) {
  const response = await api.delete<ApiEnvelope<null>>(`/users/${id}`);
  return unwrapApi(response);
}
