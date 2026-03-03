import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, StockMovement, StockMovementQuery } from '@/types/api';

export interface AdjustStockPayload {
  product_id: number;
  quantity_change: number;
  notes: string;
}

export async function listStockMovements(params?: StockMovementQuery) {
  const response = await api.get<ApiEnvelope<StockMovement[]>>('/stock-movements', { params });
  return unwrapApi(response);
}

export async function adjustStock(payload: AdjustStockPayload) {
  const response = await api.post<
    ApiEnvelope<{
      product_id: number;
      product_name: string;
      old_quantity: number;
      quantity_change: number;
      new_quantity: number;
    }>
  >('/stock-movements/adjust', payload);

  return unwrapApi(response);
}
