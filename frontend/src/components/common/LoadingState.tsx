import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Loader2 size={32} className="animate-spin mb-4" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
