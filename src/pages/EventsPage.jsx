import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, query, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar, MapPin, Users, Check, Clock } from 'lucide-react';
import Modal from '../components/Modal';

const CATEGORIES = ['Reunião','Workshop','Treinamento','Celebração','Externo','Outro'];

export default function EventsPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '', category: 'Reunião' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...form,
        creatorId: user.uid,
        creatorName: profile?.name,
        participants: [],
        confirmedUsers: [],
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setForm({ title: '', description: '', date: '', location: '', category: 'Reunião' });
    } finally {
      setLoading(false);
    }
  };

  const toggleConfirm = async (ev) => {
    const ref = doc(db, 'events', ev.id);
    const confirmed = ev.confirmedUsers?.includes(user.uid);
    await updateDoc(ref, {
      confirmedUsers: confirmed ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const upcoming = events.filter(e => !isPast(new Date(e.date)));
  const past = events.filter(e => isPast(new Date(e.date)));

  const EventCard = ({ ev }) => {
    const confirmed = ev.confirmedUsers?.includes(user.uid);
    const isOver = isPast(new Date(ev.date));
    return (
      <div className="card-hover">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-semibold text-slate-100">{ev.title}</h3>
          <span className="badge-blue text-[10px] badge flex-shrink-0">{ev.category}</span>
        </div>
        {ev.description && <p className="text-sm text-slate-400 mb-3 line-clamp-2">{ev.description}</p>}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock size={12} />
            {format(new Date(ev.date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </div>
          {ev.location && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={12} /> {ev.location}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users size={12} /> {ev.confirmedUsers?.length || 0} confirmados
          </div>
        </div>
        {!isOver && (
          <button
            onClick={() => toggleConfirm(ev)}
            className={confirmed ? 'btn-secondary text-xs py-1.5' : 'btn-primary text-xs py-1.5'}
          >
            {confirmed ? <><Check size={12} /> Confirmado</> : 'Confirmar presença'}
          </button>
        )}
        <p className="text-xs text-slate-600 mt-2">por {ev.creatorName}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Eventos</h1>
          <p className="text-slate-400 text-sm">{upcoming.length} próximos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Criar
        </button>
      </div>

      {upcoming.length > 0 && (
        <>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Próximos</h2>
          <div className="space-y-2">
            {upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">Passados</h2>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 5).map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </>
      )}

      {events.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum evento criado ainda</p>
        </div>
      )}

      {showModal && (
        <Modal title="Novo Evento" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input type="text" className="input" placeholder="Nome do evento" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="Detalhes..." value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data e hora *</label>
                <input type="datetime-local" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div>
                <label className="label">Categoria</label>
                <select className="input appearance-none" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Local</label>
              <input type="text" className="input" placeholder="Onde será o evento?" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleCreate} disabled={loading || !form.title || !form.date} className="btn-primary flex-1 justify-center">
                {loading ? 'Criando...' : 'Criar Evento'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
