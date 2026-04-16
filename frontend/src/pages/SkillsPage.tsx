import { useEffect, useState } from 'react';
import { useStore } from '../store';
import EmptyState from '../components/common/EmptyState';
import * as api from '../api/endpoints';
import { Search, Wrench, ChevronRight, ArrowLeft } from 'lucide-react';

export default function SkillsPage() {
  const { skills, skillCategories, skillsTotal, fetchSkills, fetchSkillCategories } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [readme, setReadme] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchSkillCategories();
    fetchSkills();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchSkills({ category: category || undefined, search: search || undefined, page: 1 });
  }, [category, search]);

  useEffect(() => {
    fetchSkills({ category: category || undefined, search: search || undefined, page });
  }, [page]);

  const loadSkillDetail = async (name: string) => {
    setSelectedSkill(name);
    setDetailLoading(true);
    try {
      const data = await api.fetchSkillDetail(name);
      setReadme(data.readme || 'No README available.');
    } catch {
      setReadme('Failed to load skill details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(skillsTotal / 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Skills{' '}
          <span className="text-sm font-normal text-slate-400">({skillsTotal})</span>
        </h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-64"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Category sidebar */}
        <div className="w-48 shrink-0 space-y-0.5">
          <button
            onClick={() => setCategory('')}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg ${
              !category
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All ({skillsTotal})
          </button>
          {skillCategories.map((c) => (
            <button
              key={c.name}
              onClick={() => setCategory(c.name)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg capitalize ${
                category === c.name
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {c.name} ({c.count})
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {selectedSkill ? (
            <div>
              <button
                onClick={() => { setSelectedSkill(null); setReadme(''); }}
                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-sm mb-4 transition-colors"
              >
                <ArrowLeft size={14} /> Back to list
              </button>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4">{selectedSkill}</h2>
                {detailLoading ? (
                  <div className="text-sm text-slate-500">Loading...</div>
                ) : (
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {readme}
                  </pre>
                )}
              </div>
            </div>
          ) : skills.length === 0 ? (
            <EmptyState message="No skills found" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {skills.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => loadSkillDetail(s.name)}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-amber-500/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
                      <span className="text-sm font-medium text-white">{s.name}</span>
                      <ChevronRight size={14} className="ml-auto text-slate-600 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className="text-xs text-slate-500 mt-1 capitalize">{s.category}</div>
                    {s.description && (
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</div>
                    )}
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2 mt-4 justify-center">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 text-sm bg-slate-800 rounded disabled:opacity-30 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 text-sm bg-slate-800 rounded disabled:opacity-30 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
