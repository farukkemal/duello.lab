import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('remember_username') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem('remember_username');
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedUsername = localStorage.getItem('remember_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Lütfen kullanıcı adı veya e-posta girin.');
      return;
    }

    if (!password) {
      setError('Lütfen şifrenizi girin.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await login(cleanUsername, password);
      const receivedToken = data?.token || (data as any)?.Token;
      const receivedUser = data?.user || (data as any)?.User;

      if (!receivedToken || !receivedUser || typeof data !== 'object') {
        throw new Error('Geçersiz sunucu yanıtı. Backend API adresi (VITE_API_URL) tanımlanmamış veya sunucuya ulaşılamıyor.');
      }

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('remember_username', cleanUsername);
      } else {
        localStorage.removeItem('remember_username');
      }

      setAuth(receivedToken, receivedUser, rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login submit error:', err);
      if (err.response?.status === 503 || err.response?.status === 502) {
        setError('⏳ Sunucu başlatılıyor / uyanıyor. Lütfen 20-30 saniye bekleyip tekrar deneyin.');
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('🌐 Sunucuya bağlanılamadı. Backend servisinizin çalıştığından ve VITE_API_URL adresinin doğru olduğundan emin olun.');
      } else {
        const serverError = err.response?.data?.error || err.response?.data?.message || err.message;
        setError(serverError || 'Giriş yapılamadı. Kullanıcı adı veya şifrenizi kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060710] flex justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-md mobile-app-shell flex flex-col justify-between p-6 sm:rounded-3xl relative overflow-hidden">
        
        {/* Top Logo & App Title */}
        <div className="text-center pt-8 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-violet-600 via-purple-600 to-cyan-400 p-0.5 shadow-2xl animate-bounce-subtle">
            <div className="w-full h-full bg-[#0d0f22] rounded-[22px] flex items-center justify-center text-3xl">
              ⚔️
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight font-mono">
              duello<span className="text-cyan-400">.lab</span>
            </h1>
            <span className="text-[11px] font-bold text-violet-300 uppercase tracking-widest bg-violet-500/15 border border-violet-500/30 px-3 py-0.5 rounded-full inline-block mt-1">
              YKS Mobil Düello Arenası
            </span>
          </div>
        </div>

        {/* Auth Form Card */}
        <div className="game-card-3d p-6 my-6 space-y-4">
          <h2 className="text-lg font-black text-white text-center uppercase tracking-wide">
            Arenaya Giriş Yap
          </h2>

          {error && (
            <div className="bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-bold rounded-xl p-2.5 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase tracking-wider">
                Kullanıcı Adı veya E-posta
              </label>
              <input
                type="text"
                placeholder="örn: duello_ustasi veya mail@ornek.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#10132b] border border-white/10 rounded-xl px-3.5 py-3 text-white text-xs font-bold focus:outline-none focus:border-violet-500 transition"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase tracking-wider">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#10132b] border border-white/10 rounded-xl px-3.5 py-3 text-white text-xs font-bold focus:outline-none focus:border-violet-500 transition pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Beni Hatırla (Remember Me) */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#10132b] text-violet-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-violet-600"
                />
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition">
                  Beni Hatırla
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl btn-game-primary text-white font-black text-sm uppercase tracking-wider cursor-pointer disabled:opacity-50 mt-2 shadow-lg"
            >
              {loading ? 'Giriş Yapılıyor...' : 'Arenaya Gir ➔'}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center pb-4">
          <p className="text-xs text-slate-400 font-bold">
            Hesabın yok mu?{' '}
            <Link to="/register" className="text-amber-400 hover:underline">
              Kayıt Ol (+100 💰)
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
