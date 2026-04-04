import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, FileText, Calendar, Users, ChevronDown, ChevronUp, Edit2, Save } from 'lucide-react';
import Modal from '../components/Modal';

export default function MeetingsPage() {
  const { user, profile } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', eventId: '', date: '', participants: '',
    notes: '', decisions: '', pendingActions: '', responsible: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // load events for linking
    getDocs(collection(db, 'events')).then(snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', eventId: '', date: '', participants: '', notes: '', decisions: '', pendingActions: '', responsible: '' });
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditingId(m.id);
    setForm({
      title: m.title || '',
      eventId: m.eventId || '',
      date: m.date || '',
      participants: m.participants || '',
      notes: m.notes || '',
      decisions: m.decisions || '',
      pendingActions: m.pendingActions || '',
      responsible: m.responsible || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date) return;
    setLoading(true);
    try {
      const data = {
        ...form,
        creatorId: user.uid,
        creatorName: profile?.name,
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, 'meetings', editingId), data);
      } else {
        await addDoc(collection(db, 'meetings'), { ...data, createdAt: serverTimestamp() });
      }
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Atas de Reunião</h1>
          <p className="text-slate-400 text-sm">{meetings.length} registradas</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nova Ata
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma ata registrada ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map(m => {
            const isExpanded = expandedId === m.id;
            const linkedEvent = events.find(e => e.id === m.eventId);
            return (
              <div key={m.id} className="card">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-100">{m.title}</h3>
                      {linkedEvent && (
                        <span className="badge-blue text-[10px] badge">{linkedEvent.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {m.date && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar size={11} />
                          {format(new Date(m.date), "d MMM yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {m.participants && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users size={11} /> {m.participants.split(',').length} participante(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(m); }}
                      className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-slate-800 pt-4 animate-fade-in">
                    {m.participants && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Participantes</p>
                        <p className="text-sm text-slate-300">{m.participants}</p>
                      </div>
                    )}
                    {m.notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Descrição / Pauta</p>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{m.notes}</p>
                      </div>
                    )}
                    {m.decisions && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">✅ Decisões Tomadas</p>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{m.decisions}</p>
                      </div>
                    )}
                    {m.pendingActions && (
                      <div>
                        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">⏳ Pendências</p>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{m.pendingActions}</p>
                      </div>
                    )}
                    {m.responsible && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Responsáveis</p>
                        <p className="text-sm text-slate-300">{m.responsible}</p>
                      </div>
                    )}
                    <p className="text-xs text-slate-600">Registrado por {m.creatorName}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar Ata' : 'Nova Ata de Reunião'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título da reunião *</label>
              <input type="text" className="input" placeholder="Ex: Reunião de planejamento Q1" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data *</label>
                <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div>
                <label className="label">Evento vinculado</label>
                <select className="input appearance-none" value={form.eventId} onChange={e => set('eventId', e.target.value)}>
                  <option value="">Nenhum</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Participantes (separados por vírgula)</label>
              <input type="text" className="input" placeholder="João, Maria, Pedro..." value={form.participants} onChange={e => set('participants', e.target.value)} />
            </div>
            <div>
              <label className="label">Descrição / Pauta</label>
              <textarea className="input min-h-[70px] resize-none" placeholder="Assuntos discutidos..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <div>
              <label className="label">Decisões tomadas</label>
              <textarea className="input min-h-[70px] resize-none" placeholder="O que foi decidido..." value={form.decisions} onChange={e => set('decisions', e.target.value)} />
            </div>
            <div>
              <label className="label">Pendências</label>
              <textarea className="input min-h-[70px] resize-none" placeholder="O que ficou pendente..." value={form.pendingActions} onChange={e => set('pendingActions', e.target.value)} />
            </div>
            <div>
              <label className="label">Responsáveis pelas pendências</label>
              <input type="text" className="input" placeholder="Nome dos responsáveis..." value={form.responsible} onChange={e => set('responsible', e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.title || !form.date} className="btn-primary flex-1 justify-center">
                <Save size={14} /> {loading ? 'Salvando...' : 'Salvar Ata'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
