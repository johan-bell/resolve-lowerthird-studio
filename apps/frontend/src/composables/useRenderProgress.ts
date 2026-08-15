import { onBeforeUnmount, onMounted } from 'vue';
import type { RenderProgressPayload } from '@lower-thirds/shared';
import { useRenderStore } from '@/stores/render.store';
import { getSocket } from '@/ws/socket';

/**
 * Feeds render progress from the socket into the store.
 *
 * The HTTP request stays open for the whole batch, so without this the UI would
 * sit on a spinner for minutes with nothing to show.
 */
export function useRenderProgress(): void {
  const render = useRenderStore();
  const socket = getSocket();

  const onProgress = (payload: RenderProgressPayload): void => {
    render.applyProgress(payload);
  };

  onMounted(() => socket.on('render:progress', onProgress));
  onBeforeUnmount(() => socket.off('render:progress', onProgress));
}
