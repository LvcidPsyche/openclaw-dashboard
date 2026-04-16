import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { usePolling } from '../hooks/usePolling';
import * as api from '../api/endpoints';
import {
  RefreshCw, Play, Pause, Wifi, WifiOff, ExternalLink, ChevronRight,
} from 'lucide-react';

// ─── Arc Gauge ───────────────────────────────────────────────────────────────
// Uses pathLength="100" trick: strokeDasharray="value 100" fills value% of arc.
// Arc: M 25 70 A 40 40 0 1 1 95 70 — 240° gauge from 8 o'clock to 4 o'clock.

function ArcGauge({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  const warnColor = v > 85 ? '#ef4444' : v > 65 ? '#f59e0b' : color;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 120 85" className="w-full max-w-[110px]">
        {/* Background track */}
        <path
          d="M 25 70 A 40 40 0 1 1 95 70"
          fill="none"
          stroke="#1e293b"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength="100"
        />
        {/* Value fill */}
        <path
          d="M 25 70 A 40 40 0 1 1 95 70"
          fill="none"
          stroke={warnColor}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${v} 100`}
          pathLength="100"
          className="fd-arc-fill"
          style={{ filter: `drop-shadow(0 0 4px ${warnColor}60)` }}
        />
        {/* Center value */}
        <text
          x="60"
          y="57"
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          fill="white"
          fontFamily="monospace"
        >
          {v.toFixed(0)}%
        </text>
        {/* Tick marks at 0 and 100 */}
        <circle cx="25" cy="70" r="2" fill="#334155" />
        <circle cx="95" cy="70" r="2" fill="#334155" />
      </svg>
      <span className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
        {label}
      </span>
    </div>
  );
}

// ─── HUD Panel ────────────────────────────────────────────────────────────────

function Panel({
  title,
  cols,
  rows,
  live,
  link,
  children,
}: {
  title: string;
  cols?: number;
  rows?: number;
  live?: boolean;
  link?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fd-panel relative bg-slate-900/70 border border-slate-700/40 rounded-lg p-4 overflow-hidden flex flex-col min-h-0"
      style={{
        gridColumn: cols ? `span ${cols}` : undefined,
        gridRow: rows ? `span ${rows}` : undefined,
      }}
    >
      {/* HUD corner accents */}
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-500/30 rounded-tl" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-500/30 rounded-tr" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-500/30 rounded-bl" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-500/30 rounded-br" />

      {/* Title row */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        {live && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 fd-live-dot shrink-0" />
        )}
        <span className="text-[9px] font-semibold tracking-[0.2em] text-amber-500/70 uppercase flex-1">
          {title}
        </span>
        {link && (
          <Link
            to={link}
            className="text-slate-600 hover:text-amber-400 transition-colors"
            title="Open full view"
          >
            <ExternalLink size={11} />
          </Link>
        )}
      </div>

      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

// ─── Log Line ─────────────────────────────────────────────────────────────────

function LogLine({ line }: { line: string }) {
  const isErr = /error|err|fail|exception/i.test(line);
  const isWarn = /warn|warning/i.test(line);
  return (
    <div
      className={`fd-log truncate ${
        isErr ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-slate-400'
      }`}
    >
      {line}
    </div>
  );
}

// ─── Mini sparkline ──────────────────────────────────────────────────────────

function Sparkline({ data, color = '#f59e0b' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data) || 1;
  const w = 100;
  const h = 32;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NerveCenterPage() {
  const { system, overview, jobs, fetchAll, controlJob } = useStore();

  // Gateway
  const [gateway, setGateway] = useState<any>(null);
  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  // Log tail
  const [logLines, setLogLines] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  // Token sparkline (last 24h by-hour)
  const [tokenPoints, setTokenPoints] = useState<number[]>([]);
  // Budget slider (daily, in USD)
  const [budget, setBudget] = useState<number>(() => {
    const stored = localStorage.getItem('fd_budget');
    return stored ? parseFloat(stored) : 10;
  });
  // Refresh indicator
  const [refreshing, setRefreshing] = useState(false);

  const loadAuxData = useCallback(async () => {
    await Promise.allSettled([
      api.fetchDebugGateway().then(setGateway).catch(() => {}),
      api.fetchSessionsList().then((d) => setSessions(d.sessions || [])).catch(() => {}),
      api
        .fetchLogFiles()
        .then(async (d) => {
          const first = d.files?.[0]?.name;
          if (first) {
            const tail = await api.fetchLogTail(first, 40);
            setLogLines(tail.lines || []);
          }
        })
        .catch(() => {}),
      api
        .fetchTimeseries('tokens', 24)
        .then((d) => {
          const vals = (d.data || []).map((p: any) => p.value as number);
          setTokenPoints(vals);
        })
        .catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    fetchAll();
    loadAuxData();
  }, []);

  usePolling(fetchAll, 15000);
  usePolling(loadAuxData, 30000);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAll(), loadAuxData()]);
    setRefreshing(false);
  };

  const handleBudgetChange = (v: number) => {
    setBudget(v);
    localStorage.setItem('fd_budget', String(v));
  };

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const failingJobs = jobs.filter((j) => j.consecutive_errors > 0);
  const enabledJobs = jobs.filter((j) => j.enabled).length;
  const costToday = overview?.cost_today ?? 0;
  const budgetPct = Math.min(100, (costToday / budget) * 100);

  return (
    <div className="h-full flex flex-col gap-1 min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-white tracking-[0.15em] uppercase">
            Flight Deck
          </h1>
          <span className="text-[10px] text-slate-600 tracking-wider">
            {new Date().toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-slate-500 hover:text-amber-400 rounded border border-slate-800 hover:border-amber-900/40 transition-all"
        >
          <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Panel grid */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 auto-rows-fr">

        {/* ── SYS STATUS ── */}
        <Panel title="Sys Status" cols={4} live link="/system">
          <div className="flex items-center justify-around h-full">
            <ArcGauge value={system?.cpu_percent ?? 0} label="CPU" color="#38bdf8" />
            <ArcGauge value={system?.memory_percent ?? 0} label="MEM" color="#a78bfa" />
            <ArcGauge value={system?.disk_percent ?? 0} label="DISK" color="#34d399" />
          </div>
        </Panel>

        {/* ── GATEWAY ── */}
        <Panel title="Gateway" cols={4} live={gateway?.connected} link="/debug">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center gap-3">
              {gateway?.connected ? (
                <Wifi size={20} className="text-green-400 shrink-0" />
              ) : (
                <WifiOff size={20} className="text-red-400 shrink-0" />
              )}
              <div>
                <div className="text-sm font-semibold text-white">
                  {gateway?.connected ? 'Connected' : gateway === null ? 'Checking...' : 'Offline'}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                  {gateway?.gateway_url || '—'}
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Latency</span>
                <span className={`font-mono ${(gateway?.latency_ms ?? 0) > 200 ? 'text-amber-400' : 'text-green-400'}`}>
                  {gateway?.latency_ms != null ? `${gateway.latency_ms}ms` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Protocol</span>
                <span className="font-mono text-slate-300">
                  v{gateway?.protocol_version ?? '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Uptime</span>
                <span className="font-mono text-slate-300">
                  {overview?.uptime_percent != null
                    ? `${overview.uptime_percent.toFixed(1)}%`
                    : '—'}
                </span>
              </div>
            </div>

            {gateway?.error && (
              <div className="mt-2 text-[10px] text-red-400 truncate">{gateway.error}</div>
            )}
          </div>
        </Panel>

        {/* ── ACTIVE SESSIONS ── */}
        <Panel title="Sessions" cols={4} live={activeSessions.length > 0} link="/sessions">
          <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <span className="text-lg font-bold text-white">{activeSessions.length}</span>
              <span className="text-xs text-slate-500">active</span>
              <span className="ml-auto text-xs text-slate-600">{sessions.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {activeSessions.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/40 rounded text-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="font-mono text-slate-300 truncate flex-1">
                    {(s.id || '').substring(0, 14)}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {s.model?.split('-')[0] || '—'}
                  </span>
                </div>
              ))}
              {activeSessions.length === 0 && (
                <div className="text-xs text-slate-600 pt-2">No active sessions</div>
              )}
            </div>
          </div>
        </Panel>

        {/* ── JOB CONTROL ── */}
        <Panel title="Job Control" cols={6} link="/jobs">
          <div className="flex flex-col h-full min-h-0">
            <div className="flex gap-4 mb-2 shrink-0">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{jobs.length}</div>
                <div className="text-[10px] text-slate-500">total</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{enabledJobs}</div>
                <div className="text-[10px] text-slate-500">enabled</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${failingJobs.length > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                  {failingJobs.length}
                </div>
                <div className="text-[10px] text-slate-500">failing</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {jobs.slice(0, 8).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800/40 transition-colors text-xs"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      job.consecutive_errors > 0
                        ? 'bg-red-500'
                        : job.enabled
                        ? 'bg-green-500'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-slate-300 truncate flex-1">{job.name}</span>
                  <span className="text-[10px] text-slate-600 shrink-0">{job.schedule}</span>
                  <button
                    onClick={() => controlJob(job.id, job.enabled ? 'disable' : 'enable')}
                    className={`shrink-0 p-0.5 rounded transition-colors ${
                      job.enabled
                        ? 'text-green-400 hover:text-red-400'
                        : 'text-slate-600 hover:text-green-400'
                    }`}
                    title={job.enabled ? 'Disable' : 'Enable'}
                  >
                    {job.enabled ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="text-xs text-slate-600 pt-1">No jobs configured</div>
              )}
            </div>
          </div>
        </Panel>

        {/* ── COST METER ── */}
        <Panel title="Cost Meter" cols={6} link="/metrics">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-2xl font-bold text-white font-mono">
                  ${costToday.toFixed(4)}
                </span>
                <span className="text-xs text-slate-500 mb-1">today</span>
              </div>

              {/* Budget progress bar */}
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${budgetPct}%`,
                    background:
                      budgetPct > 85
                        ? '#ef4444'
                        : budgetPct > 65
                        ? '#f59e0b'
                        : '#34d399',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 mb-4">
                <span>{budgetPct.toFixed(1)}% of budget</span>
                <span>${budget.toFixed(2)}/day</span>
              </div>
            </div>

            {/* Budget slider */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-slate-500 tracking-wider uppercase">Daily Budget</span>
                <span className="text-[10px] font-mono text-amber-400">${budget.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={50}
                step={0.1}
                value={budget}
                onChange={(e) => handleBudgetChange(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-700 mt-0.5">
                <span>$0.10</span>
                <span>$50.00</span>
              </div>
            </div>

            {/* Overview stats row */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800">
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {overview?.tokens_today?.toLocaleString() ?? '—'}
                </div>
                <div className="text-[10px] text-slate-600">tokens</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">{overview?.active_jobs ?? '—'}</div>
                <div className="text-[10px] text-slate-600">active jobs</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">{overview?.skills_count ?? '—'}</div>
                <div className="text-[10px] text-slate-600">skills</div>
              </div>
            </div>
          </div>
        </Panel>

        {/* ── LOG STREAM ── */}
        <Panel title="Log Stream" cols={8} rows={2} live link="/logs">
          <div
            ref={logRef}
            className="h-full overflow-y-auto space-y-0.5 bg-slate-950/60 rounded p-2 fd-scanlines"
          >
            {logLines.length === 0 ? (
              <div className="fd-log text-slate-600">Waiting for log data...</div>
            ) : (
              logLines.map((line, i) => <LogLine key={i} line={line} />)
            )}
          </div>
        </Panel>

        {/* ── TOKEN FLOW ── */}
        <Panel title="Token Flow" cols={4} rows={2} link="/metrics">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="text-xs text-slate-500 mb-1">24h Trend</div>
              <div className="h-8">
                <Sparkline data={tokenPoints} color="#f59e0b" />
              </div>
            </div>

            <div className="space-y-3 mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Tokens today</span>
                <span className="font-mono text-white">
                  {overview?.tokens_today?.toLocaleString() ?? '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Agents</span>
                <span className="font-mono text-white">{overview?.agents_count ?? '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Pipelines</span>
                <span className="font-mono text-white">{overview?.pipelines_count ?? '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Error jobs</span>
                <span className={`font-mono ${(overview?.error_jobs ?? 0) > 0 ? 'text-red-400' : 'text-white'}`}>
                  {overview?.error_jobs ?? '—'}
                </span>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-800 space-y-1">
              <Link
                to="/agents"
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800/50 text-xs text-slate-400 hover:text-amber-400 transition-colors"
              >
                <span>Manage Agents</span>
                <ChevronRight size={12} />
              </Link>
              <Link
                to="/jobs"
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800/50 text-xs text-slate-400 hover:text-amber-400 transition-colors"
              >
                <span>Manage Jobs</span>
                <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
