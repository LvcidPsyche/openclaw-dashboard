import { useEffect } from 'react';
import { useStore } from '../store';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import {
  Droplets, Tv, PenTool, BarChart2, Bug, GitBranch,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  droplets: Droplets,
  tv: Tv,
  'pen-tool': PenTool,
  'bar-chart-2': BarChart2,
  bug: Bug,
};

export default function PipelinesPage() {
  const { pipelines, fetchPipelines } = useStore();
  useEffect(() => { fetchPipelines(); }, []);

  if (pipelines.length === 0) return <EmptyState message="No pipelines discovered. Click Settings > Refresh Discovery to scan." />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Pipelines</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pipelines.map((p) => {
          const Icon = iconMap[p.icon] || GitBranch;
          return (
            <div key={p.id} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: p.color + '20', color: p.color }}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{p.name}</h3>
                  <div className="text-xs text-slate-400">{p.directory || p.source}</div>
                </div>
                <div className="ml-auto"><StatusBadge status={p.status} /></div>
              </div>
              {p.stages.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {p.stages.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
