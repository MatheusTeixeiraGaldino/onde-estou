import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, differenceInYears, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Calendar, BookOpen, Cake, ChevronRight, Plane, Users, ArrowRight } from 'lucide-react';
import LocationWidget from '../components/LocationWidget';

export default function HomePage() {
  const { profile } = useAuth();
  const [birthdays, setBirthdays] = useState([]);
  const [events, setEvents] = useState([]);
  const [travels, setTravels] = useState([]);
  const [goals, setGoals] = useState([]);
  const today = new Date();

  useEffect(() => {
    const loadBirthdays = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(d => d.data());
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const bdays = users
        .filter(u => { if (!u.birthDate) return false; const [, m] = u.birthDate.split('-').map(Number); return m === todayMonth; })
        .map(u => {
          const [y, m, d] = u.birthDate.split('-').map(Number);
          const age = differenceInYears(today, new Date(y, m - 1, d));
          const isToday_ = m === todayMonth && d === todayDay;
          return { ...u, age: age + (isToday_ ? 0 : 1), isToday: isToday_, bdDay: d, bdMonth: m };
        })
        .sort((a, b) => { if (a.isToday !== b.isToday) return a.isToday ? -1 : 1; return a.bdDay - b.bdDay; })
        .slice(0, 5);
      setBirthdays(bdays);
    };

    const qe = query(collection(db, 'events'), orderBy('date', 'asc'), limit(10));
    const unsubEvents = onSnapshot(qe, snap => {
      const upcoming = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => isAfter(new Date(e.date), startOfDay(today)));
      setEvents(upcoming.slice(0, 3));
    });

    // Travels from separate collection
    const qt = query(collection(db, 'travels'), orderBy('departureDate', 'asc'));
    const unsubTravels = onSnapshot(qt, snap => {
      const upcoming = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(t => !t.returnDate || isAfter(new Date(t.returnDate), startOfDay(today)));
      setTravels(upcoming.slice(0, 3));
    });

    const qg = query(collection(db, 'goals'), where('status', '!=', 'concluído'), limit(3));
    const unsubGoals = onSnapshot(qg, snap => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    loadBirthdays();
    return () => { unsubEvents(); unsubTravels(); unsubGoals(); };
  }, []);

  const hour = today.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="text-stone-400 text-sm">{greeting},</p>
        <h1 className="font-display font-bold text-2xl text-stone-900">
          {profile?.emoji} {profile?.name?.split(' ')[0] || 'Usuário'}
        </h1>
        <p className="text-stone-400 text-xs mt-0.5">
          {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <LocationWidget />

      {/* Viagens Programadas */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plane size={18} className="text-emerald-500" />
            <h3 className="font-display font-semibold text-stone-800">Viagens Programadas</h3>
          </div>
          <Link to="/travels" className="text-indigo-500 text-xs flex items-center gap-1 hover:text-indigo-600 font-medium">
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>
        {travels.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">Nenhuma viagem programada</p>
        ) : (
          <div className="space-y-2">
            {travels.map(t => {
              const confirmedCount = t.confirmedUsers?.length || 0;
              const vacancyCount = parseInt(t.vacancies) || 0;
              const spotsLeft = t.hasVacancies ? vacancyCount - confirmedCount : null;
              return (
                <div key={t.id} className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{t.title || t.destination}</p>
                      {t.destination && t.title && (
                        <p className="text-xs text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {t.destination}
                        </p>
                      )}
                    </div>
                    {t.hasVacancies ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${spotsLeft > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                        {spotsLeft > 0 ? `${spotsLeft} vagas` : 'Lotado'}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 flex-shrink-0">
                        Vagas abertas
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-stone-500">
                    {t.departureDate && (
                      <span>Ida: {format(new Date(t.departureDate), "d MMM", { locale: ptBR })}{t.departureTime && ` ${t.departureTime}`}</span>
                    )}
                    {t.returnDate && (
                      <><ArrowRight size={10} className="text-stone-300" />
                      <span>Volta: {format(new Date(t.returnDate), "d MMM", { locale: ptBR })}{t.returnTime && ` ${t.returnTime}`}</span></>
                    )}
                  </div>
                  {t.companions && (
                    <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                      <Users size={10} /> {t.companions}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aniversários */}
      {birthdays.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Cake size={18} className="text-pink-400" />
            <h3 className="font-display font-semibold text-stone-800">Aniversários</h3>
          </div>
          <div className="space-y-2">
            {birthdays.map(b => (
              <div key={b.uid} className="flex items-center gap-3 py-1.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${b.isToday ? 'bg-pink-100 border border-pink-200' : 'bg-stone-100'}`}>
                  {b.emoji || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{b.name}</p>
                  <p className="text-xs text-stone-400">
                    {b.isToday ? `🎂 Hoje! ${b.age} anos` : `${b.bdDay}/${b.bdMonth} · ${b.age} anos`}
                  </p>
                </div>
                {b.isToday && <span className="badge-purple">Hoje!</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos Eventos */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-indigo-500" />
            <h3 className="font-display font-semibold text-stone-800">Próximos Eventos</h3>
          </div>
          <Link to="/events" className="text-indigo-500 text-xs flex items-center gap-1 hover:text-indigo-600 font-medium">
            Ver todos <ChevronRight size={14} />
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">Nenhum evento próximo</p>
        ) : (
          <div className="space-y-2">
            {events.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                  {format(new Date(ev.date), 'd')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{ev.title}</p>
                  <p className="text-xs text-stone-400">{format(new Date(ev.date), "HH:mm · d MMM", { locale: ptBR })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Programas */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-violet-500" />
            <h3 className="font-display font-semibold text-stone-800">Programas em Andamento</h3>
          </div>
          <Link to="/goals" className="text-indigo-500 text-xs flex items-center gap-1 hover:text-indigo-600 font-medium">
            Ver todos <ChevronRight size={14} />
          </Link>
        </div>
        {goals.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">Nenhum programa pendente</p>
        ) : (
          <div className="space-y-3">
            {goals.map(g => (
              <div key={g.id}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-stone-800 truncate flex-1 mr-2">{g.title}</p>
                  <span className={`badge text-xs ${g.status === 'em andamento' ? 'badge-blue' : 'badge-yellow'}`}>{g.status}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${g.progress || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
