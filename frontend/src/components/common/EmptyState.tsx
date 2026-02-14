import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ message = 'No data found', description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Icon size={48} className="mb-4 opacity-50" />
      <p className="text-sm">{message}</p>
      {description && <p className="text-xs text-slate-600 mt-1">{description}</p>}
      {action && (
        <button onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
