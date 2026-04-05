import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy, query, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Plane, MapPin, Users, ArrowRight, UserCheck,
  ChevronDown, ChevronUp, Check, Trash2, Edit2
} from 'lucide-react';
import Modal from '../components/Modal';

export default function TravelsPage() {
  const { user, profile } = useAuth();
  const [travels, setTravels] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('proximas');
  const [form, setForm] = useState({
    title: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    routeOrigin: '',
    routeStops: '',
    companions: '',
    hasVacancies: false,
    vacancies: '',
    notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const q = query(collection(db, 'travels'), orderBy('departureDate', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setTravels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const upcoming = travels.filter(t =>
    !t.returnDate || isAfter(new Date(t.returnDate), startOfDay(new Date()))
  );
  const past = travels.filter(t =>
    t.returnDate && !isAfter(new Date(t.returnDate), startOfDay(new Date()))
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', destination: '', departureDate: '', returnDate: '', routeOrigin: '', routeStops: '', companions: '', hasVacancies: false, vacancies: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({
      title: t.title || '',
      destination: t.destination || '',
      departureDate: t.departureDate || '',
      returnDate: t.returnDate || '',
      routeOrigin: t.routeOrigin || '',
      routeStops: t.routeStops || '',
      companions: t.companions || '',
      hasVacancies: t.hasVacancies || false,
      vacancies: t.vacancies || '',
      notes: t.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.destination || !form.departureDate) return;
    setLoading(true);
    try {
      const data = { ...form, creatorId: user.uid, creatorName: profile?.name, updatedAt: serverTimestamp() };
      if (editingId) {
        await updateDoc(doc(db, 'travels', editingId), data);
      } else {
        await addDoc(collection(db, 'travels'), { ...data, confirmedUsers: [], createdAt: serverTimestamp() });
      }
      setShowModal(false);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta viagem?')) return;
    await deleteDoc(doc(db, 'travels', id));
  };

  const toggleConfirm = async (t) => {
    const ref = doc(db, 'travels', t.id);
    const confirmed = (t.confirmedUsers || []).includes(user.uid);
    await updateDoc(ref, {
      confirmedUsers: confirmed ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const TravelCard = ({ t }) => {
    const isExpanded = expandedId === t.id;
    const confirmed = (t.confirmedUsers || []).includes(user.uid);
    const confirmedCount = t.confirmedUsers?.length || 0;
    const vacancyCount = parseInt(t.vacancies) || 0;
    const spotsLeft = t.hasVacancies ? vacancyCount - confirmedCount : null;
    const isPastTravel = t.returnDate && !isAfter(new Date(t.returnDate), startOfDay(new Date()));
    const isCreator = t.creatorId === user.uid;

    // Build route string: Origin → Stops → Destination
    const routeParts = [];
    if (t.routeOrigin) routeParts.push(t.routeOrigin);
    if (t.routeStops) routeParts.push(t.routeStops);
    if (t.destination) routeParts.push(t.destination);
    const fullRoute = routeParts.join(' → ');

    return (
      <div className={`card border-emerald-200 ${isPastTravel ? 'opacity-60' : 'bg-gradient-to-br from-emerald-50/40 to-white'}`}>
        <div className="flex items-start justify-between gap-2 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : t.id)}>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Plane size={16} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800">{t.title || t.destination}</p>
              {t.destination && t.title && (
                <p className="text-xs text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {t.destination}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-stone-400">
                {t.departureDate && (
                  <span>Ida: {format(new Date(t.departureDate), "d MMM", { locale: ptBR })}</span>
                )}
                {t.returnDate && (
                  <><ArrowRight size={10} className="text-stone-300" />
                  <span>Volta: {format(new Date(t.returnDate), "d MMM", { locale: ptBR })}</span></>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {t.hasVacancies ? (
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${spotsLeft > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {spotsLeft > 0 ? `${spotsLeft} vagas` : 'Lotado'}
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-stone-100 text-stone-500">
                Vagas abertas
              </span>
            )}
            {isCreator && (
              <>
                <button onClick={e => { e.stopPropagation(); openEdit(t); }}
                  className="p-1.5 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                  className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={13} />
                </button>
              </>
            )}
            {isExpanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 border-t border-emerald-100 pt-4 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-emerald-100 p-3">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">✈️ Ida</p>
                <p className="text-sm font-medium text-stone-700">
                  {t.departureDate ? format(new Date(t.departureDate), "d 'de' MMMM", { locale: ptBR }) : '—'}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-emerald-100 p-3">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">🏠 Volta</p>
                <p className="text-sm font-medium text-stone-700">
                  {t.returnDate ? format(new Date(t.returnDate), "d 'de' MMMM", { locale: ptBR }) : '—'}
                </p>
              </div>
            </div>

            {fullRoute && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Rota</p>
                <p className="text-sm text-stone-700 flex items-center gap-1.5 flex-wrap">
                  {routeParts.map((part, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      {i > 0 && <ArrowRight size={12} className="text-emerald-400 flex-shrink-0" />}
                      <span className={i === routeParts.length - 1 ? 'font-semibold text-emerald-700' : 'text-stone-600'}>{part}</span>
                    </span>
                  ))}
                </p>
              </div>
            )}

            {t.companions && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Com quem</p>
                <p className="text-sm text-stone-700 flex items-center gap-1.5">
                  <Users size={13} className="text-emerald-500 flex-shrink-0" /> {t.companions}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Vagas</p>
              {t.hasVacancies ? (
                <p className={`text-sm font-semibold ${spotsLeft > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {spotsLeft > 0 ? `${spotsLeft} vaga(s) de ${vacancyCount}` : `Lotado (${vacancyCount} vagas)`}
                </p>
              ) : (
                <p className="text-sm text-stone-500">Vagas abertas (sem limite)</p>
              )}
              <p className="text-xs text-stone-400 mt-0.5">{confirmedCount} pessoa(s) confirmada(s)</p>
            </div>

            {t.notes && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-stone-600 whitespace-pre-wrap">{t.notes}</p>
              </div>
            )}

            {!isPastTravel && (
              <button onClick={() => toggleConfirm(t)}
                className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 w-full justify-center transition-colors
                  ${confirmed ? 'text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100' : 'text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'}`}>
                {confirmed ? <><Check size={12} /> Confirmado nesta viagem</> : <><UserCheck size={12} /> Confirmar minha presença</>}
              </button>
            )}

            <p className="text-xs text-stone-300">Cadastrado por {t.creatorName}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Viagens</h1>
          <p className="text-stone-400 text-sm">{upcoming.length} programadas</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nova Viagem
        </button>
      </div>

      <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
        <button onClick={() => setActiveTab('proximas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'proximas' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
          Próximas
        </button>
        <button onClick={() => setActiveTab('passadas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'passadas' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
          Passadas
        </button>
      </div>

      {activeTab === 'proximas' && (
        upcoming.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Plane size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma viagem programada</p>
          </div>
        ) : (
          <div className="space-y-2">{upcoming.map(t => <TravelCard key={t.id} t={t} />)}</div>
        )
      )}

      {activeTab === 'passadas' && (
        past.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Plane size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma viagem passada</p>
          </div>
        ) : (
          <div className="space-y-2">{past.map(t => <TravelCard key={t.id} t={t} />)}</div>
        )
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar Viagem' : 'Nova Viagem'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título / Nome da viagem</label>
              <input type="text" className="input" placeholder="Ex: Viagem a Brasília"
                value={form.title} onChange={e => set('title', e.target.value)} />
            </div>

            <div>
              <label className="label">Destino *</label>
              <input type="text" className="input" placeholder="Para onde vai?"
                value={form.destination} onChange={e => set('destination', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data de ida *</label>
                <input type="date" className="input" value={form.departureDate} onChange={e => set('departureDate', e.target.value)} />
              </div>
              <div>
                <label className="label">Data de volta</label>
                <input type="date" className="input" value={form.returnDate} onChange={e => set('returnDate', e.target.value)} />
              </div>
            </div>

            {/* Route fields */}
            <div>
              <label className="label">Rota</label>
              <div className="space-y-2">
                <input type="text" className="input" placeholder="Saída (cidade de origem)"
                  value={form.routeOrigin} onChange={e => set('routeOrigin', e.target.value)} />
                <input type="text" className="input" placeholder="Paradas intermediárias (opcional)"
                  value={form.routeStops} onChange={e => set('routeStops', e.target.value)} />
                <p className="text-xs text-stone-400 flex items-center gap-1">
                  <ArrowRight size={10} /> O destino final já é preenchido automaticamente pelo campo acima
                </p>
              </div>
            </div>

            <div>
              <label className="label">Com quem vai</label>
              <input type="text" className="input" placeholder="Nomes dos acompanhantes..."
                value={form.companions} onChange={e => set('companions', e.target.value)} />
            </div>

            <div>
              <label className="label">Vagas disponíveis?</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => set('hasVacancies', false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${!form.hasVacancies ? 'bg-indigo-100 border-indigo-400 border text-indigo-700' : 'bg-white border border-stone-200 text-stone-500'}`}>
                  Vagas abertas / sem limite
                </button>
                <button type="button" onClick={() => set('hasVacancies', true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${form.hasVacancies ? 'bg-indigo-100 border-indigo-400 border text-indigo-700' : 'bg-white border border-stone-200 text-stone-500'}`}>
                  Número limitado
                </button>
              </div>
              {form.hasVacancies && (
                <input type="number" className="input" placeholder="Quantas vagas?" min="1"
                  value={form.vacancies} onChange={e => set('vacancies', e.target.value)} />
              )}
            </div>

            <div>
              <label className="label">Observações</label>
              <textarea className="input min-h-[70px] resize-none" placeholder="Informações adicionais..."
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.destination || !form.departureDate} className="btn-primary flex-1 justify-center">
                {loading ? 'Salvando...' : 'Salvar Viagem'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
