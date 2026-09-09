import { Home, Calendar, Trophy, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'history', label: 'Historial', icon: Calendar },
    { id: 'stats', label: 'Progreso', icon: Trophy },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <nav 
      id="bottom-nav"
      className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 border-t border-neutral-800 backdrop-blur-md pb-safe z-40 select-none shadow-lg shadow-black/50"
    >
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-20 h-full transition-all duration-200 relative ${
                isActive ? 'text-lime-400 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              style={{ minHeight: '48px', minWidth: '48px' }}
            >
              <div className="relative flex items-center justify-center">
                <Icon size={20} className={`transform transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-lime-400 rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-wide uppercase font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
