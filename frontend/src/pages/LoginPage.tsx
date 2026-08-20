import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await login(username, password);
      setAuth(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-2">duello.lab</h1>
          <p className="text-[var(--color-text-muted)]">Sınav Arenasına Hoş Geldin</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-semibold mb-6">Giriş Yap</h2>
          {error && (
            <div className="bg-[var(--color-danger)]/20 border border-[var(--color-danger)] text-[var(--color-danger)] rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[var(--color-surface-light)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--color-surface-light)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
          <p className="text-center text-[var(--color-text-muted)] mt-4 text-sm">
            Hesabın yok mu?{' '}
            <Link to="/register" className="text-[var(--color-primary)] hover:underline">Kayıt Ol</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
