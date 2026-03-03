import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '@/components/PageHeading';
import { queryKeys } from '@/lib/queryKeys';
import { getSalesSummary } from '@/services/sales';
import { countQueuedSales } from '@/features/pos/offlineQueue';
import { useBranchStore } from '@/hooks/useBranchStore';
import { InlineAlert } from '@/components/InlineAlert';

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { selectedBranchId } = useBranchStore();

  const summaryQuery = useQuery({
    queryKey: queryKeys.sales.summary(selectedBranchId ?? undefined),
    queryFn: getSalesSummary
  });

  const queueQuery = useQuery({
    queryKey: ['offline-queue-count'],
    queryFn: countQueuedSales,
    refetchInterval: 5000
  });

  const data = (summaryQuery.data?.data ?? {}) as {
    today?: {
      total?: number;
      count?: number;
      average?: number;
      received_usd?: number;
      received_khr?: number;
    };
    this_month?: {
      total?: number;
      count?: number;
      average?: number;
    };
    payment_breakdown?: Array<{
      method: string;
      total: number;
      count: number;
    }>;
  };

  return (
    <div>
      <PageHeading
        title="Dashboard"
        subtitle="Live operational snapshot for the selected branch."
      />

      {summaryQuery.isError ? (
        <InlineAlert
          message={`Failed to load sales summary: ${
            (summaryQuery.error as Error | undefined)?.message ?? 'Unknown error'
          }`}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today Sales" value={String(data.today?.total ?? '-')} />
        <MetricCard label="Today Transactions" value={String(data.today?.count ?? '-')} />
        <MetricCard label="Month Sales" value={String(data.this_month?.total ?? '-')} />
        <MetricCard label="Queued Offline Sales" value={queueQuery.data ?? 0} />
      </div>

      <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
        Keyboard shortcuts on POS: <kbd>F2</kbd> focus barcode, <kbd>Ctrl</kbd> + <kbd>Enter</kbd>{' '}
        checkout, <kbd>Esc</kbd> clear barcode.
      </div>
    </div>
  );
}
