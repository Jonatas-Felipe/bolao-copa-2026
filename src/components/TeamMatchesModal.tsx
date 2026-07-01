import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchAllMatches, fetchMyGuesses } from '../services/api';
import { Match, Guess } from '../types';
import MatchCard from './MatchCard';

interface TeamMatchesModalProps {
  teamName: string;
  teamFlag: string;
  onClose: () => void;
}

export default function TeamMatchesModal({ teamName, teamFlag, onClose }: TeamMatchesModalProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    async function load() {
      try {
        const [allMatches, guessesRes] = await Promise.all([
          fetchAllMatches({ limit: 200 }),
          fetchMyGuesses(),
        ]);
        const teamMatches = allMatches.filter(
          m => m.homeTeam === teamName || m.awayTeam === teamName,
        );
        setMatches(teamMatches);
        setGuesses(
          guessesRes.data.map(g => ({
            matchId: g.matchId,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
          })),
        );
      } catch {}
      setLoading(false);
    }
    load();
  }, [teamName]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveGuess = (guess: Guess) => {
    setGuesses(prev => {
      const idx = prev.findIndex(g => g.matchId === guess.matchId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = guess;
        return next;
      }
      return [...prev, guess];
    });
  };

  const sortedMatches = [...matches].sort((a, b) => a.date.getTime() - b.date.getTime());

  const phaseLabel = (type: string, group: string) => {
    const labels: Record<string, string> = {
      group: 'Fase de Grupos',
      round_of_32: '32 avos de Final',
      round_of_16: 'Oitavas de Final',
      quarter: 'Quartas de Final',
      semi: 'Semifinal',
      third_place: 'Disputa de 3º Lugar',
      final: 'Final',
    };
    const label = labels[type] || type;
    return group && type === 'group' ? `${label} • Grupo ${group}` : label;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-br-blue p-4 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {teamFlag && (
              <img src={teamFlag} alt={teamName} className="w-12 h-8 object-contain drop-shadow" />
            )}
            <div>
              <h3 className="font-display font-bold text-xl">{teamName}</h3>
              <p className="text-white/70 text-sm">{sortedMatches.length} jogos</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-gray-200 border-t-br-green rounded-full animate-spin" />
            </div>
          ) : sortedMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="font-medium">Nenhum jogo encontrado</p>
            </div>
          ) : (
            sortedMatches.map(match => {
              const guess = guesses.find(g => g.matchId === match.id);
              return (
                <div key={match.id}>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                    {phaseLabel(match.type, match.group)}
                  </div>
                  <MatchCard
                    match={match}
                    guess={guess}
                    onSaveGuess={handleSaveGuess}
                    now={now}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
