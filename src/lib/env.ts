export const ENV = {
  API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  AUTH_REFRESH_URL:
    import.meta.env.VITE_AUTH_REFRESH_URL ?? 'http://localhost:8000/oauth/token',
  PASSPORT_CLIENT_ID: import.meta.env.VITE_PASSPORT_CLIENT_ID ?? '',
  PASSPORT_CLIENT_SECRET: import.meta.env.VITE_PASSPORT_CLIENT_SECRET ?? ''
} as const;
