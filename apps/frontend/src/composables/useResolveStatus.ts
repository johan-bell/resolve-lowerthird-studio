import { onBeforeUnmount, onMounted } from 'vue';
import type { ResolveStatus } from '@lower-thirds/shared';
import { useConnectionStore } from '@/stores/connection.store';
import { getSocket } from '@/ws/socket';
import { fetchCachedResolveStatus } from '@/api/resolve.api';

interface UseResolveStatus {
  /** Ask the backend to re-check Resolve right now. */
  refresh: () => void;
}

/**
 * Keeps the connection store in sync with the backend.
 *
 * One cached HTTP read paints the indicator immediately; after that the socket
 * pushes changes, so there is no polling from the browser.
 */
export function useResolveStatus(): UseResolveStatus {
  const connection = useConnectionStore();
  const socket = getSocket();
  const controller = new AbortController();

  const onStatus = (status: ResolveStatus): void => {
    connection.setStatus(status);
  };
  const onConnect = (): void => {
    connection.setBackendOnline(true);
  };
  const onDisconnect = (): void => {
    connection.setBackendOnline(false);
  };

  onMounted(() => {
    void fetchCachedResolveStatus(controller.signal).then((result) => {
      if (result.ok) connection.setStatus(result.data);
    });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('resolve:status', onStatus);
    if (socket.connected) onConnect();
  });

  onBeforeUnmount(() => {
    controller.abort();
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('resolve:status', onStatus);
  });

  return {
    refresh: () => socket.emit('resolve:refresh'),
  };
}
