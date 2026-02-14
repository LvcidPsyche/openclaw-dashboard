import { useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { usePolling } from '../hooks/usePolling';
import EmptyState from '../components/common/EmptyState';
import { Trash2, ChevronDown, ChevronRight, RefreshCw, Download } from 'lucide-react';
import * as api from '../api/endpoints';

export default function SessionsPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      const data = await api.fetchSessionsList();
      setSessions(data.sessions || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
    api.fetchModels().then((d) => setModels(d.models || [])).catch(() => {});
  }, []);

  usePolling(loadSessions, 15000);

  const handleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    try {
      const [usage, history] = await Promise.allSettled([
        api.fetchSessionUsage(id),
        api.fetchSessionHistory(id),
      ]);
      setSessionDetail({
        usage: usage.status === 'fulfilled' ? usage.value : null,
        messages: history.status === 'fulfilled' ? (history.value as any).messages || [] : [],
      });
    } catch {
      setSessionDetail(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSession(id);
      toast.success('Session deleted');
      setDeleteConfirm(null);
      loadSessions();
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const handlePatch = async (id: string, field: string, value: any) => {
    try {
      await api.patchSession(id, { [field]: value });
      toast.success('Session updated');
    } catch {
      toast.error('Failed to update session');
    }
  };

  const exportUsage = () => {
    const header = 'ID,Model,Messages,Status,Started,Last Activity\n';
    const rows = sessions.map(s =>
      `"${s.id}","${s.model || ''}",${s.messages || 0},"${s.status || ''}","${s.started || ''}","${s.last_activity || s.lastActivity || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sessions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading sessions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <span className="text-xs text-slate-500">{sessions.length} sessions</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportUsage} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" title="Export CSV">
            <Download size={16} />
          </button>
          <button onClick={loadSessions} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState message="No sessions found" />
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-3 py-3 w-8"></th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase">Session ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase">Model</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase">Messages</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Activity</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sessions.map((s: any) => {
                  const sid = s.id || s.sessionId || '';
                  return (
                    <>
                      <tr key={sid} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-3 py-3">
                          <button onClick={() => handleExpand(sid)} className="text-slate-500 hover:text-white p-1">
                            {expanded === sid ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-sm text-white font-mono">{sid.substring(0, 16)}...</td>
                        <td className="px-5 py-3 text-sm text-slate-300">{s.model || '-'}</td>
                        <td className="px-5 py-3 text-sm text-slate-400">{s.messages ?? s.messageCount ?? '-'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                            s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-400'
                          }`}>{s.status || 'unknown'}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-400">
                          {s.last_activity || s.lastActivity ? new Date(s.last_activity || s.lastActivity).toLocaleString() : '-'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1 justify-end">
                            {deleteConfirm === sid ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(sid)} className="px-2 py-0.5 text-xs bg-red-600 text-white rounded">Yes</button>
                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 text-xs bg-slate-600 text-white rounded">No</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(sid)} className="p-1.5 rounded-lg hover:bg-slate-700 text-red-400" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded === sid && (
                        <tr key={`${sid}-detail`}>
                          <td colSpan={7} className="px-8 py-4 bg-slate-900/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Settings */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-medium text-slate-400 uppercase">Session Settings</h4>
                                <div>
                                  <label className="text-xs text-slate-500 block mb-1">Model</label>
                                  <select value={s.model || ''} onChange={(e) => handlePatch(sid, 'model', e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white">
                                    <option value="">Default</option>
                                    {models.map((m: any, i: number) => (
                                      <option key={i} value={m.id || m.name || m}>{m.name || m.id || m}</option>
                                    ))}
                                  </select>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                  <input type="checkbox" checked={s.thinking || false}
                                    onChange={(e) => handlePatch(sid, 'thinking', e.target.checked)}
                                    className="rounded border-slate-600 bg-slate-800" />
                                  Extended Thinking
                                </label>
                              </div>

                              {/* Usage & History */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-medium text-slate-400 uppercase">Usage</h4>
                                {sessionDetail?.usage ? (
                                  <div className="space-y-1">
                                    {Object.entries(sessionDetail.usage).map(([k, v]) => (
                                      <div key={k} className="flex justify-between text-xs">
                                        <span className="text-slate-500">{k}</span>
                                        <span className="text-white">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500">No usage data</div>
                                )}

                                <h4 className="text-xs font-medium text-slate-400 uppercase mt-4">Recent Messages</h4>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {(sessionDetail?.messages || []).slice(-10).map((msg: any, i: number) => (
                                    <div key={i} className="text-xs">
                                      <span className={`font-medium ${msg.role === 'user' ? 'text-blue-400' : 'text-green-400'}`}>{msg.role}: </span>
                                      <span className="text-slate-400 truncate">{(msg.content || '').substring(0, 100)}</span>
                                    </div>
                                  ))}
                                  {(!sessionDetail?.messages || sessionDetail.messages.length === 0) && (
                                    <div className="text-xs text-slate-500">No messages</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
