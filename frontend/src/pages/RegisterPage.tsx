import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalıdır.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor! Lütfen iki şifreyi de aynı girin.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await register(cleanUsername, password);
      const receivedToken = data?.token || (data as any)?.Token;
      const receivedUser = data?.user || (data as any)?.User;

      if (!receivedToken || !receivedUser || typeof data !== 'object') {
        throw new Error('Geçersiz sunucu yanıtı. Backend API adresi (VITE_API_URL) tanımlanmamış veya sunucuya ulaşılamıyor.');
      }

      setAuth(receivedToken, receivedUser, true);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Register submit error:', err);
      if (err.response?.status === 503 || err.response?.status === 502) {
        setError('⏳ Sunucu başlatılıyor / uyanıyor. Lütfen 20-30 saniye bekleyip tekrar deneyin.');
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('🌐 Sunucuya bağlanılamadı. Backend servisinizin çalıştığından ve VITE_API_URL adresinin doğru olduğundan emin olun.');
      } else {
        const serverError = err.response?.data?.error || err.response?.data?.message || err.message;
        setError(serverError || 'Kayıt işlemi başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060710] flex justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-md mobile-app-shell flex flex-col justify-between p-6 sm:rounded-3xl relative overflow-hidden">
        
        {/* Top Header */}
        <div className="text-center pt-6 space-y-2">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-2xl animate-bounce-subtle">
            <div className="w-full h-full bg-[#0d0f22] rounded-[22px] flex items-center justify-center text-2xl">
              🎁
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white font-mono">
              duello<span className="text-cyan-400">.lab</span>
            </h1>
            <div className="inline-block bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase mt-1">
              +100 💰 Hoş Geldin Paketi
            </div>
          </div>
        </div>

        {/* Register Card */}
        <div className="game-card-3d p-6 my-4 space-y-3.5">
          <h2 className="text-base font-black text-white text-center uppercase tracking-wide">
            Yeni Savaşçı Kaydı
          </h2>

          {error && (
            <div className="bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-bold rounded-xl p-2.5 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Kullanıcı Adı */}
            <div>
              <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase tracking-wider">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                placeholder="örn: yks_sampiyonu"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#10132b] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-amber-400 transition"
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
              />
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase tracking-wider">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="En az 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#10132b] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-amber-400 transition pr-10"
                  required
                  minLength={6}
                  autoComplete="new-password"
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

            {/* Şifreyi Tekrar Girin */}
            <div>
              <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase tracking-wider">
                Şifreyi Tekrar Girin
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Şifrenizi doğrulayın"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-[#10132b] border rounded-xl px-3.5 py-2.5 text-white text-xs font-bold focus:outline-none transition pr-10 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-white/10 focus:border-amber-400'
                  }`}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold hover:text-white transition"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[10px] text-rose-400 font-bold mt-1">
                  ⚠️ Şifreler henüz eşleşmiyor
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl btn-game-gold text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 mt-3 shadow-lg"
            >
              {loading ? 'Hesap Açılıyor...' : '🎁 100 Coin ile Kayıt Ol'}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center pb-4">
          <p className="text-xs text-slate-400 font-bold">
            Zaten hesabın var mı?{' '}
            <Link to="/login" className="text-amber-400 hover:underline">
              Giriş Yap
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
