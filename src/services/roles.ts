import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, Role } from '@/types/api';

export async function listRoles() {
  const response = await api.get<ApiEnvelope<Role[]>>('/roles');
  return unwrapApi(response);
}
