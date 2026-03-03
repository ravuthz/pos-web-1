import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeading } from '@/components/PageHeading';
import { InlineAlert } from '@/components/InlineAlert';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { useBranchStore } from '@/hooks/useBranchStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import { extractApiError } from '@/lib/errors';
import { isNetworkError } from '@/lib/api';
import { getProduct } from '@/services/products';
import { createSale, searchByBarcode } from '@/services/sales';
import { getCurrentShift, openShift } from '@/services/shifts';
import type { Product, StoreSalePayload } from '@/types/api';
import { countQueuedSales, flushQueuedSales, queueSaleForOffline } from '@/features/pos/offlineQueue';

interface CartItem {
  product_id: number;
  name: string;
  barcode?: string | null;
  unit_price: number;
  quantity: number;
  max_stock: number;
}

const checkoutSchema = z.object({
  payment_method: z.enum(['cash', 'card', 'transfer', 'khqr']),
  payment_received: z.coerce.number().min(0),
  notes: z.string().optional()
});

const openShiftSchema = z.object({
  opening_cash_float: z.coerce.number().min(0),
  opening_cash_float_khr: z.coerce.number().min(0),
  opening_notes: z.string().optional()
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;
type OpenShiftFormValues = z.infer<typeof openShiftSchema>;
type CheckoutMutationInput = {
  values: CheckoutFormValues;
  cartSnapshot: CartItem[];
};

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function PosPage() {
  const { selectedBranchId } = useBranchStore();
  const { accessToken } = useAuthStore();
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(
    null
  );
  const barcodeRef = useRef<HTMLInputElement>(null);

  const checkoutForm = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      payment_method: 'cash',
      payment_received: 0,
      notes: ''
    }
  });

  const openShiftForm = useForm<OpenShiftFormValues>({
    resolver: zodResolver(openShiftSchema),
    defaultValues: {
      opening_cash_float: 0,
      opening_cash_float_khr: 0,
      opening_notes: ''
    }
  });

  const queuedCountQuery = useQuery({
    queryKey: ['offline-queue-count'],
    queryFn: countQueuedSales,
    refetchInterval: 5000
  });

  const currentShiftQuery = useQuery({
    queryKey: queryKeys.shifts.current(selectedBranchId),
    queryFn: () => getCurrentShift(selectedBranchId ?? undefined),
    enabled: Boolean(selectedBranchId)
  });

  const currentShift = currentShiftQuery.data?.data ?? null;
  const hasOpenShift = Boolean(currentShift && currentShift.status === 'open');

  const openShiftMutation = useMutation({
    mutationFn: async (values: OpenShiftFormValues) => {
      if (!selectedBranchId) {
        throw new Error('Please select branch before opening shift.');
      }

      return openShift({
        branch_id: selectedBranchId,
        opening_cash_float: values.opening_cash_float,
        opening_cash_float_khr: values.opening_cash_float_khr,
        opening_notes: values.opening_notes || undefined
      });
    },
    onSuccess: async () => {
      setMessage({ tone: 'success', text: 'Shift opened successfully.' });
      openShiftForm.reset({
        opening_cash_float: 0,
        opening_cash_float_khr: 0,
        opening_notes: ''
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.shifts.current(selectedBranchId) });
    },
    onError: (error) => setMessage({ tone: 'error', text: extractApiError(error) })
  });

  const scanMutation = useMutation({
    mutationFn: async (inputBarcode: string) => {
      if (!selectedBranchId) {
        throw new Error('Branch must be selected before scanning.');
      }
      return searchByBarcode(inputBarcode, selectedBranchId);
    },
    onSuccess: (response) => {
      setMessage(null);
      const product = response.data;
      setCart((prev) => addProductToCart(prev, product));
      setBarcode('');
      barcodeRef.current?.focus();
    },
    onError: (error) => setMessage({ tone: 'error', text: extractApiError(error) })
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ values, cartSnapshot }: CheckoutMutationInput) => {
      if (!selectedBranchId) {
        throw new Error('Branch is required for checkout.');
      }
      if (!accessToken) {
        throw new Error('Session is missing. Please login again.');
      }
      if (!hasOpenShift) {
        throw new Error('Cannot process sale. No shift is currently open. Please open a shift first.');
      }

      const payload: StoreSalePayload = {
        branch_id: selectedBranchId,
        payment_method: values.payment_method,
        payment_received: values.payment_received,
        notes: values.notes,
        idempotency_key: makeIdempotencyKey(),
        products: cartSnapshot.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      if (!navigator.onLine) {
        await queueSaleForOffline(payload, accessToken, selectedBranchId);
        return { queued: true as const };
      }

      try {
        await validateStockBeforeCheckout(cartSnapshot, selectedBranchId);
      } catch (error) {
        if (isNetworkError(error)) {
          await queueSaleForOffline(payload, accessToken, selectedBranchId);
          return { queued: true as const };
        }
        throw error;
      }

      try {
        const result = await createSale(payload);
        return { queued: false as const, result };
      } catch (error) {
        if (isNetworkError(error)) {
          await queueSaleForOffline(payload, accessToken, selectedBranchId);
          return { queued: true as const };
        }
        throw error;
      }
    },
    onMutate: async ({ cartSnapshot }: CheckoutMutationInput) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.root });

      const previousProductQueries = queryClient.getQueriesData({
        queryKey: queryKeys.products.root
      });
      const previousCart = [...cartSnapshot];

      queryClient.setQueriesData(
        { queryKey: queryKeys.products.root },
        (value: unknown): unknown => {
          if (!value || typeof value !== 'object') {
            return value;
          }

          const envelope = value as { data?: Product[] };
          if (!Array.isArray(envelope.data)) {
            return value;
          }

          const next = envelope.data.map((product) => {
            const sold = cartSnapshot.find((item) => item.product_id === product.id);
            if (!sold || !product.stock) {
              return product;
            }

            return {
              ...product,
              stock: {
                ...product.stock,
                quantity_on_hand: Math.max(0, product.stock.quantity_on_hand - sold.quantity)
              }
            };
          });

          return {
            ...envelope,
            data: next
          };
        }
      );

      setCart([]);
      setBarcode('');

      return {
        previousProductQueries,
        previousCart
      };
    },
    onSuccess: async (result) => {
      if (result.queued) {
        setMessage({
          tone: 'warning',
          text: 'Sale queued offline and will sync automatically once connected.'
        });
      } else {
        setMessage({
          tone: 'success',
          text: `Sale completed successfully (${result.result.message}).`
        });
      }

      checkoutForm.reset({
        payment_method: 'cash',
        payment_received: 0,
        notes: ''
      });
      barcodeRef.current?.focus();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts.current(selectedBranchId) }),
        queuedCountQuery.refetch()
      ]);
    },
    onError: (error, _, context) => {
      if (context?.previousProductQueries) {
        context.previousProductQueries.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }

      if (context?.previousCart) {
        setCart(context.previousCart);
      }

      setMessage({ tone: 'error', text: extractApiError(error) });
    }
  });

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        barcodeRef.current?.focus();
      }

      if (event.key === 'Escape') {
        setBarcode('');
      }

      if (event.key === 'F8') {
        event.preventDefault();
        setCart([]);
      }

      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        if (!hasOpenShift) {
          setMessage({
            tone: 'warning',
            text: 'Open a shift before checkout.'
          });
          return;
        }
        checkoutForm.handleSubmit((values) =>
          checkoutMutation.mutate({
            values,
            cartSnapshot: [...cart]
          })
        )();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cart, checkoutForm, checkoutMutation, hasOpenShift]);

  useEffect(() => {
    const onOnline = async () => {
      const result = await flushQueuedSales();
      if (result.sent > 0) {
        setMessage({
          tone: 'success',
          text: `${result.sent} queued sale(s) synced in the background.`
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.sales.root }),
          queryClient.invalidateQueries({ queryKey: queryKeys.products.root }),
          queuedCountQuery.refetch()
        ]);
      }
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [queuedCountQuery]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [cart]
  );

  function updateQuantity(item: CartItem, nextQuantity: number) {
    setCart((prev) =>
      prev.map((line) => {
        if (line.product_id !== item.product_id) {
          return line;
        }

        const clamped = Math.min(Math.max(1, nextQuantity), line.max_stock || nextQuantity);

        if (clamped !== nextQuantity) {
          setMessage({
            tone: 'warning',
            text: `Stock limit reached for ${line.name}. Available: ${line.max_stock}`
          });
        }

        return {
          ...line,
          quantity: clamped
        };
      })
    );
  }

  const scanBarcode = () => {
    const value = barcode.trim();
    if (!value) {
      return;
    }
    scanMutation.mutate(value);
  };

  return (
    <div>
      <PageHeading
        title="Point of Sale"
        subtitle="Barcode-first checkout with optimistic stock and offline queue fallback."
      />

      <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
        <span>
          <kbd>F2</kbd> focus barcode
        </span>
        <span>
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd> checkout
        </span>
        <span>
          <kbd>F8</kbd> clear cart
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
          queued: {queuedCountQuery.data ?? 0}
        </span>
      </div>

      {message ? <InlineAlert tone={message.tone} message={message.text} /> : null}

      <div
        className={`mt-3 rounded-xl border p-4 ${
          hasOpenShift
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Shift Status</h3>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: queryKeys.shifts.current(selectedBranchId) })
            }
          >
            Refresh
          </button>
        </div>

        {hasOpenShift ? (
          <div className="text-sm text-emerald-800">
            <p>
              Open shift: <span className="font-semibold">{currentShift?.shift_number}</span>
            </p>
            <p>Opened at: {currentShift?.opened_at || '-'}</p>
          </div>
        ) : (
          <form
            className="grid gap-2 md:grid-cols-4"
            onSubmit={openShiftForm.handleSubmit((values) => openShiftMutation.mutate(values))}
          >
            <input
              type="number"
              step="0.01"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              placeholder="Opening cash (USD)"
              {...openShiftForm.register('opening_cash_float')}
            />
            <input
              type="number"
              step="0.01"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              placeholder="Opening cash (KHR)"
              {...openShiftForm.register('opening_cash_float_khr')}
            />
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              placeholder="Opening notes"
              {...openShiftForm.register('opening_notes')}
            />
            <button
              type="submit"
              disabled={openShiftMutation.isPending || !selectedBranchId}
              className="rounded-lg bg-amberish px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
            >
              {openShiftMutation.isPending ? 'Opening...' : 'Open Shift'}
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 font-semibold">Scan Barcode</h3>
          <div className="flex gap-2">
            <input
              ref={barcodeRef}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  scanBarcode();
                }
              }}
              placeholder="Scan or enter barcode"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              type="button"
              onClick={scanBarcode}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Add
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 font-semibold">Product</th>
                  <th className="px-3 py-2 font-semibold">Qty</th>
                  <th className="px-3 py-2 font-semibold">Price</th>
                  <th className="px-3 py-2 font-semibold">Line Total</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.product_id} className="border-t border-slate-200">
                    <td className="px-3 py-2">
                      {item.name}
                      <p className="text-xs text-slate-500">stock: {item.max_stock}</p>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        max={item.max_stock}
                        value={item.quantity}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1"
                        onChange={(event) => updateQuantity(item, Number(event.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2">{item.unit_price}</td>
                    <td className="px-3 py-2">{item.quantity * item.unit_price}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded-md border border-rose-300 px-2 py-1 text-rose-600"
                        onClick={() =>
                          setCart((prev) => prev.filter((line) => line.product_id !== item.product_id))
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {!cart.length ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-5 text-center text-slate-500">
                      Cart is empty.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 font-semibold">Checkout</h3>
          <form
            className="space-y-3"
            onSubmit={checkoutForm.handleSubmit((values) =>
              checkoutMutation.mutate({
                values,
                cartSnapshot: [...cart]
              })
            )}
          >
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Payment method</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...checkoutForm.register('payment_method')}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
                <option value="khqr">KHQR</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Payment received</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...checkoutForm.register('payment_received')}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                rows={3}
                {...checkoutForm.register('notes')}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm text-slate-500">Subtotal</p>
              <p className="text-2xl font-bold">{subtotal.toFixed(2)}</p>
            </div>

            <button
              type="submit"
              disabled={!cart.length || checkoutMutation.isPending || !hasOpenShift}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-400"
            >
              {checkoutMutation.isPending ? 'Processing...' : 'Checkout'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function addProductToCart(current: CartItem[], product: Product): CartItem[] {
  const maxStock = Number(product.stock?.quantity_on_hand ?? 0);

  const index = current.findIndex((item) => item.product_id === product.id);
  if (index === -1) {
    return [
      ...current,
      {
        product_id: product.id,
        name: product.name,
        barcode: product.barcode,
        unit_price: product.selling_price,
        quantity: 1,
        max_stock: maxStock
      }
    ];
  }

  const next = [...current];
  const item = next[index];
  const nextQuantity = Math.min(item.quantity + 1, item.max_stock || item.quantity + 1);
  next[index] = { ...item, quantity: nextQuantity };
  return next;
}

async function validateStockBeforeCheckout(cart: CartItem[], branchId: number) {
  if (!cart.length) {
    throw new Error('Cart is empty.');
  }

  if (!branchId) {
    throw new Error('Branch is required.');
  }

  for (const item of cart) {
    const latest = await getProduct(item.product_id);
    const available = Number(latest.data.stock?.quantity_on_hand ?? 0);

    if (available < item.quantity) {
      throw new Error(
        `Insufficient stock for ${item.name}. Requested ${item.quantity}, available ${available}.`
      );
    }
  }
}
