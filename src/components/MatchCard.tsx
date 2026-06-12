import { useState } from 'react';
import { differenceInMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock, Check } from 'lucide-react';
import { Match, Guess } from '../types';
import { cn } from '../lib/utils';
import { submitGuess } from '../services/api';

interface MatchCardProps {
  match: Match;
  guess?: Guess;
  onSaveGuess: (guess: Guess) => void;
}

const typeLabels: Record<string, string> = {
  group: 'Fase de Grupos',
  round_of_32: 'Oitavas',
  round_of_16: 'Oitavas',
  quarter: 'Quartas',
  semi: 'Semifinal',
  final: 'Final',
};

export default function MatchCard({ match, guess, onSaveGuess }: MatchCardProps) {
  const [homeScore, setHomeScore] = useState<number | ''>(guess?.homeScore ?? '');
  const [awayScore, setAwayScore] = useState<number | ''>(guess?.awayScore ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const timeDiff = differenceInMinutes(match.date, new Date());
  
  // Regra: bloqueia palpites faltando 30 minutos ou jogo finalizado
  const isLocked = timeDiff < 30 || match.finished;
  
  const handleSave = async () => {
    if (homeScore === '' || awayScore === '') return;
    
    setIsSaving(true);
    setError('');
    try {
      await submitGuess(match.id, Number(homeScore), Number(awayScore));
      onSaveGuess({ matchId: match.id, homeScore: Number(homeScore), awayScore: Number(awayScore) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 403) {
        setError('Tempo esgotado para este jogo');
      } else {
        setError(msg || 'Erro ao salvar palpite');
      }
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const isChanged = homeScore !== guess?.homeScore || awayScore !== guess?.awayScore;

  const phaseLabel = match.type === 'group'
    ? `Grupo ${match.group}`
    : typeLabels[match.type] || match.type;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {format(match.date, "HH:mm", { locale: ptBR })} • {phaseLabel}
        </span>
        {match.finished ? (
          <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-700 rounded-md">
            Encerrado
          </span>
        ) : isLocked ? (
          <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-md flex items-center gap-1">
            <Lock className="w-3 h-3" /> Bloqueado
          </span>
        ) : (
          <span className="text-xs font-semibold px-2 py-1 bg-br-green/10 text-br-green rounded-md">
            Aberto
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-between">
        
        {/* Teams and Inputs */}
        <div className="flex-1 w-full flex items-center justify-between sm:justify-center gap-2 sm:gap-6">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-2 flex-1 sm:flex-none">
            <img src={match.homeFlag} alt={match.homeTeam} className="w-12 h-8 object-contain drop-shadow-sm" />
            <span className="font-semibold text-gray-800 text-sm sm:text-base text-center line-clamp-1">{match.homeTeam}</span>
          </div>

          {/* Scores */}
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="99"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              disabled={isLocked}
              className={cn(
                "w-12 h-14 sm:w-16 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border outline-none transition-all",
                isLocked 
                  ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-white border-gray-300 focus:border-br-green focus:ring-2 focus:ring-br-green/20"
              )}
            />
            <span className="text-gray-400 font-medium pb-2 text-lg">x</span>
            <input
              type="number"
              min="0"
              max="99"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              disabled={isLocked}
              className={cn(
                "w-12 h-14 sm:w-16 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border outline-none transition-all",
                isLocked 
                  ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-white border-gray-300 focus:border-br-green focus:ring-2 focus:ring-br-green/20"
              )}
            />
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-2 flex-1 sm:flex-none">
            <img src={match.awayFlag} alt={match.awayTeam} className="w-12 h-8 object-contain drop-shadow-sm" />
            <span className="font-semibold text-gray-800 text-sm sm:text-base text-center line-clamp-1">{match.awayTeam}</span>
          </div>
        </div>

        {/* Action Button */}
        {!isLocked && (
          <div className="w-full sm:w-auto">
            <button
              onClick={handleSave}
              disabled={!isChanged || isSaving || homeScore === '' || awayScore === ''}
              className={cn(
                "w-full sm:w-28 h-10 sm:h-12 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                saved ? "bg-green-100 text-green-700" :
                isChanged && homeScore !== '' && awayScore !== ''
                  ? "bg-br-blue hover:bg-br-blue-dark text-white shadow-md cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <><Check className="w-4 h-4" /> Salvo</>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Official Score Display for finished matches */}
      {match.finished && match.homeScore !== null && (
        <div className="bg-gray-50 border-t border-gray-100 p-3 text-center text-sm">
          Placar oficial: <strong className="font-semibold text-gray-800">{match.homeTeam} {match.homeScore} x {match.awayScore} {match.awayTeam}</strong>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-t border-red-200 p-3 text-center text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
