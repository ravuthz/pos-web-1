import { api, unwrapApi } from '@/lib/api';
import type {
  ApiEnvelope,
  PnlReport,
  ProductSalesReportItem,
  TopSellingProduct
} from '@/types/api';

export interface PnlParams {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date?: string;
  date_from?: string;
  date_to?: string;
  branch_id?: number;
}

export interface TopProductsParams {
  branch_id?: number;
  period?: 'daily' | 'monthly' | 'yearly';
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface ProductSalesParams {
  branch_id?: number;
  product_id?: number;
  category_id?: number;
  period?: 'daily' | 'monthly' | 'yearly';
  date_from?: string;
  date_to?: string;
}

export async function getProfitAndLoss(params: PnlParams) {
  const response = await api.get<ApiEnvelope<PnlReport>>('/reports/pnl', { params });
  return unwrapApi(response);
}

export async function getTopSellingProducts(params: TopProductsParams) {
  const response = await api.get<ApiEnvelope<TopSellingProduct[]>>('/reports/top-selling-products', {
    params
  });
  return unwrapApi(response);
}

export async function getProductSalesReport(params: ProductSalesParams) {
  const response = await api.get<ApiEnvelope<ProductSalesReportItem[]>>('/reports/product-sales', {
    params
  });
  return unwrapApi(response);
}

export async function exportSalesReport(params: Record<string, unknown>) {
  const response = await api.post('/reports/export/sales', params, { responseType: 'blob' });
  return response.data as Blob;
}

export async function exportProductsReport(params: Record<string, unknown>) {
  const response = await api.post('/reports/export/products', params, { responseType: 'blob' });
  return response.data as Blob;
}

export async function exportStockReport(params: Record<string, unknown>) {
  const response = await api.post('/reports/export/stock', params, { responseType: 'blob' });
  return response.data as Blob;
}
