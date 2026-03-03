import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, Branch, ListQuery } from '@/types/api';

export async function listBranches(params?: ListQuery) {
  const response = await api.get<ApiEnvelope<Branch[]>>('/branches', { params });
  return unwrapApi(response);
}
