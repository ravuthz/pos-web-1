import { api, unwrapApi } from '@/lib/api';
import type {
  ApiEnvelope,
  PosSearchProduct,
  Product,
  Sale,
  StoreSalePayload
} from '@/types/api';

export async function createSale(payload: StoreSalePayload) {
  const response = await api.post<ApiEnvelope<Sale>>('/sales', payload);
  return unwrapApi(response);
}

export async function listSales(params?: Record<string, unknown>) {
  const response = await api.get<ApiEnvelope<Sale[]>>('/sales', { params });
  return unwrapApi(response);
}

export async function refundSale(id: number) {
  const response = await api.post<ApiEnvelope<Sale>>(`/sales/${id}/refund`, {});
  return unwrapApi(response);
}

export async function voidSale(id: number) {
  const response = await api.post<ApiEnvelope<Sale>>(`/sales/${id}/void`, {});
  return unwrapApi(response);
}

export async function getSalesSummary() {
  const response = await api.get<ApiEnvelope<Record<string, unknown>>>('/sales-summary');
  return unwrapApi(response);
}

export async function searchByBarcode(barcode: string, branchId: number) {
  const response = await api.post<ApiEnvelope<Product>>('/products/barcode', {
    barcode,
    branch_id: branchId
  });
  return unwrapApi(response);
}

export async function searchPosProducts(query: string, branchId: number) {
  const response = await api.post<ApiEnvelope<PosSearchProduct[]>>('/pos/search-products', {
    query,
    branchId,
    branch_id: branchId
  });
  return unwrapApi(response);
}
