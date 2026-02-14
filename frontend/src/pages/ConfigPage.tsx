import { useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { Save, RefreshCw, AlertTriangle } from 'lucide-react';
import * as api from '../api/endpoints';

const TABS = ['General', 'Models', 'Gateway', 'Agents', 'Skills', 'Raw JSON'] as const;
type Tab = typeof TABS[number];

export default function ConfigPage() {
  const toast = useToast();
  const [config, setConfig] = useState<Record<string, any>>({});
  const [models, setModels] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [rawJson, setRawJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
    api.fetchModels().then((d) => setModels(d.models || [])).catch(() => {});
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.fetchConfig();
      setConfig(data);
      setRawJson(JSON.stringify(data, null, 2));
    } catch {
      toast.error('Failed to load config');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = activeTab === 'Raw JSON' ? JSON.parse(rawJson) : config;
      await api.updateConfig(data);
      toast.success('Configuration saved');
      await loadConfig();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleApply = async () => {
    try {
      await api.applyConfig();
      toast.success('Configuration applied');
    } catch {
      toast.error('Failed to apply config');
    }
  };

  const renderSection = (title: string, entries: [string, any][]) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{title}</h3>
      {entries.length === 0 ? (
        <div className="text-sm text-slate-500">No settings available</div>
      ) : (
        entries.map(([key, val]) => (
          <div key={key} className="flex justify-between items-center px-3 py-2 bg-slate-700/30 rounded-lg text-sm">
            <span className="text-slate-400 font-mono text-xs">{key}</span>
            <span className="text-white text-xs truncate max-w-[50%] text-right">
              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
            </span>
          </div>
        ))
      )}
    </div>
  );

  const getSection = (key: string) => {
    const section = config[key];
    if (!section || typeof section !== 'object') return [];
    return Object.entries(section);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading configuration...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Configuration</h1>
        <div className="flex items-center gap-2">
          <button onClick={loadConfig} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" title="Reload">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleApply}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
            Apply Changes
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 min-h-[400px]">
        {activeTab === 'General' && (
          <div className="space-y-6">
            {renderSection('Wizard Settings', getSection('wizard'))}
            {renderSection('Auth Profiles', getSection('auth'))}
            {renderSection('General', Object.entries(config).filter(([k]) => !['wizard', 'auth', 'gateway', 'agents', 'skills', 'models', 'providers'].includes(k)))}
          </div>
        )}

        {activeTab === 'Models' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Available Models</h3>
            {models.length === 0 ? (
              <div className="text-sm text-slate-500">No models detected. Gateway may be offline.</div>
            ) : (
              <div className="grid gap-2">
                {models.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-slate-700/30 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-white">{m.name || m.id || m}</div>
                      {m.provider && <div className="text-xs text-slate-400">{m.provider}</div>}
                    </div>
                    {m.context_length && (
                      <span className="text-xs text-slate-500">{(m.context_length / 1000).toFixed(0)}K ctx</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {renderSection('Provider Config', getSection('providers'))}
          </div>
        )}

        {activeTab === 'Gateway' && (
          <div className="space-y-6">
            {renderSection('Gateway Connection', getSection('gateway'))}
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-xs text-amber-400">Auth tokens are redacted for security</span>
            </div>
          </div>
        )}

        {activeTab === 'Agents' && renderSection('Agent Configuration', getSection('agents'))}
        {activeTab === 'Skills' && renderSection('Skills Configuration', getSection('skills'))}

        {activeTab === 'Raw JSON' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle size={12} />
              Edit with care — invalid JSON will prevent saving
            </div>
            <textarea value={rawJson} onChange={(e) => setRawJson(e.target.value)}
              className="w-full h-[500px] px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-green-400 font-mono focus:outline-none focus:border-blue-500 resize-none"
              spellCheck={false} />
          </div>
        )}
      </div>
    </div>
  );
}
