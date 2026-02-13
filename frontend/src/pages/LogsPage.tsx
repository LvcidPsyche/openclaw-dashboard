import { useEffect, useState, useRef } from 'react';
import { fetchLogFiles, fetchLogTail } from '../api/endpoints';
import type { LogFile } from '../api/types';
import { formatBytes } from '../utils/format';
import EmptyState from '../components/common/EmptyState';
import { FileText, RefreshCw } from 'lucide-react';

export default function LogsPage() {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selected, setSelected] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogFiles().then(({ files: f }) => {
      setFiles(f);
      if (f.length > 0 && !selected) setSelected(f[0].name);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadLogs();
    const id = setInterval(loadLogs, 5000);
    return () => clearInterval(id);
  }, [selected]);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const loadLogs = () => {
    if (!selected) return;
    fetchLogTail(selected, 200).then((d) => setLines(d.lines)).catch(() => {});
  };

  const filtered = search
    ? lines.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : lines;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Logs</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="rounded" />
            Auto-scroll
          </label>
          <button onClick={loadLogs} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* File list */}
        <div className="w-56 shrink-0 space-y-1">
          {files.map((f) => (
            <button
              key={f.name}
              onClick={() => setSelected(f.name)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${selected === f.name ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <FileText size={14} />
              <div className="truncate flex-1">
                <div className="truncate">{f.name}</div>
                <div className="text-xs text-slate-500">{formatBytes(f.size_bytes)}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Log output */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter logs..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div ref={logRef} className="flex-1 bg-slate-900 rounded-xl border border-slate-700/50 p-4 overflow-y-auto font-mono text-xs">
            {filtered.length === 0 ? (
              <EmptyState message="No log entries" />
            ) : (
              filtered.map((line, i) => (
                <div key={i} className="text-slate-300 hover:bg-slate-800/50 px-1 leading-5 whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
