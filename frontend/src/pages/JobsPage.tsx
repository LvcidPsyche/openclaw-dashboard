import { useState } from 'react';
import { useStore } from '../store';
import { usePolling } from '../hooks/usePolling';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { formatTimeAgo, formatDuration } from '../utils/format';
import { Search, Play, Pause, RotateCcw, XCircle } from 'lucide-react';

export default function JobsPage() {
  const { jobs, fetchJobs, controlJob } = useStore();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'last_run' | 'schedule'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  usePolling(fetchJobs, 10000);

  const filtered = jobs
    .filter((j) => j.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Jobs</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No jobs found" />
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  {[
                    { key: 'name', label: 'Job Name' },
                    { key: 'last_run', label: 'Status' },
                    { key: 'last_run', label: 'Last Run' },
                    { key: 'schedule', label: 'Schedule' },
                  ].map((col, i) => (
                    <th
                      key={i}
                      onClick={() => toggleSort(col.key as any)}
                      className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-slate-200"
                    >
                      {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase">Duration</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${job.enabled ? 'bg-green-500' : 'bg-slate-500'}`} />
                        <span className="text-sm font-medium text-white">{job.name}</span>
                      </div>
                      {job.error_message && (
                        <div className="text-xs text-red-400 mt-1 ml-4">{job.error_message}</div>
                      )}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={job.last_status} /></td>
                    <td className="px-5 py-3 text-sm text-slate-300">{formatTimeAgo(job.last_run)}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{job.schedule}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{formatDuration(job.last_duration)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 justify-end">
                        {job.enabled ? (
                          <button onClick={() => controlJob(job.id, 'disable')} className="p-1.5 rounded-lg hover:bg-slate-700 text-red-400" title="Disable">
                            <Pause size={14} />
                          </button>
                        ) : (
                          <button onClick={() => controlJob(job.id, 'enable')} className="p-1.5 rounded-lg hover:bg-slate-700 text-green-400" title="Enable">
                            <Play size={14} />
                          </button>
                        )}
                        <button onClick={() => controlJob(job.id, 'run_now')} className="p-1.5 rounded-lg hover:bg-slate-700 text-blue-400" title="Run now">
                          <RotateCcw size={14} />
                        </button>
                        {job.consecutive_errors > 0 && (
                          <button onClick={() => controlJob(job.id, 'clear_errors')} className="p-1.5 rounded-lg hover:bg-slate-700 text-amber-400" title="Clear errors">
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
