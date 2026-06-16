import { useState, useEffect } from 'react';
import { Trophy, Medal, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { fetchRanking } from '../services/api';
import { RankingEntry } from '../types';
import { cn } from '../lib/utils';

interface RankingProps {
  userId: string;
}

export default function Ranking({ userId }: RankingProps) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRanking() {
      setLoading(true);
      setError('');
      try {
        const { data } = await fetchRanking();
        setRanking(data);
      } catch {
        setError('Erro ao carregar ranking.');
      } finally {
        setLoading(false);
      }
    }
    loadRanking();
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Ranking Geral</h2>
          <p className="text-gray-500 text-sm">Acompanhe sua posição na disputa.</p>
        </div>
        <div className="bg-orange-100 text-orange-700 p-3 rounded-full">
          <Trophy className="w-6 h-6" />
        </div>
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {ranking.map((entry, index) => {
            const isMe = entry.id === userId;
            
            return (
              <li 
                key={entry.id}
                className={cn(
                  "p-4 flex items-center gap-4 transition-colors",
                  isMe ? "bg-br-yellow/10" : "hover:bg-gray-50"
                )}
              >
                {/* Position Marker */}
                <div className="w-8 flex justify-center items-center">
                  {index === 0 ? (
                    <Medal className="w-7 h-7 text-yellow-400 drop-shadow-sm" />
                  ) : index === 1 ? (
                    <Medal className="w-6 h-6 text-gray-400 drop-shadow-sm" />
                  ) : index === 2 ? (
                    <Medal className="w-6 h-6 text-amber-600 drop-shadow-sm" />
                  ) : (
                    <span className="font-bold text-gray-400">{index + 1}º</span>
                  )}
                </div>

                {/* Avatar / Initials */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm",
                  isMe ? "bg-br-blue text-white" : "bg-gray-100 text-gray-600"
                )}>
                  {entry.name.substring(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", isMe ? "text-br-blue font-bold" : "text-gray-900")}>
                      {entry.name}
                    </span>
                    {isMe && <span className="bg-br-blue text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Você</span>}
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {entry.points} <span className="text-sm font-medium text-gray-500">pts</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      )}
      
      <div className="mt-6 bg-br-blue text-white rounded-xl p-5 shadow-sm">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-br-yellow" />
          Como funciona a pontuação?
        </h3>
        <ul className="text-sm text-white/80 space-y-2 list-disc list-inside">
          <li><strong>7 pontos:</strong> Placar exato (ex: apostou 2x1 e deu 2x1).</li>
          <li><strong>5 pontos:</strong> Acertou o vencedor e o saldo de gols (ex: apostou 2x1, deu 3x2).</li>
          <li><strong>4 pontos:</strong> Acertou o placar do vencedor (ex: apostou 2x1, deu 2x0).</li>
          <li><strong>3 pontos:</strong> Acertou o empate com saldo errado (ex: apostou 1x1, deu 2x2).</li>
          <li><strong>2 pontos:</strong> Acertou o placar do perdedor (ex: apostou 2x1, deu 3x1).</li>
          <li><strong>1 ponto:</strong> Acertou apenas quem venceu a partida.</li>
        </ul>
      </div>
    </div>
  );
}
