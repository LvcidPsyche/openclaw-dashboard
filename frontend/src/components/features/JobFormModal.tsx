import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface JobFormData {
  name: string;
  scheduleType: 'cron' | 'interval';
  cronExpression: string;
  intervalMs: number;
  agent: string;
  model: string;
  message: string;
  timeout: number;
  enabled: boolean;
}

interface JobFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: JobFormData) => Promise<void>;
  initial?: Partial<JobFormData>;
  title?: string;
}

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly (Monday)', value: '0 0 * * 1' },
];

export default function JobFormModal({ open, onClose, onSubmit, initial, title = 'Create Job' }: JobFormModalProps) {
  const [form, setForm] = useState<JobFormData>({
    name: '',
    scheduleType: 'cron',
    cronExpression: '0 * * * *',
    intervalMs: 3600000,
    agent: 'main',
    model: '',
    message: '',
    timeout: 300000,
    enabled: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm((f) => ({ ...f, ...initial }));
    }
  }, [initial]);

  useEffect(() => {
    if (open) {
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (form.scheduleType === 'cron' && !form.cronExpression.trim()) { setError('Cron expression is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof JobFormData, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Job Name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Schedule Type</label>
            <div className="flex gap-2">
              {(['cron', 'interval'] as const).map((t) => (
                <button key={t} type="button" onClick={() => set('scheduleType', t)}
                  className={`px-4 py-1.5 text-sm rounded-lg capitalize ${form.scheduleType === t ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {form.scheduleType === 'cron' ? (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Cron Expression</label>
              <input value={form.cronExpression} onChange={(e) => set('cronExpression', e.target.value)}
                placeholder="* * * * *"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-blue-500" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CRON_PRESETS.map((p) => (
                  <button key={p.value} type="button" onClick={() => set('cronExpression', p.value)}
                    className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Interval (minutes)</label>
              <input type="number" value={form.intervalMs / 60000} min={1}
                onChange={(e) => set('intervalMs', parseInt(e.target.value || '1') * 60000)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Agent</label>
              <input value={form.agent} onChange={(e) => set('agent', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Model (optional)</label>
              <input value={form.model} onChange={(e) => set('model', e.target.value)}
                placeholder="Default"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Message / Prompt</label>
            <textarea value={form.message} onChange={(e) => set('message', e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Timeout (seconds)</label>
              <input type="number" value={form.timeout / 1000} min={10}
                onChange={(e) => set('timeout', parseInt(e.target.value || '300') * 1000)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 pt-5">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)}
                className="rounded border-slate-600 bg-slate-900" />
              Enabled
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
              {submitting ? 'Saving...' : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
