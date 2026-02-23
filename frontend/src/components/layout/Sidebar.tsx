import { useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store';
import {
  LayoutDashboard, Monitor, Bug, MessageSquare, FolderOpen,
  PanelLeftClose, PanelLeft,
} from 'lucide-react';

const prefetchMap: Record<string, () => void> = {
  '/': () => import('../../pages/ChatPage'),
  '/overview': () => import('../../pages/OverviewPage'),
  '/system': () => import('../../pages/SystemPage'),
  '/debug': () => import('../../pages/DebugPage'),
  '/files': () => import('../../pages/FilesPage'),
};

const links = [
  { to: '/', icon: MessageSquare, label: 'Chat' },
  { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/system', icon: Monitor, label: 'System' },
  { to: '/debug', icon: Bug, label: 'Debug' },
  { to: '/files', icon: FolderOpen, label: 'Files' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useStore();

  const prefetch = useCallback((to: string) => {
    prefetchMap[to]?.();
  }, []);

  return (
    <aside className={`${sidebarOpen ? 'w-52' : 'w-14'} bg-slate-900 border-r border-slate-700/50 flex flex-col transition-all duration-200 shrink-0`}>
      <div className="h-14 flex items-center px-3 border-b border-slate-700/50 gap-2">
        {sidebarOpen && <span className="text-base font-bold text-white whitespace-nowrap">OpenClaw</span>}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ml-auto text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
      </div>
      <nav className="flex-1 py-2 space-y-0.5 px-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onMouseEnter={() => prefetch(to)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
