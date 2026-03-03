import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, Product, ProductListQuery } from '@/types/api';

export interface ProductPayload {
  category_id: number;
  vendor_id?: number;
  code?: string;
  barcode?: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price: number;
  status: 'active' | 'inactive';
  track_expiry?: boolean;
  expiry_date?: string;
  low_stock_alert?: number;
}

export async function listProducts(params?: ProductListQuery) {
  const response = await api.get<ApiEnvelope<Product[]>>('/products', { params });
  return unwrapApi(response);
}

export async function getProduct(id: number) {
  const response = await api.get<ApiEnvelope<Product>>(`/products/${id}`);
  return unwrapApi(response);
}

export async function createProduct(payload: ProductPayload) {
  const response = await api.post<ApiEnvelope<Product>>('/products', payload);
  return unwrapApi(response);
}

export async function updateProduct(id: number, payload: Partial<ProductPayload>) {
  const response = await api.put<ApiEnvelope<Product>>(`/products/${id}`, payload);
  return unwrapApi(response);
}

export async function deleteProduct(id: number) {
  const response = await api.delete<ApiEnvelope<null>>(`/products/${id}`);
  return unwrapApi(response);
}
