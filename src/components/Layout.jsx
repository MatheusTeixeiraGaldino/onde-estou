import { Outlet, NavLink } from 'react-router-dom';
import { Home, Users, Calendar, FileText, BookOpen, User, MapPin } from 'lucide-react';

const navItems = [
  { to: '/',         icon: Home,     label: 'Home' },
  { to: '/people',   icon: Users,    label: 'Pessoas' },
  { to: '/events',   icon: Calendar, label: 'Eventos' },
  { to: '/meetings', icon: FileText, label: 'Atas' },
  { to: '/goals',    icon: BookOpen, label: 'Programas' },
  { to: '/profile',  icon: User,     label: 'Perfil' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200/80 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200">
              <MapPin size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-stone-900 text-lg">Onde Estou</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24 animate-fade-in">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-stone-200/80 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
