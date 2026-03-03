import type {
  ListQuery,
  ProductListQuery,
  PurchaseListQuery,
  StockMovementQuery
} from '@/types/api';

export const queryKeys = {
  auth: {
    root: ['auth'] as const,
    me: () => ['auth', 'me'] as const
  },
  branches: {
    root: ['branches'] as const,
    list: (params?: ListQuery) => ['branches', 'list', params ?? {}] as const
  },
  roles: {
    root: ['roles'] as const,
    list: () => ['roles', 'list'] as const
  },
  vendors: {
    root: ['vendors'] as const,
    list: () => ['vendors', 'list'] as const
  },
  categories: {
    root: ['categories'] as const,
    list: (params?: ListQuery) => ['categories', 'list', params ?? {}] as const
  },
  customers: {
    root: ['customers'] as const,
    list: (params?: ListQuery) => ['customers', 'list', params ?? {}] as const
  },
  products: {
    root: ['products'] as const,
    list: (params?: ProductListQuery) => ['products', 'list', params ?? {}] as const,
    detail: (id: number) => ['products', 'detail', id] as const
  },
  purchases: {
    root: ['purchase-orders'] as const,
    list: (params?: PurchaseListQuery) => ['purchase-orders', 'list', params ?? {}] as const,
    detail: (id: number) => ['purchase-orders', 'detail', id] as const
  },
  stockMovements: {
    root: ['stock-movements'] as const,
    list: (params?: StockMovementQuery) => ['stock-movements', 'list', params ?? {}] as const
  },
  users: {
    root: ['users'] as const,
    list: (params?: ListQuery) => ['users', 'list', params ?? {}] as const
  },
  shifts: {
    root: ['shifts'] as const,
    current: (branchId?: number) => ['shifts', 'current', branchId ?? null] as const
  },
  sales: {
    root: ['sales'] as const,
    list: (params?: ListQuery) => ['sales', 'list', params ?? {}] as const,
    summary: (branchId?: number) => ['sales', 'summary', branchId ?? null] as const
  },
  reports: {
    root: ['reports'] as const,
    pnl: (params: Record<string, unknown>) => ['reports', 'pnl', params] as const,
    topProducts: (params: Record<string, unknown>) => ['reports', 'top-products', params] as const,
    productSales: (params: Record<string, unknown>) => ['reports', 'product-sales', params] as const
  },
  pos: {
    root: ['pos'] as const,
    search: (branchId: number, query: string) => ['pos', 'search', branchId, query] as const
  }
};
