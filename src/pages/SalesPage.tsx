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
import { listSales, refundSale, voidSale } from '@/services/sales';
import type { Sale } from '@/types/api';

const filtersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['', 'completed', 'refunded', 'void']).default(''),
  payment_method: z.enum(['', 'cash', 'card', 'transfer', 'khqr']).default(''),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  per_page: z.coerce.number().min(1).max(100).default(50)
});

type FiltersFormValues = z.infer<typeof filtersSchema>;

export function SalesPage() {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FiltersFormValues>({
    resolver: zodResolver(filtersSchema),
    defaultValues: {
      search: '',
      status: '',
      payment_method: '',
      date_from: '',
      date_to: '',
      per_page: 50
    }
  });

  const filters = form.watch();

  const salesQuery = useQuery({
    queryKey: queryKeys.sales.list(filters),
    queryFn: () => listSales(filters)
  });

  const refundMutation = useMutation({
    mutationFn: refundSale,
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sales.root });
    },
    onError: (mutationError) => setError(extractApiError(mutationError))
  });

  const voidMutation = useMutation({
    mutationFn: voidSale,
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sales.root });
    },
    onError: (mutationError) => setError(extractApiError(mutationError))
  });

  const sales = salesQuery.data?.data ?? [];
  const meta = salesQuery.data?.meta;

  return (
    <div>
      <PageHeading title="Sales" subtitle="Browse sales transactions and run refund/void operations." />

      <form
        className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-6"
        onSubmit={form.handleSubmit(() => salesQuery.refetch())}
      >
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Search invoice"
          {...form.register('search')}
        />

        <select className="rounded-lg border border-slate-300 px-3 py-2" {...form.register('status')}>
          <option value="">All status</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="void">Void</option>
        </select>

        <select className="rounded-lg border border-slate-300 px-3 py-2" {...form.register('payment_method')}>
          <option value="">All payments</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="transfer">Transfer</option>
          <option value="khqr">KHQR</option>
        </select>

        <input type="date" className="rounded-lg border border-slate-300 px-3 py-2" {...form.register('date_from')} />

        <input type="date" className="rounded-lg border border-slate-300 px-3 py-2" {...form.register('date_to')} />

        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={100}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('per_page')}
          />
          <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            Apply
          </button>
        </div>
      </form>

      {error ? <InlineAlert message={error} /> : null}

      {meta ? (
        <p className="mb-3 text-xs text-slate-500">
          Page {meta.page} of {meta.total_pages} · {meta.total_items} sales
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 font-semibold">Invoice</th>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Payment</th>
              <th className="px-3 py-2 font-semibold">Amount</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale: Sale) => (
              <tr key={sale.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{sale.invoice_number}</td>
                <td className="px-3 py-2">{sale.sale_date}</td>
                <td className="px-3 py-2">{sale.payment_method}</td>
                <td className="px-3 py-2">{sale.total_amount}</td>
                <td className="px-3 py-2">{sale.status}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={sale.status !== 'completed' || refundMutation.isPending}
                      className="rounded-md border border-amber-300 px-2 py-1 text-amber-700 disabled:opacity-40"
                      onClick={() => refundMutation.mutate(sale.id)}
                    >
                      Refund
                    </button>
                    <button
                      type="button"
                      disabled={sale.status !== 'completed' || voidMutation.isPending}
                      className="rounded-md border border-rose-300 px-2 py-1 text-rose-600 disabled:opacity-40"
                      onClick={() => voidMutation.mutate(sale.id)}
                    >
                      Void
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!sales.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No sales found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
