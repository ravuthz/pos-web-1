import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeading } from '@/components/PageHeading';
import { InlineAlert } from '@/components/InlineAlert';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { listVendors } from '@/services/vendors';
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  sendPurchaseOrder,
  updatePurchaseOrder
} from '@/services/purchases';
import { extractApiError } from '@/lib/errors';
import type { PurchaseOrder } from '@/types/api';

const purchaseCreateSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor is required.'),
  order_date: z.string().min(1, 'Order date is required.'),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        product_id: z.coerce.number().int().positive(),
        quantity_ordered: z.coerce.number().positive(),
        unit_cost: z.coerce.number().min(0)
      })
    )
    .min(1, 'At least one product line is required.')
});

const purchaseUpdateSchema = z.object({
  id: z.number(),
  vendor_id: z.string().min(1, 'Vendor is required.'),
  order_date: z.string().min(1, 'Order date is required.'),
  expected_date: z.string().optional(),
  notes: z.string().optional()
});

type PurchaseCreateValues = z.infer<typeof purchaseCreateSchema>;
type PurchaseUpdateValues = z.infer<typeof purchaseUpdateSchema>;

export function PurchasesPage() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  const purchasesQuery = useQuery({
    queryKey: queryKeys.purchases.list({ per_page: 200 }),
    queryFn: () => listPurchaseOrders({ per_page: 200 })
  });

  const vendorsQuery = useQuery({
    queryKey: queryKeys.vendors.list(),
    queryFn: listVendors
  });

  const createForm = useForm<PurchaseCreateValues>({
    resolver: zodResolver(purchaseCreateSchema),
    defaultValues: {
      vendor_id: '',
      order_date: new Date().toISOString().slice(0, 10),
      expected_date: '',
      notes: '',
      products: [{ product_id: 0, quantity_ordered: 1, unit_cost: 0 }]
    }
  });

  const createLines = useFieldArray({
    control: createForm.control,
    name: 'products'
  });

  const updateForm = useForm<PurchaseUpdateValues>({
    resolver: zodResolver(purchaseUpdateSchema),
    defaultValues: {
      id: 0,
      vendor_id: '',
      order_date: '',
      expected_date: '',
      notes: ''
    }
  });

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: async () => {
      setApiError(null);
      createForm.reset({
        vendor_id: '',
        order_date: new Date().toISOString().slice(0, 10),
        expected_date: '',
        notes: '',
        products: [{ product_id: 0, quantity_ordered: 1, unit_cost: 0 }]
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.purchases.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updatePurchaseOrder(id, payload),
    onSuccess: async () => {
      setApiError(null);
      setEditingOrder(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.purchases.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const sendMutation = useMutation({
    mutationFn: sendPurchaseOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.purchases.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const receiveMutation = useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: number;
      payload: {
        products: Array<{
          product_id: number;
          quantity_received: number;
        }>;
      };
    }) => receivePurchaseOrder(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.purchases.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPurchaseOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.purchases.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const orders = useMemo(() => purchasesQuery.data?.data ?? [], [purchasesQuery.data]);
  const vendors = vendorsQuery.data?.data ?? [];

  return (
    <div>
      <PageHeading title="Purchases" subtitle="Create and manage purchase order lifecycle." />

      <form
        className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
        onSubmit={createForm.handleSubmit((values) =>
          createMutation.mutate({
            vendor_id: Number(values.vendor_id),
            order_date: values.order_date,
            expected_date: values.expected_date || undefined,
            notes: values.notes || undefined,
            products: values.products
          })
        )}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Vendor</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...createForm.register('vendor_id')}>
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Order date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...createForm.register('order_date')}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Expected date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...createForm.register('expected_date')}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...createForm.register('notes')}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {createLines.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 md:grid-cols-4">
              <input
                type="number"
                placeholder="Product ID"
                className="rounded-lg border border-slate-300 px-3 py-2"
                {...createForm.register(`products.${index}.product_id`)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Quantity"
                className="rounded-lg border border-slate-300 px-3 py-2"
                {...createForm.register(`products.${index}.quantity_ordered`)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Unit cost"
                className="rounded-lg border border-slate-300 px-3 py-2"
                {...createForm.register(`products.${index}.unit_cost`)}
              />
              <button
                type="button"
                className="rounded-lg border border-rose-300 px-3 py-2 text-rose-600"
                onClick={() => createLines.remove(index)}
              >
                Remove line
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => createLines.append({ product_id: 0, quantity_ordered: 1, unit_cost: 0 })}
          >
            Add line
          </button>
          <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            Create PO
          </button>
        </div>
      </form>

      {editingOrder ? (
        <form
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
          onSubmit={updateForm.handleSubmit((values) =>
            updateMutation.mutate({
              id: values.id,
              payload: {
                vendor_id: Number(values.vendor_id),
                order_date: values.order_date,
                expected_date: values.expected_date || undefined,
                notes: values.notes || undefined
              }
            })
          )}
        >
          <p className="mb-3 text-sm font-semibold text-amber-800">Editing PO #{editingOrder.po_number}</p>
          <div className="grid gap-3 md:grid-cols-4">
            <input type="hidden" {...updateForm.register('id', { valueAsNumber: true })} />
            <select className="rounded-lg border border-slate-300 px-3 py-2" {...updateForm.register('vendor_id')}>
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2"
              {...updateForm.register('order_date')}
            />
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2"
              {...updateForm.register('expected_date')}
            />
            <input className="rounded-lg border border-slate-300 px-3 py-2" {...updateForm.register('notes')} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
              Save
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onClick={() => setEditingOrder(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {apiError ? <InlineAlert message={apiError} /> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 font-semibold">PO#</th>
              <th className="px-3 py-2 font-semibold">Vendor</th>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Total</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{order.po_number}</td>
                <td className="px-3 py-2">{order.vendor?.name || order.vendor_id}</td>
                <td className="px-3 py-2">{order.order_date}</td>
                <td className="px-3 py-2">{order.status}</td>
                <td className="px-3 py-2">{order.total_amount}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1"
                      onClick={() => {
                        setEditingOrder(order);
                        updateForm.reset({
                          id: order.id,
                          vendor_id: String(order.vendor_id),
                          order_date: order.order_date.slice(0, 10),
                          expected_date: order.expected_date?.slice(0, 10) ?? '',
                          notes: order.notes ?? ''
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-cyan-300 px-2 py-1 text-cyan-700"
                      onClick={() => sendMutation.mutate(order.id)}
                    >
                      Send
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-emerald-300 px-2 py-1 text-emerald-700"
                      onClick={() => {
                        const payload = {
                          products: (order.products ?? []).map((line) => ({
                            product_id: line.product_id,
                            quantity_received: line.pending_quantity > 0 ? line.pending_quantity : line.quantity_ordered
                          }))
                        };
                        receiveMutation.mutate({ id: order.id, payload });
                      }}
                    >
                      Receive
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-rose-300 px-2 py-1 text-rose-600"
                      onClick={() => cancelMutation.mutate(order.id)}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!orders.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-5 text-center text-slate-500">
                  No purchase orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
