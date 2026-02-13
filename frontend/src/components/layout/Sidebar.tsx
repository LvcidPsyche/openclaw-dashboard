import { NavLink } from 'react-router-dom';
import { useStore } from '../../store';
import {
  LayoutDashboard, Briefcase, GitBranch, Bot, Wrench,
  BarChart3, Monitor, FileText, MessageSquare, Settings, PanelLeftClose, PanelLeft,
} from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/pipelines', icon: GitBranch, label: 'Pipelines' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/skills', icon: Wrench, label: 'Skills' },
  { to: '/metrics', icon: BarChart3, label: 'Metrics' },
  { to: '/system', icon: Monitor, label: 'System' },
  { to: '/logs', icon: FileText, label: 'Logs' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useStore();

  return (
    <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-slate-900 border-r border-slate-700/50 flex flex-col transition-all duration-200 shrink-0`}>
      <div className="h-14 flex items-center px-4 border-b border-slate-700/50 gap-2">
        {sidebarOpen && <span className="text-lg font-bold text-white whitespace-nowrap">OpenClaw</span>}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ml-auto text-slate-400 hover:text-white p-1"
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>
      </div>
      <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700/50">
        {sidebarOpen && (
          <div className="text-xs text-slate-500 text-center">
            OpenClaw Dashboard v2.0
          </div>
        )}
      </div>
    </aside>
  );
}
