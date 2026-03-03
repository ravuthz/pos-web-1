export interface PaginationMeta {
  size: number;
  page: number;
  total_pages: number;
  total_items: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  message: string;
  data?: Record<string, string[]> | string;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  status?: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string | null;
}

export interface Role {
  id: number;
  name: string;
  permissions?: Permission[];
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  status?: 'active' | 'inactive' | string;
  can_access_all_branches?: boolean;
  role: Role;
  branches: Branch[];
  primary_branch?: Branch | null;
}

export interface LoginPayload {
  email?: string;
  username?: string;
  password: string;
}

export interface LoginData {
  user: User;
  csrf_token?: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

export interface Category {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  parent_id?: number | null;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  display_name?: string;
  is_walk_in?: boolean;
  sales_count?: number;
}

export interface ProductStock {
  id: number;
  product_id: number;
  branch_id: number;
  quantity_on_hand: number;
}

export interface Product {
  id: number;
  category_id: number;
  code?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  image?: string | null;
  cost_price: number;
  selling_price: number;
  status: 'active' | 'inactive' | string;
  track_expiry?: boolean;
  expiry_date?: string | null;
  stock?: ProductStock | null;
  category?: Pick<Category, 'id' | 'name' | 'code'>;
}

export interface Vendor {
  id: number;
  name: string;
  code?: string;
}

export interface PurchaseOrderLine {
  id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  quantity_ordered: number;
  quantity_received: number;
  pending_quantity: number;
  unit_cost: number;
  line_total: number;
  product_unit_id?: number | null;
  product_unit_name?: string | null;
}

export interface PurchaseOrder {
  id: number;
  branch_id: number;
  vendor_id: number;
  buyer_id: number;
  po_number: string;
  order_date: string;
  expected_date?: string | null;
  total_amount: number;
  status: 'draft' | 'sent' | 'received' | 'cancelled' | string;
  status_label?: string;
  notes?: string | null;
  is_editable?: boolean;
  is_receivable?: boolean;
  is_cancellable?: boolean;
  vendor?: Vendor | null;
  branch?: Pick<Branch, 'id' | 'name'> | null;
  buyer?: Pick<User, 'id' | 'name'> | null;
  products?: PurchaseOrderLine[];
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  movement_type: string;
  movement_type_label?: string;
  reference_id?: number | null;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  movement_date: string;
  notes?: string | null;
  created_by?: {
    id: number;
    name: string;
  } | null;
}

export interface SaleLine {
  product_id: number;
  quantity: number;
  unit_price: number;
  product_unit_id?: number | null;
  total_quantity?: number;
}

export interface Sale {
  id: number;
  uuid?: string | null;
  branch_id: number;
  invoice_number: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  status: string;
  products?: Array<{
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export interface Shift {
  id: number;
  shift_number: string;
  branch_id: number;
  cashier_id: number;
  shift_date: string;
  opening_cash_float: number;
  opening_cash_float_khr?: number;
  status: 'open' | 'closed' | string;
  opened_at?: string | null;
  closed_at?: string | null;
  opening_notes?: string | null;
  closing_notes?: string | null;
  total_sales?: number;
  total_transactions?: number;
  expected_cash?: number;
  actual_cash?: number;
  cash_difference?: number;
}

export interface StoreSalePayload {
  branch_id: number;
  customer_id?: number;
  products: SaleLine[];
  promotion_id?: string | null;
  discount_amount?: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'khqr';
  payment_received?: number;
  payment_received_usd?: number;
  payment_received_khr?: number;
  exchange_rate?: number;
  status?: string;
  notes?: string;
  idempotency_key?: string;
}

export interface PosSearchProduct {
  id: number;
  code?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  selling_price: number;
  quantity_on_hand: number;
  category?: {
    id: number;
    name: string;
  } | null;
}

export interface PnlReport {
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  margin_percentage: number;
  period: string;
}

export interface TopSellingProduct {
  product_id: number;
  product_name: string;
  sku?: string | null;
  total_quantity: number;
  total_revenue: number;
  total_orders: number;
}

export interface ProductSalesReportItem {
  product_id: number;
  product_name: string;
  sku?: string | null;
  category_name?: string | null;
  total_units_sold: number;
  average_unit_price: number;
  total_sales_amount: number;
  total_transactions: number;
  first_sale_date?: string;
  last_sale_date?: string;
}

export interface ListQuery {
  page?: number;
  per_page?: number;
  search?: string;
  branch_id?: number;
}

export interface ProductListQuery extends ListQuery {
  category_id?: number;
  status?: string;
}

export interface PurchaseListQuery extends ListQuery {
  vendor_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface StockMovementQuery extends ListQuery {
  product_id?: number;
  movement_type?: string;
  from_date?: string;
  to_date?: string;
}
