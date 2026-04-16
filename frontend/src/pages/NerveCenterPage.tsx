import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { usePolling } from '../hooks/usePolling';
import * as api from '../api/endpoints';
import {
  RefreshCw, Play, Pause, Wifi, WifiOff, ExternalLink, ChevronRight,
  Loader2,
} from 'lucide-react';

// ─── Arc Gauge ────────────────────────────────────────────────────────────────
// Arc: M 25 70 A 40 40 0 1 1 95 70  (240° gauge, 8 o'clock → 4 o'clock)
// pathLength="100" means strokeDasharray="value 100" fills value% of the arc.

function ArcGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const v = Math.min(100, Math.max(0, value));
  const fill = v > 85 ? '#ef4444' : v > 65 ? '#f59e0b' : color;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 85" className="w-full max-w-[108px]">
        <path d="M 25 70 A 40 40 0 1 1 95 70" fill="none" stroke="#1e293b" strokeWidth="9" strokeLinecap="round" pathLength="100" />
        <path
          d="M 25 70 A 40 40 0 1 1 95 70"
          fill="none"
          stroke={fill}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${v} 100`}
          pathLength="100"
          className="fd-arc-fill"
          style={{ filter: `drop-shadow(0 0 5px ${fill}55)` }}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="16" fontWeight="700" fill="white" fontFamily="monospace">
          {v.toFixed(0)}%
        </text>
        {/* Range endpoints */}
        <circle cx="25" cy="70" r="2" fill="#334155" />
        <circle cx="95" cy="70" r="2" fill="#334155" />
      </svg>
      <span className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">{label}</span>
    </div>
  );
}

// ─── HUD Panel ────────────────────────────────────────────────────────────────

function Panel({
  title,
  live,
  link,
  className = '',
  children,
}: {
  title: string;
  live?: boolean;
  link?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`fd-panel relative bg-slate-900/70 border border-slate-700/40 rounded-lg p-4 flex flex-col overflow-hidden ${className}`}>
      {/* HUD corner accents */}
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-500/25 rounded-tl pointer-events-none" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-500/25 rounded-tr pointer-events-none" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-500/25 rounded-bl pointer-events-none" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-500/25 rounded-br pointer-events-none" />

      {/* Title */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        {live && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 fd-live-dot shrink-0" />}
        <span className="text-[9px] font-semibold tracking-[0.22em] text-amber-500/60 uppercase flex-1 truncate">
          {title}
        </span>
        {link && (
          <Link to={link} className="text-slate-700 hover:text-amber-400 transition-colors shrink-0">
            <ExternalLink size={11} />
          </Link>
        )}
      </div>

      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#f59e0b', height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div className="text-[10px] text-slate-600 italic">No data</div>;
  const max = Math.max(...data) || 1;
  const w = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * (height - 2);
    return `${x},${y}`;
  }).join(' ');
  const areaPts = `0,${height} ${pts} ${w},${height}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#sparkGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Log Line ─────────────────────────────────────────────────────────────────

