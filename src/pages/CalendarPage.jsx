import { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, getDay, addMonths, subMonths
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
  const startPad = getDay(monthStart);
  const blanks = Array(startPad).fill(null);

  const getEventsForDay = (day) =>
    events.filter(e => isSameDay(new Date(e.date), day));

  const getBirthdaysForDay = (day) =>
    users.filter(u => {
      const [y, m, d] = u.birthDate.split('-').map(Number);
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
          <span className="text-sm font-semibold text-slate-200 min-w-[110px] text-center capitalize">
            {format(current, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={() => setCurrent(d => addMonths(d, 1))} className="btn-secondary p-2">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const dayBdays = getBirthdaysForDay(day);
            const hasItems = dayEvents.length > 0 || dayBdays.length > 0;
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                  ${today ? 'bg-primary-600 text-white font-bold' : ''}
                  ${isSelected && !today ? 'bg-primary-500/20 border border-primary-500 text-primary-300' : ''}
                  ${!today && !isSelected ? 'hover:bg-slate-800 text-slate-300' : ''}
                `}
              >
                <span>{format(day, 'd')}</span>
                {hasItems && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.length > 0 && <div className="w-1 h-1 rounded-full bg-primary-400" />}
                    {dayBdays.length > 0 && <div className="w-1 h-1 rounded-full bg-pink-400" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-primary-400" /> Eventos
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-pink-400" /> Aniversários
          </div>
        </div>
      </div>

      {/* Selected day details */}
      {selectedDay && (selectedEvents.length > 0 || selectedBirthdays.length > 0) && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold text-slate-100 mb-3">
            {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
          </h3>

          {selectedEvents.map(ev => (
            <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
                <Calendar size={14} className="text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-100">{ev.title}</p>
                <p className="text-xs text-slate-500">{format(new Date(ev.date), 'HH:mm')} · {ev.location || 'Sem local'}</p>
              </div>
            </div>
          ))}

          {selectedBirthdays.map(u => (
            <div key={u.uid} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                <Cake size={14} className="text-pink-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-100">{u.name}</p>
                <p className="text-xs text-slate-500">🎂 Aniversário · {u.department}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDay && selectedEvents.length === 0 && selectedBirthdays.length === 0 && (
        <div className="card text-center py-6">
          <p className="text-slate-500 text-sm">Nenhum evento neste dia</p>
        </div>
      )}
    </div>
  );
}
