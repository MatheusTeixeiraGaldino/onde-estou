import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Clock, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';
import Modal from './Modal';

const LOCATIONS = ['Escritório', 'Home Office', 'Cliente', 'Viagem', 'Reunião Externa', 'Férias', 'Folga', 'Outro'];

export default function LocationWidget() {
  const { user, profile } = useAuth();
  const [current, setCurrent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ location: 'Escritório', start: '', end: '', custom: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'locations'),
      where('userId', '==', user.uid),
      orderBy('start', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        const endDate = data.end ? new Date(data.end) : null;
        if (!endDate || endDate > new Date()) {
          setCurrent({ id: snap.docs[0].id, ...data });
        } else {
          setCurrent(null);
        }
      } else {
        setCurrent(null);
      }
    });
    return unsub;
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const loc = form.location === 'Outro' ? form.custom : form.location;
      await addDoc(collection(db, 'locations'), {
        userId: user.uid,
        userName: profile?.name,
        userEmoji: profile?.emoji,
        location: loc,
        start: form.start || new Date().toISOString(),
        end: form.end || null,
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setForm({ location: 'Escritório', start: '', end: '', custom: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="card border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
              <MapPin size={18} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Localização atual</p>
              {current ? (
                <>
                  <p className="text-stone-800 font-semibold">{current.location}</p>
                  <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                    <Clock size={11} />
                    Desde {format(new Date(current.start), 'HH:mm')}
                    {current.end && ` · até ${format(new Date(current.end), 'HH:mm')}`}
                  </p>
                </>
              ) : (
                <p className="text-stone-400 text-sm">Não registrado</p>
              )}
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary text-xs py-2 px-3">
            <Plus size={14} /> Atualizar
          </button>
        </div>
      </div>

      {showModal && (
        <Modal title="Registrar Localização" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Local</label>
              <div className="grid grid-cols-2 gap-2">
                {LOCATIONS.map(l => (
                  <button key={l} type="button"
                    onClick={() => setForm(f => ({ ...f, location: l }))}
                    className={`px-3 py-2 rounded-xl text-sm transition-all text-left flex items-center gap-2 ${form.location === l ? 'bg-indigo-50 border-indigo-400 border text-indigo-700 font-medium' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'}`}>
                    {form.location === l && <Check size={12} />}
                    {l}
                  </button>
                ))}
              </div>
              {form.location === 'Outro' && (
                <input type="text" className="input mt-2" placeholder="Descreva o local..." value={form.custom} onChange={e => setForm(f => ({ ...f, custom: e.target.value }))} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Início</label>
                <input type="datetime-local" className="input" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div>
                <label className="label">Fim (opcional)</label>
                <input type="datetime-local" className="input" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
