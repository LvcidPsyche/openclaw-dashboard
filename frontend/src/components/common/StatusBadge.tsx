const styles: Record<string, string> = {
  success: 'text-green-400 bg-green-500/10 border-green-500/30',
  active: 'text-green-400 bg-green-500/10 border-green-500/30',
  error: 'text-red-400 bg-red-500/10 border-red-500/30',
  idle: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  unknown: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  configured: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  pending: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

export default function StatusBadge({ status }: { status: string | null }) {
  const s = status || 'unknown';
  const cls = styles[s] || styles.unknown;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${cls}`}>
      {s}
    </span>
  );
}
