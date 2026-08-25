export type MobileTab = 'arena' | 'duello' | 'klan' | 'pratik' | 'magaza' | 'profil' | 'liderlik';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
}

export default function MobileBottomNav({ activeTab, onSelectTab }: MobileBottomNavProps) {
  const tabs: { id: MobileTab; label: string; icon: string; badge?: string }[] = [
    { id: 'arena', label: 'Arena', icon: '🏠' },
    { id: 'duello', label: 'Düello', icon: '⚔️', badge: 'CANLI' },
    { id: 'klan', label: 'Klan', icon: '🏰' },
    { id: 'pratik', label: 'Pratik', icon: '📝' },
    { id: 'magaza', label: 'Mağaza', icon: '🛒' },
    { id: 'profil', label: 'Profil', icon: '👤' },
  ];

  return (
    <nav className="shrink-0 z-40 bg-[#0c0e22]/98 backdrop-blur-2xl border-t border-white/10 px-1 py-1.5 shadow-2xl safe-area-bottom w-full">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all cursor-pointer select-none active:scale-90 ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Tab Glow Pill */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-b from-violet-600/30 to-violet-800/10 border border-violet-500/40 rounded-2xl -z-10 shadow-sm" />
              )}

              <div className="relative">
                <span className={`text-xl transition-transform duration-200 block ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
                  {tab.icon}
                </span>

                {tab.badge && (
                  <span className="absolute -top-1.5 -right-3 text-white text-[7px] font-black px-1 py-0.2 rounded-full border border-slate-900 bg-rose-500 animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[9px] font-bold mt-0.5 tracking-tight ${isActive ? 'text-violet-300 font-extrabold' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
