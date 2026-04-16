import { useStore } from '../../store';
import { Github, Cpu } from 'lucide-react';

export default function Header() {
  const system = useStore((s) => s.system);
  const overview = useStore((s) => s.overview);

  const cpu = system?.cpu_percent;
  const mem = system?.memory_percent;
  const disk = system?.disk_percent;

  const cpuColor =
    cpu == null ? 'text-slate-600' : cpu > 85 ? 'text-red-400' : cpu > 65 ? 'text-amber-400' : 'text-green-400';

  return (
    <header className="h-10 bg-slate-900/80 backdrop-blur border-b border-amber-900/20 flex items-center px-5 shrink-0 gap-4">
      {/* System quick-stats */}
      <div className="flex items-center gap-1.5">
        <Cpu size={11} className={cpuColor} />
        <span className="text-[10px] font-mono text-slate-500">
          CPU{' '}
          <span className={cpuColor}>{cpu != null ? `${cpu.toFixed(0)}%` : '--'}</span>
        </span>
      </div>

      <div className="w-px h-3 bg-slate-800" />

      <span className="text-[10px] font-mono text-slate-500">
        MEM{' '}
        <span className={mem != null && mem > 85 ? 'text-red-400' : 'text-slate-300'}>
          {mem != null ? `${mem.toFixed(0)}%` : '--'}
        </span>
      </span>

      <div className="w-px h-3 bg-slate-800" />

      <span className="text-[10px] font-mono text-slate-500">
        DISK{' '}
        <span className={disk != null && disk > 85 ? 'text-amber-400' : 'text-slate-300'}>
          {disk != null ? `${disk.toFixed(0)}%` : '--'}
        </span>
      </span>

      <div className="ml-auto flex items-center gap-3">
        {overview?.active_sessions != null && overview.active_sessions > 0 && (
          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-semibold rounded border border-amber-500/20">
            {overview.active_sessions} active
          </span>
        )}
        <a
          href="https://github.com/LvcidPsyche/openclaw-dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-700 hover:text-amber-400 transition-colors"
          title="GitHub"
        >
          <Github size={14} />
        </a>
      </div>
    </header>
  );
}
