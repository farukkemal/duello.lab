import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('💥 [ErrorBoundary] Uncaught UI error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.href = '/dashboard';
  };

  private handleHardReset = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070913] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
          {/* Subtle Background Glow */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md bg-[#131631] border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-fadeIn">
            {/* Mascot / Icon */}
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
              ⚡
            </div>

            {/* Error Title */}
            <div>
              <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
                Arayüz Bağlantı Uyarısı
              </span>
              <h2 className="text-xl font-black text-white">
                Bir Aksaklık Meydana Geldi
              </h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Sunucu yanıtı veya veri aktarımı sırasında beklenmeyen bir durum oluştu. Lütfen sayfayı yenileyin veya ana ekrana dönün.
              </p>
            </div>

            {/* Error Details Accordion */}
            {this.state.error && (
              <div className="text-left bg-black/40 border border-white/5 rounded-2xl p-3 max-h-32 overflow-y-auto no-scrollbar">
                <p className="text-[11px] font-mono font-bold text-rose-400 break-words">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={this.handleReload}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs uppercase shadow-lg shadow-violet-900/30 active:scale-95 transition cursor-pointer"
              >
                🔄 Sayfayı Yenile / Lobiye Dön
              </button>

              <button
                onClick={this.handleHardReset}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs uppercase transition cursor-pointer"
              >
                Oturumu Sıfırla (Çıkış Yap)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
