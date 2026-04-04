import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, isToday, isSameMonth, differenceInYears, parseISO, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Calendar, Target, Cake, ChevronRight, Bell } from 'lucide-react';
import LocationWidget from '../components/LocationWidget';

export default function HomePage() {
  const { profile } = useAuth();
  const [birthdays, setBirthdays] = useState([]);
  const [events, setEvents] = useState([]);
  const [goals, setGoals] = useState([]);
  const today = new Date();

  useEffect(() => {
    // Load users for birthdays
    const loadBirthdays = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(d => d.data());
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      
      const bdays = users
        .filter(u => {
          if (!u.birthDate) return false;
          const [y, m, d] = u.birthDate.split('-').map(Number);
          return m === todayMonth || (m === todayMonth && d >= todayDay);
        })
        .map(u => {
          const [y, m, d] = u.birthDate.split('-').map(Number);
          const age = differenceInYears(today, new Date(y, m - 1, d));
          const isToday_ = m === todayMonth && d === todayDay;
          return { ...u, age: age + (isToday_ ? 0 : 1), isToday: isToday_, bdDay: d, bdMonth: m };
        })
        .sort((a, b) => {
          if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
          return a.bdDay - b.bdDay;
        })
        .slice(0, 5);
      setBirthdays(bdays);
    };

    // Load upcoming events
    const q = query(collection(db, 'events'), orderBy('date', 'asc'), limit(5));
    const unsubEvents = onSnapshot(q, snap => {
      const evts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => isAfter(new Date(e.date), startOfDay(today)));
      setEvents(evts.slice(0, 3));
    });

    // Load goals
    const qg = query(collection(db, 'goals'), where('status', '!=', 'concluído'), limit(3));
    const unsubGoals = onSnapshot(qg, snap => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    loadBirthdays();
    return () => { unsubEvents(); unsubGoals(); };
  }, []);

  const hour = today.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-slate-400 text-sm">{greeting},</p>
        <h1 className="font-display font-bold text-2xl text-white">
          {profile?.emoji} {profile?.name?.split(' ')[0] || 'Usuário'}
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">{format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </div>

      {/* Location Widget */}
      <LocationWidget />

      {/* Birthdays */}
      {birthdays.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Cake size={18} className="text-pink-400" />
            <h3 className="font-display font-semibold text-slate-100">Aniversários</h3>
          </div>
          <div className="space-y-2">
            {birthdays.map(b => (
              <div key={b.uid} className="flex items-center gap-3 py-1.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${b.isToday ? 'bg-pink-500/20 border border-pink-500/30' : 'bg-slate-800'}`}>
                  {b.emoji || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.isToday ? `🎂 Hoje! ${b.age} anos` : `${b.bdDay}/${b.bdMonth} · ${b.age} anos`}</p>
                </div>
                {b.isToday && <span className="badge-purple">Hoje!</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary-400" />
            <h3 className="font-display font-semibold text-slate-100">Próximos Eventos</h3>
          </div>
          <Link to="/events" className="text-primary-400 text-xs flex items-center gap-1 hover:text-primary-300">
            Ver todos <ChevronRight size={14} />
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Nenhum evento próximo</p>
        ) : (
          <div className="space-y-2">
            {events.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm font-bold text-primary-300 flex-shrink-0">
                  {format(new Date(ev.date), 'd')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{ev.title}</p>
                  <p className="text-xs text-slate-500">{format(new Date(ev.date), "HH:mm · d MMM", { locale: ptBR })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goals in progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-emerald-400" />
            <h3 className="font-display font-semibold text-slate-100">Metas em Andamento</h3>
          </div>
          <Link to="/goals" className="text-primary-400 text-xs flex items-center gap-1 hover:text-primary-300">
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>
        {goals.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Nenhuma meta pendente</p>
        ) : (
          <div className="space-y-3">
            {goals.map(g => (
              <div key={g.id}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-slate-100 truncate flex-1 mr-2">{g.title}</p>
                  <span className={`badge text-xs ${g.status === 'em andamento' ? 'badge-blue' : 'badge-yellow'}`}>{g.status}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-accent-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${g.progress || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
