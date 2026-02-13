import { useStore } from '../../store';
import { Activity, Github } from 'lucide-react';

export default function Header() {
  const system = useStore((s) => s.system);

  return (
    <header className="h-14 bg-slate-800/60 backdrop-blur border-b border-slate-700/50 flex items-center px-6 shrink-0">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-green-400" />
        <span className="text-sm text-slate-300">
          CPU {system?.cpu_percent.toFixed(0)}% | MEM {system?.memory_percent.toFixed(0)}% | DISK {system?.disk_percent.toFixed(0)}%
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
          FREE
        </span>
        <a
          href="https://github.com/openclaw"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-white transition-colors"
        >
          <Github size={18} />
        </a>
      </div>
    </header>
  );
}
