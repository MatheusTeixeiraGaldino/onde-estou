import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msgs = {
        'auth/invalid-credential': 'Email ou senha inválidos.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
      };
      setError(msgs[err.code] || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200">
            <MapPin size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-stone-900">Onde Estou</h1>
          <p className="text-stone-400 text-sm mt-1">Gestão de pessoas e localização</p>
        </div>

        <div className="card">
          <h2 className="font-display font-semibold text-xl text-stone-900 mb-5">Entrar</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="email" className="input pl-9" placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type={showPass ? 'text' : 'password'} className="input pl-9 pr-10"
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-stone-400 text-sm mt-4">
            Não tem conta?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Cadastrar-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
