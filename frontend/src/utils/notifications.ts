// Web Push & Browser Notifications Manager

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('⚠️ Bu tarayıcı sistem bildirimlerini desteklemiyor.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

export function showLocalNotification(title: string, options?: NotificationOptions & { url?: string; roomCode?: string }): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // If Service Worker registration is available, use it for rich push notifications
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/pwa-icon.svg',
        badge: '/pwa-icon.svg',
        ...options,
        data: {
          url: options?.url || (options?.roomCode ? `/lobby/${options.roomCode}` : '/dashboard'),
          ...(options?.data || {})
        }
      });
    });
  } else {
    // Fallback to standard window Notification
    const notif = new Notification(title, {
      icon: '/pwa-icon.svg',
      ...options
    });

    notif.onclick = () => {
      window.focus();
      if (options?.url) {
        window.location.href = options.url;
      }
      notif.close();
    };
  }
}
