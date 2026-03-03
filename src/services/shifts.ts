import { api, unwrapApi } from '@/lib/api';
import type { ApiEnvelope, Shift } from '@/types/api';

export interface OpenShiftPayload {
  branch_id: number;
  opening_cash_float?: number;
  opening_cash_float_khr?: number;
  opening_notes?: string;
}

export async function getCurrentShift(branchId?: number) {
  const response = await api.get<ApiEnvelope<Shift | null>>('/shifts/current', {
    params: branchId ? { branch_id: branchId } : undefined
  });

  return unwrapApi(response);
}

export async function openShift(payload: OpenShiftPayload) {
  const response = await api.post<ApiEnvelope<Shift>>('/shifts/open', payload);
  return unwrapApi(response);
}
