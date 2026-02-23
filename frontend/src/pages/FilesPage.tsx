import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, File, ChevronRight, Home,
  Search, RefreshCw, X, AlertCircle, Copy, Check,
} from 'lucide-react';

interface Entry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
  mode: string;
  error?: string;
}

interface Crumb {
  name: string;
  path: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function FilesPage() {
  const [path, setPath] = useState('/');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<Entry | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ truncated: boolean; size: number; binary: boolean } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entry[] | null>(null);
  const [searching, setSearching] = useState(false);

  const loadDir = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    setSearchResults(null);
    setSearchQuery('');
    setSelectedFile(null);
    setFileContent(null);
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(p)}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to load');
      }
      const data = await res.json();
      setEntries(data.entries);
      setBreadcrumb(data.breadcrumb);
      setPath(data.path);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDir('/'); }, [loadDir]);

  const openFile = async (entry: Entry) => {
    setSelectedFile(entry);
    setFileContent(null);
    setFileMeta(null);
    setFileLoading(true);
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(entry.path)}`);
      const data = await res.json();
      setFileContent(data.content);
      setFileMeta({ truncated: data.truncated, size: data.size, binary: data.binary });
    } catch {
      setFileContent(null);
    } finally {
      setFileLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/files/search?path=${encodeURIComponent(path)}&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const copyContent = () => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayEntries = searchResults ?? entries;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">File Explorer</h1>
        <button
          onClick={() => loadDir(path)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search in ${path}...`}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button type="submit" disabled={searching}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {searching ? 'Searching...' : 'Search'}
        </button>
        {searchResults && (
          <button type="button" onClick={() => { setSearchResults(null); setSearchQuery(''); }}
            className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
            <X size={14} />
          </button>
        )}
      </form>

      {/* Breadcrumb */}
      {!searchResults && (
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <button onClick={() => loadDir('/')} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
            <Home size={14} />
          </button>
          {breadcrumb.slice(1).map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-slate-600" />
              <button
                onClick={() => loadDir(crumb.path)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  i === breadcrumb.length - 2
                    ? 'text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {searchResults && (
        <div className="text-sm text-slate-400">
          {searchResults.length} results for <span className="text-white">"{searchQuery}"</span> in {path}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* File list */}
        <div className={`${selectedFile ? 'w-1/2' : 'w-full'} bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col transition-all duration-200`}>
          {error && (
            <div className="flex items-center gap-2 p-4 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading && (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Loading...
            </div>
          )}

          {!loading && !error && (
            <div className="flex-1 overflow-y-auto">
              {displayEntries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  {searchResults ? 'No results found' : 'Empty directory'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3 text-right hidden sm:table-cell">Size</th>
                      <th className="px-4 py-3 text-right hidden md:table-cell">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayEntries.map((entry) => (
                      <tr
                        key={entry.path}
                        onClick={() => {
                          if (entry.is_dir) loadDir(entry.path);
                          else openFile(entry);
                        }}
                        className={`border-t border-slate-700/30 cursor-pointer transition-colors hover:bg-slate-700/30 ${
                          selectedFile?.path === entry.path ? 'bg-blue-600/10 hover:bg-blue-600/20' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {entry.is_dir ? (
                              <FolderOpen size={16} className="text-yellow-400 shrink-0" />
                            ) : (
                              <File size={16} className="text-slate-400 shrink-0" />
                            )}
                            <span className={`truncate ${entry.is_dir ? 'text-white' : 'text-slate-300'} ${entry.error ? 'opacity-50' : ''}`}>
                              {entry.name}
                            </span>
                            {entry.error && <span className="text-xs text-red-400 ml-1">({entry.error})</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500 hidden sm:table-cell">
                          {entry.is_dir ? '—' : formatSize(entry.size)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500 hidden md:table-cell">
                          {entry.modified ? formatDate(entry.modified) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* File viewer */}
        {selectedFile && (
          <div className="w-1/2 bg-slate-800/30 border border-slate-700/50 rounded-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <File size={14} className="text-slate-400 shrink-0" />
                <span className="text-sm text-white font-mono truncate">{selectedFile.name}</span>
                {fileMeta && <span className="text-xs text-slate-500 shrink-0">{formatSize(fileMeta.size)}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {fileContent && (
                  <button onClick={copyContent}
                    className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                    title="Copy content">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                )}
                <button onClick={() => setSelectedFile(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {fileLoading && (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading...</div>
              )}
              {!fileLoading && fileMeta?.binary && (
                <div className="text-center text-slate-500 text-sm py-8">Binary file — cannot display</div>
              )}
              {!fileLoading && fileContent !== null && !fileMeta?.binary && (
                <>
                  {fileMeta?.truncated && (
                    <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                      Large file — showing last 512KB
                    </div>
                  )}
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {fileContent}
                  </pre>
                </>
              )}
              {!fileLoading && fileContent === null && !fileMeta?.binary && !fileLoading && (
                <div className="text-center text-slate-500 text-sm py-8">Could not read file</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
