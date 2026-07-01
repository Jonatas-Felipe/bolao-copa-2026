import { useState, useEffect, Fragment } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy } from 'lucide-react';
import { fetchAllMatches } from '../services/api';
import { Match } from '../types';
import { cn } from '../lib/utils';
import {
  connectRealtime,
  disconnectRealtime,
  subscribeMatchesUpdated,
} from '../services/realtime';

const phaseOrder = ['round_of_32', 'round_of_16', 'quarter', 'semi'];

const phaseNames: Record<string, string> = {
  round_of_32: '16 Avos',
  round_of_16: 'Oitavas',
  quarter: 'Quartas',
  semi: 'Semi',
  third_place: '3º Lugar',
  final: 'Final',
};

interface Phase {
  type: string;
  name: string;
  matches: Match[];
}

/**
 * Reorder matches in earlier rounds so that bracket connector lines
 * correctly show which matches feed into the next round.
 * Two-pass approach: first assign all confirmed feeders, then fill gaps.
 */
function reorderForBracket(phases: Phase[]): Phase[] {
  if (phases.length <= 1) return phases;

  const result = phases.map(p => ({ ...p, matches: [...p.matches] }));

  // Work backwards from inner rounds to outer
  for (let i = result.length - 2; i >= 0; i--) {
    const currentMatches = result[i].matches;
    const nextMatches = result[i + 1].matches;
    const slotsPerNext = Math.max(1, Math.round(currentMatches.length / nextMatches.length));

    // Pass 1: assign all confirmed feeders (matches whose team appears in next round)
    const slots: Match[][] = nextMatches.map(() => []);
    const used = new Set<string>();

    for (let j = 0; j < nextMatches.length; j++) {
      const nextMatch = nextMatches[j];
      for (const teamName of [nextMatch.homeTeam, nextMatch.awayTeam]) {
        if (!teamName || teamName === 'A definir') continue;
        const feeder = currentMatches.find(
          m => !used.has(m.id) && (m.homeTeam === teamName || m.awayTeam === teamName),
        );
        if (feeder) {
          slots[j].push(feeder);
          used.add(feeder.id);
        }
      }
    }

    // Pass 2: fill incomplete slots with remaining unmatched matches
    const remaining = currentMatches.filter(m => !used.has(m.id));
    let remIdx = 0;
    for (let j = 0; j < slots.length; j++) {
      while (slots[j].length < slotsPerNext && remIdx < remaining.length) {
        slots[j].push(remaining[remIdx]);
        remIdx++;
      }
    }

    // Flatten slots into ordered array
    const ordered: Match[] = slots.flat();
    // Add any leftover
    while (remIdx < remaining.length) {
      ordered.push(remaining[remIdx]);
      remIdx++;
    }

    result[i] = { ...result[i], matches: ordered };
  }

  return result;
}

