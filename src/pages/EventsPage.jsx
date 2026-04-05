import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, orderBy, query, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  format, isPast, isSameDay, isToday, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, addMonths, subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Calendar, MapPin, Users, Check, Clock,
  ChevronLeft, ChevronRight, List, CalendarDays, X,
  Plane, ArrowRight, UserCheck, AlertCircle
} from 'lucide-react';
import Modal from '../components/Modal';

const CATEGORIES = ['Reunião', 'Workshop', 'Treinamento', 'Celebração', 'Externo', 'Viagem', 'Outro'];

const CATEGORY_COLORS = {
  'Reunião':     'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Workshop':    'bg-violet-100 text-violet-700 border-violet-200',
  'Treinamento': 'bg-sky-100 text-sky-700 border-sky-200',
  'Celebração':  'bg-pink-100 text-pink-700 border-pink-200',
  'Externo':     'bg-amber-100 text-amber-700 border-amber-200',
  'Viagem':      'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Outro':       'bg-stone-100 text-stone-600 border-stone-200',
};

const CATEGORY_DOT = {
  'Reunião':     'bg-indigo-500',
  'Workshop':    'bg-violet-500',
  'Treinamento': 'bg-sky-500',
  'Celebração':  'bg-pink-500',
  'Externo':     'bg-amber-500',
  'Viagem':      'bg-emerald-500',
  'Outro':       'bg-stone-400',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const emptyForm = () => ({
  title: '', description: '', date: '', location: '', category: 'Reunião',
  // travel fields
  isTravel: false,
  travelDestination: '',
  travelDepartureDate: '',
  travelDepartureTime: '',
  travelReturnDate: '',
  travelReturnTime: '',
  travelCompanions: '',
  travelRoute: '',
  travelHasVacancies: false,
  travelVacancies: '',
});

export default function EventsPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const blanks = Array(startPad).fill(null);

  const getEventsForDay = (day) => events.filter(e => isSameDay(new Date(e.date), day));
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const openCreate = (day = null) => {
    const f = emptyForm();
    if (day) f.date = format(day, "yyyy-MM-dd'T'09:00");
    setForm(f);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...form,
        isTravel: form.category === 'Viagem',
        creatorId: user.uid,
        creatorName: profile?.name,
        confirmedUsers: [],
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      if (form.date) setSelectedDay(new Date(form.date));
    } finally { setLoading(false); }
  };

  const toggleConfirm = async (ev, e) => {
    e.stopPropagation();
    const ref = doc(db, 'events', ev.id);
    const confirmed = ev.confirmedUsers?.includes(user.uid);
    await updateDoc(ref, {
      confirmedUsers: confirmed ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const upcoming = events.filter(e => !isPast(new Date(e.date)));
  const past = events.filter(e => isPast(new Date(e.date)));

  /* ── TRAVEL CARD ── */
  const TravelCard = ({ ev, compact = false }) => {
    const confirmed = ev.confirmedUsers?.includes(user.uid);
    const isOver = isPast(new Date(ev.date));
    const vacancyCount = parseInt(ev.travelVacancies) || 0;
    const confirmedCount = ev.confirmedUsers?.length || 0;
    const spotsLeft = ev.travelHasVacancies ? vacancyCount - confirmedCount : null;

    return (
      <div className={`card border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white ${compact ? 'p-3' : ''}`}>
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
              <Plane size={14} className="text-emerald-600" />
            </div>
            <div>
              <h3 className={`font-semibold text-stone-800 ${compact ? 'text-sm' : ''}`}>{ev.title}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                Viagem
              </span>
            </div>
          </div>
          {ev.travelHasVacancies && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${spotsLeft > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              <UserCheck size={11} />
              {spotsLeft > 0 ? `${spotsLeft} vagas` : 'Lotado'}
            </div>
          )}
          {!ev.travelHasVacancies && (
            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-1 rounded-lg">Vagas abertas</span>
          )}
        </div>

        {!compact && (
          <div className="space-y-2 mb-3">
            {ev.travelDestination && (
              <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <MapPin size={13} className="text-emerald-500" />
                Destino: <span className="text-emerald-700 font-semibold">{ev.travelDestination}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {ev.travelDepartureDate && (
                <div className="bg-stone-50 rounded-lg p-2 border border-stone-100">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Ida</p>
                  <p className="text-xs font-medium text-stone-700">
                    {format(new Date(ev.travelDepartureDate), "d MMM", { locale: ptBR })}
                    {ev.travelDepartureTime && ` às ${ev.travelDepartureTime}`}
                  </p>
                </div>
              )}
              {ev.travelReturnDate && (
                <div className="bg-stone-50 rounded-lg p-2 border border-stone-100">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Volta</p>
                  <p className="text-xs font-medium text-stone-700">
                    {format(new Date(ev.travelReturnDate), "d MMM", { locale: ptBR })}
                    {ev.travelReturnTime && ` às ${ev.travelReturnTime}`}
                  </p>
                </div>
              )}
            </div>
            {ev.travelRoute && (
              <div className="flex items-start gap-2 text-xs text-stone-500">
                <ArrowRight size={12} className="mt-0.5 flex-shrink-0 text-stone-400" />
                <span>Rota: {ev.travelRoute}</span>
              </div>
            )}
            {ev.travelCompanions && (
              <div className="flex items-start gap-2 text-xs text-stone-500">
                <Users size={12} className="mt-0.5 flex-shrink-0 text-stone-400" />
                <span>Com: {ev.travelCompanions}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <UserCheck size={11} /> {confirmedCount} confirmados
            </div>
          </div>
        )}

        {!isOver && (
          <button onClick={(e) => toggleConfirm(ev, e)}
            className={confirmed
              ? 'flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100 transition-colors'
              : 'flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors'
            }>
            {confirmed ? <><Check size={11} /> Confirmado</> : 'Confirmar presença'}
          </button>
        )}
        {!compact && <p className="text-xs text-stone-300 mt-2">por {ev.creatorName}</p>}
      </div>
    );
  };

  /* ── REGULAR EVENT CARD ── */
  const EventCard = ({ ev, compact = false }) => {
    if (ev.isTravel || ev.category === 'Viagem') return <TravelCard ev={ev} compact={compact} />;
    const confirmed = ev.confirmedUsers?.includes(user.uid);
    const isOver = isPast(new Date(ev.date));
    const catClass = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS['Outro'];

    return (
      <div className={`card-hover ${compact ? 'p-3' : ''}`}>
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className={`font-semibold text-stone-800 ${compact ? 'text-sm' : ''}`}>{ev.title}</h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${catClass}`}>
            {ev.category}
          </span>
        </div>
        {!compact && ev.description && (
          <p className="text-sm text-stone-500 mb-3 line-clamp-2">{ev.description}</p>
        )}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Clock size={11} />
            {format(new Date(ev.date), compact ? 'HH:mm' : "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </div>
          {ev.location && !compact && (
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <MapPin size={11} /> {ev.location}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Users size={11} /> {ev.confirmedUsers?.length || 0} confirmados
          </div>
        </div>
        {!isOver && (
          <button onClick={(e) => toggleConfirm(ev, e)}
            className={confirmed
              ? 'flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100 transition-colors'
              : 'flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors'
            }>
            {confirmed ? <><Check size={11} /> Confirmado</> : 'Confirmar presença'}
          </button>
        )}
        {!compact && <p className="text-xs text-stone-300 mt-2">por {ev.creatorName}</p>}
      </div>
    );
  };

  /* ── RENDER ── */
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Eventos</h1>
          <p className="text-stone-400 text-sm">{upcoming.length} próximos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
            <button onClick={() => setView('calendar')}
              className={`p-1.5 rounded-lg transition-all ${view === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400 hover:text-stone-600'}`}>
              <CalendarDays size={15} />
            </button>
            <button onClick={() => setView('list')}
              className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400 hover:text-stone-600'}`}>
              <List size={15} />
            </button>
          </div>
          <button onClick={() => openCreate()} className="btn-primary">
            <Plus size={16} /> Criar
          </button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="btn-secondary p-2 text-stone-400">
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm font-display font-semibold text-stone-800 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="btn-secondary p-2 text-stone-400">
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="grid grid-cols-7 px-3 pt-3">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-stone-400 pb-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 px-3 pb-3">
              {blanks.map((_, i) => <div key={`b-${i}`} />)}
              {days.map(day => {
                const dayEvts = getEventsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const today = isToday(day);
                return (
                  <button key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    onDoubleClick={() => openCreate(day)}
                    title="Clique para ver · Duplo-clique para criar"
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 text-sm transition-all group
                      ${today ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200' : ''}
                      ${isSelected && !today ? 'bg-indigo-50 border-2 border-indigo-400 text-indigo-700 font-semibold' : ''}
                      ${!today && !isSelected ? 'hover:bg-stone-50 text-stone-700' : ''}`}>
                    <span className="text-[13px] leading-none">{format(day, 'd')}</span>
                    {dayEvts.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-0.5">
                        {dayEvts.slice(0, 3).map((ev, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${today ? 'bg-white/70' : (CATEGORY_DOT[ev.category] || 'bg-stone-400')}`} />
                        ))}
                      </div>
                    )}
                    {!today && dayEvts.length === 0 && (
                      <span className="absolute bottom-0.5 right-1 text-[9px] text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity font-bold">+</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-t border-stone-100 flex-wrap">
              {Object.entries(CATEGORY_DOT).slice(0, 5).map(([cat, dot]) => (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-stone-400">
                  <div className={`w-2 h-2 rounded-full ${dot}`} /> {cat}
                </div>
              ))}
            </div>
          </div>

          {selectedDay && (
            <div className="card animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-stone-800">
                  {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => openCreate(selectedDay)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 font-medium transition-colors">
                    <Plus size={12} /> Novo evento
                  </button>
                  <button onClick={() => setSelectedDay(null)} className="text-stone-300 hover:text-stone-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar size={28} className="mx-auto text-stone-200 mb-2" />
                  <p className="text-stone-400 text-sm">Nenhum evento neste dia</p>
                  <button onClick={() => openCreate(selectedDay)} className="mt-3 text-xs text-indigo-500 hover:text-indigo-600 font-medium">
                    + Criar evento neste dia
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(ev => <EventCard key={ev.id} ev={ev} compact />)}
                </div>
              )}
            </div>
          )}

          {!selectedDay && (
            <div className="space-y-2">
              {events.filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
              }).map(ev => (
                <div key={ev.id} onClick={() => setSelectedDay(new Date(ev.date))}
                  className="flex items-center gap-3 card-hover py-3 cursor-pointer">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${CATEGORY_COLORS[ev.category] || CATEGORY_COLORS['Outro']}`}>
                    {ev.category === 'Viagem' ? <Plane size={14} /> : format(new Date(ev.date), 'd')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{ev.title}</p>
                    <p className="text-xs text-stone-400">
                      {ev.category === 'Viagem'
                        ? `✈️ ${ev.travelDestination || 'Destino não informado'}`
                        : format(new Date(ev.date), "HH:mm · EEEE", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-stone-400">
                    <Users size={11} /> {ev.confirmedUsers?.length || 0}
                  </div>
                </div>
              ))}
              {events.filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
              }).length === 0 && (
                <div className="text-center py-8 text-stone-400">
                  <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum evento neste mês</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          {upcoming.length > 0 && (
            <>
              <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider">Próximos</p>
              <div className="space-y-2">{upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}</div>
            </>
          )}
          {past.length > 0 && (
            <>
              <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mt-4">Passados</p>
              <div className="space-y-2 opacity-60">{past.slice(0, 5).map(ev => <EventCard key={ev.id} ev={ev} />)}</div>
            </>
          )}
          {events.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum evento criado ainda</p>
            </div>
          )}
        </>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <Modal title="Novo Evento" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Categoria</label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => set('category', c)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1
                      ${form.category === c ? `${CATEGORY_COLORS[c]} border font-semibold` : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                    {c === 'Viagem' && <Plane size={10} />}
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Título *</label>
              <input type="text" className="input" placeholder="Nome do evento" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
            </div>

            {/* TRAVEL FIELDS */}
            {form.category === 'Viagem' ? (
              <>
                <div>
                  <label className="label">Destino *</label>
                  <input type="text" className="input" placeholder="Para onde vai?" value={form.travelDestination} onChange={e => set('travelDestination', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Data de ida</label>
                    <input type="date" className="input" value={form.travelDepartureDate} onChange={e => set('travelDepartureDate', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Horário de ida</label>
                    <input type="time" className="input" value={form.travelDepartureTime} onChange={e => set('travelDepartureTime', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Data de volta</label>
                    <input type="date" className="input" value={form.travelReturnDate} onChange={e => set('travelReturnDate', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Horário de volta</label>
                    <input type="time" className="input" value={form.travelReturnTime} onChange={e => set('travelReturnTime', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Com quem vai</label>
                  <input type="text" className="input" placeholder="Nomes dos acompanhantes..." value={form.travelCompanions} onChange={e => set('travelCompanions', e.target.value)} />
                </div>
                <div>
                  <label className="label">Rota</label>
                  <input type="text" className="input" placeholder="Ex: Goianésia → Brasília → Goiânia" value={form.travelRoute} onChange={e => set('travelRoute', e.target.value)} />
                </div>
                <div>
                  <label className="label">Vagas disponíveis?</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => set('travelHasVacancies', false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${!form.travelHasVacancies ? 'bg-indigo-100 border-indigo-400 border text-indigo-700' : 'bg-white border border-stone-200 text-stone-500'}`}>
                      Vagas abertas / sem limite
                    </button>
                    <button type="button" onClick={() => set('travelHasVacancies', true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${form.travelHasVacancies ? 'bg-indigo-100 border-indigo-400 border text-indigo-700' : 'bg-white border border-stone-200 text-stone-500'}`}>
                      Número limitado
                    </button>
                  </div>
                  {form.travelHasVacancies && (
                    <input type="number" className="input mt-2" placeholder="Quantas vagas?" min="1"
                      value={form.travelVacancies} onChange={e => set('travelVacancies', e.target.value)} />
                  )}
                </div>
                <div>
                  <label className="label">Observações</label>
                  <textarea className="input min-h-[60px] resize-none" placeholder="Informações adicionais..."
                    value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                {/* hidden date for firestore ordering */}
                <input type="hidden" value={form.date} />
                {!form.date && form.travelDepartureDate && (() => { if (!form.date) set('date', form.travelDepartureDate + 'T08:00'); return null; })()}
              </>
            ) : (
              /* REGULAR EVENT FIELDS */
              <>
                <div>
                  <label className="label">Descrição</label>
                  <textarea className="input min-h-[70px] resize-none" placeholder="Detalhes do evento..."
                    value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Data e hora *</label>
                    <input type="datetime-local" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Local</label>
                  <input type="text" className="input" placeholder="Onde será o evento?" value={form.location} onChange={e => set('location', e.target.value)} />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button
                onClick={() => {
                  // For travel, auto-set date from departure
                  if (form.category === 'Viagem' && !form.date && form.travelDepartureDate) {
                    setForm(f => ({ ...f, date: f.travelDepartureDate + 'T08:00' }));
                    setTimeout(handleCreate, 0);
                  } else {
                    handleCreate();
                  }
                }}
                disabled={loading || !form.title || (!form.date && !form.travelDepartureDate)}
                className="btn-primary flex-1 justify-center">
                {loading ? 'Criando...' : 'Criar Evento'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
