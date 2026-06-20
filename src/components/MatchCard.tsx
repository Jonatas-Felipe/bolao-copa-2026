import { useState } from 'react';
import { differenceInMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock, Check, Users, X, Trophy } from 'lucide-react';
import { Match, Guess, MatchGuessEntry } from '../types';
import { cn } from '../lib/utils';
import { submitGuess, fetchMatchGuesses } from '../services/api';

interface MatchCardProps {
  match: Match;
  guess?: Guess;
  onSaveGuess: (guess: Guess) => void;
  now: number;
}

const typeLabels: Record<string, string> = {
  group: 'Fase de Grupos',
  round_of_32: '16 avos',
  round_of_16: 'Oitavas',
  quarter: 'Quartas',
  semi: 'Semifinal',
  final: 'Final',
};

export default function MatchCard({ match, guess, onSaveGuess, now }: MatchCardProps) {
  const [homeScore, setHomeScore] = useState<number | ''>(guess?.homeScore ?? '');
  const [awayScore, setAwayScore] = useState<number | ''>(guess?.awayScore ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showGuesses, setShowGuesses] = useState(false);
  const [matchGuesses, setMatchGuesses] = useState<MatchGuessEntry[]>([]);
  const [loadingGuesses, setLoadingGuesses] = useState(false);

  const currentDate = new Date(now);
  const timeDiff = differenceInMinutes(match.date, currentDate);
  const hasStarted = currentDate >= match.date;
  
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

  // Palpites dos outros ficam visíveis após o início do jogo.
  const canViewGuesses = hasStarted || match.finished;

  const handleViewGuesses = async () => {
    if (showGuesses) {
      setShowGuesses(false);
      return;
    }
    setLoadingGuesses(true);
    setError('');
    try {
      const { data } = await fetchMatchGuesses(match.id);
      setMatchGuesses(data);
      setShowGuesses(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(msg || 'Palpites ainda não disponíveis para esta partida.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoadingGuesses(false);
    }
  };

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

      {/* View others' guesses button */}
      {canViewGuesses && (
        <div className="border-t border-gray-100">
          <button
            onClick={handleViewGuesses}
            disabled={loadingGuesses}
            className="w-full p-3 text-sm text-br-blue hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {loadingGuesses ? (
              <div className="w-4 h-4 border-2 border-br-blue/30 border-t-br-blue rounded-full animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            Ver palpites dos participantes
          </button>
        </div>
      )}

      {/* Modal de palpites dos participantes */}
      {showGuesses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGuesses(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-br-blue p-5 text-white">
              <button
                onClick={() => setShowGuesses(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <img src={match.homeFlag} alt={match.homeTeam} className="w-8 h-5 object-contain" />
                  <span className="font-bold text-sm">{match.homeTeam}</span>
                </div>
                {match.finished && match.homeScore !== null ? (
                  <span className="font-bold text-lg">{match.homeScore} x {match.awayScore}</span>
                ) : (
                  <span className="text-white/70 text-sm">vs</span>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{match.awayTeam}</span>
                  <img src={match.awayFlag} alt={match.awayTeam} className="w-8 h-5 object-contain" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Users className="w-3.5 h-3.5" />
                <span>Palpites dos participantes</span>
                {match.timeElapsed !== 'finished' && match.timeElapsed !== 'notstarted' && (
                  <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                    Ao vivo • {match.timeElapsed}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {matchGuesses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Nenhum palpite ainda</p>
                  <p className="text-sm mt-1">Ninguém fez palpite neste jogo.</p>
                </div>
              ) : (
                matchGuesses.map((g, index) => (
                  <div
                    key={g.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                      index === 0 && match.finished && g.points >= 5
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-gray-50 border-gray-100"
                    )}
                  >
                    {/* Position */}
                    <div className="w-7 text-center shrink-0">
                      {match.finished && index === 0 && g.points >= 5 ? (
                        <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                      ) : (
                        <span className="text-xs font-bold text-gray-400">{index + 1}º</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-br-blue/10 flex items-center justify-center text-br-blue font-bold text-xs shrink-0">
                      {g.userName.substring(0, 2).toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-800 text-sm truncate block">{g.userName}</span>
                    </div>

                    {/* Guess score */}
                    <div className="text-center shrink-0">
                      <span className="font-bold text-gray-700 text-sm">{g.homeScore} x {g.awayScore}</span>
                    </div>

                    {/* Points - always show */}
                    <div className={cn(
                      "shrink-0 text-xs font-bold px-2.5 py-1 rounded-full",
                      g.points >= 7 ? "bg-green-100 text-green-700" :
                      g.points >= 5 ? "bg-emerald-100 text-emerald-700" :
                      g.points >= 3 ? "bg-yellow-100 text-yellow-700" :
                      g.points >= 1 ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-600"
                    )}>
                      {g.points} pts
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer - Scoring Legend */}
            {match.finished && matchGuesses.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 justify-center">
                  <span><strong className="text-green-600">7</strong> exato</span>
                  <span><strong className="text-emerald-600">6</strong> vencedor+saldo</span>
                  <span><strong className="text-teal-600">5</strong> placar vencedor</span>
                  <span><strong className="text-yellow-600">4</strong> empate não exato</span>
                  <span><strong className="text-orange-600">3</strong> placar perdedor</span>
                  <span><strong className="text-amber-600">2</strong> só vencedor</span>
                  <span><strong className="text-gray-600">1</strong> palpite empate</span>
                </div>
              </div>
            )}
          </div>
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
