import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeading } from '@/components/PageHeading';
import { InlineAlert } from '@/components/InlineAlert';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { extractApiError } from '@/lib/errors';
import { listStockMovements, adjustStock } from '@/services/stockMovements';
import { listProducts } from '@/services/products';
import type { StockMovement } from '@/types/api';

const adjustSchema = z.object({
  product_id: z.string().min(1, 'Product is required.'),
  quantity_change: z.coerce.number(),
  notes: z.string().trim().min(1, 'Notes are required.')
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

export function StockMovementsPage() {
  const [apiError, setApiError] = useState<string | null>(null);

  const movementsQuery = useQuery({
    queryKey: queryKeys.stockMovements.list({ per_page: 200 }),
    queryFn: () => listStockMovements({ per_page: 200 })
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ per_page: 200 }),
    queryFn: () => listProducts({ per_page: 200 })
  });

  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      product_id: '',
      quantity_change: 0,
      notes: ''
    }
  });

  const adjustMutation = useMutation({
    mutationFn: adjustStock,
    onSuccess: async () => {
      setApiError(null);
      form.reset({ product_id: '', quantity_change: 0, notes: '' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
      ]);
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const products = productsQuery.data?.data ?? [];
  const movements = movementsQuery.data?.data ?? [];

  return (
    <div>
      <PageHeading title="Stock Movements" subtitle="Review stock history and run manual adjustments." />

      <form
        className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"
        onSubmit={form.handleSubmit((values) =>
          adjustMutation.mutate({
            product_id: Number(values.product_id),
            quantity_change: values.quantity_change,
            notes: values.notes
          })
        )}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Product</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register('product_id')}>
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code || 'N/A'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Quantity Change</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('quantity_change')}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
          <div className="flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...form.register('notes')}
            />
            <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
              Adjust
            </button>
          </div>
        </div>
      </form>

      {apiError ? <InlineAlert message={apiError} /> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">Before</th>
              <th className="px-3 py-2 font-semibold">Change</th>
              <th className="px-3 py-2 font-semibold">After</th>
              <th className="px-3 py-2 font-semibold">By</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement: StockMovement) => (
              <tr key={movement.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{movement.movement_date}</td>
                <td className="px-3 py-2">{movement.product_name}</td>
                <td className="px-3 py-2">{movement.movement_type_label || movement.movement_type}</td>
                <td className="px-3 py-2">{movement.quantity_before}</td>
                <td className="px-3 py-2">{movement.quantity_change}</td>
                <td className="px-3 py-2">{movement.quantity_after}</td>
                <td className="px-3 py-2">{movement.created_by?.name || '-'}</td>
              </tr>
            ))}
            {!movements.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-5 text-center text-slate-500">
                  No stock movements found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