export default function Bracket({ onTeamClick }: { onTeamClick: (name: string, flag: string) => void }) {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMatches = async () => {
    try {
      const matches = await fetchAllMatches({ limit: 200 });
      setAllMatches(matches);
    } catch {
      setError('Erro ao carregar chave do mata-mata.');
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      await loadMatches();
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    connectRealtime();
    const unsubscribe = subscribeMatchesUpdated(() => {
      loadMatches();
    });
    return () => {
      unsubscribe();
      disconnectRealtime();
    };
  }, []);

  const knockoutMatches = allMatches.filter(m => {
    // Explicitly a known knockout type
    const knownKnockout = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place'];
    if (knownKnockout.includes(m.type)) return true;
    // Not a group match: type isn't 'group' AND has no group assignment
    if (m.type !== 'group' && !m.group) return true;
    // High matchday (group stage is matchdays 1-3 for 48-team format)
    if (m.matchday >= 4) return true;
    // High weight indicates knockout
    if (m.weight > 1 && m.type !== 'group') return true;
    return false;
  });

  const handleTeamClick = (teamName: string, teamFlag: string) => {
    onTeamClick(teamName, teamFlag);
  };

  // Build bracket sides
  const buildBracket = () => {
    const left: Phase[] = [];
    const right: Phase[] = [];

    // Infer type for matches without a recognized knockout type
    const inferType = (m: Match): string => {
      if (phaseOrder.includes(m.type) || m.type === 'final' || m.type === 'third_place') return m.type;
      if (m.matchday === 4) return 'round_of_32';
      if (m.matchday === 5) return 'round_of_16';
      if (m.matchday === 6) return 'quarter';
      if (m.matchday === 7) return 'semi';
      if (m.matchday === 8) return 'final';
      if (m.weight >= 70) return 'final';
      if (m.weight >= 50) return 'semi';
      if (m.weight >= 40) return 'quarter';
      if (m.weight >= 30) return 'round_of_16';
      if (m.weight >= 20) return 'round_of_32';
      return m.type || 'round_of_32';
    };

    const categorized = knockoutMatches.map(m => ({ ...m, _phase: inferType(m) }));

    for (const type of phaseOrder) {
      const matches = categorized.filter(m => m._phase === type);
      if (matches.length === 0) continue;
      const half = Math.ceil(matches.length / 2);
      left.push({ type, name: phaseNames[type] || type, matches: matches.slice(0, half) });
      right.push({ type, name: phaseNames[type] || type, matches: matches.slice(half) });
    }

    const finalAndThird = categorized.filter(m => m._phase === 'final' || m._phase === 'third_place');
    let finalMatches: Match[];
    let thirdPlace: Match[];

    // If type is explicitly 'third_place', use that
    const explicitThird = finalAndThird.filter(m => m.type === 'third_place');
    const explicitFinal = finalAndThird.filter(m => m.type === 'final');

    if (explicitThird.length > 0) {
      thirdPlace = explicitThird;
      finalMatches = finalAndThird.filter(m => m.type !== 'third_place');
    } else if (finalAndThird.length > 1) {
      // If multiple matches ended up as 'final', the earlier one is 3rd place
      const sorted = [...finalAndThird].sort((a, b) => a.date.getTime() - b.date.getTime());
      thirdPlace = [sorted[0]];
      finalMatches = sorted.slice(1);
    } else {
      finalMatches = explicitFinal.length > 0 ? explicitFinal : finalAndThird;
      thirdPlace = [];
    }

    // Reorder matches so bracket connections are correct
    const reorderedLeft = reorderForBracket(left);
    const reorderedRight = reorderForBracket(right);

    return { left: reorderedLeft, right: reorderedRight, finalMatches, thirdPlace };
  };

  const { left: leftPhases, right: rightPhases, finalMatches, thirdPlace } = buildBracket();
  const rightPhasesReversed = [...rightPhases].reverse();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-br-green rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  if (knockoutMatches.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Chave do Mata-Mata</h2>
          <p className="text-gray-500 text-sm">Fases eliminatórias — Copa do Mundo 2026</p>
        </div>
        <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-gray-100">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium text-lg">Fase eliminatória ainda não iniciou</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Os jogos do mata-mata aparecerão automaticamente quando forem definidos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Chave do Mata-Mata</h2>
        <p className="text-gray-500 text-sm">Clique em uma seleção para ver seus jogos e palpitar</p>
      </div>

      {/* Bracket (scroll lateral no mobile) */}
      {leftPhases.length > 0 ? (
        <DesktopBracket
          leftPhases={leftPhases}
          rightPhasesReversed={rightPhasesReversed}
          finalMatches={finalMatches}
          thirdPlace={thirdPlace}
          onTeamClick={handleTeamClick}
        />
      ) : (
        <FinalOnlyView
          finalMatches={finalMatches}
          thirdPlace={thirdPlace}
          onTeamClick={handleTeamClick}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DESKTOP BRACKET
// ══════════════════════════════════════════════════════════════════════════════

interface DesktopBracketProps {
  leftPhases: Phase[];
  rightPhasesReversed: Phase[];
  finalMatches: Match[];
  thirdPlace: Match[];
  onTeamClick: (name: string, flag: string) => void;
}

function FinalOnlyView({
  finalMatches,
  thirdPlace,
  onTeamClick,
}: {
  finalMatches: Match[];
  thirdPlace: Match[];
  onTeamClick: (name: string, flag: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Bracket placeholder */}
      <div className="flex items-center gap-4 w-full max-w-3xl">
        <div className="flex-1 border-t-2 border-dashed border-gray-200" />
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-bold text-br-yellow uppercase tracking-wider flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            Final
          </div>
          <div className="w-56">
            {finalMatches.map(m => (
              <BracketMatchCompact key={m.id} match={m} onTeamClick={onTeamClick} isFinal />
            ))}
          </div>
        </div>
        <div className="flex-1 border-t-2 border-dashed border-gray-200" />
      </div>

      {thirdPlace.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            3º Lugar
          </div>
          <div className="w-56">
            {thirdPlace.map(m => (
              <BracketMatchCompact key={m.id} match={m} onTeamClick={onTeamClick} />
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-gray-400 text-sm mt-4 bg-gray-50 rounded-xl px-6 py-4 max-w-md">
        <p>Os jogos das fases anteriores (16 avos, oitavas, quartas e semi) aparecerão aqui quando forem definidos pelo sistema.</p>
      </div>
    </div>
  );
}

function DesktopBracket({
  leftPhases,
  rightPhasesReversed,
  finalMatches,
  thirdPlace,
  onTeamClick,
}: DesktopBracketProps) {
  const COL_W = 120;
  const CONN_W = 24;
  const FINAL_W = 140;

  const leftCols = leftPhases.length;
  const rightCols = rightPhasesReversed.length;
  const leftConns = Math.max(0, leftCols - 1);
  const rightConns = Math.max(0, rightCols - 1);
  const centerConns = (leftCols > 0 ? 1 : 0) + (rightCols > 0 ? 1 : 0);

  const totalWidth =
    leftCols * COL_W +
    leftConns * CONN_W +
    centerConns * 20 +
    FINAL_W +
    rightConns * CONN_W +
    rightCols * COL_W;

  const maxFirstRound = Math.max(
    leftPhases[0]?.matches.length || 1,
    rightPhasesReversed[rightPhasesReversed.length - 1]?.matches.length || 1,
  );
  const bracketHeight = Math.max(maxFirstRound * 76, 250);

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div style={{ minWidth: `${totalWidth}px` }}>
        {/* Headers */}
        <div className="flex mb-2">
          {leftPhases.map((p, i) => (
            <Fragment key={`hl-${p.type}`}>
              <div
                className="text-center flex-shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider"
                style={{ width: `${COL_W}px` }}
              >
                {p.name}
              </div>
              {i < leftPhases.length - 1 && (
                <div className="flex-shrink-0" style={{ width: `${CONN_W}px` }} />
              )}
            </Fragment>
          ))}
          {leftCols > 0 && <div className="flex-shrink-0" style={{ width: '20px' }} />}
          <div
            className="text-center flex-shrink-0 text-[10px] font-bold text-br-yellow uppercase tracking-wider flex items-center justify-center gap-1"
            style={{ width: `${FINAL_W}px` }}
          >
            <Trophy className="w-3 h-3" />
            Final
          </div>
          {rightCols > 0 && <div className="flex-shrink-0" style={{ width: '20px' }} />}
          {rightPhasesReversed.map((p, i) => (
            <Fragment key={`hr-${p.type}`}>
              {i > 0 && (
                <div className="flex-shrink-0" style={{ width: `${CONN_W}px` }} />
              )}
              <div
                className="text-center flex-shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider"
                style={{ width: `${COL_W}px` }}
              >
                {p.name}
              </div>
            </Fragment>
          ))}
        </div>

        {/* Bracket */}
        <div className="flex" style={{ height: `${bracketHeight}px` }}>
          {/* Left phases */}
          {leftPhases.map((phase, i) => (
            <Fragment key={`l-${phase.type}`}>
              <RoundColumn
                matches={phase.matches}
                width={COL_W}
                onTeamClick={onTeamClick}
              />
              {i < leftPhases.length - 1 && (
                <ConnectorLeft inputCount={phase.matches.length} width={CONN_W} />
              )}
            </Fragment>
          ))}

          {/* Left → Final connector */}
          {leftCols > 0 && (
            <div className="flex flex-col justify-center flex-shrink-0" style={{ width: '20px' }}>
              <div className="border-t-2 border-gray-300" />
            </div>
          )}

          {/* Final */}
          <div
            className="flex flex-col justify-center flex-shrink-0"
            style={{ width: `${FINAL_W}px` }}
          >
            {finalMatches.length > 0 ? (
              finalMatches.map(m => (
                <BracketMatchCompact key={m.id} match={m} onTeamClick={onTeamClick} isFinal />
              ))
            ) : (
              <div className="border border-dashed border-gray-300 rounded-lg p-2 text-center text-[10px] text-gray-400">
                Final
              </div>
            )}
          </div>

          {/* Final → Right connector */}
          {rightCols > 0 && (
            <div className="flex flex-col justify-center flex-shrink-0" style={{ width: '20px' }}>
              <div className="border-t-2 border-gray-300" />
            </div>
          )}

          {/* Right phases (reversed) */}
          {rightPhasesReversed.map((phase, i) => (
            <Fragment key={`r-${phase.type}`}>
              {i > 0 && (
                <ConnectorRight inputCount={phase.matches.length} width={CONN_W} />
              )}
              <RoundColumn
                matches={phase.matches}
                width={COL_W}
                onTeamClick={onTeamClick}
              />
            </Fragment>
          ))}
        </div>

        {/* 3rd place */}
        {thirdPlace.length > 0 && (
          <div className="flex justify-center mt-4">
            <div style={{ width: `${FINAL_W}px` }}>
              {thirdPlace.map(m => (
                <BracketMatchCompact key={m.id} match={m} onTeamClick={onTeamClick} isThirdPlace />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BRACKET COLUMNS & CONNECTORS
// ══════════════════════════════════════════════════════════════════════════════

function RoundColumn({
  matches,
  width,
  onTeamClick,
}: {
  matches: Match[];
  width: number;
  onTeamClick: (name: string, flag: string) => void;
}) {
  return (
    <div
      className="flex flex-col justify-around flex-shrink-0"
      style={{ width: `${width}px` }}
    >
      {matches.map(match => (
        <BracketMatchCompact key={match.id} match={match} onTeamClick={onTeamClick} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BRACKET CONNECTORS
// ══════════════════════════════════════════════════════════════════════════════

function ConnectorLeft({ inputCount, width }: { inputCount: number; width: number }) {
  const pairs = Math.floor(inputCount / 2);
  if (pairs === 0) return <div className="flex-shrink-0" style={{ width: `${width}px` }} />;

  const half = Math.floor(width / 2);
  return (
    <div className="flex flex-shrink-0" style={{ width: `${width}px` }}>
      <div className="flex flex-col" style={{ width: `${half}px` }}>
        {Array.from({ length: pairs }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col">
            <div className="flex-1" />
            <div className="flex-1 border-t-2 border-r-2 border-gray-300" />
            <div className="flex-1 border-b-2 border-r-2 border-gray-300" />
            <div className="flex-1" />
          </div>
        ))}
      </div>
      <div className="flex flex-col" style={{ width: `${half}px` }}>
        {Array.from({ length: pairs }).map((_, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div className="w-full border-t-2 border-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectorRight({ inputCount, width }: { inputCount: number; width: number }) {
  const pairs = Math.floor(inputCount / 2);
  if (pairs === 0) return <div className="flex-shrink-0" style={{ width: `${width}px` }} />;

  const half = Math.floor(width / 2);
  return (
    <div className="flex flex-shrink-0" style={{ width: `${width}px` }}>
      <div className="flex flex-col" style={{ width: `${half}px` }}>
        {Array.from({ length: pairs }).map((_, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div className="w-full border-t-2 border-gray-300" />
          </div>
        ))}
      </div>
      <div className="flex flex-col" style={{ width: `${half}px` }}>
        {Array.from({ length: pairs }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col">
            <div className="flex-1" />
            <div className="flex-1 border-t-2 border-l-2 border-gray-300" />
            <div className="flex-1 border-b-2 border-l-2 border-gray-300" />
            <div className="flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPACT MATCH CARD (BRACKET)
// ══════════════════════════════════════════════════════════════════════════════

function BracketMatchCompact({
  match,
  onTeamClick,
  isFinal,
  isThirdPlace,
}: {
  match: Match;
  onTeamClick: (name: string, flag: string) => void;
  isFinal?: boolean;
  isThirdPlace?: boolean;
}) {
  const homeTeam = match.homeTeam || 'A definir';
  const awayTeam = match.awayTeam || 'A definir';
  const isFinished = match.finished;
  const isLive = !match.finished && match.timeElapsed !== 'notstarted';

  const homeWon =
    isFinished && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore;
  const awayWon =
    isFinished && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden text-xs mx-0.5 my-1.5 bg-white',
        isLive ? 'border-red-500 ring-1 ring-red-200' : '',
        !isLive && isFinal ? 'border-br-yellow ring-1 ring-br-yellow/30' : '',
        !isLive && isThirdPlace ? 'border-amber-600 ring-1 ring-amber-600/30' : '',
        !isLive && !isFinal && !isThirdPlace ? 'border-gray-200' : '',
      )}
    >
      {isLive && (
        <div className="bg-red-500 text-white text-center text-[9px] font-bold py-0.5 animate-pulse">
          🔴 AO VIVO • {match.timeElapsed}
        </div>
      )}
      {isThirdPlace && (
        <div className="bg-amber-700 text-white text-center text-[9px] font-bold py-0.5">
          3º LUGAR
        </div>
      )}
      <TeamRow
        teamName={homeTeam}
        flag={match.homeFlag}
        score={match.homeScore}
        isWinner={homeWon}
        isFinished={isFinished}
        isLive={isLive}
        onClick={() => onTeamClick(homeTeam, match.homeFlag)}
        hasBorder
      />
      <TeamRow
        teamName={awayTeam}
        flag={match.awayFlag}
        score={match.awayScore}
        isWinner={awayWon}
        isFinished={isFinished}
        isLive={isLive}
        onClick={() => onTeamClick(awayTeam, match.awayFlag)}
      />
      <div className="bg-gray-50 text-gray-400 text-center text-[9px] py-0.5 border-t border-gray-100">
        {format(match.date, 'dd/MM HH:mm')}
      </div>
    </div>
  );
}

function TeamRow({
  teamName,
  flag,
  score,
  isWinner,
  isFinished,
  isLive,
  onClick,
  hasBorder,
}: {
  teamName: string;
  flag: string;
  score: number | null;
  isWinner: boolean;
  isFinished: boolean;
  isLive: boolean;
  onClick: () => void;
  hasBorder?: boolean;
}) {
  const isClickable = teamName !== 'A definir' && !!teamName;

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        'flex items-center gap-1 px-1.5 py-1 w-full text-left transition-colors',
        hasBorder && 'border-b border-gray-100',
        isWinner && 'bg-green-50',
        isClickable && 'hover:bg-blue-50 cursor-pointer',
        !isClickable && 'cursor-default',
      )}
    >
      {flag ? (
        <img src={flag} alt="" className="w-4 h-3 object-contain shrink-0" />
      ) : (
        <div className="w-4 h-3 bg-gray-200 rounded-sm shrink-0" />
      )}
      <span
        className={cn(
          'flex-1 truncate text-[11px]',
          isWinner ? 'font-bold text-gray-900' : 'text-gray-700',
        )}
      >
        {teamName}
      </span>
      <span
        className={cn(
          'font-mono text-[11px] w-3 text-right shrink-0',
          isWinner && 'text-green-700 font-bold',
        )}
      >
        {isFinished || isLive ? (score ?? 0) : '-'}
      </span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE VIEW
// ══════════════════════════════════════════════════════════════════════════════

interface MobileViewProps {
  leftPhases: Phase[];
  rightPhases: Phase[];
  finalMatches: Match[];
  thirdPlace: Match[];
  onTeamClick: (name: string, flag: string) => void;
}

function MobileView({ leftPhases, rightPhases, finalMatches, thirdPlace, onTeamClick }: MobileViewProps) {
  const allPhaseTypes = [...new Set([...leftPhases.map(p => p.type), ...rightPhases.map(p => p.type)])];

  const mergedPhases: Phase[] = phaseOrder
    .filter(t => allPhaseTypes.includes(t))
    .map(type => {
      const leftP = leftPhases.find(p => p.type === type);
      const rightP = rightPhases.find(p => p.type === type);
      return {
        type,
        name: phaseNames[type] || type,
        matches: [...(leftP?.matches || []), ...(rightP?.matches || [])],
      };
    });

  return (
    <div className="space-y-6">
      {mergedPhases.map(phase => (
        <div key={phase.type}>
          <h3 className="font-display font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-6 bg-br-blue rounded-full" />
            {phaseNames[phase.type] || phase.type}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {phase.matches.map(match => (
              <MobileBracketCard key={match.id} match={match} onTeamClick={onTeamClick} />
            ))}
          </div>
        </div>
      ))}

      {finalMatches.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-br-yellow" />
            Final
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {finalMatches.map(match => (
              <MobileBracketCard key={match.id} match={match} onTeamClick={onTeamClick} />
            ))}
          </div>
        </div>
      )}

      {thirdPlace.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-6 bg-amber-500 rounded-full" />
            Disputa de 3º Lugar
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {thirdPlace.map(match => (
              <MobileBracketCard key={match.id} match={match} onTeamClick={onTeamClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileBracketCard({
  match,
  onTeamClick,
}: {
  match: Match;
  onTeamClick: (name: string, flag: string) => void;
}) {
  const homeTeam = match.homeTeam || 'A definir';
  const awayTeam = match.awayTeam || 'A definir';
  const isFinished = match.finished;
  const isLive = !match.finished && match.timeElapsed !== 'notstarted';

  const homeWon =
    isFinished && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore;
  const awayWon =
    isFinished && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore;

  const handleClick = (name: string, flag: string) => {
    if (!name || name === 'A definir') return;
    onTeamClick(name, flag);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border overflow-hidden shadow-sm',
        isLive ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-100',
      )}
    >
      {isLive && (
        <div className="bg-red-500 text-white text-center text-xs font-bold py-1 animate-pulse">
          🔴 AO VIVO • {match.timeElapsed}
        </div>
      )}
      <div className="p-3 flex items-center gap-3">
        <button
          onClick={() => handleClick(homeTeam, match.homeFlag)}
          disabled={homeTeam === 'A definir'}
          className={cn(
            'flex-1 flex items-center gap-2 min-w-0 rounded-lg p-1 -m-1 transition-colors',
            homeWon && 'font-bold',
            homeTeam !== 'A definir' && 'hover:bg-blue-50',
          )}
        >
          {match.homeFlag && (
            <img src={match.homeFlag} alt={homeTeam} className="w-8 h-5 object-contain shrink-0" />
          )}
          <span className="text-sm truncate">{homeTeam}</span>
        </button>
        <div className="text-center shrink-0">
          {isFinished || isLive ? (
            <span className="font-bold text-lg">
              <span className={cn(homeWon && 'text-green-700')}>{match.homeScore ?? 0}</span>
              <span className="text-gray-400 mx-1">x</span>
              <span className={cn(awayWon && 'text-green-700')}>{match.awayScore ?? 0}</span>
            </span>
          ) : (
            <div className="text-xs text-gray-400">
              <div>{format(match.date, 'dd/MM', { locale: ptBR })}</div>
              <div>{format(match.date, 'HH:mm')}</div>
            </div>
          )}
        </div>
        <button
          onClick={() => handleClick(awayTeam, match.awayFlag)}
          disabled={awayTeam === 'A definir'}
          className={cn(
            'flex-1 flex items-center gap-2 justify-end min-w-0 rounded-lg p-1 -m-1 transition-colors',
            awayWon && 'font-bold',
            awayTeam !== 'A definir' && 'hover:bg-blue-50',
          )}
        >
          <span className="text-sm truncate text-right">{awayTeam}</span>
          {match.awayFlag && (
            <img src={match.awayFlag} alt={awayTeam} className="w-8 h-5 object-contain shrink-0" />
          )}
        </button>
      </div>
      {!isFinished && !isLive && (
        <div className="bg-gray-50 border-t border-gray-100 px-3 py-1.5 text-xs text-gray-400 text-center">
          {format(match.date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </div>
      )}
    </div>
  );
}
