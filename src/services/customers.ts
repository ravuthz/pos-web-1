import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, Customer, ListQuery } from '@/types/api';

export interface CustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export async function listCustomers(params?: ListQuery) {
  const response = await api.get<ApiEnvelope<Customer[]>>('/customers', { params });
  return unwrapApi(response);
}

export async function createCustomer(payload: CustomerPayload) {
  const response = await api.post<ApiEnvelope<Customer>>('/customers', payload);
  return unwrapApi(response);
}

export async function updateCustomer(id: number, payload: Partial<CustomerPayload>) {
  const response = await api.put<ApiEnvelope<Customer>>(`/customers/${id}`, payload);
  return unwrapApi(response);
}

export async function deleteCustomer(id: number) {
  const response = await api.delete<ApiEnvelope<null>>(`/customers/${id}`);
  return unwrapApi(response);
}
