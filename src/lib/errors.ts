import type { AxiosError } from 'axios';
import type { ApiErrorEnvelope } from '@/types/api';

export function extractApiError(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorEnvelope>;
  if ((axiosError as { isAxiosError?: boolean }).isAxiosError) {
    if (!axiosError.response?.data) {
      if (axiosError.code === 'ERR_NETWORK') {
        return 'Cannot reach API server. Check connection and API URL.';
      }

      return axiosError.message || 'Unexpected network error.';
    }

    const payload = axiosError.response.data;

    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
      const firstField = Object.values(payload.data)[0];
      if (Array.isArray(firstField) && firstField.length > 0) {
        return firstField[0] ?? payload.message;
      }
    }

    if (typeof payload.data === 'string' && payload.data.length > 0) {
      return payload.data;
    }

    return payload.message || axiosError.message || 'Request failed.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Request failed.';
}
