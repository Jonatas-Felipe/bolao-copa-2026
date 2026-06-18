import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MatchCard from './MatchCard';
import { Match, Guess } from '../types';
import { fetchAllMatches, fetchMyGuesses } from '../services/api';

interface DashboardProps {
  userId: string;
}

export default function Dashboard({ userId }: DashboardProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                  return (
                    <MatchCard 
                      key={match.id} 
                      match={match} 
                      guess={guess}
                      onSaveGuess={handleSaveGuess}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
