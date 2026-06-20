import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectRealtime(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectRealtime(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export interface MatchesUpdatedPayload {
  created: number;
  updated: number;
}

export interface RankingUpdatedPayload {
  recalculated: number;
}

export interface GuessCreatedPayload {
  matchId: string;
  userId: string;
}

export function subscribeMatchesUpdated(
  listener: (payload: MatchesUpdatedPayload) => void
): () => void {
  const s = getSocket();

  const handler = (payload: MatchesUpdatedPayload) => {
    listener(payload);
  };

  s.on('matches:updated', handler);

  return () => {
    s.off('matches:updated', handler);
  };
}

export function subscribeRankingUpdated(
  listener: (payload: RankingUpdatedPayload) => void
): () => void {
  const s = getSocket();

  const handler = (payload: RankingUpdatedPayload) => {
    listener(payload);
  };

  s.on('ranking:updated', handler);

  return () => {
    s.off('ranking:updated', handler);
  };
}

export function subscribeGuessCreated(
  listener: (payload: GuessCreatedPayload) => void
): () => void {
  const s = getSocket();

  const handler = (payload: GuessCreatedPayload) => {
    listener(payload);
  };

  s.on('guess:created', handler);

  return () => {
    s.off('guess:created', handler);
  };
}
