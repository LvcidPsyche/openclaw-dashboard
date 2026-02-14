import { useEffect, useState } from 'react';
import { fetchDiscovery, refreshDiscovery, fetchSystemHealth } from '../api/endpoints';
import type { DiscoveryResult } from '../api/types';
import { useToast } from '../hooks/useToast';
import { RefreshCw, Info, Keyboard, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const toast = useToast();
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetchDiscovery().then(setDiscovery).catch(() => {});
    fetchSystemHealth().then(setHealth).catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshDiscovery();
      const d = await fetchDiscovery();
      setDiscovery(d);
      toast.success('Discovery refreshed');
    } catch {
      toast.error('Refresh failed');
    }
    setRefreshing(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Discovery */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300">Discovery Engine</h3>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {discovery && (
          <div className="space-y-2">
            <div className="flex justify-between px-3 py-2 bg-slate-700/30 rounded-lg text-sm">
              <span className="text-slate-400">Workspace</span>
              <span className="text-white font-mono text-xs">{discovery.workspace}</span>
            </div>
            <div className="flex justify-between px-3 py-2 bg-slate-700/30 rounded-lg text-sm">
              <span className="text-slate-400">Last Scan</span>
              <span className="text-white">{new Date(discovery.detected_at).toLocaleString()}</span>
            </div>
            {Object.entries(discovery.metrics).map(([k, v]) => (
              <div key={k} className="flex justify-between px-3 py-2 bg-slate-700/30 rounded-lg text-sm">
                <span className="text-slate-400 capitalize">{k}</span>
                <span className="text-white font-bold">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Keyboard size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-300">Keyboard Shortcuts</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ['/', 'Focus search'],
            ['Esc', 'Close modals / blur'],
            ['g o', 'Go to Overview'],
            ['g j', 'Go to Jobs'],
            ['g c', 'Go to Config'],
            ['g n', 'Go to Nodes'],
            ['g m', 'Go to Metrics'],
            ['g l', 'Go to Logs'],
            ['g d', 'Go to Debug'],
            ['g t', 'Go to Chat'],
            ['g e', 'Go to Sessions'],
            ['g i', 'Go to Settings'],
          ].map(([key, desc]) => (
            <div key={key} className="flex justify-between px-3 py-1.5 bg-slate-700/30 rounded-lg">
              <kbd className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">{key}</kbd>
              <span className="text-slate-400 text-xs">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-300">About</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between px-3 py-2 bg-slate-700/30 rounded-lg">
            <span className="text-slate-400">Dashboard Version</span>
            <span className="text-white">2.0.0</span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-slate-700/30 rounded-lg">
            <span className="text-slate-400">Stack</span>
            <span className="text-white">FastAPI + React 19 + TypeScript</span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-slate-700/30 rounded-lg">
            <span className="text-slate-400">License</span>
            <span className="text-white">MIT (Free)</span>
          </div>
          {health && Object.entries(health).map(([k, v]) => (
            <div key={k} className="flex justify-between px-3 py-2 bg-slate-700/30 rounded-lg">
              <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
              <span className="text-white text-xs">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <a href="https://github.com/openclaw" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:text-white hover:bg-slate-600 transition-colors">
            <ExternalLink size={12} /> GitHub
          </a>
        </div>
      </div>

      {/* Custom modules */}
      {discovery?.custom_modules && discovery.custom_modules.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Custom Modules</h3>
          <div className="space-y-2">
            {discovery.custom_modules.map((m) => (
              <div key={m.name} className="flex items-center justify-between px-3 py-2 bg-slate-700/30 rounded-lg text-sm">
                <span className="text-white">{m.name}</span>
                <span className="text-xs text-slate-400 capitalize">{m.type} - {m.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
