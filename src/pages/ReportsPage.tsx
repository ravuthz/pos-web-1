import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeading } from '@/components/PageHeading';
import { InlineAlert } from '@/components/InlineAlert';
import { queryKeys } from '@/lib/queryKeys';
import {
  exportProductsReport,
  exportSalesReport,
  exportStockReport,
  getProductSalesReport,
  getProfitAndLoss,
  getTopSellingProducts
} from '@/services/reports';
import { extractApiError } from '@/lib/errors';

const pnlSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  date_from: z.string().optional(),
  date_to: z.string().optional()
});

const topSchema = z.object({
  period: z.enum(['daily', 'monthly', 'yearly']),
  limit: z.coerce.number().min(1).max(100)
});

const salesSchema = z.object({
  period: z.enum(['daily', 'monthly', 'yearly'])
});

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [error, setError] = useState<string | null>(null);

  const pnlForm = useForm<z.infer<typeof pnlSchema>>({
    resolver: zodResolver(pnlSchema),
    defaultValues: {
      type: 'monthly',
      date_from: '',
      date_to: ''
    }
  });

  const topForm = useForm<z.infer<typeof topSchema>>({
    resolver: zodResolver(topSchema),
    defaultValues: {
      period: 'monthly',
      limit: 10
    }
  });

  const salesForm = useForm<z.infer<typeof salesSchema>>({
    resolver: zodResolver(salesSchema),
    defaultValues: {
      period: 'monthly'
    }
  });

  const pnlParams = pnlForm.watch();
  const topParams = topForm.watch();
  const salesParams = salesForm.watch();

  const pnlQuery = useQuery({
    queryKey: queryKeys.reports.pnl(pnlParams),
    queryFn: () => getProfitAndLoss(pnlParams)
  });

  const topQuery = useQuery({
    queryKey: queryKeys.reports.topProducts(topParams),
    queryFn: () => getTopSellingProducts(topParams)
  });

  const productSalesQuery = useQuery({
    queryKey: queryKeys.reports.productSales(salesParams),
    queryFn: () => getProductSalesReport(salesParams)
  });

  const exportMutation = useMutation({
    mutationFn: async ({ type }: { type: 'sales' | 'products' | 'stock' }) => {
      if (type === 'sales') {
        return {
          blob: await exportSalesReport({ format: 'csv' }),
          filename: `sales-report-${Date.now()}.csv`
        };
      }

      if (type === 'products') {
        return {
          blob: await exportProductsReport({ format: 'csv' }),
          filename: `products-report-${Date.now()}.csv`
        };
      }

      return {
        blob: await exportStockReport({ format: 'csv' }),
        filename: `stock-report-${Date.now()}.csv`
      };
    },
    onSuccess: ({ blob, filename }) => {
      setError(null);
      downloadBlob(blob, filename);
    },
    onError: (mutationError) => setError(extractApiError(mutationError))
  });

  const pnlData = pnlQuery.data?.data;
  const topData = topQuery.data?.data ?? [];
  const productSalesData = productSalesQuery.data?.data ?? [];

  return (
    <div>
      <PageHeading title="Reports" subtitle="Profit and loss, top products, and product sales analytics." />

      {error ? <InlineAlert message={error} /> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <form
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={pnlForm.handleSubmit(() => pnlQuery.refetch())}
        >
          <h3 className="mb-3 font-semibold">Profit and Loss</h3>
          <div className="space-y-2">
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...pnlForm.register('type')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2" {...pnlForm.register('date_from')} />
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2" {...pnlForm.register('date_to')} />
            <button type="submit" className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
              Refresh PnL
            </button>
          </div>
          <div className="mt-3 text-sm text-slate-700">
            <p>Revenue: {String((pnlData as Record<string, unknown> | undefined)?.revenue ?? '-')}</p>
            <p>Net Profit: {String((pnlData as Record<string, unknown> | undefined)?.net_profit ?? '-')}</p>
            <p>Margin: {String((pnlData as Record<string, unknown> | undefined)?.margin_percentage ?? '-')}</p>
          </div>
        </form>

        <form
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={topForm.handleSubmit(() => topQuery.refetch())}
        >
          <h3 className="mb-3 font-semibold">Top Selling Products</h3>
          <div className="space-y-2">
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...topForm.register('period')}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input
              type="number"
              min={1}
              max={100}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...topForm.register('limit')}
            />
            <button type="submit" className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
              Refresh Top List
            </button>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {topData.slice(0, 5).map((item) => (
              <li key={item.product_id} className="flex justify-between">
                <span>{item.product_name}</span>
                <span className="font-semibold">{item.total_quantity}</span>
              </li>
            ))}
          </ul>
        </form>

        <form
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={salesForm.handleSubmit(() => productSalesQuery.refetch())}
        >
          <h3 className="mb-3 font-semibold">Product Sales Report</h3>
          <div className="space-y-2">
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...salesForm.register('period')}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button type="submit" className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
              Refresh Product Sales
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onClick={() => exportMutation.mutate({ type: 'sales' })}
            >
              Export Sales CSV
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onClick={() => exportMutation.mutate({ type: 'products' })}
            >
              Export Products CSV
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onClick={() => exportMutation.mutate({ type: 'stock' })}
            >
              Export Stock CSV
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Category</th>
              <th className="px-3 py-2 font-semibold">Units Sold</th>
              <th className="px-3 py-2 font-semibold">Avg Price</th>
              <th className="px-3 py-2 font-semibold">Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {productSalesData.map((row) => (
              <tr key={row.product_id} className="border-t border-slate-200">
                <td className="px-3 py-2">{row.product_name}</td>
                <td className="px-3 py-2">{row.category_name || '-'}</td>
                <td className="px-3 py-2">{row.total_units_sold}</td>
                <td className="px-3 py-2">{row.average_unit_price}</td>
                <td className="px-3 py-2">{row.total_sales_amount}</td>
              </tr>
            ))}
            {!productSalesData.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-slate-500">
                  No report rows available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
