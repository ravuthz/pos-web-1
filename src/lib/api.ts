import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type RawAxiosRequestHeaders
} from 'axios';
import { ENV } from '@/lib/env';
import { clearAuthState, getAuthState, setAuthState } from '@/store/authStore';
import { getBranchState } from '@/store/branchStore';
import type { ApiEnvelope } from '@/types/api';

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipRefresh?: boolean;
};

const AUTH_SKIP_PATHS = ['/login', '/forgot-password', '/reset-password', '/oauth/token'];

function isAuthSkipPath(url?: string) {
  if (!url) {
    return false;
  }

  return AUTH_SKIP_PATHS.some((path) => url.includes(path));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function attachBranchToRequest(config: InternalAxiosRequestConfig) {
  if (isAuthSkipPath(config.url)) {
    return config;
  }

  const branchId = getBranchState().selectedBranchId;
  if (!branchId) {
    return config;
  }

  const headers = (config.headers ?? {}) as RawAxiosRequestHeaders;
  headers['X-Branch-Id'] = String(branchId);
  headers.branch_id = String(branchId);
  config.headers = headers;

  const method = (config.method ?? 'get').toLowerCase();

  if (['get', 'delete', 'head', 'options'].includes(method)) {
    const params = isPlainObject(config.params) ? config.params : {};
    if (!('branch_id' in params)) {
      config.params = { ...params, branch_id: branchId };
    }
    return config;
  }

  if (config.data instanceof FormData) {
    if (!config.data.has('branch_id')) {
      config.data.append('branch_id', String(branchId));
    }
    return config;
  }

  if (isPlainObject(config.data)) {
    if (!('branch_id' in config.data)) {
      config.data = { branch_id: branchId, ...config.data };
    }
    return config;
  }

  if (!config.data) {
    config.data = { branch_id: branchId };
  }

  return config;
}

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  const path = `${window.location.pathname}${window.location.search}`;
  const redirect = encodeURIComponent(path);
  window.location.assign(`/login?redirect=${redirect}`);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getAuthState();
  if (!refreshToken || !ENV.PASSPORT_CLIENT_ID || !ENV.PASSPORT_CLIENT_SECRET) {
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = axios
    .post(
      ENV.AUTH_REFRESH_URL,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: ENV.PASSPORT_CLIENT_ID,
        client_secret: ENV.PASSPORT_CLIENT_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    .then((response) => {
      const payload = response.data as {
        access_token?: string;
        refresh_token?: string;
      };

      if (!payload.access_token) {
        return null;
      }

      setAuthState({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token ?? refreshToken
      });

      return payload.access_token;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export const api = axios.create({
  baseURL: ENV.API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const nextConfig = attachBranchToRequest(config);
  const { accessToken } = getAuthState();

  if (accessToken && !isAuthSkipPath(nextConfig.url)) {
    const headers = (nextConfig.headers ?? {}) as RawAxiosRequestHeaders;
    headers.Authorization = `Bearer ${accessToken}`;
    nextConfig.headers = headers;
  }

  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    if (!original || original._retry || original._skipRefresh) {
      throw error;
    }

    if (error.response?.status !== 401 || isAuthSkipPath(original.url)) {
      throw error;
    }

    original._retry = true;

    const nextToken = await refreshAccessToken();
    if (!nextToken) {
      clearAuthState();
      redirectToLogin();
      throw error;
    }

    original.headers = {
      ...(original.headers ?? {}),
      Authorization: `Bearer ${nextToken}`
    };

    return api.request(original);
  }
);

export function unwrapApi<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data;
}

export function isNetworkError(error: unknown) {
  const maybeAxios = error as AxiosError;
  return Boolean(maybeAxios?.isAxiosError && !maybeAxios.response);
}
