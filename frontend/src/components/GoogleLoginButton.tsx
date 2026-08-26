import { useEffect, useRef, useState } from 'react';

interface GoogleLoginButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: (error: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  isLoading?: boolean;
}

const DEFAULT_GOOGLE_CLIENT_ID = '31375613755-tu8dkeo411m0kltv4sa2bc6jbjd7cbep.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
    __gsiSuccessHandler?: (idToken: string) => void;
    __gsiErrorHandler?: (error: string) => void;
    __gsiInitializedId?: string;
  }
}

export default function GoogleLoginButton({
  onSuccess,
  onError,
  text = 'continue_with',
  isLoading = false
}: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  // Keep latest callback references globally dispatched without re-running initialize()
  useEffect(() => {
    window.__gsiSuccessHandler = onSuccess;
    window.__gsiErrorHandler = onError;
  });

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setSdkReady(true);
      return;
    }

    const scriptId = 'google-gsi-client-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setSdkReady(true);
      script.onerror = () => {
        window.__gsiErrorHandler?.('Google oturum açma kütüphanesi yüklenemedi.');
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setSdkReady(true));
    }
  }, []);

  useEffect(() => {
    if (!sdkReady || !buttonRef.current || !window.google?.accounts?.id) return;

    try {
      if (window.__gsiInitializedId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response?.credential) {
              window.__gsiSuccessHandler?.(response.credential);
            } else {
              window.__gsiErrorHandler?.('Google oturum doğrulaması alınamadı.');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_prompt: true,
        });
        window.__gsiInitializedId = clientId;
      }

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: text,
        shape: 'pill',
        logo_alignment: 'left',
        width: 320,
      });
    } catch (err) {
      console.error('Google Sign-In initialization error:', err);
    }
  }, [sdkReady, clientId, text]);

  return (
    <div className="w-full flex flex-col items-center justify-center my-2 select-none relative min-h-[44px]">
      {isLoading ? (
        <div className="w-full py-2.5 px-4 rounded-2xl bg-[#171b38] border border-white/15 flex items-center justify-center gap-2 text-xs font-black text-slate-300">
          <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Google ile bağlanılıyor...
        </div>
      ) : (
        <div ref={buttonRef} className="w-full flex justify-center [&>div]:!w-full [&>div]:!max-w-full" />
      )}
    </div>
  );
}