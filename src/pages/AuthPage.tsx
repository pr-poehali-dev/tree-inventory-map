import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Props {
  onSuccess: () => void;
  onClose?: () => void;
}

export default function AuthPage({ onSuccess, onClose }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const err = mode === 'login'
      ? await login(email, password)
      : await register(email, password, name);

    setLoading(false);
    if (err) { setError(err); return; }
    onSuccess();
  };

  return (
    <div className={`flex items-center justify-center p-4 z-[2000] ${onClose ? 'fixed inset-0 bg-black/50 backdrop-blur-sm' : 'min-h-screen bg-[var(--background)]'}`}>
      <div className="w-full max-w-sm relative">
        {onClose && (
          <button onClick={onClose} className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg">✕</button>
        )}
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 forest-bg rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">🌲</div>
          <h1 className="font-bold font-heading text-lg text-[var(--forest-dark)]">Дендрологическая ведомость</h1>
          <p className="text-xs text-[var(--stone)] mt-1">г. Минусинск и Минусинский район</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-[var(--border)]">
          {/* Tabs */}
          <div className="flex rounded-xl bg-[var(--forest-pale)] p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white text-[var(--forest-dark)] shadow-sm' : 'text-[var(--stone)]'}`}
            >
              Войти
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-white text-[var(--forest-dark)] shadow-sm' : 'text-[var(--stone)]'}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Иван Иванов"
                  required
                  className="border-[var(--forest-light)]/40"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@mail.ru"
                required
                className="border-[var(--forest-light)]/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Не менее 6 символов' : '••••••••'}
                required
                className="border-[var(--forest-light)]/40"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full forest-bg hover:opacity-90 text-white font-semibold"
            >
              {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}