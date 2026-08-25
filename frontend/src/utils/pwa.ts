// PWA Service Worker Registration & Install Prompt Utilities

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Register Service Worker in production/supported browsers
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('⚡ [PWA] ServiceWorker registered with scope:', registration.scope);

          // Listen for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🚀 [PWA] Yeni sürüm mevcut! Sayfa yenilendiğinde güncellenecektir.');
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('⚠️ [PWA] ServiceWorker registration failed:', error);
        });
    });
  }
}

// Check if app is running in Standalone (PWA) mode
export function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Check if device is iOS
export function isIOS(): boolean {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}
