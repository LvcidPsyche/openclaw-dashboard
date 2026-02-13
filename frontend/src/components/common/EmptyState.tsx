import { Inbox } from 'lucide-react';

export default function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Inbox size={48} className="mb-4 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
