const STYLES: Record<string, string> = {
  // Success states
  success:   'text-green-400 bg-green-500/10 border-green-500/30',
  ok:        'text-green-400 bg-green-500/10 border-green-500/30',
  active:    'text-green-400 bg-green-500/10 border-green-500/30',
  connected: 'text-green-400 bg-green-500/10 border-green-500/30',
  running:   'text-green-400 bg-green-500/10 border-green-500/30',
  completed: 'text-green-400 bg-green-500/10 border-green-500/30',
  enabled:   'text-green-400 bg-green-500/10 border-green-500/30',
  // Warning states
  pending:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
  waiting:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
  degraded:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
  starting:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
  // Error states
  error:     'text-red-400 bg-red-500/10 border-red-500/30',
  failed:    'text-red-400 bg-red-500/10 border-red-500/30',
  offline:   'text-red-400 bg-red-500/10 border-red-500/30',
  // Neutral states
  idle:      'text-slate-400 bg-slate-500/10 border-slate-500/30',
  disabled:  'text-slate-400 bg-slate-500/10 border-slate-500/30',
  stopped:   'text-slate-400 bg-slate-500/10 border-slate-500/30',
  unknown:   'text-slate-400 bg-slate-500/10 border-slate-500/30',
  // Info states
  configured:'text-amber-400 bg-amber-500/10 border-amber-500/30',
  approved:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

export default function StatusBadge({ status }: { status: string | null }) {
  const s = (status || 'unknown').toLowerCase();
  const cls = STYLES[s] || STYLES.unknown;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${cls}`}>
      {s}
    </span>
  );
}
