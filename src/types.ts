export interface User {
  id: string;
  name: string;
  points: number;
}

// Resposta da API /matches (dentro de .matches[])
export interface MatchAPI {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: string | null;
  awayScore: string | null;
  group: string;
  matchday: string;
  date: string; // ISO 8601
  finished: boolean;
  timeElapsed: string; // "finished" | "notstarted" | "45'" etc.
  type: string; // "group" | "round_of_32" | "round_of_16" | "quarter" | "semi" | "final"
  weight: number;
}

// Resposta paginada de GET /api/matches
export interface MatchesResponse {
  matches: MatchAPI[];
  total: number;
  page: number;
  totalPages: number;
}

// Versão normalizada para uso nos componentes
export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string; // URL
  awayFlag: string; // URL
  date: Date;
  finished: boolean;
  timeElapsed: string;
  homeScore: number | null;
  awayScore: number | null;
  group: string;
  type: string;
  weight: number;
}

export interface Team {
  id: string;
  name_en: string;
  name_fa: string;
  flag: string;
  fifa_code: string;
  iso2: string;
  groups: string;
}

export interface GroupStanding {
  name: string;
  teams: GroupTeamStats[];
}

export interface GroupTeamStats {
  team_id: string;
  mp: string;
  w: string;
  l: string;
  d: string;
  pts: string;
  gf: string;
  ga: string;
  gd: string;
}

export interface Guess {
  matchId: string;
  homeScore: number | '';
  awayScore: number | '';
}

export interface RankingEntry {
  id: string;
  name: string;
  points: number;
}

export interface MatchGuessEntry {
  id: string;
  userName: string;
  homeScore: number;
  awayScore: number;
  points: number;
}
