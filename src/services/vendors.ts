import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, Vendor } from '@/types/api';

export async function listVendors() {
  const response = await api.get<ApiEnvelope<Vendor[]>>('/vendors', {
    params: { per_page: 200 }
  });
  return unwrapApi(response);
}
