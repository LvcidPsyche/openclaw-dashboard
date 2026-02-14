import { useEffect, lazy, Suspense } from 'react';
import { useStore } from '../store';
import { usePolling } from '../hooks/usePolling';
import StatCard from '../components/common/StatCard';
import { Briefcase, Cpu, HardDrive, GitBranch, Bot, Wrench, DollarSign } from 'lucide-react';
import { formatNumber } from '../utils/format';

// Lazy load charts so stat cards render instantly
const OverviewCharts = lazy(() => import('../components/features/OverviewCharts'));

export default function OverviewPage() {
  const { overview, jobs, system, fetchAll, fetchTimeseries, fetchBreakdown } = useStore();

  useEffect(() => {
    fetchTimeseries('tokens', 24);
    fetchBreakdown();
  }, []);

  usePolling(() => { fetchAll(); }, 10000);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>

      {/* Stats grid — renders immediately */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <StatCard label="Total Jobs" value={overview?.total_jobs ?? 0} sub={`${overview?.active_jobs ?? 0} active`} icon={Briefcase} color="blue" />
        <StatCard label="CPU" value={`${system?.cpu_percent.toFixed(0) ?? 0}%`} sub={`Load ${system?.load_average[0]?.toFixed(2) ?? ''}`} icon={Cpu} color="green" />
        <StatCard label="Memory" value={`${system?.memory_used_gb?.toFixed(1) ?? 0}GB`} sub={`of ${system?.memory_total_gb?.toFixed(1) ?? 0}GB`} icon={HardDrive} color="purple" />
        <StatCard label="Disk" value={`${system?.disk_percent?.toFixed(0) ?? 0}%`} sub={`${system?.disk_used_gb?.toFixed(0) ?? 0}GB used`} icon={HardDrive} color="pink" />
        <StatCard label="Pipelines" value={overview?.pipelines_count ?? 0} icon={GitBranch} color="amber" />
        <StatCard label="Agents" value={overview?.agents_count ?? 0} icon={Bot} color="green" />
        <StatCard label="Skills" value={overview?.skills_count ?? 0} icon={Wrench} color="blue" />
        <StatCard label="Cost Today" value={`$${overview?.cost_today?.toFixed(2) ?? '0.00'}`} sub={`${formatNumber(overview?.tokens_today ?? 0)} tokens`} icon={DollarSign} color="amber" />
      </div>

      {/* Charts — load async after stats are visible */}
      <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 h-[310px]" /><div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 h-[310px]" /></div>}>
        <OverviewCharts />
      </Suspense>

      {/* Recent jobs summary — renders immediately */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Recent Jobs</h3>
          <a href="/jobs" className="text-xs text-blue-400 hover:text-blue-300">View all</a>
        </div>
        <div className="divide-y divide-slate-700/50">
          {jobs.slice(0, 5).map((j) => (
            <div key={j.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${j.enabled ? 'bg-green-500' : 'bg-slate-500'}`} />
                <span className="text-sm text-white">{j.name}</span>
              </div>
              <span className={`text-xs ${j.last_status === 'success' ? 'text-green-400' : j.last_status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                {j.last_status || 'pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
