import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, orderBy, query, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, FileText, Calendar, Users, ChevronDown, ChevronUp,
  Edit2, Save, Globe, Check
} from 'lucide-react';
import Modal from '../components/Modal';

export default function MeetingsPage() {
  const { user, profile } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [events, setEvents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('minhas');
  const [newItem, setNewItem] = useState('');
  const [form, setForm] = useState({
    title: '', eventId: '', date: '', participantIds: [],
    notes: '', decisions: '', pendingActions: '', responsible: '',
    isCommunity: false,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    getDocs(collection(db, 'events')).then(snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const myMeetings = meetings.filter(m =>
    !m.isCommunity && (
      m.creatorId === user.uid ||
      (m.participantIds || []).includes(user.uid)
    )
  );

  const communityMeeting = meetings.find(m => m.isCommunity);

  const openCreate = (isCommunity = false) => {
    setEditingId(null);
    setForm({
      title: isCommunity ? 'Programação da Semana' : '',
      eventId: '', date: '',
      participantIds: isCommunity ? allUsers.map(u => u.uid || u.id) : [user.uid],
      notes: '', decisions: '', pendingActions: '', responsible: '',
      isCommunity,
    });
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditingId(m.id);
    setForm({
      title: m.title || '',
      eventId: m.eventId || '',
      date: m.date || '',
      participantIds: m.participantIds || [],
      notes: m.notes || '',
      decisions: m.decisions || '',
      pendingActions: m.pendingActions || '',
      responsible: m.responsible || '',
      isCommunity: m.isCommunity || false,
    });
    setShowModal(true);
  };

  const toggleParticipant = (uid) => {
    setForm(f => {
      const ids = f.participantIds || [];
      return {
        ...f,
        participantIds: ids.includes(uid) ? ids.filter(id => id !== uid) : [...ids, uid],
      };
    });
  };

  const handleSave = async () => {
    if (!form.title || !form.date) return;
    setLoading(true);
    try {
      const data = { ...form, creatorId: user.uid, creatorName: profile?.name, updatedAt: serverTimestamp() };
      if (editingId) {
        await updateDoc(doc(db, 'meetings', editingId), data);
      } else {
        await addDoc(collection(db, 'meetings'), { ...data, createdAt: serverTimestamp() });
      }
      setShowModal(false);
    } finally { setLoading(false); }
  };

  const addCommunityItem = async () => {
    if (!newItem.trim() || !communityMeeting) return;
    const updated = (communityMeeting.notes ? communityMeeting.notes + '\n' : '') + `• [${profile?.name}] ${newItem.trim()}`;
    await updateDoc(doc(db, 'meetings', communityMeeting.id), { notes: updated });
    setNewItem('');
  };

  const MeetingCard = ({ m }) => {
    const isExpanded = expandedId === m.id;
    const linkedEvent = events.find(e => e.id === m.eventId);
    const participantUsers = allUsers.filter(u => (m.participantIds || []).includes(u.uid || u.id));

    return (
      <div className="card">
        <div className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : m.id)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-stone-800">{m.title}</h3>
              {m.isCommunity && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <Globe size={9} /> Comunitária
                </span>
              )}
              {linkedEvent && <span className="badge-blue text-[10px] badge">{linkedEvent.title}</span>}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {m.date && (
                <span className="flex items-center gap-1 text-xs text-stone-400">
                  <Calendar size={11} />
                  {format(new Date(m.date), "d MMM yyyy", { locale: ptBR })}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <Users size={11} /> {(m.participantIds || []).length} participante(s)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {(m.creatorId === user.uid || m.isCommunity) && (
              <button onClick={e => { e.stopPropagation(); openEdit(m); }}
                className="p-1.5 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit2 size={14} />
              </button>
            )}
            {isExpanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-stone-100 pt-4 animate-fade-in">
            {participantUsers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Participantes</p>
                <div className="flex flex-wrap gap-1.5">
                  {participantUsers.map(u => (
                    <span key={u.uid || u.id} className="flex items-center gap-1.5 text-xs bg-stone-100 text-stone-700 rounded-full px-2.5 py-1 border border-stone-200">
                      {u.emoji || '👤'} {u.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {m.notes && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  {m.isCommunity ? 'Itens da Programação' : 'Descrição / Pauta'}
                </p>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{m.notes}</p>
              </div>
            )}

            {m.isCommunity && (
              <div className="flex gap-2 pt-1">
                <input type="text" className="input text-sm py-2"
                  placeholder="Adicionar item à programação..."
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCommunityItem()} />
                <button onClick={addCommunityItem} className="btn-primary py-2 px-3 flex-shrink-0">
                  <Plus size={14} />
                </button>
              </div>
            )}

            {m.decisions && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">✅ Decisões Tomadas</p>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{m.decisions}</p>
              </div>
            )}
            {m.pendingActions && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">⏳ Pendências</p>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{m.pendingActions}</p>
              </div>
            )}
            {m.responsible && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Responsáveis</p>
                <p className="text-sm text-stone-700">{m.responsible}</p>
              </div>
            )}
            <p className="text-xs text-stone-300">Registrado por {m.creatorName}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Atas de Reunião</h1>
          <p className="text-stone-400 text-sm">{myMeetings.length} registradas</p>
        </div>
        <button onClick={() => openCreate(false)} className="btn-primary">
          <Plus size={16} /> Nova Ata
        </button>
      </div>

      <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
        <button onClick={() => setActiveTab('minhas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'minhas' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
          Minhas Atas
        </button>
        <button onClick={() => setActiveTab('semana')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === 'semana' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
          <Globe size={13} /> Prog. da Semana
        </button>
      </div>

      {activeTab === 'minhas' && (
        myMeetings.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma ata registrada ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myMeetings.map(m => <MeetingCard key={m.id} m={m} />)}
          </div>
        )
      )}

      {activeTab === 'semana' && (
        !communityMeeting ? (
          <div className="text-center py-12 text-stone-400">
            <Globe size={40} className="mx-auto mb-3 opacity-30" />
            <p className="mb-4">Nenhuma programação da semana criada</p>
            <button onClick={() => openCreate(true)} className="btn-primary mx-auto justify-center">
              <Plus size={16} /> Criar Programação da Semana
            </button>
          </div>
        ) : (
          <MeetingCard m={communityMeeting} />
        )
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Ata' : (form.isCommunity ? 'Programação da Semana' : 'Nova Ata de Reunião')}
          onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {!form.isCommunity && (
              <div>
                <label className="label">Título da reunião *</label>
                <input type="text" className="input" placeholder="Ex: Reunião de planejamento Q1"
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data *</label>
                <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              {!form.isCommunity && (
                <div>
                  <label className="label">Evento vinculado</label>
                  <select className="input appearance-none" value={form.eventId} onChange={e => set('eventId', e.target.value)}>
                    <option value="">Nenhum</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="label">Participantes ({(form.participantIds || []).length} selecionados)</label>
              <div className="max-h-44 overflow-y-auto space-y-1 border border-stone-200 rounded-xl p-2 bg-stone-50">
                {allUsers.map(u => {
                  const uid = u.uid || u.id;
                  const selected = (form.participantIds || []).includes(uid);
                  return (
                    <button key={uid} type="button" onClick={() => toggleParticipant(uid)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left
                        ${selected ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'hover:bg-white border border-transparent text-stone-600'}`}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-stone-300 bg-white'}`}>
                        {selected && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-base leading-none">{u.emoji || '👤'}</span>
                      <span className="font-medium truncate">{u.name}</span>
                      <span className="text-xs text-stone-400 ml-auto flex-shrink-0">{u.department}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label">{form.isCommunity ? 'Itens da programação' : 'Descrição / Pauta'}</label>
              <textarea className="input min-h-[80px] resize-none"
                placeholder={form.isCommunity ? 'Liste os itens...' : 'Assuntos discutidos...'}
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            {!form.isCommunity && (
              <>
                <div>
                  <label className="label">Decisões tomadas</label>
                  <textarea className="input min-h-[60px] resize-none" placeholder="O que foi decidido..."
                    value={form.decisions} onChange={e => set('decisions', e.target.value)} />
                </div>
                <div>
                  <label className="label">Pendências</label>
                  <textarea className="input min-h-[60px] resize-none" placeholder="O que ficou pendente..."
                    value={form.pendingActions} onChange={e => set('pendingActions', e.target.value)} />
                </div>
                <div>
                  <label className="label">Responsáveis pelas pendências</label>
                  <input type="text" className="input" placeholder="Nome dos responsáveis..."
                    value={form.responsible} onChange={e => set('responsible', e.target.value)} />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.title || !form.date} className="btn-primary flex-1 justify-center">
                <Save size={14} /> {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
