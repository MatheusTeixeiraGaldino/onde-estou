import { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, getDay, addMonths, subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Cake } from 'lucide-react';

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'events'), snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    getDocs(collection(db, 'users')).then(snap => {
      setUsers(snap.docs.map(d => d.data()).filter(u => u.birthDate));
    });
    return unsub;
  }, []);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const blanks = Array(getDay(monthStart)).fill(null);

  const getEventsForDay = (day) => events.filter(e => isSameDay(new Date(e.date), day));
  const getBirthdaysForDay = (day) => users.filter(u => {
    const [, m, d] = u.birthDate.split('-').map(Number);
    return m === day.getMonth() + 1 && d === day.getDate();
  });

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selectedBirthdays = selectedDay ? getBirthdaysForDay(selectedDay) : [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Calendário</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(d => subMonths(d, 1))} className="btn-secondary p-2">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-stone-700 min-w-[110px] text-center capitalize">
            {format(current, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={() => setCurrent(d => addMonths(d, 1))} className="btn-secondary p-2">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="card p-3">
        <div className="grid grid-cols-7 mb-2">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-stone-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const dayBdays = getBirthdaysForDay(day);
            const hasItems = dayEvents.length > 0 || dayBdays.length > 0;
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);

            return (
              <button key={day.toISOString()} onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                  ${today ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200' : ''}
                  ${isSelected && !today ? 'bg-indigo-100 border border-indigo-400 text-indigo-700 font-semibold' : ''}
                  ${!today && !isSelected ? 'hover:bg-stone-50 text-stone-700' : ''}`}>
                <span>{format(day, 'd')}</span>
                {hasItems && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.length > 0 && <div className={`w-1 h-1 rounded-full ${today ? 'bg-white/70' : 'bg-indigo-500'}`} />}
                    {dayBdays.length > 0 && <div className={`w-1 h-1 rounded-full ${today ? 'bg-white/70' : 'bg-pink-400'}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <div className="w-2 h-2 rounded-full bg-indigo-500" /> Eventos
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <div className="w-2 h-2 rounded-full bg-pink-400" /> Aniversários
          </div>
        </div>
      </div>

      {selectedDay && (selectedEvents.length > 0 || selectedBirthdays.length > 0) && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold text-stone-800 mb-3">
            {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
          </h3>
          {selectedEvents.map(ev => (
            <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                <Calendar size={14} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">{ev.title}</p>
                <p className="text-xs text-stone-400">{format(new Date(ev.date), 'HH:mm')} · {ev.location || 'Sem local'}</p>
              </div>
            </div>
          ))}
          {selectedBirthdays.map(u => (
            <div key={u.uid} className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-pink-100 border border-pink-200 flex items-center justify-center flex-shrink-0">
                <Cake size={14} className="text-pink-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">{u.name}</p>
                <p className="text-xs text-stone-400">🎂 Aniversário · {u.department}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDay && selectedEvents.length === 0 && selectedBirthdays.length === 0 && (
        <div className="card text-center py-6">
          <p className="text-stone-400 text-sm">Nenhum evento neste dia</p>
        </div>
      )}
    </div>
  );
}
