import { Trophy, Calendar, LogOut } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: User;
  view: 'dashboard' | 'ranking';
  setView: (view: 'dashboard' | 'ranking') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, view, setView, onLogout, children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-br-green sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
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

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 flex">
          <button
            onClick={() => setView('dashboard')}
            className={cn(
              "flex-1 py-4 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2",
              view === 'dashboard' 
                ? "border-br-green text-br-green" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <Calendar className="w-4 h-4" />
            Palpites
          </button>
          <button
            onClick={() => setView('ranking')}
            className={cn(
              "flex-1 py-4 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2",
              view === 'ranking' 
                ? "border-br-blue text-br-blue" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <Trophy className="w-4 h-4" />
            Ranking
          </button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
