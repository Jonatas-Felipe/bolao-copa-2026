import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Ranking from './components/Ranking';
import GroupStandings from './components/GroupStandings';
import Bracket from './components/Bracket';
import TeamMatchesModal from './components/TeamMatchesModal';
import Layout from './components/Layout';
import { User } from './types';
import { logout } from './services/api';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [view, setView] = useState<'dashboard' | 'groups' | 'bracket' | 'ranking'>('dashboard');
  const [selectedTeam, setSelectedTeam] = useState<{ name: string; flag: string } | null>(null);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // mesmo se falhar no server, desloga localmente
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleTeamClick = (name: string, flag: string) => {
    if (!name || name === 'A definir') return;
    setSelectedTeam({ name, flag });
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} view={view} setView={setView} onLogout={handleLogout}>
      {view === 'dashboard' && <Dashboard userId={user.id} onTeamClick={handleTeamClick} />}
      {view === 'groups' && <GroupStandings onTeamClick={handleTeamClick} />}
      {view === 'bracket' && <Bracket onTeamClick={handleTeamClick} />}
      {view === 'ranking' && <Ranking userId={user.id} />}

      {selectedTeam && (
        <TeamMatchesModal
          teamName={selectedTeam.name}
          teamFlag={selectedTeam.flag}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </Layout>
  );
}
