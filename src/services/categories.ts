import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, Category, ListQuery } from '@/types/api';

export interface CategoryPayload {
  name: string;
  code?: string;
  description?: string;
  parent_id?: number | null;
}

export async function listCategories(params?: ListQuery) {
  const response = await api.get<ApiEnvelope<Category[]>>('/categories', { params });
  return unwrapApi(response);
}

export async function createCategory(payload: CategoryPayload) {
  const response = await api.post<ApiEnvelope<Category>>('/categories', payload);
  return unwrapApi(response);
}

export async function updateCategory(id: number, payload: Partial<CategoryPayload>) {
  const response = await api.put<ApiEnvelope<Category>>(`/categories/${id}`, payload);
  return unwrapApi(response);
}

export async function deleteCategory(id: number) {
  const response = await api.delete<ApiEnvelope<null>>(`/categories/${id}`);
  return unwrapApi(response);
}
