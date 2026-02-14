import { useEffect, useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import EmptyState from '../components/common/EmptyState';
import { Bug, Wifi, WifiOff, Activity, HardDrive, RefreshCw, FileText } from 'lucide-react';
import * as api from '../api/endpoints';

export default function DebugPage() {
  const [gateway, setGateway] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [filesystem, setFilesystem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logLevel, setLogLevel] = useState('all');

  const loadAll = async () => {
    try {
      const [gw, h, s, l, fs] = await Promise.allSettled([
        api.fetchDebugGateway(),
        api.fetchDebugHealth(),
        api.fetchDebugSessions(),
        api.fetchDebugLogs(),
        api.fetchDebugFilesystem(),
      ]);
      if (gw.status === 'fulfilled') setGateway(gw.value);
      if (h.status === 'fulfilled') setHealth(h.value);
      if (s.status === 'fulfilled') setSessions((s.value as any).sessions || []);
      if (l.status === 'fulfilled') setLogs((l.value as any).lines || []);
      if (fs.status === 'fulfilled') setFilesystem((fs.value as any).checks || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);
  usePolling(loadAll, 30000);

  const filteredLogs = logLevel === 'all'
    ? logs
    : logs.filter((l) => l.toLowerCase().includes(logLevel));

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading diagnostics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Debug & Diagnostics</h1>
        <button onClick={loadAll} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Gateway Status */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          {gateway?.connected ? <Wifi size={16} className="text-green-400" /> : <WifiOff size={16} className="text-red-400" />}
          <h2 className="text-sm font-semibold text-white">Gateway Status</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Connection</div>
            <div className={`text-sm font-bold ${gateway?.connected ? 'text-green-400' : 'text-red-400'}`}>
              {gateway?.connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Latency</div>
            <div className="text-sm font-bold text-white">{gateway?.latency_ms ?? '-'}ms</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Protocol</div>
            <div className="text-sm font-bold text-white">v{gateway?.protocol_version ?? '-'}</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">URL</div>
            <div className="text-xs font-mono text-white truncate">{gateway?.gateway_url ?? '-'}</div>
          </div>
        </div>
      </div>

      {/* Health Checks + Filesystem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Health Checks</h2>
          </div>
          {health ? (
            <div className="space-y-2">
              {Object.entries(health).map(([key, val]) => (
                <div key={key} className="flex justify-between px-3 py-2 bg-slate-700/30 rounded-lg text-sm">
                  <span className="text-slate-400">{key}</span>
                  <span className="text-white text-xs">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Health data unavailable" />
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive size={16} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-white">File System</h2>
          </div>
          {filesystem ? (
            <div className="space-y-2">
              {Object.entries(filesystem).map(([key, val]: [string, any]) => (
                <div key={key} className="flex justify-between items-center px-3 py-2 bg-slate-700/30 rounded-lg text-sm">
                  <span className="text-slate-400">{key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{val.path}</span>
                    <span className={`w-2 h-2 rounded-full ${val.exists ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Filesystem check unavailable" />
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Bug size={16} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Active Sessions</h2>
          <span className="text-xs text-slate-500 ml-auto">{sessions.length} sessions</span>
        </div>
        {sessions.length === 0 ? (
          <EmptyState message="No active sessions" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Session ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Model</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Messages</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Tokens</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sessions.map((s: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-700/20">
                    <td className="px-3 py-2 text-xs text-white font-mono">{(s.id || '').substring(0, 16)}...</td>
                    <td className="px-3 py-2 text-xs text-slate-300">{s.model || '-'}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{s.messages ?? s.messageCount ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {s.usage ? `${s.usage.input_tokens || 0}/${s.usage.output_tokens || 0}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">{s.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Tail */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-green-400" />
            <h2 className="text-sm font-semibold text-white">Recent Logs</h2>
          </div>
          <div className="flex gap-1">
            {['all', 'error', 'warn', 'info'].map((level) => (
              <button key={level} onClick={() => setLogLevel(level)}
                className={`px-2 py-0.5 text-xs rounded capitalize ${logLevel === level ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-4">No log entries</div>
          ) : (
            filteredLogs.map((line, i) => (
              <div key={i} className={`leading-5 whitespace-pre-wrap ${
                line.toLowerCase().includes('error') ? 'text-red-400' :
                line.toLowerCase().includes('warn') ? 'text-amber-400' :
                'text-slate-400'
              }`}>
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
