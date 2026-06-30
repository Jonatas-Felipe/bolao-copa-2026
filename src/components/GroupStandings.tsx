import { useState, useEffect } from 'react';
import { fetchGroups, fetchTeams } from '../services/api';
import { GroupStanding, Team } from '../types';
import { translateTeamName } from '../lib/teamNames';

export default function GroupStandings() {
  const [groups, setGroups] = useState<GroupStanding[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [groupsRes, teamsRes] = await Promise.all([
          fetchGroups(),
          fetchTeams(),
        ]);
        setGroups(groupsRes.data);
        setTeams(teamsRes.data);
      } catch {
        setError('Erro ao carregar classificação dos grupos.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getTeamInfo = (teamId: string): Team | undefined => {
    return teams.find(t => t.id === teamId);
  };

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

  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Classificação dos Grupos</h2>
        <p className="text-gray-500 text-sm">Fase de grupos — Copa do Mundo 2026</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedGroups.map(group => (
          <div key={group.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-br-blue px-4 py-3">
              <h3 className="text-white font-display font-bold text-lg">Grupo {group.name}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Seleção</th>
                    <th className="px-3 py-2 text-center w-8">P</th>
                    <th className="px-3 py-2 text-center w-8">J</th>
                    <th className="px-3 py-2 text-center w-8">V</th>
                    <th className="px-3 py-2 text-center w-8">E</th>
                    <th className="px-3 py-2 text-center w-8">D</th>
                    <th className="px-3 py-2 text-center w-8">GP</th>
                    <th className="px-3 py-2 text-center w-8">GC</th>
                    <th className="px-3 py-2 text-center w-8">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map((ts, idx) => {
                    const info = getTeamInfo(ts.team_id);
                    const name = info ? translateTeamName(info.name_en) : `Time ${ts.team_id}`;
                    const flag = info?.flag;

                    const bgClass = idx < 2
                      ? 'bg-green-50'
                      : idx === 2
                        ? 'bg-yellow-50'
                        : '';
                    const posClass = idx < 2
                      ? 'text-green-700 font-bold'
                      : idx === 2
                        ? 'text-yellow-700 font-bold'
                        : 'text-gray-400';

                    return (
                      <tr key={ts.team_id} className={`border-b border-gray-50 ${bgClass}`}>
                        <td className={`px-3 py-2.5 ${posClass}`}>{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {flag && (
                              <img src={flag} alt={name} className="w-6 h-4 object-contain shrink-0" />
                            )}
                            <span className="font-medium text-gray-800 truncate">{name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900">{ts.pts}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{ts.mp}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{ts.w}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{ts.d}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{ts.l}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{ts.gf}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{ts.ga}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">
                          {parseInt(ts.gd) > 0 ? `+${ts.gd}` : ts.gd}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200" />
                  Classificados
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-200" />
                  Possível classificação
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
