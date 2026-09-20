import { Home, Calendar, Trophy, User, Utensils, Bike } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'history', label: 'Historial', icon: Calendar },
    { id: 'diet', label: 'Dieta', icon: Utensils },
    { id: 'activity', label: 'Clase', icon: Bike },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 border-t border-neutral-800 backdrop-blur-md pb-safe z-40">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-16 h-full ${
                isActive ? 'text-lime-400 font-medium' : 'text-neutral-400'
              }`}>
              <Icon size={20} />
              <span className="text-[10px] mt-1 uppercase font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
