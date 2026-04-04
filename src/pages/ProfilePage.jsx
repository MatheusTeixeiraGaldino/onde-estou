import { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogOut, MapPin, Building2, Cake, Shield, Edit2, Save, X } from 'lucide-react';

const EMOJIS = ['👤','👨','👩','🧑','👨‍💼','👩‍💼','🧑‍💼','👨‍💻','👩‍💻','🧑‍💻','👨‍🔬','👩‍🔬','🦸','🦸‍♀️','😎','🤓'];
const DEPARTMENTS = ['TI','RH','Financeiro','Comercial','Marketing','Operações','Jurídico','Diretoria','Outro'];

const ROLE_LABEL = { admin: '👑 Admin', gestor: '🎯 Gestor', colaborador: '💼 Colaborador' };
const ROLE_BADGE = { admin: 'badge-purple', gestor: 'badge-blue', colaborador: 'badge-green' };

export default function ProfilePage() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (profile) setForm({ name: profile.name, department: profile.department, emoji: profile.emoji });
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'locations'),
      where('userId', '==', user.uid),
      orderBy('start', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5));
    });
    return unsub;
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), form);
      await refreshProfile();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const age = profile?.birthDate
    ? differenceInYears(new Date(), new Date(profile.birthDate))
    : null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Meu Perfil</h1>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary text-xs py-2">
              <Edit2 size={13} /> Editar
            </button>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-2">
                <X size={13} /> Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-2">
                <Save size={13} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          )}
          <button onClick={logout} className="btn-danger text-xs py-2">
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="card">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="label">Avatar</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} type="button"
                    onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${form.emoji === e ? 'bg-primary-500/30 border-2 border-primary-500' : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Nome</label>
              <input type="text" className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Departamento</label>
              <select className="input appearance-none" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-900 to-slate-800 border border-primary-500/30 flex items-center justify-center text-3xl flex-shrink-0">
              {profile?.emoji || '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-xl text-white">{profile?.name}</h2>
              <p className="text-sm text-slate-400">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`badge text-xs ${ROLE_BADGE[profile?.role] || 'badge-green'}`}>
                  {ROLE_LABEL[profile?.role] || profile?.role}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Building2 size={11} /> {profile?.department}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info cards */}
      {!editing && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center py-4">
            <Cake size={20} className="mx-auto text-pink-400 mb-1" />
            <p className="text-xs text-slate-500">Aniversário</p>
            {profile?.birthDate ? (
              <>
                <p className="font-semibold text-slate-100 text-sm mt-0.5">
                  {format(new Date(profile.birthDate.replace(/-/g, '/')), "d 'de' MMM", { locale: ptBR })}
                </p>
                <p className="text-xs text-slate-500">{age} anos</p>
              </>
            ) : <p className="text-xs text-slate-500 mt-0.5">Não informado</p>}
          </div>
          <div className="card text-center py-4">
            <Shield size={20} className="mx-auto text-primary-400 mb-1" />
            <p className="text-xs text-slate-500">Perfil de acesso</p>
            <p className="font-semibold text-slate-100 text-sm mt-0.5 capitalize">{profile?.role}</p>
            <p className="text-xs text-slate-500">{profile?.department}</p>
          </div>
        </div>
      )}

      {/* Location history */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-primary-400" />
          <h3 className="font-semibold text-slate-100">Histórico de Localização</h3>
        </div>
        {locations.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-3">Sem registros de localização</p>
        ) : (
          <div className="space-y-2">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-center gap-3 py-1.5 border-b border-slate-800 last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{loc.location}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(loc.start), "d MMM, HH:mm", { locale: ptBR })}
                    {loc.end && ` → ${format(new Date(loc.end), 'HH:mm')}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