function LogLine({ line }: { line: string }) {
  const color = /error|err|fail|exception/i.test(line)
    ? 'text-red-400'
    : /warn|warning/i.test(line)
    ? 'text-amber-400/80'
    : /info|started|connected/i.test(line)
    ? 'text-slate-300'
    : 'text-slate-500';
  return <div className={`fd-log leading-5 truncate ${color}`}>{line}</div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NerveCenterPage() {
  const { system, overview, jobs, timeseries, fetchAll, fetchTimeseries, controlJob } = useStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gateway, setGateway] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessions, setSessions] = useState<any[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [budget, setBudget] = useState<number>(() => {
    const v = localStorage.getItem('fd_budget');
    return v ? parseFloat(v) : 10;
  });
  const [refreshing, setRefreshing] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);

  const loadAuxData = useCallback(async () => {
    await Promise.allSettled([
      api.fetchDebugGateway().then(setGateway).catch(() => {}),
      api.fetchSessionsList().then((d) => setSessions(d.sessions || [])).catch(() => {}),
      api.fetchLogFiles().then(async (d) => {
        const first = d.files?.[0]?.name;
        if (first) {
          const tail = await api.fetchLogTail(first, 50);
          setLogLines(tail.lines || []);
        }
      }).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    fetchAll();
    fetchTimeseries('tokens', 24);
    loadAuxData();
  }, []);

  usePolling(fetchAll, 15000);
  usePolling(() => fetchTimeseries('tokens', 24), 60000);
  usePolling(loadAuxData, 30000);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAll(), fetchTimeseries('tokens', 24), loadAuxData()]);
    setRefreshing(false);
  };

  const handleBudget = (v: number) => {
    setBudget(v);
    localStorage.setItem('fd_budget', String(v));
  };

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const failingJobs = jobs.filter((j) => j.consecutive_errors > 0);
  const costToday = overview?.cost_today ?? 0;
  const budgetPct = Math.min(100, (costToday / budget) * 100);
  const tokenPoints = (timeseries || []).map((p) => p.value);

  // ── Layout: three rows with explicit heights ───────────────────────────────

  return (
    <div className="space-y-3">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-bold text-white tracking-[0.2em] uppercase">Flight Deck</h1>
          <span className="text-[10px] text-slate-600 tracking-wide">
            {new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-slate-500 hover:text-amber-400 rounded border border-slate-800 hover:border-amber-900/40 transition-all"
        >
          <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          Sync
        </button>
      </div>

      {/* Row 1: System │ Gateway │ Sessions  (h-48) */}
      <div className="grid grid-cols-12 gap-3 h-48">

        <Panel title="Sys Status" live link="/system" className="col-span-4">
          <div className="flex items-center justify-around h-full pb-1">
            <ArcGauge value={system?.cpu_percent ?? 0} label="CPU" color="#38bdf8" />
            <ArcGauge value={system?.memory_percent ?? 0} label="MEM" color="#a78bfa" />
            <ArcGauge value={system?.disk_percent ?? 0} label="DISK" color="#34d399" />
          </div>
        </Panel>

        <Panel title="Gateway" live={gateway?.connected} link="/debug" className="col-span-4">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center gap-3">
              {gateway === null ? (
                <Loader2 size={18} className="text-slate-600 animate-spin" />
              ) : gateway?.connected ? (
                <Wifi size={18} className="text-green-400" />
              ) : (
                <WifiOff size={18} className="text-red-400" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">
                  {gateway === null ? 'Checking…' : gateway?.connected ? 'Connected' : 'Offline'}
                </div>
                <div className="text-[10px] text-slate-600 truncate">
                  {gateway?.gateway_url || 'No URL'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              {[
                { label: 'Latency', value: gateway?.latency_ms != null ? `${gateway.latency_ms}ms` : '—', warn: (gateway?.latency_ms ?? 0) > 200 },
                { label: 'Protocol', value: gateway?.protocol_version ? `v${gateway.protocol_version}` : '—' },
                { label: 'Uptime', value: overview?.uptime_percent != null ? `${overview.uptime_percent.toFixed(1)}%` : '—' },
              ].map(({ label, value, warn }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-600">{label}</span>
                  <span className={`font-mono ${warn ? 'text-amber-400' : 'text-slate-300'}`}>{value}</span>
                </div>
              ))}
            </div>

            {gateway?.error && (
              <div className="text-[10px] text-red-400 truncate">{gateway.error}</div>
            )}
          </div>
        </Panel>

        <Panel title="Active Sessions" live={activeSessions.length > 0} link="/sessions" className="col-span-4">
          <div className="flex flex-col h-full min-h-0">
            <div className="flex items-baseline gap-2 mb-2 shrink-0">
              <span className="text-2xl font-bold text-white font-mono">{activeSessions.length}</span>
              <span className="text-xs text-slate-500">active</span>
              <span className="ml-auto text-[10px] text-slate-700">{sessions.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {activeSessions.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center gap-2 px-2 py-1 bg-slate-800/40 rounded text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="font-mono text-slate-300 truncate flex-1">{(s.id || '').slice(0, 14)}</span>
                  <span className="text-[10px] text-slate-600 shrink-0">{(s.model || '').split('-')[0] || '—'}</span>
                </div>
              ))}
              {activeSessions.length === 0 && (
                <div className="text-[11px] text-slate-700 pt-1">No active sessions</div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 2: Job Control │ Cost Meter  (h-52) */}
      <div className="grid grid-cols-12 gap-3 h-52">

        <Panel title="Job Control" link="/jobs" className="col-span-6">
          <div className="flex flex-col h-full min-h-0">
            {/* Summary row */}
            <div className="flex gap-4 shrink-0 mb-2">
              {[
                { n: jobs.length, label: 'total', color: 'text-white' },
                { n: jobs.filter((j) => j.enabled).length, label: 'enabled', color: 'text-green-400' },
                { n: failingJobs.length, label: 'failing', color: failingJobs.length ? 'text-red-400' : 'text-slate-600' },
              ].map(({ n, label, color }) => (
                <div key={label} className="text-center">
                  <div className={`text-xl font-bold font-mono ${color}`}>{n}</div>
                  <div className="text-[10px] text-slate-600">{label}</div>
                </div>
              ))}
            </div>

            {/* Job list */}
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {jobs.slice(0, 10).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800/40 transition-colors text-xs group"
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    job.consecutive_errors > 0 ? 'bg-red-500' : job.enabled ? 'bg-green-500' : 'bg-slate-600'
                  }`} />
                  <span className="text-slate-300 truncate flex-1">{job.name}</span>
                  <span className="text-[10px] text-slate-700 shrink-0 hidden group-hover:block">{job.schedule}</span>
                  <button
                    onClick={() => controlJob(job.id, job.enabled ? 'disable' : 'enable')}
                    className={`shrink-0 p-0.5 rounded transition-colors ${
                      job.enabled ? 'text-green-500 hover:text-red-400' : 'text-slate-600 hover:text-green-400'
                    }`}
                  >
                    {job.enabled ? <Pause size={11} /> : <Play size={11} />}
                  </button>
                </div>
              ))}
              {jobs.length === 0 && <div className="text-[11px] text-slate-700 pt-1">No jobs configured</div>}
            </div>
          </div>
        </Panel>

        <Panel title="Cost Meter" link="/metrics" className="col-span-6">
          <div className="flex flex-col justify-between h-full">
            {/* Today's spend */}
            <div>
              <div className="flex items-end gap-2 mb-1.5">
                <span className="text-2xl font-bold text-white font-mono">${costToday.toFixed(4)}</span>
                <span className="text-xs text-slate-500 mb-0.5">today</span>
                {budgetPct > 80 && (
                  <span className="ml-auto text-[10px] text-red-400 font-semibold">NEAR LIMIT</span>
                )}
              </div>
              {/* Progress bar */}
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${budgetPct}%`,
                    background: budgetPct > 85 ? '#ef4444' : budgetPct > 65 ? '#f59e0b' : '#34d399',
                    boxShadow: budgetPct > 85 ? '0 0 6px #ef4444aa' : undefined,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-700 mt-1">
                <span>{budgetPct.toFixed(1)}% of ${budget.toFixed(2)}</span>
                <span>{(overview?.tokens_today ?? 0).toLocaleString()} tokens</span>
              </div>
            </div>

            {/* Budget slider */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">Daily Budget</span>
                <span className="text-[10px] font-mono text-amber-400">${budget.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={50}
                step={0.1}
                value={budget}
                onChange={(e) => handleBudget(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              {[
                { label: 'active jobs', value: overview?.active_jobs ?? '—' },
                { label: 'agents', value: overview?.agents_count ?? '—' },
                { label: 'skills', value: overview?.skills_count ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-sm font-bold text-white">{value}</div>
                  <div className="text-[10px] text-slate-600">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 3: Log Stream │ Token Flow  (h-72) */}
      <div className="grid grid-cols-12 gap-3 h-72">

        <Panel title="Log Stream" live link="/logs" className="col-span-8">
          <div
            ref={logRef}
            className="h-full overflow-y-auto bg-slate-950/70 rounded p-2 fd-scanlines"
          >
            {logLines.length === 0 ? (
              <div className="fd-log text-slate-700">Waiting for log data…</div>
            ) : (
              logLines.map((line, i) => <LogLine key={i} line={line} />)
            )}
          </div>
        </Panel>

        <Panel title="Token Flow" link="/metrics" className="col-span-4">
          <div className="flex flex-col justify-between h-full">
            {/* Sparkline */}
            <div>
              <div className="text-[10px] text-slate-600 mb-1">24h trend</div>
              <Sparkline data={tokenPoints} color="#f59e0b" height={44} />
            </div>

            {/* Key metrics */}
            <div className="space-y-2">
              {[
                { label: 'Tokens today', value: (overview?.tokens_today ?? 0).toLocaleString() },
                { label: 'Cost today', value: `$${costToday.toFixed(4)}` },
                { label: 'Pipelines', value: overview?.pipelines_count ?? '—' },
                { label: 'Error jobs', value: overview?.error_jobs ?? '—', warn: (overview?.error_jobs ?? 0) > 0 },
              ].map(({ label, value, warn }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-600">{label}</span>
                  <span className={`font-mono ${warn ? 'text-red-400' : 'text-slate-300'}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="space-y-0.5 border-t border-slate-800/80 pt-2">
              {[
                { to: '/agents', label: 'Agents' },
                { to: '/jobs', label: 'Jobs' },
                { to: '/metrics', label: 'Full Metrics' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800/40 text-[11px] text-slate-500 hover:text-amber-400 transition-colors"
                >
                  {label}
                  <ChevronRight size={11} />
                </Link>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
