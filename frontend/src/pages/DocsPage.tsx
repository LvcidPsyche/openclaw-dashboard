import { BookOpen, Terminal, Cpu, Wrench, Bot, GitBranch, ExternalLink } from 'lucide-react';

const DOCS_SECTIONS = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    color: 'text-blue-400',
    links: [
      { name: 'Installation Guide', desc: 'Install and set up OpenClaw on your system' },
      { name: 'Quick Start', desc: 'Get up and running in under 5 minutes' },
      { name: 'Configuration', desc: 'Configure OpenClaw for your environment' },
    ],
  },
  {
    title: 'CLI Commands',
    icon: Terminal,
    color: 'text-green-400',
    links: [
      { name: 'openclaw gateway start', desc: 'Start the gateway server' },
      { name: 'openclaw chat', desc: 'Start an interactive chat session' },
      { name: 'openclaw cron', desc: 'Manage cron jobs' },
      { name: 'openclaw device pair', desc: 'Pair a new device' },
      { name: 'openclaw config', desc: 'View and edit configuration' },
    ],
  },
  {
    title: 'Agents',
    icon: Bot,
    color: 'text-purple-400',
    links: [
      { name: 'Agent Types', desc: 'Coder, researcher, writer, devops, admin' },
      { name: 'Custom Agents', desc: 'Create and configure custom agents' },
      { name: 'Agent Capabilities', desc: 'Skills and tools available to agents' },
    ],
  },
  {
    title: 'Skills',
    icon: Wrench,
    color: 'text-amber-400',
    links: [
      { name: 'Built-in Skills', desc: 'Search, development, communication, data, AI' },
      { name: 'Installing Skills', desc: 'Add new skills to your OpenClaw instance' },
      { name: 'Creating Skills', desc: 'Build custom skills for your workflow' },
    ],
  },
  {
    title: 'Pipelines',
    icon: GitBranch,
    color: 'text-pink-400',
    links: [
      { name: 'Pipeline Overview', desc: 'Multi-stage automated workflows' },
      { name: 'HydroFlow', desc: 'Data processing pipeline' },
      { name: 'Content Factory', desc: 'Automated content generation' },
    ],
  },
  {
    title: 'API Reference',
    icon: Cpu,
    color: 'text-red-400',
    links: [
      { name: 'Gateway WebSocket API', desc: 'RPC protocol, challenge-response auth' },
      { name: 'Dashboard REST API', desc: 'All dashboard endpoints' },
      { name: 'Models API', desc: 'Available models and providers' },
    ],
  },
];

const QUICK_REF = [
  { cmd: 'openclaw gateway start', desc: 'Start gateway' },
  { cmd: 'openclaw chat -m "hello"', desc: 'Quick chat' },
  { cmd: 'openclaw cron list', desc: 'List cron jobs' },
  { cmd: 'openclaw config get', desc: 'Show config' },
  { cmd: 'openclaw device pair', desc: 'Pair device' },
  { cmd: 'openclaw status', desc: 'System status' },
];

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Documentation</h1>
        <a href="https://github.com/openclaw" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:text-white hover:bg-slate-700 transition-colors">
          <ExternalLink size={14} /> GitHub
        </a>
      </div>

      {/* Quick Reference */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Quick Reference</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {QUICK_REF.map((item) => (
            <div key={item.cmd} className="px-3 py-2 bg-slate-700/30 rounded-lg">
              <code className="text-xs text-green-400 font-mono">{item.cmd}</code>
              <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Documentation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCS_SECTIONS.map((section) => (
          <div key={section.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <section.icon size={18} className={section.color} />
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
            </div>
            <div className="space-y-2">
              {section.links.map((link) => (
                <div key={link.name} className="px-3 py-2 bg-slate-700/20 rounded-lg hover:bg-slate-700/40 transition-colors cursor-pointer">
                  <div className="text-sm text-slate-200">{link.name}</div>
                  <div className="text-xs text-slate-500">{link.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Architecture overview */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Architecture Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          {[
            { name: 'Dashboard', desc: 'React 19 + TypeScript', color: 'border-blue-500/30 bg-blue-500/5' },
            { name: 'Backend API', desc: 'FastAPI + Python', color: 'border-green-500/30 bg-green-500/5' },
            { name: 'Gateway', desc: 'WebSocket RPC', color: 'border-purple-500/30 bg-purple-500/5' },
            { name: 'Agents', desc: 'AI Model Runners', color: 'border-amber-500/30 bg-amber-500/5' },
          ].map((item) => (
            <div key={item.name} className={`rounded-xl p-4 border ${item.color}`}>
              <div className="text-sm font-semibold text-white">{item.name}</div>
              <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
