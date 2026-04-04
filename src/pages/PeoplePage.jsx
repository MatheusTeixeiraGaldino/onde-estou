import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, MapPin, Building2, Shield } from 'lucide-react';

const ROLE_BADGE = {
  admin: 'badge-purple',
  gestor: 'badge-blue',
  colaborador: 'badge-green',
};

const ROLE_LABEL = { admin: 'Admin', gestor: 'Gestor', colaborador: 'Colaborador' };

export default function PeoplePage() {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
      setLoading(false);

      // Load current location for each user
      const locs = {};
      for (const u of list) {
        const q = query(
          collection(db, 'locations'),
          where('userId', '==', u.uid || u.id),
          orderBy('start', 'desc'),
          limit(1)
        );
        const locSnap = await getDocs(q);
        if (!locSnap.empty) {
          const data = locSnap.docs[0].data();
          const now = new Date();
          const endDate = data.end ? new Date(data.end) : null;
          if (!endDate || endDate > now) {
            locs[u.uid || u.id] = data.location;
          }
        }
      }
      setLocations(locs);
    });
    return unsub;
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-header">Pessoas</h1>
        <p className="text-slate-400 text-sm">{users.length} colaboradores</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Buscar por nome ou departamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-500">Nenhuma pessoa encontrada</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const uid = u.uid || u.id;
            const loc = locations[uid];
            return (
              <div key={uid} className="card-hover">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                    {u.emoji || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-100">{u.name}</p>
                      <span className={`badge text-[10px] ${ROLE_BADGE[u.role] || 'badge-green'}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Building2 size={11} /> {u.department}
                      </span>
                      {loc && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <MapPin size={11} /> {loc}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
