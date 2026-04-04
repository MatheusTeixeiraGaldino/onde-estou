import { MapPin } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-4 animate-pulse-slow shadow-2xl shadow-primary-900/50">
          <MapPin size={28} className="text-white" />
        </div>
        <p className="text-slate-400 text-sm font-medium">Carregando...</p>
      </div>
    </div>
  );
}
