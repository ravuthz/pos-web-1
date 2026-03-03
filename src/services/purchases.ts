import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, PurchaseListQuery, PurchaseOrder } from '@/types/api';

export interface PurchaseLinePayload {
  product_id: number;
  quantity_ordered: number;
  unit_cost: number;
  product_unit_id?: number;
}

export interface PurchasePayload {
  vendor_id: number;
  order_date: string;
  expected_date?: string;
  notes?: string;
  products: PurchaseLinePayload[];
}

export interface PurchaseReceivePayload {
  products: Array<{
    product_id: number;
    quantity_received: number;
  }>;
}

export async function listPurchaseOrders(params?: PurchaseListQuery) {
  const response = await api.get<ApiEnvelope<PurchaseOrder[]>>('/purchase-orders', { params });
  return unwrapApi(response);
}

export async function createPurchaseOrder(payload: PurchasePayload) {
  const response = await api.post<ApiEnvelope<PurchaseOrder>>('/purchase-orders', payload);
  return unwrapApi(response);
}

export async function updatePurchaseOrder(id: number, payload: Partial<PurchasePayload>) {
  const response = await api.put<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}`, payload);
  return unwrapApi(response);
}

export async function sendPurchaseOrder(id: number) {
  const response = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}/send`, {});
  return unwrapApi(response);
}

export async function receivePurchaseOrder(id: number, payload: PurchaseReceivePayload) {
  const response = await api.post<ApiEnvelope<PurchaseOrder>>(
    `/purchase-orders/${id}/receive`,
    payload
  );
  return unwrapApi(response);
}

export async function cancelPurchaseOrder(id: number) {
  const response = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}/cancel`, {});
  return unwrapApi(response);
}
