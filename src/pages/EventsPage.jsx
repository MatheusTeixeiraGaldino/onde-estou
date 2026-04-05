import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
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
  ExternalLink, Trash2
} from 'lucide-react';
import Modal from '../components/Modal';

const PRESET_CATEGORIES = ['Reunião', 'Workshop', 'Treinamento', 'Celebração', 'Externo', 'Outro'];

const CATEGORY_COLORS = {
  'Reunião':     'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Workshop':    'bg-violet-100 text-violet-700 border-violet-200',
  'Treinamento': 'bg-sky-100 text-sky-700 border-sky-200',
  'Celebração':  'bg-pink-100 text-pink-700 border-pink-200',
  'Externo':     'bg-amber-100 text-amber-700 border-amber-200',
  'Outro':       'bg-stone-100 text-stone-600 border-stone-200',
};

const CATEGORY_DOT = {
  'Reunião':     'bg-indigo-500',
  'Workshop':    'bg-violet-500',
  'Treinamento': 'bg-sky-500',
  'Celebração':  'bg-pink-500',
  'Externo':     'bg-amber-500',
  'Outro':       'bg-stone-400',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function googleCalendarUrl(ev) {
  const start = new Date(ev.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: ev.description || '',
    location: ev.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadICS(ev) {
  const start = new Date(ev.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OndeEstou//PT',
    'BEGIN:VEVENT',
    `UID:${ev.id || Date.now()}@ondeestou`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${ev.location || ''}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ev.title.replace(/\s+/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventsPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', date: '', location: '',
    category: 'Reunião', customCategory: '', responsible: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const blanks = Array(startPad).fill(null);
  const getEventsForDay = (day) => events.filter(e => isSameDay(new Date(e.date), day));
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const openCreate = (day = null) => {
    setForm({
      title: '', description: '',
      date: day ? format(day, "yyyy-MM-dd'T'09:00") : '',
      location: '', category: 'Reunião', customCategory: '', responsible: '',
    });
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    setLoading(true);
    try {
      const finalCategory = form.category === 'Outro' && form.customCategory
        ? form.customCategory : form.category;
      await addDoc(collection(db, 'events'), {
        title: form.title,
        description: form.description,
        date: form.date,
        location: form.location,
        category: finalCategory,
        responsible: form.responsible,
        creatorId: user.uid,
        creatorName: profile?.name,
        confirmedUsers: [],
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      if (form.date) setSelectedDay(new Date(form.date));
    } finally { setLoading(false); }
  };

  const handleDelete = async (ev, e) => {
    e.stopPropagation();
    if (!confirm('Excluir este evento?')) return;
    await deleteDoc(doc(db, 'events', ev.id));
  };

  const toggleConfirm = async (ev, e) => {
    e.stopPropagation();
    const ref = doc(db, 'events', ev.id);
    const confirmed = ev.confirmedUsers?.includes(user.uid);
    await updateDoc(ref, {
      confirmedUsers: confirmed ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const canDelete = (ev) =>
    ev.creatorId === user.uid ||
    (ev.responsible && ev.responsible.toLowerCase().includes(profile?.name?.toLowerCase()));

  const getCatColor = (cat) => CATEGORY_COLORS[cat] || 'bg-stone-100 text-stone-600 border-stone-200';
  const getCatDot = (cat) => CATEGORY_DOT[cat] || 'bg-stone-400';

  const upcoming = events.filter(e => !isPast(new Date(e.date)));
  const past = events.filter(e => isPast(new Date(e.date)));

  const EventCard = ({ ev, compact = false }) => {
    const confirmed = ev.confirmedUsers?.includes(user.uid);
    const isOver = isPast(new Date(ev.date));
    const isExportOpen = showExportMenu === ev.id;
    const canDel = canDelete(ev);

    return (
      <div className={`card-hover ${compact ? 'p-3' : ''}`}>
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className={`font-semibold text-stone-800 ${compact ? 'text-sm' : ''}`}>{ev.title}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCatColor(ev.category)}`}>
              {ev.category}
            </span>
            {canDel && (
              <button onClick={(e) => handleDelete(ev, e)}
                className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={12} />
              </button>
            )}
          </div>
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
          {ev.responsible && !compact && (
            <div className="flex items-center gap-2 text-xs text-stone-400">
              👤 Responsável: {ev.responsible}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Users size={11} /> {ev.confirmedUsers?.length || 0} confirmados
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isOver && (
            <button onClick={(e) => toggleConfirm(ev, e)}
              className={confirmed
                ? 'flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100 transition-colors'
                : 'flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors'
              }>
              {confirmed ? <><Check size={11} /> Confirmado</> : 'Confirmar presença'}
            </button>
          )}

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(isExportOpen ? null : ev.id); }}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-500 bg-stone-100 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-200 transition-colors">
              <ExternalLink size={11} /> Adicionar à agenda
            </button>
            {isExportOpen && (
              <div className="absolute bottom-full left-0 mb-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-20 min-w-[180px]">
                <a href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer"
                  onClick={() => setShowExportMenu(null)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                  <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
                  Google Agenda
                </a>
                <button onClick={() => { downloadICS(ev); setShowExportMenu(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors border-t border-stone-100">
                  <span className="text-base leading-none">📅</span>
                  Outlook / Apple
                </button>
              </div>
            )}
          </div>
        </div>

        {!compact && <p className="text-xs text-stone-300 mt-2">por {ev.creatorName}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in" onClick={() => showExportMenu && setShowExportMenu(null)}>
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

      {view === 'calendar' && (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="btn-secondary p-2"><ChevronLeft size={15} /></button>
              <span className="text-sm font-display font-semibold text-stone-800 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="btn-secondary p-2"><ChevronRight size={15} /></button>
            </div>

            <div className="grid grid-cols-7 px-3 pt-3">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-stone-400 pb-2">{d}</div>)}
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
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 text-sm transition-all group
                      ${today ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200' : ''}
                      ${isSelected && !today ? 'bg-indigo-50 border-2 border-indigo-400 text-indigo-700 font-semibold' : ''}
                      ${!today && !isSelected ? 'hover:bg-stone-50 text-stone-700' : ''}`}>
                    <span className="text-[13px] leading-none">{format(day, 'd')}</span>
                    {dayEvts.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-0.5">
                        {dayEvts.slice(0, 3).map((ev, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${today ? 'bg-white/70' : getCatDot(ev.category)}`} />
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
              {Object.entries(CATEGORY_DOT).map(([cat, dot]) => (
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
                    className="text-xs text-indigo-600 flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 font-medium">
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
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${getCatColor(ev.category)}`}>
                    {format(new Date(ev.date), 'd')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{ev.title}</p>
                    <p className="text-xs text-stone-400">
                      {format(new Date(ev.date), "HH:mm · EEEE", { locale: ptBR })}
                      {ev.location && ` · ${ev.location}`}
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

      {view === 'list' && (
        <>
          {upcoming.length > 0 && (
            <><p className="text-stone-400 text-xs font-semibold uppercase tracking-wider">Próximos</p>
            <div className="space-y-2">{upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}</div></>
          )}
          {past.length > 0 && (
            <><p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mt-4">Passados</p>
            <div className="space-y-2 opacity-60">{past.slice(0, 5).map(ev => <EventCard key={ev.id} ev={ev} />)}</div></>
          )}
          {events.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum evento criado ainda</p>
            </div>
          )}
        </>
      )}

      {showModal && (
        <Modal title="Novo Evento" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input type="text" className="input" placeholder="Nome do evento"
                value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
            </div>

            <div>
              <label className="label">Categoria</label>
              <select className="input appearance-none" value={form.category} onChange={e => set('category', e.target.value)}>
                {PRESET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {form.category === 'Outro' && (
                <input type="text" className="input mt-2" placeholder="Digite a categoria..."
                  value={form.customCategory} onChange={e => set('customCategory', e.target.value)} />
              )}
            </div>

            <div>
              <label className="label">Responsável pelo evento</label>
              <input type="text" className="input" placeholder="Nome do responsável"
                value={form.responsible} onChange={e => set('responsible', e.target.value)} />
            </div>

            <div>
              <label className="label">Descrição</label>
              <textarea className="input min-h-[70px] resize-none" placeholder="Detalhes do evento..."
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div>
              <label className="label">Data e hora *</label>
              <input type="datetime-local" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>

            <div>
              <label className="label">Local</label>
              <input type="text" className="input" placeholder="Onde será o evento?"
                value={form.location} onChange={e => set('location', e.target.value)} />
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
