import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import {
  Home, LayoutDashboard,
  Bot, Terminal, Network,
  Briefcase, GitBranch, Zap,
  BarChart2, FileText, FolderOpen,
  MessageSquare, Sliders, Settings, Monitor, Bug, BookOpen,
  PanelLeftClose, PanelLeft,
} from 'lucide-react';

type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    label: 'Monitor',
    items: [
      { to: '/', icon: Home, label: 'Nerve Center' },
      { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
    ],
  },
  {
    label: 'Agents',
    items: [
      { to: '/agents', icon: Bot, label: 'Agents' },
      { to: '/sessions', icon: Terminal, label: 'Sessions' },
      { to: '/nodes', icon: Network, label: 'Nodes' },
    ],
  },
  {
    label: 'Automate',
    items: [
      { to: '/jobs', icon: Briefcase, label: 'Jobs' },
      { to: '/pipelines', icon: GitBranch, label: 'Pipelines' },
      { to: '/skills', icon: Zap, label: 'Skills' },
    ],
  },
  {
    label: 'Observe',
    items: [
      { to: '/metrics', icon: BarChart2, label: 'Metrics' },
      { to: '/logs', icon: FileText, label: 'Logs' },
      { to: '/files', icon: FolderOpen, label: 'Files' },
    ],
  },
  {
    label: 'Configure',
    items: [
      { to: '/chat', icon: MessageSquare, label: 'Chat' },
      { to: '/config', icon: Sliders, label: 'Config' },
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/system', icon: Monitor, label: 'System' },
      { to: '/debug', icon: Bug, label: 'Debug' },
      { to: '/docs', icon: BookOpen, label: 'Docs' },
    ],
  },
];

const PREFETCH_MAP: Record<string, () => void> = {
  '/': () => import('../../pages/NerveCenterPage'),
  '/overview': () => import('../../pages/OverviewPage'),
  '/agents': () => import('../../pages/AgentsPage'),
  '/sessions': () => import('../../pages/SessionsPage'),
  '/nodes': () => import('../../pages/NodesPage'),
  '/jobs': () => import('../../pages/JobsPage'),
  '/pipelines': () => import('../../pages/PipelinesPage'),
  '/skills': () => import('../../pages/SkillsPage'),
  '/metrics': () => import('../../pages/MetricsPage'),
  '/logs': () => import('../../pages/LogsPage'),
  '/files': () => import('../../pages/FilesPage'),
  '/chat': () => import('../../pages/ChatPage'),
  '/config': () => import('../../pages/ConfigPage'),
  '/settings': () => import('../../pages/SettingsPage'),
  '/system': () => import('../../pages/SystemPage'),
  '/debug': () => import('../../pages/DebugPage'),
  '/docs': () => import('../../pages/DocsPage'),
};

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, jobs, overview } = useStore();
  const location = useLocation();

  const failingJobs = jobs.filter((j) => j.consecutive_errors > 0).length;
  const activeSessions = overview?.active_sessions ?? 0;

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const prefetch = useCallback((to: string) => {
    PREFETCH_MAP[to]?.();
  }, []);

  const getBadge = (to: string) => {
    if (to === '/sessions' && activeSessions > 0) {
      return (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded leading-none">
          {activeSessions}
        </span>
      );
    }
    if (to === '/jobs' && failingJobs > 0) {
      return (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded leading-none">
          {failingJobs}
        </span>
      );
    }
    return null;
  };

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-52' : 'w-14'
      } bg-slate-900/95 border-r border-amber-900/20 flex flex-col transition-all duration-200 shrink-0 relative`}
    >
      {/* Logo bar */}
      <div className="h-14 flex items-center px-3 border-b border-amber-900/20 gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-amber-400 fd-live-dot shrink-0" />
        {sidebarOpen && (
          <span className="text-xs font-bold text-white tracking-[0.2em] uppercase whitespace-nowrap">
            OpenClaw
          </span>
        )}
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-slate-600 hover:text-amber-400 p-1 rounded transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="h-14 flex items-center justify-center text-slate-600 hover:text-amber-400 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft size={14} />
        </button>
      )}

      {/* Nav sections */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {SECTIONS.map((section, si) => (
          <div key={section.label} className={si > 0 ? 'mt-1' : ''}>
            {sidebarOpen ? (
              <div className="px-4 pt-3 pb-1 text-[9px] font-semibold tracking-[0.18em] text-amber-600/60 uppercase">
                {section.label}
              </div>
            ) : (
              <div className="mx-3 my-2 border-t border-slate-800/80" />
            )}

            <div className="space-y-0.5 px-2">
              {section.items.map(({ to, icon: Icon, label }) => {
                const active = isActive(to);
                const badge = getBadge(to);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onMouseEnter={() => prefetch(to)}
                    className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                      active
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-400 rounded-r" />
                    )}
                    <Icon size={14} className="shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 truncate">{label}</span>
                        {badge}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer tag */}
      {sidebarOpen && (
        <div className="px-4 py-3 border-t border-amber-900/20 shrink-0">
          <div className="text-[9px] text-slate-700 tracking-[0.2em] uppercase">Flight Deck v2</div>
        </div>
      )}
    </aside>
  );
}
