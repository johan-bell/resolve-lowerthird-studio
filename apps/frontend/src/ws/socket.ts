import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@lower-thirds/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Lazily created singleton. Vite proxies /socket.io to the backend in dev, so
 * the default same-origin URL is correct in both dev and a packaged build.
 */
export function getSocket(): AppSocket {
  socket ??= io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
