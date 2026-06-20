import axios from 'axios';
import type { MatchAPI, MatchesResponse, Match, Team, GroupStanding, RankingEntry } from '../types';
import { translateTeamName } from '../lib/teamNames';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: injeta o token em toda request autenticada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: se receber 401, desloga automaticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normaliza a resposta da API para o formato interno */
export function normalizeMatch(m: MatchAPI): Match {
  return {
    id: m.id,
    homeTeam: translateTeamName(m.homeTeamName),
    awayTeam: translateTeamName(m.awayTeamName),
    homeFlag: m.homeFlag,
    awayFlag: m.awayFlag,
    date: new Date(m.date),
    finished: m.finished,
    timeElapsed: m.timeElapsed,
    homeScore: m.homeScore != null ? parseInt(m.homeScore) : null,
    awayScore: m.awayScore != null ? parseInt(m.awayScore) : null,
    group: m.group,
    type: m.type,
    weight: typeof m.weight === 'number' ? m.weight : 1,
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  user: { id: string; name: string; points: number };
  token: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  points: number;
  createdAt: string;
}

export const register = (name: string, pin: string) =>
  api.post<RegisterResponse>('/auth/register', { name, pin });

export const login = (name: string, pin: string) =>
  api.post<LoginResponse>('/auth/login', { name, pin });

export const logout = () => api.post('/auth/logout');

// ─── Matches ─────────────────────────────────────────────────────────────────

export interface FetchMatchesParams {
  page?: number;
  limit?: number;
  type?: string;
  group?: string;
  finished?: boolean;
}

export interface FetchMatchesResult {
  matches: Match[];
  total: number;
  page: number;
  totalPages: number;
}

export const fetchMatches = async (params?: FetchMatchesParams): Promise<FetchMatchesResult> => {
  const { data } = await api.get<MatchesResponse>('/matches', { params });
  return {
    matches: data.matches.map(normalizeMatch),
    total: data.total,
    page: data.page,
    totalPages: data.totalPages,
  };
};

/**
 * Carrega todas as páginas de jogos.
 * Mantém os nomes já normalizados via tradutor para compatibilidade.
 */
export const fetchAllMatches = async (
  params?: Omit<FetchMatchesParams, 'page'>
): Promise<Match[]> => {
  const allMatches: Match[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await fetchMatches({ ...params, page });
    allMatches.push(...result.matches);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages);

  return allMatches;
};

export const syncMatches = () => api.post<{ created: number; updated: number }>('/matches/sync');

// ─── Teams ───────────────────────────────────────────────────────────────────

export const fetchTeams = () => api.get<Team[]>('/teams');

// ─── Groups ──────────────────────────────────────────────────────────────────

export const fetchGroups = () => api.get<GroupStanding[]>('/groups');

// ─── Guesses ─────────────────────────────────────────────────────────────────

export interface GuessResponse {
  id: string;
  homeScore: number;
  awayScore: number;
  userId: string;
  matchId: string;
}

export const submitGuess = (matchId: string, homeScore: number, awayScore: number) =>
  api.post<GuessResponse>('/guesses', { matchId, homeScore, awayScore });

export const fetchMyGuesses = () => api.get<GuessResponse[]>('/guesses/me');

export interface MatchGuessEntry {
  id: string;
  userName: string;
  homeScore: number;
  awayScore: number;
  points: number;
}

export const fetchMatchGuesses = (matchId: string) =>
  api.get<MatchGuessEntry[]>(`/guesses/match/${encodeURIComponent(matchId)}`);

// ─── Ranking ─────────────────────────────────────────────────────────────────

export const fetchRanking = () =>
  api.get<RankingEntry[]>('/ranking');

export const recalculateRanking = () =>
  api.post<{ recalculated: number }>('/ranking/recalculate');

export default api;
