import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { formatNumber } from '../utils/format';
import { Download } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#38bdf8', '#10b981', '#ef4444'];

export default function MetricsPage() {
  const { timeseries, breakdown, fetchTimeseries, fetchBreakdown } = useStore();
  const [hours, setHours] = useState(24);
  const [metric, setMetric] = useState<'tokens' | 'cost'>('tokens');

  useEffect(() => {
    fetchTimeseries(metric, hours);
    fetchBreakdown();
  }, [metric, hours]);

  const totalTokens = breakdown?.by_model?.reduce((a, b) => a + b.tokens, 0) ?? 0;
  const totalCost = breakdown?.by_model?.reduce((a, b) => a + b.cost, 0) ?? 0;

  const exportCsv = () => {
    if (!breakdown?.by_model) return;
    const header = 'Model,Tokens,Cost,Requests\n';
    const rows = breakdown.by_model.map(m => `"${m.model}",${m.tokens},${m.cost},${m.requests}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'token-metrics.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Metrics</h1>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" title="Export CSV">
            <Download size={16} />
          </button>
          <div className="flex gap-1">
            {[6, 12, 24, 48, 168].map((h) => (
              <button key={h} onClick={() => setHours(h)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  hours === h ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}>
                {h < 48 ? `${h}h` : `${h / 24}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tokens', value: formatNumber(totalTokens) },
          { label: 'Total Cost', value: `$${totalCost.toFixed(4)}` },
          { label: 'Models Used', value: breakdown?.by_model?.length ?? 0 },
          { label: 'Time Range', value: hours < 48 ? `${hours}h` : `${hours / 24}d` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="text-xl font-bold text-white mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(['tokens', 'cost'] as const).map((m) => (
          <button key={m} onClick={() => setMetric(m)}
            className={`px-4 py-1.5 text-sm rounded-lg capitalize transition-colors ${
              metric === m ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}>
            {m}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">
          {metric === 'tokens' ? 'Token Usage' : 'Cost'} Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeseries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" stroke="#475569" fontSize={11} />
            <YAxis stroke="#475569" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Usage by Model</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={breakdown?.by_model ?? []}
                dataKey="tokens"
                nameKey="model"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {(breakdown?.by_model ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {(breakdown?.by_model ?? []).map((m, i) => (
              <div key={m.model} className="flex items-center gap-1.5 text-xs text-slate-300">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {m.model}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={breakdown?.daily_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#475569" fontSize={11} />
              <YAxis stroke="#475569" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="tokens" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
