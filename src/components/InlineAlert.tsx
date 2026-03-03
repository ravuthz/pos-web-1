interface InlineAlertProps {
  tone?: 'error' | 'success' | 'warning';
  message: string;
}

export function InlineAlert({ tone = 'error', message }: InlineAlertProps) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-rose-200 bg-rose-50 text-rose-700';

  return <p className={`rounded-lg border px-3 py-2 text-sm ${toneClass}`}>{message}</p>;
}
