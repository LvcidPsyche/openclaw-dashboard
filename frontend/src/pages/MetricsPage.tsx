import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { formatNumber } from '../utils/format';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Metrics</h1>
        <div className="flex gap-2">
          {[6, 12, 24, 48, 168].map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`px-3 py-1 text-xs rounded-lg ${hours === h ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              {h < 48 ? `${h}h` : `${h / 24}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs text-slate-400">Total Tokens</div>
          <div className="text-xl font-bold text-white mt-1">{formatNumber(totalTokens)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs text-slate-400">Total Cost</div>
          <div className="text-xl font-bold text-white mt-1">${totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs text-slate-400">Models Used</div>
          <div className="text-xl font-bold text-white mt-1">{breakdown?.by_model?.length ?? 0}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs text-slate-400">Time Range</div>
          <div className="text-xl font-bold text-white mt-1">{hours < 48 ? `${hours}h` : `${hours / 24}d`}</div>
        </div>
      </div>

      {/* Metric toggle */}
      <div className="flex gap-2">
        {(['tokens', 'cost'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-4 py-1.5 text-sm rounded-lg capitalize ${metric === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Time series chart */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">{metric === 'tokens' ? 'Token Usage' : 'Cost'} Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeseries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Usage by Model</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={breakdown?.by_model ?? []} dataKey="tokens" nameKey="model" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {(breakdown?.by_model ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {(breakdown?.by_model ?? []).map((m, i) => (
              <div key={m.model} className="flex items-center gap-1.5 text-xs text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {m.model}
              </div>
            ))}
          </div>
        </div>

        {/* Daily trend */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={breakdown?.daily_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} />
              <Bar dataKey="tokens" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
