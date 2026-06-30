import { Trophy, Calendar, LogOut, LayoutGrid, Swords } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: User;
  view: 'dashboard' | 'groups' | 'bracket' | 'ranking';
  setView: (view: 'dashboard' | 'groups' | 'bracket' | 'ranking') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, view, setView, onLogout, children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="sticky top-0 z-50">
        <header className="bg-br-green shadow-md">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-br-yellow fill-br-yellow" />
              <span className="font-display font-bold text-white text-lg tracking-tight">
                Bolão <span className="text-br-yellow">Copa 26</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-white/90 text-sm">
                Olá, <span className="font-semibold text-white">{user.name}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-br-yellow flex items-center justify-center text-br-green font-bold shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button 
                onClick={onLogout}
                className="ml-2 p-2 hover:bg-br-green-dark rounded-full transition-colors text-white"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex">
          <button
            onClick={() => setView('dashboard')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5",
              view === 'dashboard' 
                ? "border-br-green text-br-green" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Palpites</span>
          </button>
          <button
            onClick={() => setView('groups')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5",
              view === 'groups' 
                ? "border-br-blue text-br-blue" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grupos</span>
          </button>
          <button
            onClick={() => setView('bracket')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5",
              view === 'bracket' 
                ? "border-br-green text-br-green" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <Swords className="w-4 h-4" />
            <span className="hidden sm:inline">Chave</span>
          </button>
          <button
            onClick={() => setView('ranking')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5",
              view === 'ranking' 
                ? "border-br-blue text-br-blue" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Ranking</span>
          </button>
        </div>
        </nav>
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
