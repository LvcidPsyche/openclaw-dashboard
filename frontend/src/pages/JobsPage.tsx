import { useState } from 'react';
import { useStore } from '../store';
import { usePolling } from '../hooks/usePolling';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import JobFormModal from '../components/features/JobFormModal';
import { formatTimeAgo, formatDuration } from '../utils/format';
import { Search, Play, Pause, RotateCcw, XCircle, Plus, Pencil, Trash2, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as api from '../api/endpoints';

export default function JobsPage() {
  const { jobs, fetchJobs, controlJob } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'last_run' | 'schedule'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editJob, setEditJob] = useState<any>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleCreate = async (data: any) => {
    await api.createJob(data);
    toast.success('Job created');
    fetchJobs();
  };

  const handleEdit = async (data: any) => {
    if (!editJob) return;
    await api.updateJob(editJob.id, data);
    toast.success('Job updated');
    setEditJob(null);
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteJob(id);
      toast.success('Job deleted');
      setDeleteConfirm(null);
      fetchJobs();
    } catch {
      toast.error('Failed to delete job');
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await api.runJob(id);
      toast.success('Job triggered');
    } catch {
      toast.error('Failed to trigger job');
    }
  };

  const toggleHistory = async (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
      return;
    }
    setExpandedJob(jobId);
    try {
      const data = await api.fetchJobHistory(jobId);
      setJobHistory(data.history || []);
    } catch {
      setJobHistory([]);
    }
  };

  const exportCsv = () => {
    const header = 'Name,Enabled,Schedule,Last Run,Last Status,Duration,Errors\n';
    const rows = jobs.map(j =>
      `"${j.name}",${j.enabled},"${j.schedule}","${j.last_run || ''}","${j.last_status || ''}",${j.last_duration || ''},${j.consecutive_errors}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'jobs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Jobs</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64" />
          </div>
          <button onClick={exportCsv} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" title="Export CSV">
            <Download size={16} />
          </button>
          <button onClick={() => { setEditJob(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Create Job
          </button>
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
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase w-8"></th>
                  {[
                    { key: 'name', label: 'Job Name' },
                    { key: 'last_run', label: 'Status' },
                    { key: 'last_run', label: 'Last Run' },
                    { key: 'schedule', label: 'Schedule' },
                  ].map((col, i) => (
                    <th key={i} onClick={() => toggleSort(col.key as any)}
                      className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-slate-200">
                      {col.label} {sortKey === col.key ? (sortAsc ? '\u2191' : '\u2193') : ''}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase">Duration</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((job) => (
                  <>
                    <tr key={job.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-3 py-3">
                        <button onClick={() => toggleHistory(job.id)} className="text-slate-500 hover:text-white p-1">
                          {expandedJob === job.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
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
                          <button onClick={() => handleRunNow(job.id)} className="p-1.5 rounded-lg hover:bg-slate-700 text-blue-400" title="Run now">
                            <RotateCcw size={14} />
                          </button>
                          <button onClick={() => { setEditJob(job); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400" title="Edit">
                            <Pencil size={14} />
                          </button>
                          {deleteConfirm === job.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDelete(job.id)} className="px-2 py-0.5 text-xs bg-red-600 text-white rounded">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 text-xs bg-slate-600 text-white rounded">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(job.id)} className="p-1.5 rounded-lg hover:bg-slate-700 text-red-400" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          )}
                          {job.consecutive_errors > 0 && (
                            <button onClick={() => controlJob(job.id, 'clear_errors')} className="p-1.5 rounded-lg hover:bg-slate-700 text-amber-400" title="Clear errors">
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedJob === job.id && (
                      <tr key={`${job.id}-history`}>
                        <td colSpan={7} className="px-8 py-3 bg-slate-900/50">
                          <div className="text-xs font-medium text-slate-400 mb-2">Run History</div>
                          {jobHistory.length === 0 ? (
                            <div className="text-xs text-slate-500">No run history available</div>
                          ) : (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {jobHistory.slice(0, 20).map((run: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 text-xs text-slate-400">
                                  <span className={`w-2 h-2 rounded-full ${run.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span>{new Date(run.ts || run.timestamp).toLocaleString()}</span>
                                  <span>{run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '-'}</span>
                                  <span className="text-slate-500 truncate flex-1">{run.error || run.status || '-'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <JobFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditJob(null); }}
        onSubmit={editJob ? handleEdit : handleCreate}
        initial={editJob ? {
          name: editJob.name,
          scheduleType: editJob.schedule?.includes('*') ? 'cron' : 'interval',
          cronExpression: editJob.schedule?.includes('*') ? editJob.schedule : '0 * * * *',
          enabled: editJob.enabled,
        } : undefined}
        title={editJob ? 'Edit Job' : 'Create Job'}
      />
    </div>
  );
}
