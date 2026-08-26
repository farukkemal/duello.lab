import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, googleAuth } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (idToken: string) => {
    setError('');
    setGoogleLoading(true);
    try {
      const { data } = await googleAuth(idToken);
      if (data?.token && data?.user) {
        setAuth(data.token, data.user);
        navigate('/dashboard');
      } else {
        setError('Google oturum bilgileri doğrulanamadı.');
      }
    } catch (err: any) {
      console.error('Google Login Error:', err);
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(serverMsg || 'Google ile giriş yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await login(username, password);
      setAuth(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-4 rounded-2xl btn-game-primary text-white font-black text-sm uppercase tracking-wider cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? 'Giriş Yapılıyor...' : 'Arenaya Gir ➔'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#131633] px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
              veya
            </span>
            <div className="border-t border-white/10 w-full" />
          </div>

          {/* Google Sign In Button */}
          <GoogleLoginButton
            text="signin_with"
            isLoading={googleLoading}
            onSuccess={handleGoogleSuccess}
            onError={(err) => setError(err)}
          />
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
