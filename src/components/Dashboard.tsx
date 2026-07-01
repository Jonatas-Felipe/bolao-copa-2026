import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target } from 'lucide-react';
import MatchCard from './MatchCard';
import { Match, Guess } from '../types';
import { fetchAllMatches, fetchMyGuesses } from '../services/api';
import {
  connectRealtime,
  disconnectRealtime,
  subscribeMatchesUpdated,
} from '../services/realtime';

interface DashboardProps {
  userId: string;
  onTeamClick: (name: string, flag: string) => void;
}

export default function Dashboard({ userId, onTeamClick }: DashboardProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const refetchMatches = async () => {
    try {
      const allMatches = await fetchAllMatches({ limit: 50 });
      setMatches(allMatches);
      setNow(Date.now());
    } catch {
      setError('Erro ao atualizar jogos em tempo real.');
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [allMatches, guessesRes] = await Promise.all([
          fetchAllMatches({ limit: 50 }),
          fetchMyGuesses(),
        ]);
        setMatches(allMatches);
        setGuesses(
          guessesRes.data.map((g) => ({
            matchId: g.matchId,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
          }))
        );
      } catch {
        setError('Erro ao carregar jogos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    connectRealtime();

    const unsubscribe = subscribeMatchesUpdated(() => {
      refetchMatches();
    });

    return () => {
      unsubscribe();
      disconnectRealtime();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  // ── Auto-scroll para jogo ao vivo / próximo ──────────────────────────────────────────────

  const targetMatch = useMemo(() => {
    if (matches.length === 0) return null;

    // 1. Jogo ao vivo
    const liveMatch = matches.find(m => !m.finished && m.timeElapsed !== 'notstarted');
    if (liveMatch) return { match: liveMatch, type: 'live' as const };

    // 2. Próximo jogo (data mais próxima)
    const upcoming = matches
      .filter(m => !m.finished && m.timeElapsed === 'notstarted')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (upcoming.length > 0) return { match: upcoming[0], type: 'next' as const };

    // 3. Último jogo finalizado
    const finished = matches
      .filter(m => m.finished)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    if (finished.length > 0) return { match: finished[0], type: 'last' as const };

    return null;
  }, [matches]);

  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (!targetMatch || loading || initialScrollDone.current) return;
    initialScrollDone.current = true;

    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-match-id="${targetMatch.match.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);

    return () => clearTimeout(timer);
  }, [targetMatch, loading]);

  const handleScrollToTarget = () => {
    if (!targetMatch) return;
    const el = document.querySelector(`[data-match-id="${targetMatch.match.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSaveGuess = (guess: Guess) => {
    setGuesses(prev => {
      const idx = prev.findIndex(g => g.matchId === guess.matchId);
      if (idx !== -1) {
        const newGuesses = [...prev];
        newGuesses[idx] = guess;
        return newGuesses;
      }
      return [...prev, guess];
    });
  };

  // Group matches by date (YYYY-MM-DD)
  const groupedMatches: Record<string, Match[]> = {};
  
  matches.forEach(match => {
    const dateKey = format(match.date, 'yyyy-MM-dd');
    if (!groupedMatches[dateKey]) {
      groupedMatches[dateKey] = [];
    }
    groupedMatches[dateKey].push(match);
  });

  // Sort dates
  const sortedDates = Object.keys(groupedMatches).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Meus Palpites</h2>
        <p className="text-gray-500 text-sm">Insira seus resultados. Apostas fecham 30 minutos antes do jogo.</p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-br-green rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
      <div className="space-y-8">
        {sortedDates.map(dateKey => {
          const dateMatches = groupedMatches[dateKey];
          const dateObj = new Date(dateKey + 'T12:00:00');
          const displayDate = format(dateObj, "d 'de' MMMM, yyyy", { locale: ptBR });
          const dayOfWeek = format(dateObj, "EEEE", { locale: ptBR });
          
          return (
            <div key={dateKey}>
              <div className="mb-4 flex items-baseline gap-2">
                <h3 className="font-bold text-lg text-gray-800 capitalize">{displayDate}</h3>
                <span className="text-sm text-gray-500 capitalize">({dayOfWeek})</span>
              </div>
              <div className="space-y-3">
                {dateMatches.map(match => {
                  const guess = guesses.find(g => g.matchId === match.id);
                  const badge = targetMatch?.match.id === match.id
                    ? (targetMatch.type === 'live' ? 'live' as const : targetMatch.type === 'next' ? 'next' as const : undefined)
                    : undefined;
                  return (
                    <div key={match.id} data-match-id={match.id}>
                      <MatchCard 
                        match={match} 
                        guess={guess}
                        onSaveGuess={handleSaveGuess}
                        now={now}
                        badge={badge}
                        onTeamClick={onTeamClick}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {targetMatch && targetMatch.type !== 'last' && (
        <button
          onClick={handleScrollToTarget}
          className="fixed bottom-6 right-6 z-40 bg-br-green text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center hover:bg-br-green-dark transition-colors active:scale-95"
          title={targetMatch.type === 'live' ? 'Ir para jogo ao vivo' : 'Ir para próximo jogo'}
        >
          <Target className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
