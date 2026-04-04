import { MapPin } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-stone-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 animate-pulse-slow shadow-xl shadow-indigo-200">
          <MapPin size={28} className="text-white" />
        </div>
        <p className="text-stone-400 text-sm font-medium">Carregando...</p>
      </div>
    </div>
  );
}
