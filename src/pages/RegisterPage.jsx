import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Mail, Lock, User, Cake, Building2 } from 'lucide-react';

const EMOJIS = ['👤','👨','👩','🧑','👨‍💼','👩‍💼','🧑‍💼','👨‍💻','👩‍💻','🧑‍💻','👨‍🔬','👩‍🔬','🦸','🦸‍♀️','😎','🤓'];
const DEPARTMENTS = [
  'Departamento Pessoal','Jurídico','DH','SESMT',
  'Comunicação','Treinamento e Desenvolvimento','Saúde e Bem Estar',
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name:'', email:'', password:'', birthDate:'',
    department:'Departamento Pessoal', role:'colaborador', emoji:'👤'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este email já está cadastrado.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
      };
      setError(msgs[err.code] || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-indigo-200">
            <MapPin size={24} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-stone-900">Criar conta</h1>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Seu avatar</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => set('emoji', e)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all
                      ${form.emoji === e
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-stone-100 border-2 border-transparent hover:border-stone-300'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Nome completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="text" className="input pl-9" placeholder="Seu nome"
                  value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="email" className="input pl-9" placeholder="seu@email.com"
                  value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="password" className="input pl-9" placeholder="Mínimo 6 caracteres"
                  value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
              </div>
            </div>

            <div>
              <label className="label">Data de nascimento</label>
              <div className="relative">
                <Cake size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="date" className="input pl-9"
                  value={form.birthDate} onChange={e => set('birthDate', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label">Departamento</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <select className="input pl-9 appearance-none" value={form.department} onChange={e => set('department', e.target.value)}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-stone-400 text-sm mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
