import { useEffect, useState } from 'react';
import { fetchDiscovery, refreshDiscovery } from '../api/endpoints';
import type { DiscoveryResult } from '../api/types';
import { RefreshCw, Info } from 'lucide-react';

export default function SettingsPage() {
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDiscovery().then(setDiscovery).catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshDiscovery();
      const d = await fetchDiscovery();
      setDiscovery(d);
    } catch {}
    setRefreshing(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Discovery */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300">Discovery Engine</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
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
