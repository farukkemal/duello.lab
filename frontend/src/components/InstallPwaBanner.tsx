import { useState, useEffect } from 'react';
import { isRunningStandalone, isIOS, type BeforeInstallPromptEvent } from '../utils/pwa';
import { requestNotificationPermission } from '../utils/notifications';

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  useEffect(() => {
    // If running in standalone mode or already dismissed in session, do not show
    if (isRunningStandalone() || sessionStorage.getItem('pwa_banner_dismissed')) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone, show iOS banner if not dismissed
    if (isIOS() && !isRunningStandalone() && !sessionStorage.getItem('pwa_banner_dismissed')) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS()) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('✅ [PWA] Kullanıcı uygulamayı yükledi.');
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIosGuide(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      setNotifGranted(true);
    }
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="mx-3 my-2 bg-gradient-to-r from-violet-950/80 via-[#161a40] to-violet-900/80 border border-violet-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 animate-fadeIn">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-violet-600 flex items-center justify-center text-lg shrink-0 shadow-md">
            📲
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white leading-tight truncate">
              duello.lab Mobil Uygulaması
            </h4>
            <p className="text-[10px] font-bold text-slate-300 truncate">
              Tam ekran & takılmasız oyun deneyimi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!notifGranted && (
            <button
              onClick={handleEnableNotifications}
              className="px-2 py-1.5 rounded-xl bg-violet-600/40 hover:bg-violet-600/60 text-violet-300 font-bold text-[9px] uppercase cursor-pointer border border-violet-500/30"
              title="Düello bildirimlerini aç"
            >
              🔔
            </button>
          )}
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl btn-game-gold font-black text-[10px] uppercase shadow-sm cursor-pointer active:scale-95 transition-transform"
          >
            Yükle
          </button>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
            title="Kapat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#131631] border-2 border-violet-500 rounded-3xl p-5 text-center shadow-2xl space-y-4">
            <div className="text-4xl animate-bounce">🍎</div>
            <h3 className="text-base font-black text-white">iPhone / iPad'e Yükle</h3>
            <div className="text-xs text-slate-300 space-y-2 text-left bg-white/5 rounded-2xl p-3.5 border border-white/10 font-medium">
              <p className="flex items-center gap-2">
                <span className="font-black text-violet-400">1.</span>
                Safari alt menüsündeki <span className="font-bold text-amber-300">Paylaş (Share ⬆️)</span> butonuna dokunun.
              </p>
              <p className="flex items-center gap-2">
                <span className="font-black text-violet-400">2.</span>
                Aşağı kaydırıp <span className="font-bold text-amber-300">"Ana Ekrana Ekle" ➕</span> seçeneğini seçin.
              </p>
              <p className="flex items-center gap-2">
                <span className="font-black text-violet-400">3.</span>
                Sağ üstteki <span className="font-bold text-emerald-400">"Ekle"</span> butonuna basın!
              </p>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 rounded-2xl btn-game-primary font-black text-xs uppercase cursor-pointer"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
}
