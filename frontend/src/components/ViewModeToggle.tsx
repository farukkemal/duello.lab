import { useViewMode } from '../contexts/ViewModeContext';

interface ViewModeToggleProps {
  className?: string;
  isFloating?: boolean;
}

export default function ViewModeToggle({ className = '', isFloating = false }: ViewModeToggleProps) {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div
      className={`inline-flex items-center bg-[#090b1c]/90 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-xl select-none z-50 transition-all ${
        isFloating ? 'fixed top-3 right-3 sm:top-4 sm:right-4' : ''
      } ${className}`}
    >
      <button
        onClick={() => setViewMode('mobile')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
          viewMode === 'mobile'
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.6)] border border-violet-400/50'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Mobil Uygulama Görünümü"
      >
        <span className="text-sm">📱</span>
        <span className="hidden sm:inline">Mobil</span>
      </button>

      <button
        onClick={() => setViewMode('desktop')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
          viewMode === 'desktop'
            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-cyan-400/50'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Geniş Masaüstü (PC) Görünümü"
      >
        <span className="text-sm">💻</span>
        <span className="hidden sm:inline">PC Modu</span>
      </button>
    </div>
  );
}
