import { useEffect } from 'react';
import { useStore } from '../store';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import { Code, Search, PenTool, Settings, Shield, DollarSign, Bot } from 'lucide-react';

const iconMap: Record<string, any> = {
  code: Code,
  search: Search,
  'pen-tool': PenTool,
  settings: Settings,
  shield: Shield,
  'dollar-sign': DollarSign,
  bot: Bot,
};

export default function AgentsPage() {
  const { agents, fetchAgents } = useStore();
  useEffect(() => { fetchAgents(); }, []);

  if (agents.length === 0) return <EmptyState message="No agents discovered" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Agents</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((a, i) => {
          const Icon = iconMap[a.icon] || Bot;
          return (
            <div key={i} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: a.color + '20', color: a.color }}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{a.name}</h3>
                  <div className="text-xs text-slate-400 capitalize">{a.type}</div>
                </div>
                <div className="ml-auto"><StatusBadge status={a.status} /></div>
              </div>
              {a.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {a.capabilities.slice(0, 5).map((c, j) => (
                    <span key={j} className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded">{c}</span>
                  ))}
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">{a.source}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
